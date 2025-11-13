import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { healthRoutes } from "./routes/health.js";
import { txRoutes } from "./routes/tx.js";
import { addressRoutes } from "./routes/address.js";
import { statsRoutes } from "./routes/stats.js";
import { eventsRoutes } from "./routes/events.js";
import { metricsRoutes } from "./routes/metrics.js";
import { paymentRoutes } from "./routes/payment.js";
import { paymentClientRoutes } from "./routes/payment-client.js";

// Get project root - use process.cwd() for reliability
const rootDir = process.cwd();
const publicDir = join(rootDir, "public");

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

  // Serve static files from public directory (for local development)
  // Must be registered before other routes to avoid conflicts
  if (existsSync(publicDir)) {
    await fastify.register(fastifyStatic, {
      root: publicDir,
      prefix: "/",
      list: false,
    });
    logger.info(`Serving static files from: ${publicDir}`);
    
    // Explicit route for demo.html as fallback
    fastify.get("/demo.html", async (request, reply) => {
      const demoPath = join(publicDir, "demo.html");
      if (existsSync(demoPath)) {
        const content = readFileSync(demoPath, "utf-8");
        return reply.type("text/html").send(content);
      }
      return reply.code(404).send({ error: "demo.html not found" });
    });
  } else {
    logger.warn(`Public directory not found at: ${publicDir}`);
  }

  // Root route - redirect to Next.js app or provide info
  fastify.get("/", async (request, reply) => {
    return reply.code(200).send({
      message: "Push Chain Indexer API",
      version: "1.0.0",
      endpoints: {
        health: "/health",
        stats: "/api/indexer/stats",
        transaction: "/api/indexer/tx?hash=<txHash>",
        events: "/api/indexer/events",
        payment: "/api/payment/process",
        protected: "/api/protected/weather",
      },
      note: "For the demo page, please use the Next.js dev server: npm run dev (runs on http://localhost:3000)",
    });
  });

  // Protected API endpoint (x402 demo)
  fastify.get("/api/protected/weather", async (request, reply) => {
    const paymentHeader = request.headers["x-payment"];

    if (!paymentHeader) {
      // Return 402 Payment Required with payment specification
      // recipient is the seller wallet that will receive the payment
      return reply.code(402).send({
        scheme: "exact",
        amount: "0.001",
        currency: "PUSH",
        recipient: config.pushChain.sellerAddress, // Seller wallet address
        facilitator: config.pushChain.facilitatorAddress, // Facilitator contract address
        network: "push",
        chainId: config.pushChain.chainId.toString(),
      });
    }

    // Payment provided - verify and return protected resource
    try {
      const startTime = Date.now();
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const weatherData = {
        location: "San Francisco, CA",
        temperature: 72,
        condition: "Sunny",
        humidity: 65,
        windSpeed: 8,
      };

      const processingTime = Date.now() - startTime;

      // Set response headers with timing information
      reply.header("x-payment-response", paymentHeader as string);
      reply.header("x-settlement-time", "128");
      reply.header("x-verification-time", "64");
      reply.header("x-matched-path", "/api/protected/weather");

      return reply.send({
        success: true,
        data: weatherData,
        processingTime: `${processingTime}ms`,
      });
    } catch (error: any) {
      return reply.code(500).send({
        error: "Failed to process request",
        message: error.message,
      });
    }
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(txRoutes);
  await fastify.register(addressRoutes);
  await fastify.register(statsRoutes);
  await fastify.register(eventsRoutes);
  await fastify.register(metricsRoutes);
  await fastify.register(paymentRoutes);
  await fastify.register(paymentClientRoutes);

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
    logger.info(`Demo page available at http://localhost:${config.api.port}/demo.html`);
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

