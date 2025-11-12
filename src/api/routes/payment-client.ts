import { FastifyInstance } from "fastify";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Client-side payment endpoint
 * This endpoint provides the Facilitator contract ABI and address
 * The actual payment is done client-side by the buyer's wallet
 */
export async function paymentClientRoutes(fastify: FastifyInstance) {
  // Get payment configuration for client
  fastify.get("/api/payment/config", async (request, reply) => {
    return reply.send({
      facilitatorAddress: config.pushChain.facilitatorAddress,
      chainId: config.pushChain.chainId,
      rpcUrl: config.pushChain.rpcUrl,
      sellerAddress: config.pushChain.sellerAddress,
      buyerAddress: config.pushChain.buyerAddress,
      abi: [
        "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
      ],
    });
  });

  // Verify payment by checking if transaction exists in indexer
  fastify.get<{
    Querystring: { txHash: string };
  }>("/api/payment/verify", async (request, reply) => {
    const { txHash } = request.query;

    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return reply.code(400).send({ error: "Invalid transaction hash" });
    }

    try {
      // Check if transaction is indexed using internal route
      const { getDbPool } = await import("../../db/client.js");
      const pool = getDbPool();

      const result = await pool.query(
        `SELECT * FROM facilitated_tx WHERE tx_hash = $1`,
        [txHash]
      );

      if (result.rows.length > 0) {
        const tx = result.rows[0];
        const eventsResult = await pool.query(
          `SELECT * FROM facilitator_event WHERE tx_hash = $1 ORDER BY log_index`,
          [txHash]
        );

        return reply.send({
          verified: true,
          transaction: {
            txHash: tx.tx_hash,
            blockNumber: tx.block_number,
            sender: tx.sender,
            target: tx.target,
            facilitator: tx.facilitator,
            value: tx.value,
            status: tx.status,
            txType: tx.tx_type,
          },
          events: eventsResult.rows.map((e) => ({
            eventName: e.event_name,
            eventArgs: e.event_args,
          })),
        });
      } else {
        return reply.send({
          verified: false,
          message: "Transaction not yet indexed",
        });
      }
    } catch (error: any) {
      logger.error("Error verifying payment:", error);
      return reply.code(500).send({
        error: "Failed to verify payment",
        message: error.message,
      });
    }
  });
}

