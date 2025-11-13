import { ethers } from "ethers";
import { config } from "../config/index.js";
import { getDbPool, closeDbPool } from "../db/client.js";
import { logger } from "../utils/logger.js";
import { EventListener } from "./eventListener.js";
import { ConfirmationWorker } from "./confirmationWorker.js";
import { ReorgHandler } from "./reorgHandler.js";
import { EventLog } from "../types/index.js";
import { metrics } from "../monitoring/metrics.js";
import { indexTransactionFromBlockchain } from "./indexingHelpers.js";

// Facilitator contract ABI (just the event)
const FACILITATOR_ABI = [
  "event FacilitatedTx(address indexed sender, address indexed target, address indexed token, uint256 value, bytes32 txHash, uint256 timestamp, uint8 txType)",
];

class Indexer {
  private provider: ethers.JsonRpcProvider;
  private eventListener: EventListener | null = null;
  private confirmationWorker: ConfirmationWorker | null = null;
  private reorgHandler: ReorgHandler | null = null;
  private isRunning = false;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.pushChain.rpcUrl);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Indexer is already running");
      return;
    }

    logger.info("Starting Push Chain Facilitator Indexer...");
    logger.info(`Chain ID: ${config.pushChain.chainId}`);
    logger.info(`Facilitator: ${config.pushChain.facilitatorAddress}`);

    if (!config.pushChain.facilitatorAddress) {
      throw new Error("FACILITATOR_CONTRACT_ADDRESS is required");
    }

    // Initialize database state
    await this.initializeIndexerState();

    // Start event listener
    this.eventListener = new EventListener(
      config.pushChain.facilitatorAddress,
      FACILITATOR_ABI,
      this.handleEvent.bind(this)
    );
    await this.eventListener.start();

    // Start confirmation worker
    this.confirmationWorker = new ConfirmationWorker(
      this.provider,
      config.indexer.confirmations
    );
    this.confirmationWorker.start(30000); // Check every 30 seconds

    // Start reorg handler
    this.reorgHandler = new ReorgHandler(this.provider);
    setInterval(() => {
      this.reorgHandler?.checkForReorgs(config.pushChain.chainId).catch((error) => {
        logger.error("Error checking for reorgs:", error);
      });
    }, 60000); // Check every minute

    this.isRunning = true;
    logger.info("Indexer started successfully");

    // Handle graceful shutdown
    process.on("SIGINT", () => this.stop());
    process.on("SIGTERM", () => this.stop());
  }

  private async initializeIndexerState(): Promise<void> {
    const pool = getDbPool();

    try {
      // Check if state exists
      const result = await pool.query(
        `SELECT * FROM indexer_state WHERE chain_id = $1`,
        [config.pushChain.chainId]
      );

      if (result.rows.length === 0) {
        // Initialize state
        const currentBlock = await this.provider.getBlockNumber();
        const currentBlockHash = (await this.provider.getBlock(currentBlock))?.hash || "";

        await pool.query(
          `INSERT INTO indexer_state (chain_id, last_processed_block, last_processed_block_hash)
           VALUES ($1, $2, $3)`,
          [config.pushChain.chainId, currentBlock, currentBlockHash]
        );

        logger.info(`Initialized indexer state at block ${currentBlock}`);
      } else {
        const state = result.rows[0];
        logger.info(
          `Resuming from block ${state.last_processed_block} (hash: ${state.last_processed_block_hash})`
        );
      }
    } catch (error) {
      logger.error("Error initializing indexer state:", error);
      throw error;
    }
  }

  private async handleEvent(log: EventLog, parsed: any): Promise<void> {
    try {
      const pool = getDbPool();
      const facilitatorInterface = new ethers.Interface(FACILITATOR_ABI);

      // Use shared indexing helper
      const indexed = await indexTransactionFromBlockchain(
        log.transactionHash,
        this.provider,
        facilitatorInterface
      );

      // Get receipt for block number and hash
      const receipt = await this.provider.getTransactionReceipt(log.transactionHash);
      if (!receipt) {
        logger.warn(`Receipt for ${log.transactionHash} not found`);
        return;
      }

      // Update indexer state
      await pool.query(
        `UPDATE indexer_state 
         SET last_processed_block = $1, 
             last_processed_block_hash = $2,
             updated_at = NOW()
         WHERE chain_id = $3`,
        [receipt.blockNumber, receipt.blockHash, config.pushChain.chainId]
      );

      // Track metrics
      const txType = indexed.transaction.tx_type || 0;
      metrics.incrementCounter("indexer_events_indexed", { event: parsed.name, txType: txType.toString() });
      metrics.setGauge("indexer_latest_block", receipt.blockNumber);

      logger.info(
        `Indexed ${parsed.name} event: tx=${log.transactionHash}, sender=${indexed.transaction.sender}, target=${indexed.transaction.target}, value=${indexed.transaction.value}, type=${txType}`
      );
    } catch (error) {
      logger.error(`Error handling event for tx ${log.transactionHash}:`, error);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info("Stopping indexer...");

    if (this.eventListener) {
      await this.eventListener.stop();
    }

    if (this.confirmationWorker) {
      this.confirmationWorker.stop();
    }

    await closeDbPool();

    this.isRunning = false;
    logger.info("Indexer stopped");
    process.exit(0);
  }
}

// Start indexer if run directly (check if this file is being executed directly)
const isMainModule = process.argv[1]?.includes('indexer/indexer') || 
                     process.argv[1]?.includes('indexer\\indexer') ||
                     import.meta.url.endsWith('indexer/indexer.ts') ||
                     import.meta.url.endsWith('indexer/indexer.js');

if (isMainModule) {
  const indexer = new Indexer();
  indexer.start().catch((error) => {
    logger.error("Failed to start indexer:", error);
    process.exit(1);
  });
}

export { Indexer };

