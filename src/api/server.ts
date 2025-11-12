import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { healthRoutes } from "./routes/health.js";
import { txRoutes } from "./routes/tx.js";
import { addressRoutes } from "./routes/address.js";
import { statsRoutes } from "./routes/stats.js";
import { eventsRoutes } from "./routes/events.js";
import { metricsRoutes } from "./routes/metrics.js";

export async function createServer() {
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(txRoutes);
  await fastify.register(addressRoutes);
  await fastify.register(statsRoutes);
  await fastify.register(eventsRoutes);
  await fastify.register(metricsRoutes);

  return fastify;
}

export async function startServer() {
  const server = await createServer();

  try {
    await server.listen({
      port: config.api.port,
      host: config.api.host,
    });

    logger.info(`API server listening on ${config.api.host}:${config.api.port}`);
  } catch (error) {
    logger.error("Error starting API server:", error);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down API server...");
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Start server if run directly (check if this file is being executed directly)
const isMainModule = process.argv[1]?.includes('api/server') ||
                     process.argv[1]?.includes('api\\server') ||
                     import.meta.url.endsWith('api/server.ts') ||
                     import.meta.url.endsWith('api/server.js');

if (isMainModule) {
  startServer().catch((error) => {
    logger.error("Failed to start API server:", error);
    process.exit(1);
  });
}

