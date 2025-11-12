import { ethers } from "ethers";
import { getDbPool } from "../db/client.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { metrics } from "../monitoring/metrics.js";

export class ConfirmationWorker {
  private provider: ethers.JsonRpcProvider;
  private confirmations: number;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(provider: ethers.JsonRpcProvider, confirmations: number = 6) {
    this.provider = provider;
    this.confirmations = confirmations;
  }

  start(intervalMs: number = 30000): void {
    logger.info(`Starting confirmation worker (checking every ${intervalMs}ms, ${this.confirmations} confirmations)`);
    
    this.intervalId = setInterval(() => {
      this.checkConfirmations().catch((error) => {
        logger.error("Error in confirmation worker:", error);
      });
    }, intervalMs);

    // Run immediately
    this.checkConfirmations().catch((error) => {
      logger.error("Error in initial confirmation check:", error);
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("Confirmation worker stopped");
    }
  }

  private async checkConfirmations(): Promise<void> {
    const pool = getDbPool();
    
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      // Get pending transactions
      const result = await pool.query(
        `SELECT tx_hash, block_number 
         FROM facilitated_tx 
         WHERE status IN ('pending', 'reorged') 
           AND block_number IS NOT NULL
           AND ($1 - block_number) >= $2`,
        [currentBlock, this.confirmations]
      );

      logger.debug(`Checking ${result.rows.length} transactions for confirmation`);

      for (const row of result.rows) {
        await this.checkTransaction(row.tx_hash, row.block_number);
      }
    } catch (error) {
      logger.error("Error checking confirmations:", error);
    }
  }

  private async checkTransaction(txHash: string, blockNumber: number): Promise<void> {
    const pool = getDbPool();
    
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        logger.debug(`Transaction ${txHash} receipt not found yet`);
        return;
      }

      const status = receipt.status === 1 ? "confirmed" : "reverted";
      
      // Update transaction status
      await pool.query(
        `UPDATE facilitated_tx 
         SET status = $1, 
             gas_used = $2,
             updated_at = NOW()
         WHERE tx_hash = $3`,
        [status, receipt.gasUsed.toString(), txHash]
      );

      // Track metrics
      metrics.incrementCounter("indexer_transactions_confirmed", { status });

      logger.debug(`Transaction ${txHash} marked as ${status}`);
    } catch (error) {
      logger.error(`Error checking transaction ${txHash}:`, error);
      
      // If transaction not found, it might have been dropped
      // Mark as reverted after enough time has passed
      const currentBlock = await this.provider.getBlockNumber();
      const blocksSinceTx = currentBlock - blockNumber;
      
      if (blocksSinceTx > this.confirmations * 2) {
        logger.warn(`Transaction ${txHash} not found after ${blocksSinceTx} blocks, marking as reverted`);
        await pool.query(
          `UPDATE facilitated_tx 
           SET status = 'reverted', updated_at = NOW()
           WHERE tx_hash = $1`,
          [txHash]
        );
      }
    }
  }
}

