import { FastifyInstance } from "fastify";
import { metrics } from "../../monitoring/metrics.js";

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get("/metrics", async (request, reply) => {
    const prometheusOutput = metrics.exportPrometheus();
    return reply.type("text/plain").send(prometheusOutput);
  });
}

