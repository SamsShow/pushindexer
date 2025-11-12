import { FastifyInstance } from "fastify";
import { getDbPool } from "../../db/client.js";

export async function txRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { txHash: string } }>("/v1/tx/:txHash", async (request, reply) => {
    const { txHash } = request.params;

    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return reply.code(400).send({ error: "Invalid transaction hash" });
    }

    const pool = getDbPool();

    try {
      const result = await pool.query(
        `SELECT * FROM facilitated_tx WHERE tx_hash = $1`,
        [txHash]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: "Transaction not found" });
      }

      const tx = result.rows[0];

      // Get associated events
      const eventsResult = await pool.query(
        `SELECT * FROM facilitator_event WHERE tx_hash = $1 ORDER BY log_index`,
        [txHash]
      );

      return {
        transaction: {
          txHash: tx.tx_hash,
          blockNumber: tx.block_number,
          blockHash: tx.block_hash,
          blockTimestamp: tx.block_timestamp,
          sender: tx.sender,
          target: tx.target,
          facilitator: tx.facilitator,
          tokenAddress: tx.token_address,
          value: tx.value,
          gasUsed: tx.gas_used,
          gasPrice: tx.gas_price,
          status: tx.status,
          chainId: tx.chain_id,
          txType: tx.tx_type,
          decoded: tx.decoded,
        },
        events: eventsResult.rows.map((e) => ({
          id: e.id,
          eventName: e.event_name,
          eventArgs: e.event_args,
          logIndex: e.log_index,
          blockNumber: e.block_number,
        })),
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}

