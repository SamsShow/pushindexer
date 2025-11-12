import { ethers } from "ethers";
import { getDbPool } from "../db/client.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

export class ReorgHandler {
  private provider: ethers.JsonRpcProvider;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  /**
   * Check for reorgs by comparing stored block hashes with current chain
   */
  async checkForReorgs(chainId: number): Promise<void> {
    const pool = getDbPool();
    
    try {
      // Get transactions that might be affected by reorgs
      const result = await pool.query(
        `SELECT DISTINCT block_number, block_hash 
         FROM facilitated_tx 
         WHERE chain_id = $1 AND status = 'confirmed'
         ORDER BY block_number DESC
         LIMIT 100`,
        [chainId]
      );

      for (const row of result.rows) {
        const storedBlockHash = row.block_hash;
        const blockNumber = row.block_number;

        try {
          const currentBlock = await this.provider.getBlock(Number(blockNumber));
          
          if (!currentBlock) {
            logger.warn(`Block ${blockNumber} not found - possible reorg`);
            await this.markReorged(blockNumber, chainId);
            continue;
          }

          if (currentBlock.hash !== storedBlockHash) {
            logger.warn(
              `Reorg detected at block ${blockNumber}: stored=${storedBlockHash}, current=${currentBlock.hash}`
            );
            await this.markReorged(blockNumber, chainId);
            await this.reprocessBlock(blockNumber, chainId);
          }
        } catch (error) {
          logger.error(`Error checking block ${blockNumber}:`, error);
        }
      }
    } catch (error) {
      logger.error("Error checking for reorgs:", error);
    }
  }

  /**
   * Mark transactions in a block as reorged
   */
  private async markReorged(blockNumber: number, chainId: number): Promise<void> {
    const pool = getDbPool();
    
    try {
      await pool.query(
        `UPDATE facilitated_tx 
         SET status = 'reorged', updated_at = NOW()
         WHERE block_number = $1 AND chain_id = $2`,
        [blockNumber, chainId]
      );
      
      logger.info(`Marked transactions in block ${blockNumber} as reorged`);
    } catch (error) {
      logger.error(`Error marking block ${blockNumber} as reorged:`, error);
    }
  }

  /**
   * Reprocess a block after reorg
   */
  private async reprocessBlock(blockNumber: number, chainId: number): Promise<void> {
    logger.info(`Reprocessing block ${blockNumber} after reorg...`);
    
    try {
      const block = await this.provider.getBlock(Number(blockNumber), true);
      
      if (!block || !block.transactions) {
        logger.warn(`Block ${blockNumber} not found or has no transactions`);
        return;
      }

      // Get facilitator address
      const facilitatorAddress = config.pushChain.facilitatorAddress.toLowerCase();
      
      // Process transactions in the block
      for (const txHash of block.transactions) {
        if (typeof txHash === "string") {
          const tx = await this.provider.getTransaction(txHash);
          
          if (tx && tx.to && tx.to.toLowerCase() === facilitatorAddress) {
            // This transaction interacts with facilitator - reprocess it
            logger.debug(`Reprocessing transaction ${txHash} from reorged block`);
            // The main indexer will handle the actual reprocessing
          }
        }
      }
    } catch (error) {
      logger.error(`Error reprocessing block ${blockNumber}:`, error);
    }
  }

  /**
   * Get the latest confirmed block hash for a chain
   */
  async getLatestConfirmedBlockHash(chainId: number): Promise<string | null> {
    const pool = getDbPool();
    
    try {
      const result = await pool.query(
        `SELECT block_hash 
         FROM facilitated_tx 
         WHERE chain_id = $1 AND status = 'confirmed'
         ORDER BY block_number DESC
         LIMIT 1`,
        [chainId]
      );

      return result.rows[0]?.block_hash || null;
    } catch (error) {
      logger.error("Error getting latest confirmed block hash:", error);
      return null;
    }
  }
}

