import type { NextApiRequest, NextApiResponse } from "next";
import { getDbPool } from "../../../src/db/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { hash } = req.query;

    if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash as string)) {
      return res.status(400).json({ error: "Invalid transaction hash" });
    }

    const pool = getDbPool();

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
    return res.status(500).json({ error: "Internal server error" });
  }
}

