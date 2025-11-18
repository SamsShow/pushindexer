/**
 * Push Chain Token Registry
 * 
 * Based on Push Chain documentation: https://push.org/docs/chain/setup/chain-config/
 * 
 * Push Chain supports cross-chain payments via Universal Signer, allowing users
 * to pay from their native chains (Solana, Ethereum, etc.) without needing wrapped tokens.
 * 
 * For ERC20 token payments on Push Chain itself, token contract addresses are listed here.
 */

/**
 * Supported chain information for Push Chain
 */
export interface SupportedChain {
  name: string;
  namespace: string;
  chainId?: number;
  gatewayAddress?: string;
  rpcUrl?: string;
}

/**
 * Token information for Push Chain
 */
export interface TokenInfo {
  name: string;
  symbol: string;
  address: string; // Token contract address on Push Chain (if applicable)
  chain: string; // Source chain name
  namespace?: string; // Chain namespace (eip155:chainId or solana:...)
  gatewayAddress?: string; // Universal Gateway contract address
  decimals?: number;
}

/**
 * Push Chain Donut Testnet Chain Configuration
 * Source: https://push.org/docs/chain/setup/chain-config/
 */
export const PUSH_CHAIN_DONUT_TESTNET: SupportedChain = {
  name: 'Push Chain Donut Testnet',
  namespace: 'eip155:42101',
  chainId: 42101,
  rpcUrl: 'https://evm.donut.rpc.push.org/',
};

/**
 * Supported chains for cross-chain payments via Universal Signer
 * Source: https://push.org/docs/chain/setup/chain-config/
 */
export const SUPPORTED_CHAINS: Record<string, SupportedChain> = {
  'push-testnet': PUSH_CHAIN_DONUT_TESTNET,
  'ethereum-sepolia': {
    name: 'Ethereum Sepolia Testnet',
    namespace: 'eip155:11155111',
    chainId: 11155111,
    gatewayAddress: '0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A',
  },
  'solana-devnet': {
    name: 'Solana Devnet',
    namespace: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    gatewayAddress: 'CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS',
  },
};

/**
 * Supported tokens for payments on Push Chain
 * 
 * Note: For cross-chain payments via Universal Signer, users can pay directly
 * from their native chains (Solana, Ethereum, etc.) without needing these addresses.
 * 
 * These addresses are for ERC20 token payments ON Push Chain itself.
 * Token addresses should be verified on Push Chain explorer: https://donut.push.network
 */
export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    name: 'Push Chain Native Token',
    symbol: 'PC',
    address: '0x0000000000000000000000000000000000000000', // Native token, no address needed
    chain: 'Push Chain',
    namespace: 'eip155:42101',
    decimals: 18,
  },
  {
    name: 'Solana (SOL)',
    symbol: 'SOL',
    address: '0x0000000000000000000000000000000000000000', // TODO: Find wrapped SOL address on Push Chain
    chain: 'Solana Devnet',
    namespace: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    gatewayAddress: 'CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS',
    decimals: 9, // Solana uses 9 decimals
  },
  {
    name: 'Ethereum (ETH)',
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000', // TODO: Find wrapped ETH address on Push Chain
    chain: 'Ethereum Sepolia',
    namespace: 'eip155:11155111',
    gatewayAddress: '0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A',
    decimals: 18,
  },
  {
    name: 'USDC',
    symbol: 'USDC',
    address: '0x0000000000000000000000000000000000000000', // TODO: Find USDC address on Push Chain
    chain: 'Multi-chain',
    decimals: 6, // USDC uses 6 decimals
  },
];

/**
 * Get token information by symbol
 */
export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS.find(token => token.symbol.toUpperCase() === symbol.toUpperCase());
}

/**
 * Get token information by address
 */
export function getTokenByAddress(address: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get all supported tokens
 */
export function getSupportedTokens(): TokenInfo[] {
  return [...SUPPORTED_TOKENS];
}

/**
 * Get supported chains
 */
export function getSupportedChains(): Record<string, SupportedChain> {
  return { ...SUPPORTED_CHAINS };
}

/**
 * Get chain information by namespace
 */
export function getChainByNamespace(namespace: string): SupportedChain | undefined {
  return Object.values(SUPPORTED_CHAINS).find(chain => chain.namespace === namespace);
}


