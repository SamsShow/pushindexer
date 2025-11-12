import { FastifyInstance } from "fastify";
import { getDbPool } from "../../db/client.js";

export async function eventsRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: {
      eventName?: string;
      fromBlock?: number;
      toBlock?: number;
      address?: string;
      limit?: number;
      page?: number;
    };
  }>("/v1/events", async (request, reply) => {
    const {
      eventName,
      fromBlock,
      toBlock,
      address,
      limit = 50,
      page = 1,
    } = request.query;

    const pool = getDbPool();
    const offset = (page - 1) * limit;

    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (eventName) {
        conditions.push(`event_name = $${paramIndex++}`);
        params.push(eventName);
      }

      if (fromBlock !== undefined) {
        conditions.push(`block_number >= $${paramIndex++}`);
        params.push(fromBlock);
      }

      if (toBlock !== undefined) {
        conditions.push(`block_number <= $${paramIndex++}`);
        params.push(toBlock);
      }

      if (address) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return reply.code(400).send({ error: "Invalid address format" });
        }
        conditions.push(
          `(event_args->>'sender' = $${paramIndex} OR event_args->>'target' = $${paramIndex})`
        );
        params.push(address.toLowerCase());
        paramIndex++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const query = `SELECT * FROM facilitator_event 
                     ${whereClause}
                     ORDER BY block_number DESC, log_index DESC 
                     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

      const countQuery = `SELECT COUNT(*) FROM facilitator_event ${whereClause}`;

      params.push(limit, offset);

      const [result, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, params.slice(0, -2)), // Remove limit and offset for count
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      return {
        events: result.rows.map((e) => ({
          id: e.id,
          txHash: e.tx_hash,
          eventName: e.event_name,
          eventArgs: e.event_args,
          logIndex: e.log_index,
          blockNumber: e.block_number,
          createdAt: e.created_at,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        filters: {
          eventName: eventName || null,
          fromBlock: fromBlock || null,
          toBlock: toBlock || null,
          address: address || null,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}

