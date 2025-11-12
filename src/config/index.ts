import dotenv from "dotenv";

dotenv.config();

export const config = {
  pushChain: {
    rpcUrl: process.env.PUSH_CHAIN_RPC_URL || "https://evm.rpc-testnet-donut-node1.push.org/",
    wsUrl: process.env.PUSH_CHAIN_WS_URL || "wss://evm.rpc-testnet-donut-node1.push.org/",
    chainId: parseInt(process.env.PUSH_CHAIN_ID || "0"),
    facilitatorAddress: process.env.FACILITATOR_CONTRACT_ADDRESS || "",
    sellerAddress: process.env.SELLER_WALLET_ADDRESS || "0x0dFd63e8b357eD75D502bb42F6e4eC63E2D84761",
  },
  database: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/pushindexer",
  },
  indexer: {
    confirmations: parseInt(process.env.CONFIRMATIONS || "6", 10),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "5000", 10),
    batchSize: parseInt(process.env.BATCH_SIZE || "100", 10),
  },
  api: {
    port: parseInt(process.env.API_PORT || "3000", 10),
    host: process.env.API_HOST || "0.0.0.0",
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};

