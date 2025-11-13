import pg from "pg";
import type { NextApiRequest, NextApiResponse } from "next";

const { Pool } = pg;

// Singleton pool for serverless functions
let pool: pg.Pool | null = null;

function getDbPool(): pg.Pool {
  if (pool) {
    return pool;
  }

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
  if (DATABASE_URL.includes("neon.tech")) {
    connectionConfig.ssl = { rejectUnauthorized: false };
  }
  pool = new Pool(connectionConfig);
  return pool;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      eventName,
      fromBlock,
      toBlock,
      address,
      limit = 50,
      page = 1,
    } = req.query;

    const pool = getDbPool();
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (eventName) {
      conditions.push(`event_name = $${paramIndex++}`);
      params.push(eventName);
    }

    if (fromBlock !== undefined) {
      conditions.push(`block_number >= $${paramIndex++}`);
      params.push(Number(fromBlock));
    }

    if (toBlock !== undefined) {
      conditions.push(`block_number <= $${paramIndex++}`);
      params.push(Number(toBlock));
    }

    if (address) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address as string)) {
        return res.status(400).json({ error: "Invalid address format" });
      }
      conditions.push(
        `(event_args->>'sender' = $${paramIndex} OR event_args->>'target' = $${paramIndex})`
      );
      params.push((address as string).toLowerCase());
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `SELECT * FROM facilitator_event 
                   ${whereClause}
                   ORDER BY block_number DESC, log_index DESC 
                   LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

    const countQuery = `SELECT COUNT(*) FROM facilitator_event ${whereClause}`;

    params.push(Number(limit), offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / Number(limit));

    return res.status(200).json({
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
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
      },
      filters: {
        eventName: eventName || null,
        fromBlock: fromBlock ? Number(fromBlock) : null,
        toBlock: toBlock ? Number(toBlock) : null,
        address: address || null,
      },
    });
  } catch (error: any) {
    console.error("Error fetching events:", error);
    
    if (error.message?.includes("DATABASE_URL")) {
      return res.status(503).json({ 
        error: "Database not configured",
        message: "DATABASE_URL environment variable is not set."
      });
    }
    
    return res.status(500).json({ error: "Internal server error" });
  }
}

