import dotenv from "dotenv";

dotenv.config();

/**
 * Parse chain RPC map from environment variable
 * Format: "chainId1:rpcUrl1,chainId2:rpcUrl2" or JSON object
 */
function parseChainRpcMap(): Record<string | number, string> | undefined {
  const chainRpcMapEnv = process.env.CHAIN_RPC_MAP;
  if (!chainRpcMapEnv) {
    return undefined;
  }

  try {
    // Try parsing as JSON first
    const parsed = JSON.parse(chainRpcMapEnv);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch {
    // Not JSON, try comma-separated format: "chainId1:rpcUrl1,chainId2:rpcUrl2"
    const map: Record<string, string> = {};
    const pairs = chainRpcMapEnv.split(',');
    for (const pair of pairs) {
      const [chainId, rpcUrl] = pair.split(':').map(s => s.trim());
      if (chainId && rpcUrl) {
        map[chainId] = rpcUrl;
      }
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }

  return undefined;
}

export const config = {
  pushChain: {
    rpcUrl: process.env.PUSH_CHAIN_RPC_URL || "https://evm.rpc-testnet-donut-node1.push.org/",
    wsUrl: process.env.PUSH_CHAIN_WS_URL || "wss://evm.rpc-testnet-donut-node1.push.org/",
    chainId: parseInt(process.env.PUSH_CHAIN_ID || "0"),
    facilitatorAddress: process.env.FACILITATOR_CONTRACT_ADDRESS || "",
    sellerAddress: process.env.SELLER_WALLET_ADDRESS || "0x0dFd63e8b357eD75D502bb42F6e4eC63E2D84761",
    buyerAddress: process.env.BUYER_WALLET_ADDRESS || "",
    buyerPrivateKey: process.env.BUYER_PRIVATE_KEY || "",
    // Multi-chain RPC URL mapping for automatic chain detection
    // Can be set via CHAIN_RPC_MAP env var as JSON: {"42101": "https://...", "1": "https://..."}
    // or comma-separated: "42101:https://...,1:https://..."
    chainRpcMap: parseChainRpcMap(),
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

