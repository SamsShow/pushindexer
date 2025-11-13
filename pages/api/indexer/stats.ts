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

  const chainId = parseInt(process.env.PUSH_CHAIN_ID || "42101");

  try {
    const pool = getDbPool();

    const totalTxsResult = await pool.query(
      `SELECT COUNT(*) as count FROM facilitated_tx WHERE chain_id = $1`,
      [chainId]
    );
    const totalTxs = parseInt(totalTxsResult.rows[0].count);

    const volumeResult = await pool.query(
      `SELECT COALESCE(SUM(value::numeric), 0) as volume 
       FROM facilitated_tx 
       WHERE chain_id = $1 AND status = 'confirmed'`,
      [chainId]
    );
    const totalVolume = volumeResult.rows[0].volume;

    const activeUsersResult = await pool.query(
      `SELECT COUNT(DISTINCT sender) as count 
       FROM facilitated_tx 
       WHERE chain_id = $1`,
      [chainId]
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].count);

    const txTypeResult = await pool.query(
      `SELECT tx_type, COUNT(*) as count 
       FROM facilitated_tx 
       WHERE chain_id = $1 
       GROUP BY tx_type`,
      [chainId]
    );
    const txByType = txTypeResult.rows.reduce((acc: any, row: any) => {
      const typeName =
        row.tx_type === 0 ? "native" : row.tx_type === 1 ? "erc20" : "cross_chain";
      acc[typeName] = parseInt(row.count);
      return acc;
    }, {});

    const statusResult = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM facilitated_tx 
       WHERE chain_id = $1 
       GROUP BY status`,
      [chainId]
    );
    const txByStatus = statusResult.rows.reduce((acc: any, row: any) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    const latestBlockResult = await pool.query(
      `SELECT MAX(block_number) as block_number 
       FROM facilitated_tx 
       WHERE chain_id = $1`,
      [chainId]
    );
    const latestBlock = latestBlockResult.rows[0]?.block_number || 0;

    return res.status(200).json({
      chainId: chainId,
      totalTransactions: totalTxs,
      totalVolume: totalVolume.toString(),
      activeUsers,
      transactionsByType: txByType,
      transactionsByStatus: txByStatus,
      latestBlock: latestBlock ? Number(latestBlock) : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    
    if (error.message?.includes("DATABASE_URL")) {
      return res.status(503).json({ 
        error: "Database not configured",
        message: "DATABASE_URL environment variable is not set."
      });
    }
    
    return res.status(500).json({ error: "Internal server error" });
  }
}

