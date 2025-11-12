import { FastifyInstance } from "fastify";
import { getDbPool } from "../../db/client.js";
import { config } from "../../config/index.js";
import { ethers } from "ethers";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async (request, reply) => {
    const health: any = {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {},
    };

    // Check database
    try {
      const pool = getDbPool();
      await pool.query("SELECT 1");
      health.services.database = "ok";
    } catch (error) {
      health.services.database = "error";
      health.status = "degraded";
    }

    // Check blockchain connection
    try {
      const provider = new ethers.JsonRpcProvider(config.pushChain.rpcUrl);
      await provider.getBlockNumber();
      health.services.blockchain = "ok";
    } catch (error) {
      health.services.blockchain = "error";
      health.status = "degraded";
    }

    const statusCode = health.status === "ok" ? 200 : 503;
    return reply.code(statusCode).send(health);
  });
}

