import type { X402ClientConfig } from './types';

/**
 * Network preset configurations
 */
export type NetworkPreset = 'push-testnet' | 'push-mainnet';

/**
 * Push Chain testnet configuration
 * Source: https://push.org/docs/chain/setup/chain-config/
 */
const PUSH_TESTNET_CONFIG: Partial<X402ClientConfig> = {
  facilitatorAddress: '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7',
  chainId: 42101,
  pushChainRpcUrl: 'https://evm.donut.rpc.push.org/',
};

/**
 * Push Chain mainnet configuration
 * Note: Update these values when mainnet is available
 */
const PUSH_MAINNET_CONFIG: Partial<X402ClientConfig> = {
  facilitatorAddress: '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7', // TODO: Update when mainnet is available
  chainId: 42101, // TODO: Update when mainnet is available
  pushChainRpcUrl: 'https://evm.rpc-testnet-donut-node1.push.org/', // TODO: Update when mainnet is available
};

/**
 * Get preset configuration for a network
 * @param network - Network preset name ('push-testnet' or 'push-mainnet')
 * @returns Partial configuration object with network-specific values
 */
export function getPresetConfig(network: NetworkPreset): Partial<X402ClientConfig> {
  switch (network) {
    case 'push-testnet':
      return { ...PUSH_TESTNET_CONFIG };
    case 'push-mainnet':
      return { ...PUSH_MAINNET_CONFIG };
    default:
      throw new Error(`Unknown network preset: ${network}. Supported presets: 'push-testnet', 'push-mainnet'`);
  }
}

