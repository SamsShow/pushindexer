import type { X402ClientConfig, PushNetwork } from './types';

/**
 * Default facilitator contract address
 */
export const DEFAULT_FACILITATOR_ADDRESS = '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7';

/**
 * Default chain ID (Push Chain testnet)
 */
export const DEFAULT_CHAIN_ID = 42101;

/**
 * Default Push Chain RPC URL
 * Source: https://push.org/docs/chain/setup/chain-config/
 */
export const DEFAULT_PUSH_CHAIN_RPC = 'https://evm.donut.rpc.push.org/';

/**
 * Default Push Network (testnet)
 */
export const DEFAULT_PUSH_NETWORK: PushNetwork = 'testnet';

/**
 * Get environment variable value
 * Works in both Node.js and browser (via build-time process.env)
 */
function getEnvVar(key: string): string | undefined {
  // In Node.js, process.env is available
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  // In browser, some bundlers inject process.env at build time
  // Fallback to undefined if not available
  return undefined;
}

/**
 * Load configuration from environment variables
 * Returns a partial config object with values from env vars
 */
export function loadConfigFromEnv(): Partial<X402ClientConfig> {
  const config: Partial<X402ClientConfig> = {};

  // Load facilitator address from env
  const facilitatorAddress = getEnvVar('PUSH_X402_FACILITATOR_ADDRESS');
  if (facilitatorAddress) {
    config.facilitatorAddress = facilitatorAddress;
  }

  // Load chain ID from env
  const chainId = getEnvVar('PUSH_X402_CHAIN_ID');
  if (chainId) {
    const parsed = parseInt(chainId, 10);
    if (!isNaN(parsed)) {
      config.chainId = parsed;
    }
  }

  // Load RPC URL from env
  const rpcUrl = getEnvVar('PUSH_X402_RPC_URL');
  if (rpcUrl) {
    config.pushChainRpcUrl = rpcUrl;
  }

  // Load private key from env (server-side only)
  const privateKey = getEnvVar('PUSH_X402_PRIVATE_KEY');
  if (privateKey) {
    config.privateKey = privateKey;
  }

  // Load Push Network from env
  const pushNetwork = getEnvVar('PUSH_X402_NETWORK');
  if (pushNetwork === 'testnet' || pushNetwork === 'mainnet') {
    config.pushNetwork = pushNetwork;
  }

  return config;
}

/**
 * Get default configuration values
 */
export function getDefaultConfig(): Partial<X402ClientConfig> {
  return {
    facilitatorAddress: DEFAULT_FACILITATOR_ADDRESS,
    chainId: DEFAULT_CHAIN_ID,
    pushChainRpcUrl: DEFAULT_PUSH_CHAIN_RPC,
    pushNetwork: DEFAULT_PUSH_NETWORK,
  };
}

/**
 * Merge configuration with defaults and environment variables
 * Priority: userConfig > envVars > defaults
 */
export function mergeConfig(userConfig: X402ClientConfig = {}): X402ClientConfig {
  const defaults = getDefaultConfig();
  const envConfig = loadConfigFromEnv();

  // Merge in priority order: user config overrides env, env overrides defaults
  const merged: X402ClientConfig = {
    ...defaults,
    ...envConfig,
    ...userConfig,
  };

  // Auto-detect baseURL in browser environments if not provided
  if (!merged.baseURL) {
    try {
      // Check if we're in a browser environment
      const globalWindow = typeof globalThis !== 'undefined' ? (globalThis as any).window : undefined;
      if (globalWindow && globalWindow.location && globalWindow.location.origin) {
        merged.baseURL = globalWindow.location.origin;
      }
    } catch {
      // Not in browser environment, skip auto-detection
    }
  }

  return merged;
}

/**
 * Create a configuration object with sensible defaults
 * This is a convenience function that merges user config with defaults and env vars
 */
export function createConfig(userConfig: X402ClientConfig = {}): X402ClientConfig {
  return mergeConfig(userConfig);
}

