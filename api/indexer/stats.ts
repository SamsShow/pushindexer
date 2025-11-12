import { getDbPool } from "../../src/db/client.js";
import { config } from "../../src/config/index.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const pool = getDbPool();

    const totalTxsResult = await pool.query(
      `SELECT COUNT(*) as count FROM facilitated_tx WHERE chain_id = $1`,
      [config.pushChain.chainId]
    );
    const totalTxs = parseInt(totalTxsResult.rows[0].count);

    const volumeResult = await pool.query(
      `SELECT COALESCE(SUM(value::numeric), 0) as volume 
       FROM facilitated_tx 
       WHERE chain_id = $1 AND status = 'confirmed'`,
      [config.pushChain.chainId]
    );
    const totalVolume = volumeResult.rows[0].volume;

    const activeUsersResult = await pool.query(
      `SELECT COUNT(DISTINCT sender) as count 
       FROM facilitated_tx 
       WHERE chain_id = $1`,
      [config.pushChain.chainId]
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].count);

    const txTypeResult = await pool.query(
      `SELECT tx_type, COUNT(*) as count 
       FROM facilitated_tx 
       WHERE chain_id = $1 
       GROUP BY tx_type`,
      [config.pushChain.chainId]
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
      [config.pushChain.chainId]
    );
    const txByStatus = statusResult.rows.reduce((acc: any, row: any) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    const latestBlockResult = await pool.query(
      `SELECT MAX(block_number) as block_number 
       FROM facilitated_tx 
       WHERE chain_id = $1`,
      [config.pushChain.chainId]
    );
    const latestBlock = latestBlockResult.rows[0]?.block_number || 0;

    return res.status(200).json({
      chainId: config.pushChain.chainId,
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
    return res.status(500).json({ error: "Internal server error" });
  }
}

