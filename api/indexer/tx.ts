import pg from "pg";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const { Pool } = pg;

// Create database pool
function getDbPool(): pg.Pool {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const connectionConfig: pg.PoolConfig = {
    connectionString: DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  // Neon requires SSL
  if (DATABASE_URL.includes("neon.tech")) {
    connectionConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  return new Pool(connectionConfig);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS - must be set before any response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let pool: pg.Pool | null = null;

  try {
    const { hash } = req.query;

    if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash as string)) {
      return res.status(400).json({ error: "Invalid transaction hash" });
    }

    pool = getDbPool();

    const result = await pool.query(
      `SELECT * FROM facilitated_tx WHERE tx_hash = $1`,
      [hash]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const tx = result.rows[0];

    const eventsResult = await pool.query(
      `SELECT * FROM facilitator_event WHERE tx_hash = $1 ORDER BY log_index`,
      [hash]
    );

    return res.status(200).json({
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
    });
  } catch (error: any) {
    console.error("Error fetching transaction:", error);
    
    // Provide more helpful error messages
    if (error.message?.includes("DATABASE_URL")) {
      return res.status(503).json({ 
        error: "Database not configured",
        message: "DATABASE_URL environment variable is not set. Please configure it in Vercel environment variables."
      });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ 
        error: "Database connection failed",
        message: "Could not connect to the database. Please check your DATABASE_URL configuration."
      });
    }
    
    return res.status(500).json({ 
      error: "Internal server error",
      message: error.message || "Unknown error"
    });
  } finally {
    // Close the pool connection
    if (pool) {
      await pool.end().catch(console.error);
    }
  }
}

