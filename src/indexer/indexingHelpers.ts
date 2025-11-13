import { ethers } from "ethers";
import { getDbPool } from "../db/client.js";
import { config } from "../config/index.js";

/**
 * Index a transaction from blockchain data
 * This function can be used by both the long-running indexer and on-demand API
 */
export async function indexTransactionFromBlockchain(
  txHash: string,
  provider: ethers.JsonRpcProvider,
  facilitatorInterface: ethers.Interface
): Promise<{
  transaction: any;
  events: any[];
}> {
  const pool = getDbPool();

  // Get transaction details
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    throw new Error(`Transaction ${txHash} not found`);
  }

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    throw new Error(`Receipt for ${txHash} not found`);
  }

  const block = await provider.getBlock(receipt.blockNumber);
  if (!block) {
    throw new Error(`Block ${receipt.blockNumber} not found`);
  }

  // Find FacilitatedTx event in the logs
  let parsedEvent: ethers.LogDescription | null = null;
  let eventLog: ethers.Log | null = null;

  for (const log of receipt.logs) {
    try {
      const parsed = facilitatorInterface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (parsed && parsed.name === "FacilitatedTx") {
        parsedEvent = parsed;
        eventLog = log;
        break;
      }
    } catch (error) {
      // Not the event we're looking for, continue
      continue;
    }
  }

  if (!parsedEvent || !eventLog) {
    throw new Error(`FacilitatedTx event not found in transaction ${txHash}`);
  }

  // Extract event arguments
  const args = parsedEvent.args;
  const sender = args.sender?.toString() || "";
  const target = args.target?.toString() || "";
  const token = args.token?.toString() || null;
  const value = args.value?.toString() || "0";
  const timestamp = args.timestamp?.toString() || block.timestamp.toString();
  const txType = args.txType || 0;

  // Prepare decoded data
  const decoded = {
    event: parsedEvent.name,
    sender,
    target,
    token,
    value,
    txType,
    timestamp,
  };

  // Upsert transaction
  await pool.query(
    `INSERT INTO facilitated_tx (
      tx_hash, block_number, block_hash, block_timestamp,
      sender, target, facilitator, token_address, value,
      gas_used, gas_price, input_data, decoded, status, chain_id, tx_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (tx_hash) DO UPDATE SET
      block_number = EXCLUDED.block_number,
      block_hash = EXCLUDED.block_hash,
      block_timestamp = EXCLUDED.block_timestamp,
      status = EXCLUDED.status,
      decoded = EXCLUDED.decoded,
      updated_at = NOW()`,
    [
      txHash,
      receipt.blockNumber,
      receipt.blockHash,
      new Date(Number(block.timestamp) * 1000).toISOString(),
      sender,
      target,
      config.pushChain.facilitatorAddress,
      token,
      value,
      receipt.gasUsed.toString(),
      tx.gasPrice?.toString() || null,
      tx.data || null,
      JSON.stringify(decoded),
      "pending",
      config.pushChain.chainId,
      txType,
    ]
  );

  // Insert event log
  await pool.query(
    `INSERT INTO facilitator_event (tx_hash, event_name, event_args, log_index, block_number)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [
      txHash,
      parsedEvent.name,
      JSON.stringify({
        sender,
        target,
        token,
        value,
        timestamp,
        txType,
      }),
      eventLog.index,
      receipt.blockNumber,
    ]
  );

  // Get the inserted transaction
  const txResult = await pool.query(
    `SELECT * FROM facilitated_tx WHERE tx_hash = $1`,
    [txHash]
  );

  // Get associated events
  const eventsResult = await pool.query(
    `SELECT * FROM facilitator_event WHERE tx_hash = $1 ORDER BY log_index`,
    [txHash]
  );

  return {
    transaction: txResult.rows[0],
    events: eventsResult.rows,
  };
}

