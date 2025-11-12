import pg from "pg";
import { config } from "../config/index.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!pool) {
    const connectionConfig: pg.PoolConfig = {
      connectionString: config.database.url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased to 10 seconds for Neon
    };

    // Neon requires SSL, but connection string usually includes sslmode=require
    // If using Neon, ensure SSL is enabled
    if (config.database.url.includes("neon.tech")) {
      connectionConfig.ssl = {
        rejectUnauthorized: false, // Neon uses valid certificates
      };
    }

    pool = new Pool(connectionConfig);

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

