import { FastifyInstance } from "fastify";
import { getDbPool } from "../../db/client.js";

export async function addressRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Params: { address: string };
    Querystring: { limit?: number; page?: number; type?: "sender" | "target" | "both" };
  }>("/v1/address/:address/txs", async (request, reply) => {
    const { address } = request.params;
    const { limit = 50, page = 1, type = "both" } = request.query;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return reply.code(400).send({ error: "Invalid address" });
    }

    const pool = getDbPool();
    const offset = (page - 1) * limit;

    try {
      let query: string;
      let countQuery: string;
      const params: any[] = [address.toLowerCase(), limit, offset];

      if (type === "sender") {
        query = `SELECT * FROM facilitated_tx 
                 WHERE sender = $1 
                 ORDER BY block_number DESC, block_timestamp DESC 
                 LIMIT $2 OFFSET $3`;
        countQuery = `SELECT COUNT(*) FROM facilitated_tx WHERE sender = $1`;
      } else if (type === "target") {
        query = `SELECT * FROM facilitated_tx 
                 WHERE target = $1 
                 ORDER BY block_number DESC, block_timestamp DESC 
                 LIMIT $2 OFFSET $3`;
        countQuery = `SELECT COUNT(*) FROM facilitated_tx WHERE target = $1`;
      } else {
        query = `SELECT * FROM facilitated_tx 
                 WHERE sender = $1 OR target = $1 
                 ORDER BY block_number DESC, block_timestamp DESC 
                 LIMIT $2 OFFSET $3`;
        countQuery = `SELECT COUNT(*) FROM facilitated_tx WHERE sender = $1 OR target = $1`;
      }

      const [result, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, [address.toLowerCase()]),
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      return {
        address: address.toLowerCase(),
        transactions: result.rows.map((tx) => ({
          txHash: tx.tx_hash,
          blockNumber: tx.block_number,
          blockTimestamp: tx.block_timestamp,
          sender: tx.sender,
          target: tx.target,
          tokenAddress: tx.token_address,
          value: tx.value,
          status: tx.status,
          txType: tx.tx_type,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}

