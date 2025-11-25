/**
 * Push Chain Token Registry
 * 
 * Based on Push Chain documentation: https://push.org/docs/chain/setup/chain-config/
 * 
 * Push Chain supports cross-chain payments via Universal Transaction, allowing users
 * to pay from their native chains (Solana, Ethereum, Base, Arbitrum, BNB) without needing wrapped tokens.
 * 
 * PRC-20 tokens are the wrapped versions of tokens from external chains on Push Chain.
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
  address: string; // PRC-20 Token contract address on Push Chain
  chain: string; // Source chain name
  sourceAddress?: string; // Original token address on source chain
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
 * Supported chains for cross-chain payments via Universal Transaction
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
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia Testnet',
    namespace: 'eip155:421614',
    chainId: 421614,
    gatewayAddress: '0x2cd870e0166Ba458dEC615168Fd659AacD795f34',
  },
  'base-sepolia': {
    name: 'Base Sepolia Testnet',
    namespace: 'eip155:84532',
    chainId: 84532,
    gatewayAddress: '0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16',
  },
  'bnb-testnet': {
    name: 'BNB Testnet',
    namespace: 'eip155:97',
    chainId: 97,
    gatewayAddress: '0x44aFFC61983F4348DdddB886349eb992C061EaC0',
  },
  'solana-devnet': {
    name: 'Solana Devnet',
    namespace: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    gatewayAddress: 'CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS',
  },
};

/**
 * PRC-20 Supported Tokens on Push Chain
 * These are the wrapped versions of tokens from external chains
 * 
 * Source: Push Chain official documentation
 */
