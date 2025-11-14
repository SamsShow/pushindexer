// Use require for pg to avoid ESM/CommonJS issues on Vercel
const pg = require("pg");
import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

const { Pool } = pg;

// Singleton pool for serverless functions
let pool: pg.Pool | null = null;

// Create database pool (reused across invocations in serverless)
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

  // Neon requires SSL
  if (DATABASE_URL.includes("neon.tech")) {
    connectionConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  pool = new Pool(connectionConfig);
  return pool;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  try {
    const { hash } = req.query;

    if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash as string)) {
      return res.status(400).json({ error: "Invalid transaction hash" });
    }

    const pool = getDbPool();

    let result = await pool.query(
      `SELECT * FROM facilitated_tx WHERE tx_hash = $1`,
      [hash]
    );

    // If not found in database, try on-demand indexing from blockchain
    if (result.rows.length === 0) {
      try {
        const RPC_URL = process.env.PUSH_CHAIN_RPC_URL || "https://evm.rpc-testnet-donut-node1.push.org/";
        const FACILITATOR_ADDRESS = process.env.FACILITATOR_CONTRACT_ADDRESS || "";
        
        if (!FACILITATOR_ADDRESS) {
          return res.status(404).json({ 
            error: "Transaction not found",
            message: "Transaction not indexed and FACILITATOR_CONTRACT_ADDRESS not configured for on-demand indexing"
          });
        }

        // Create provider and interface for on-demand indexing
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const facilitatorInterface = new ethers.Interface([
          "event FacilitatedTx(address indexed sender, address indexed target, address indexed token, uint256 value, bytes32 txHash, uint256 timestamp, uint8 txType)",
        ]);

        // On-demand indexing: fetch transaction from blockchain
        const tx = await provider.getTransaction(hash as string);
        if (!tx) {
          return res.status(404).json({ 
            error: "Transaction not found",
            message: `Transaction ${hash} not found on blockchain`
          });
        }

        const receipt = await provider.getTransactionReceipt(hash as string);
        if (!receipt) {
          return res.status(404).json({ 
            error: "Transaction not found",
            message: `Receipt for ${hash} not found`
          });
        }

        const block = await provider.getBlock(receipt.blockNumber);
        if (!block) {
          return res.status(404).json({ 
            error: "Transaction not found",
            message: `Block ${receipt.blockNumber} not found`
          });
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
          return res.status(404).json({ 
            error: "Transaction not found",
            message: `FacilitatedTx event not found in transaction ${hash}`
          });
        }

        // Extract event arguments
        const args = parsedEvent.args;
        const sender = args.sender?.toString() || "";
        const target = args.target?.toString() || "";
        const token = args.token?.toString() || null;
        const value = args.value?.toString() || "0";
        const timestamp = args.timestamp?.toString() || block.timestamp.toString();
        const txType = args.txType || 0;
        const CHAIN_ID = parseInt(process.env.PUSH_CHAIN_ID || "42101");

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
            hash,
            receipt.blockNumber,
            receipt.blockHash,
            new Date(Number(block.timestamp) * 1000).toISOString(),
            sender,
            target,
            FACILITATOR_ADDRESS,
            token,
            value,
            receipt.gasUsed.toString(),
            tx.gasPrice?.toString() || null,
            tx.data || null,
            JSON.stringify(decoded),
            "pending",
            CHAIN_ID,
            txType,
          ]
        );

        // Insert event log
        await pool.query(
          `INSERT INTO facilitator_event (tx_hash, event_name, event_args, log_index, block_number)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tx_hash, log_index) DO NOTHING`,
          [
            hash,
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

        // Get the newly indexed transaction
        result = await pool.query(
          `SELECT * FROM facilitated_tx WHERE tx_hash = $1`,
          [hash]
        );

        if (result.rows.length === 0) {
          return res.status(500).json({ 
            error: "Indexing failed",
            message: "Transaction was indexed but could not be retrieved"
          });
        }
      } catch (indexError: any) {
        console.error("On-demand indexing error:", indexError);
        
        // If it's a "not found" type error, return 404
        if (indexError.message?.includes("not found") || indexError.message?.includes("FacilitatedTx event not found")) {
          return res.status(404).json({ 
            error: "Transaction not found",
            message: indexError.message || "Transaction not found or does not contain a FacilitatedTx event"
          });
        }
        
        // For other errors, return 500
        return res.status(500).json({ 
          error: "On-demand indexing failed",
          message: indexError.message || "Failed to index transaction from blockchain"
        });
      }
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
  }
}

