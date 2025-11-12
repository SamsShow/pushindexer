import { ethers } from "ethers";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { EventLog } from "../types/index.js";

export class EventListener {
  private provider: ethers.JsonRpcProvider;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private facilitatorAddress: string;
  private facilitatorInterface: ethers.Interface;
  private onEventCallback: (log: EventLog, parsed: any) => Promise<void>;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;

  constructor(
    facilitatorAddress: string,
    facilitatorAbi: string[],
    onEventCallback: (log: EventLog, parsed: any) => Promise<void>
  ) {
    this.facilitatorAddress = facilitatorAddress.toLowerCase();
    this.facilitatorInterface = new ethers.Interface(facilitatorAbi);
    this.onEventCallback = onEventCallback;
    this.provider = new ethers.JsonRpcProvider(config.pushChain.rpcUrl);
  }

  async start(): Promise<void> {
    logger.info("Starting event listener...");
    logger.info(`Facilitator address: ${this.facilitatorAddress}`);
    logger.info(`RPC URL: ${config.pushChain.rpcUrl}`);

    // Try WebSocket first, fallback to HTTP polling
    try {
      await this.startWebSocket();
    } catch (error) {
      logger.warn("WebSocket connection failed, falling back to HTTP polling", error);
      await this.startHttpPolling();
    }
  }

  private async startWebSocket(): Promise<void> {
    try {
      this.wsProvider = new ethers.WebSocketProvider(config.pushChain.wsUrl);
      
      // Handle errors on the underlying WebSocket connection
      // Access the websocket property and handle events
      const ws = this.wsProvider.websocket as any;
      if (ws) {
        // Use addEventListener if available (standard WebSocket API)
        if (typeof ws.addEventListener === 'function') {
          ws.addEventListener('error', (error: any) => {
            logger.error("WebSocket error:", error);
            this.handleReconnect();
          });
          ws.addEventListener('close', () => {
            logger.warn("WebSocket connection closed");
            this.handleReconnect();
          });
        } else {
          // Fallback for WebSocket-like objects with onerror/onclose
          if (typeof ws.onerror !== 'undefined') {
            ws.onerror = (error: any) => {
              logger.error("WebSocket error:", error);
              this.handleReconnect();
            };
          }
          if (typeof ws.onclose !== 'undefined') {
            ws.onclose = () => {
              logger.warn("WebSocket connection closed");
              this.handleReconnect();
            };
          }
        }
      }

      // Subscribe to logs
      const filter = {
        address: this.facilitatorAddress,
      };

      this.wsProvider.on(filter, async (log: ethers.Log) => {
        await this.handleLog(log);
      });

      logger.info("WebSocket subscription active");
      this.reconnectAttempts = 0;
    } catch (error) {
      logger.error("Failed to start WebSocket:", error);
      throw error;
    }
  }

  private async startHttpPolling(): Promise<void> {
    logger.info("Starting HTTP polling...");
    let lastBlock = await this.getLastProcessedBlock();

    const poll = async () => {
      try {
        const currentBlock = await this.provider.getBlockNumber();
        
        if (currentBlock > lastBlock) {
          const fromBlock = lastBlock + 1;
          const toBlock = Math.min(currentBlock, fromBlock + config.indexer.batchSize - 1);

          logger.debug(`Polling blocks ${fromBlock} to ${toBlock}`);

          const filter = {
            address: this.facilitatorAddress,
            fromBlock,
            toBlock,
          };

          const logs = await this.provider.getLogs(filter);
          
          for (const log of logs) {
            await this.handleLog(log);
          }

          lastBlock = toBlock;
        }

        setTimeout(poll, config.indexer.pollIntervalMs);
      } catch (error) {
        logger.error("HTTP polling error:", error);
        setTimeout(poll, config.indexer.pollIntervalMs * 2);
      }
    };

    poll();
  }

  private async handleLog(log: ethers.Log): Promise<void> {
    try {
      const parsed = this.facilitatorInterface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (!parsed) {
        return;
      }

      const eventLog: EventLog = {
        address: log.address,
        topics: log.topics as string[],
        data: log.data,
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash,
        logIndex: log.index,
        blockHash: log.blockHash || "",
      };

      await this.onEventCallback(eventLog, parsed);
    } catch (error) {
      // Not all logs will parse to our event - that's okay
      logger.debug("Failed to parse log:", error);
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("Max reconnection attempts reached, switching to HTTP polling");
      if (this.wsProvider) {
        await this.wsProvider.destroy();
        this.wsProvider = null;
      }
      await this.startHttpPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(async () => {
      try {
        if (this.wsProvider) {
          await this.wsProvider.destroy();
        }
        await this.startWebSocket();
      } catch (error) {
        logger.error("Reconnection failed:", error);
        this.handleReconnect();
      }
    }, delay);
  }

  private async getLastProcessedBlock(): Promise<number> {
    // This will be implemented by the main indexer
    // For now, return current block minus some buffer
    try {
      const block = await this.provider.getBlockNumber();
      return Math.max(0, block - 100); // Start from 100 blocks ago as buffer
    } catch (error) {
      logger.error("Failed to get block number:", error);
      return 0;
    }
  }

  async stop(): Promise<void> {
    logger.info("Stopping event listener...");
    if (this.wsProvider) {
      await this.wsProvider.destroy();
      this.wsProvider = null;
    }
  }
}