export const SUPPORTED_TOKENS: TokenInfo[] = [
  // ═══════════════════════════════════════════════════════════════
  // NATIVE TOKEN
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Push Chain Native Token',
    symbol: 'PC',
    address: '0x0000000000000000000000000000000000000000', // Native token
    chain: 'Push Chain',
    namespace: 'eip155:42101',
    decimals: 18,
  },

  // ═══════════════════════════════════════════════════════════════
  // ETHEREUM SEPOLIA TOKENS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Wrapped ETH (Ethereum Sepolia)',
    symbol: 'pETH',
    address: '0x2971824Db68229D087931155C2b8bB820B275809',
    chain: 'Ethereum Sepolia',
    sourceAddress: '0x0000000000000000000000000000000000000000',
    namespace: 'eip155:11155111',
    gatewayAddress: '0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A',
    decimals: 18,
  },
  {
    name: 'Wrapped ETH (WETH)',
    symbol: 'WETH.eth',
    address: '0x0d0dF7E8807430A81104EA84d926139816eC7586',
    chain: 'Ethereum Sepolia',
    sourceAddress: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    namespace: 'eip155:11155111',
    gatewayAddress: '0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A',
    decimals: 18,
  },
  {
    name: 'USDT (Ethereum Sepolia)',
    symbol: 'USDT.eth',
    address: '0xCA0C5E6F002A389E1580F0DB7cd06e4549B5F9d3',
    chain: 'Ethereum Sepolia',
    sourceAddress: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
    namespace: 'eip155:11155111',
    gatewayAddress: '0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A',
    decimals: 6,
  },
  {
    name: 'stETH (Ethereum Sepolia)',
    symbol: 'stETH.eth',
    address: '0xaf89E805949c628ebde3262e91dc4ab9eA12668E',
    chain: 'Ethereum Sepolia',
    sourceAddress: '0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af',
    namespace: 'eip155:11155111',
    gatewayAddress: '0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A',
    decimals: 18,
  },
  {
    name: 'USDC (Ethereum Sepolia)',
    symbol: 'USDC.eth',
    address: '0x387b9C8Db60E74999aAAC5A2b7825b400F12d68E',
    chain: 'Ethereum Sepolia',
    sourceAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    namespace: 'eip155:11155111',
    gatewayAddress: '0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A',
    decimals: 6,
  },

  // ═══════════════════════════════════════════════════════════════
  // SOLANA DEVNET TOKENS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Wrapped SOL (Solana Devnet)',
    symbol: 'pSOL',
    address: '0x5D525Df2bD99a6e7ec58b76aF2fd95F39874EBed',
    chain: 'Solana Devnet',
    namespace: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    gatewayAddress: 'CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS',
    decimals: 9,
  },
  {
    name: 'USDC (Solana Devnet)',
    symbol: 'USDC.sol',
    address: '0x04B8F634ABC7C879763F623e0f0550a4b5c4426F',
    chain: 'Solana Devnet',
    sourceAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    namespace: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    gatewayAddress: 'CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS',
    decimals: 6,
  },
  {
    name: 'USDT (Solana Devnet)',
    symbol: 'USDT.sol',
    address: '0x4f1A3D22d170a2F4Bddb37845a962322e24f4e34',
    chain: 'Solana Devnet',
    sourceAddress: 'EiXDnrAg9ea2Q6vEPV7E5TpTU1vh41jcuZqKjU5Dc4ZF',
    namespace: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    gatewayAddress: 'CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS',
    decimals: 6,
  },
  {
    name: 'DAI (Solana Devnet)',
    symbol: 'DAI.sol',
    address: '0x5861f56A556c990358cc9cccd8B5baa3767982A8',
    chain: 'Solana Devnet',
    sourceAddress: 'G2ZLaRhpohW23KTEX3fBjZXtNTFFwemqCaWWnWVTj4TB',
    namespace: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    gatewayAddress: 'CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS',
    decimals: 18,
  },

  // ═══════════════════════════════════════════════════════════════
  // BASE SEPOLIA TOKENS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Wrapped ETH (Base Sepolia)',
    symbol: 'pETH.base',
    address: '0xc7007af2B24D4eb963fc9633B0c66e1d2D90Fc21',
    chain: 'Base Sepolia',
    sourceAddress: '0x0000000000000000000000000000000000000000',
    namespace: 'eip155:84532',
    gatewayAddress: '0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16',
    decimals: 18,
  },
  {
    name: 'USDT (Base Sepolia)',
    symbol: 'USDT.base',
    address: '0x2C455189D2af6643B924A981a9080CcC63d5a567',
    chain: 'Base Sepolia',
    sourceAddress: '0x9FF5a186f53F6E6964B00320Da1D2024DE11E0cB',
    namespace: 'eip155:84532',
    gatewayAddress: '0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16',
    decimals: 6,
  },
  {
    name: 'USDC (Base Sepolia)',
    symbol: 'USDC.base',
    address: '0x84B62e44F667F692F7739Ca6040cD17DA02068A8',
    chain: 'Base Sepolia',
    sourceAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    namespace: 'eip155:84532',
    gatewayAddress: '0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16',
    decimals: 6,
  },

  // ═══════════════════════════════════════════════════════════════
  // ARBITRUM SEPOLIA TOKENS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Wrapped ETH (Arbitrum Sepolia)',
    symbol: 'pETH.arb',
    address: '0xc0a821a1AfEd1322c5e15f1F4586C0B8cE65400e',
    chain: 'Arbitrum Sepolia',
    sourceAddress: '0x0000000000000000000000000000000000000000',
    namespace: 'eip155:421614',
    gatewayAddress: '0x2cd870e0166Ba458dEC615168Fd659AacD795f34',
    decimals: 18,
  },
  {
    name: 'USDC (Arbitrum Sepolia)',
    symbol: 'USDC.arb',
    address: '0xa261A10e94aE4bA88EE8c5845CbE7266bD679DD6',
    chain: 'Arbitrum Sepolia',
    sourceAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    namespace: 'eip155:421614',
    gatewayAddress: '0x2cd870e0166Ba458dEC615168Fd659AacD795f34',
    decimals: 6,
  },
  {
    name: 'USDT (Arbitrum Sepolia)',
    symbol: 'USDT.arb',
    address: '0x76Ad08339dF606BeEDe06f90e3FaF82c5b2fb2E9',
    chain: 'Arbitrum Sepolia',
    sourceAddress: '0x1419d7C74D234fA6B73E06A2ce7822C1d37922f0',
    namespace: 'eip155:421614',
    gatewayAddress: '0x2cd870e0166Ba458dEC615168Fd659AacD795f34',
    decimals: 6,
  },

  // ═══════════════════════════════════════════════════════════════
  // BNB TESTNET TOKENS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Wrapped BNB (BNB Testnet)',
    symbol: 'pBNB',
    address: '0x7a9082dA308f3fa005beA7dB0d203b3b86664E36',
    chain: 'BNB Testnet',
    sourceAddress: '0x0000000000000000000000000000000000000000',
    namespace: 'eip155:97',
    gatewayAddress: '0x44aFFC61983F4348DdddB886349eb992C061EaC0',
    decimals: 18,
  },
  {
    name: 'USDT (BNB Testnet)',
    symbol: 'USDT.bnb',
    address: '0x2f98B4235FD2BA0173a2B056D722879360B12E7b',
    chain: 'BNB Testnet',
    sourceAddress: '0xBC14F348BC9667be46b35Edc9B68653d86013DC5',
    namespace: 'eip155:97',
    gatewayAddress: '0x44aFFC61983F4348DdddB886349eb992C061EaC0',
    decimals: 6,
  },
];

/**
 * Get token information by symbol
 */
export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS.find(token => token.symbol.toUpperCase() === symbol.toUpperCase());
}

/**
 * Get token information by address (Push Chain PRC-20 address)
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

/**
 * Get tokens by source chain
 */
export function getTokensByChain(chainName: string): TokenInfo[] {
  return SUPPORTED_TOKENS.filter(token => 
    token.chain.toLowerCase().includes(chainName.toLowerCase())
  );
}
