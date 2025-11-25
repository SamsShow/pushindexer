import { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';

/**
 * Wallet provider interface (compatible with ethers.js providers)
 * This is a minimal interface that works with ethers BrowserProvider, JsonRpcProvider, etc.
 */
interface WalletProvider {
    getSigner?: () => Promise<any>;
    getNetwork?: () => Promise<{
        chainId: bigint | number | string;
    }>;
    [key: string]: any;
}
/**
 * Viem wallet client interface
 * Compatible with viem's WalletClient for browser and server-side use
 */
interface ViemWalletClient {
    account?: {
        address: string;
    };
    signMessage?: (args: any) => Promise<string>;
    sendTransaction?: (args: any) => Promise<string>;
    [key: string]: any;
}
/**
 * Solana keypair interface
 * Compatible with @solana/web3.js Keypair
 */
interface SolanaKeypair {
    publicKey: {
        toBase58: () => string;
    };
    secretKey: Uint8Array;
}
/**
 * Universal Signer type from @pushchain/core
 * This is a placeholder type - actual type would come from @pushchain/core if available
 */
type UniversalSigner = any;
/**
 * Push Chain Client type from @pushchain/core
 * Initialized via PushChain.initialize() and provides universal.sendTransaction()
 */
type PushChainClient = any;
/**
 * Push Network type for specifying testnet or mainnet
 */
type PushNetwork = 'testnet' | 'mainnet';
/**
 * Network preset type
 */
type NetworkPreset$1 = 'push-testnet' | 'push-mainnet';
/**
 * Payment requirements from a 402 response
 */
interface PaymentRequirements {
    scheme?: string;
    amount?: string;
    maxAmountRequired?: string;
    currency?: string;
    asset?: string;
    token?: string;
    recipient?: string;
    payTo?: string;
    facilitator?: string;
    network?: string;
    chainId?: string | number;
    rpcUrl?: string;
    [key: string]: any;
}
/**
 * Chain detection result from payment requirements
 */
interface ChainInfo {
    chainId: string | number;
    rpcUrl: string;
    network?: string;
}
/**
 * Payment proof created after processing payment
 */
interface PaymentProof {
    scheme: string;
    amount: string;
    currency: string;
    recipient: string;
    facilitator: string;
    network: string;
    chainId: string | number;
    txHash: string;
    timestamp: number;
    token?: string;
}
/**
 * Configuration for creating an x402 client
 */
interface X402ClientConfig {
    /**
     * Optional: Base URL for API calls
     * If not provided, use full URLs in requests
     */
    baseURL?: string;
    /**
     * Optional: Custom axios request config
     * Merged with default axios instance config
     */
    axiosConfig?: AxiosRequestConfig;
    /**
     * Optional: Callback for payment status updates
     * Called with status messages during payment processing
     */
    onPaymentStatus?: (status: string) => void;
    /**
     * Optional: Custom payment endpoint for server-side processing
     * If not provided, SDK will use direct facilitator contract calls (walletProvider/privateKey/universalSigner)
     * Only use this if you have your own payment processing server
     *
     * @example
     * ```typescript
     * // Use your own server endpoint
     * const client = createX402Client({
     *   paymentEndpoint: 'https://your-server.com/api/payment/process'
     * });
     * ```
     */
    paymentEndpoint?: string;
    /**
     * Optional: Facilitator contract address
     * Default: 0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7
     */
    facilitatorAddress?: string;
    /**
     * Optional: Chain ID
     * Default: 42101 (Push Chain testnet)
     */
    chainId?: number | string;
    /**
     * Optional: Buyer's private key for seamless transactions (agents/server-side)
     * ⚠️ WARNING: Only use this in secure environments (server-side).
     * Never expose private keys in client-side code or public repositories.
     * If provided, transactions will be signed automatically without manual approval.
     * Use this for automated agents and server-side applications.
     */
    privateKey?: string;
    /**
     * Optional: Network preset ('push-testnet' or 'push-mainnet')
     * When provided, automatically sets facilitatorAddress, chainId, and pushChainRpcUrl
     * Can be overridden by explicit config values
     */
    network?: NetworkPreset$1;
    /**
     * Optional: Wallet provider for browser/client-side transactions
     * Accepts ethers.js providers (e.g., window.ethereum from MetaMask)
     * If provided, transactions will prompt user for approval in their wallet.
     * Use this for browser applications where users have wallet extensions.
     *
     * @example
     * ```typescript
     * // Browser with MetaMask
     * const provider = new ethers.BrowserProvider(window.ethereum);
     * const client = createX402Client({ walletProvider: provider });
     * ```
     */
    walletProvider?: WalletProvider;
    /**
     * Optional: Universal Signer from Push Chain SDK
     * If provided, enables multi-chain transactions across all Push Chain supported networks.
     * Takes priority over walletProvider/privateKey for cross-chain support.
     *
     * @example
     * ```typescript
     * import { PushChain } from '@pushchain/core';
     * const universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);
     * const client = createX402Client({ universalSigner });
     * ```
     */
    universalSigner?: UniversalSigner;
    /**
     * Optional: Viem wallet client for browser/client-side transactions
     * Accepts viem WalletClient for Viem-based applications
     *
     * @example
     * ```typescript
     * import { createWalletClient, http } from 'viem';
     * import { privateKeyToAccount } from 'viem/accounts';
     * const account = privateKeyToAccount(privateKey);
     * const viemClient = createWalletClient({ account, transport: http(rpcUrl) });
     * const client = createX402Client({ viemClient });
     * ```
     */
    viemClient?: ViemWalletClient;
    /**
     * Optional: Solana keypair for Solana-based transactions
     * Accepts @solana/web3.js Keypair for Solana chain support
     *
     * @example
     * ```typescript
     * import { Keypair } from '@solana/web3.js';
     * const keypair = Keypair.generate();
     * const client = createX402Client({ solanaKeypair: keypair });
     * ```
     */
    solanaKeypair?: SolanaKeypair;
    /**
     * Optional: Push Network to use ('testnet' or 'mainnet')
     * Default: 'testnet'
     * Used when initializing Push Chain Client for Universal Transactions
     */
    pushNetwork?: PushNetwork;
    /**
     * Optional: Enable debug mode for detailed logging
     * When enabled, logs all payment flow steps, timing information, and transaction details
     */
    debug?: boolean;
    /**
     * Optional: Push Chain RPC URL for Universal Signer chain detection
     * If not provided, will auto-detect from payment requirements or use default Push Chain testnet RPC
     * The RPC URL determines which chain the Universal Signer operates on
     */
    pushChainRpcUrl?: string;
    /**
     * Optional: Mapping of chain IDs to RPC URLs for multi-chain support
     * Used for automatic chain detection from payment requirements
     * Format: { [chainId: string]: rpcUrl: string }
     *
     * @example
     * ```typescript
     * {
     *   '42101': 'https://evm.rpc-testnet-donut-node1.push.org/',
     *   '1': 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
     *   '137': 'https://polygon-rpc.com'
     * }
     * ```
     */
    chainRpcMap?: Record<string | number, string>;
}
/**
 * Payment processor response
 */
interface PaymentProcessorResponse {
    success: boolean;
    txHash: string;
    recipient: string;
    amount: string;
    chainId: string;
    blockNumber?: number;
}
/**
 * Error codes for x402 payment processing
 */
declare enum X402ErrorCode {
    PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    INVALID_PAYMENT_REQUIREMENTS = "INVALID_PAYMENT_REQUIREMENTS",
    PAYMENT_METHOD_NOT_AVAILABLE = "PAYMENT_METHOD_NOT_AVAILABLE",
    TRANSACTION_FAILED = "TRANSACTION_FAILED",
    NETWORK_ERROR = "NETWORK_ERROR",
    MAX_RETRIES_EXCEEDED = "MAX_RETRIES_EXCEEDED",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
/**
 * Enhanced error class for x402 payment processing
 */
declare class X402Error extends Error {
    readonly code: X402ErrorCode;
    readonly details?: any;
    response?: any;
    request?: any;
    constructor(message: string, code?: X402ErrorCode, details?: any);
    /**
     * Create X402Error from an existing error
     */
    static fromError(error: any, code?: X402ErrorCode): X402Error;
}
/**
 * Typed response wrapper for x402 requests
 * Extends AxiosResponse with payment-specific fields
 */
interface X402Response<T = any> extends AxiosResponse<T> {
    /**
     * Payment proof if payment was processed during this request
     */
    paymentProof?: PaymentProof;
    /**
     * Whether payment was required and processed
     */
    paymentProcessed?: boolean;
}

/**
 * Creates an axios instance with x402 payment interceptor
 * Automatically handles 402 Payment Required responses
 *
 * This is a drop-in replacement for axios - use it exactly like axios!
 *
 * @param config - Optional configuration for the x402 client
 * @returns Configured axios instance with payment interceptor
 *
 * @example
 * ```typescript
 * // Simplest usage - just use it like axios!
 * const client = createX402Client();
 * const response = await client.get('https://api.example.com/protected/resource');
 *
 * // With base URL
 * const client = createX402Client({
 *   baseURL: 'https://api.example.com',
 * });
 * const response = await client.get('/protected/resource');
 *
 * // With payment status callback
 * const client = createX402Client({
 *   onPaymentStatus: (status) => console.log(status),
 * });
 * ```
 */
declare function createX402Client(config?: X402ClientConfig): AxiosInstance;

/**
 * Network preset configurations
 */
type NetworkPreset = 'push-testnet' | 'push-mainnet';
/**
 * Get preset configuration for a network
 * @param network - Network preset name ('push-testnet' or 'push-mainnet')
 * @returns Partial configuration object with network-specific values
 */
declare function getPresetConfig(network: NetworkPreset): Partial<X402ClientConfig>;

/**
 * Builder class for creating x402 clients with a fluent API
 *
 * @example
 * ```typescript
 * const client = X402ClientBuilder
 *   .forTestnet()
 *   .withWallet(walletProvider)
 *   .withStatusCallback((status) => console.log(status))
 *   .build();
 * ```
 */
declare class X402ClientBuilder {
    private config;
    /**
     * Create a builder instance for Push Chain testnet
     */
    static forTestnet(): X402ClientBuilder;
    /**
     * Create a builder instance for Push Chain mainnet
     */
    static forMainnet(): X402ClientBuilder;
    /**
     * Create a builder instance with custom network preset
     */
    static forNetwork(network: NetworkPreset): X402ClientBuilder;
    /**
     * Create a builder instance with custom configuration
     */
    static withConfig(config: Partial<X402ClientConfig>): X402ClientBuilder;
    /**
     * Set wallet provider for browser/client-side transactions
     */
    withWallet(walletProvider: any): X402ClientBuilder;
    /**
     * Set private key for server-side/agent transactions
     * ⚠️ WARNING: Only use in secure server-side environments!
     */
    withPrivateKey(privateKey: string): X402ClientBuilder;
    /**
     * Set Universal Signer for multi-chain support
     */
    withUniversalSigner(universalSigner: any): X402ClientBuilder;
    /**
     * Set Viem wallet client for Viem-based applications
     */
    withViemClient(viemClient: any): X402ClientBuilder;
    /**
     * Set Solana keypair for Solana-based transactions
     */
    withSolanaKeypair(keypair: any): X402ClientBuilder;
    /**
     * Set Push Network ('testnet' or 'mainnet')
     */
    withPushNetwork(network: 'testnet' | 'mainnet'): X402ClientBuilder;
    /**
     * Set payment status callback
     */
    withStatusCallback(callback: (status: string) => void): X402ClientBuilder;
    /**
     * Set base URL for API calls
     */
    withBaseURL(baseURL: string): X402ClientBuilder;
    /**
     * Set facilitator contract address
     */
    withFacilitatorAddress(address: string): X402ClientBuilder;
    /**
     * Set chain ID
     */
    withChainId(chainId: number | string): X402ClientBuilder;
    /**
     * Set Push Chain RPC URL
     */
    withRpcUrl(rpcUrl: string): X402ClientBuilder;
    /**
     * Set chain RPC mapping for multi-chain support
     */
    withChainRpcMap(chainRpcMap: Record<string | number, string>): X402ClientBuilder;
    /**
     * Set custom payment endpoint
     */
    withPaymentEndpoint(endpoint: string): X402ClientBuilder;
    /**
     * Enable debug mode for detailed logging
     */
    withDebug(enabled?: boolean): X402ClientBuilder;
    /**
     * Set custom axios configuration
     */
    withAxiosConfig(axiosConfig: X402ClientConfig['axiosConfig']): X402ClientBuilder;
    /**
     * Build and return the configured x402 client
     * The createX402Client function will handle merging with defaults and env vars
     */
    build(): AxiosInstance;
}

/**
 * Default facilitator contract address
 */
declare const DEFAULT_FACILITATOR_ADDRESS = "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7";
/**
 * Default chain ID (Push Chain testnet)
 */
declare const DEFAULT_CHAIN_ID = 42101;
/**
 * Default Push Chain RPC URL
 * Source: https://push.org/docs/chain/setup/chain-config/
 */
declare const DEFAULT_PUSH_CHAIN_RPC = "https://evm.donut.rpc.push.org/";
/**
 * Default Push Network (testnet)
 */
declare const DEFAULT_PUSH_NETWORK: PushNetwork;
/**
 * Load configuration from environment variables
 * Returns a partial config object with values from env vars
 */
declare function loadConfigFromEnv(): Partial<X402ClientConfig>;
/**
 * Get default configuration values
 */
declare function getDefaultConfig(): Partial<X402ClientConfig>;
/**
 * Merge configuration with defaults and environment variables
 * Priority: userConfig > envVars > defaults
 */
declare function mergeConfig(userConfig?: X402ClientConfig): X402ClientConfig;
/**
 * Create a configuration object with sensible defaults
 * This is a convenience function that merges user config with defaults and env vars
 */
declare function createConfig(userConfig?: X402ClientConfig): X402ClientConfig;

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
interface SupportedChain {
    name: string;
    namespace: string;
    chainId?: number;
    gatewayAddress?: string;
    rpcUrl?: string;
}
/**
 * Token information for Push Chain
 */
interface TokenInfo {
    name: string;
    symbol: string;
    address: string;
    chain: string;
    sourceAddress?: string;
    namespace?: string;
    gatewayAddress?: string;
    decimals?: number;
}
/**
 * Push Chain Donut Testnet Chain Configuration
 * Source: https://push.org/docs/chain/setup/chain-config/
 */
declare const PUSH_CHAIN_DONUT_TESTNET: SupportedChain;
/**
 * Supported chains for cross-chain payments via Universal Transaction
 * Source: https://push.org/docs/chain/setup/chain-config/
 */
declare const SUPPORTED_CHAINS: Record<string, SupportedChain>;
/**
 * PRC-20 Supported Tokens on Push Chain
 * These are the wrapped versions of tokens from external chains
 *
 * Source: Push Chain official documentation
 */
declare const SUPPORTED_TOKENS: TokenInfo[];
/**
 * Get token information by symbol
 */
declare function getTokenBySymbol(symbol: string): TokenInfo | undefined;
/**
 * Get token information by address (Push Chain PRC-20 address)
 */
declare function getTokenByAddress(address: string): TokenInfo | undefined;
/**
 * Get all supported tokens
 */
declare function getSupportedTokens(): TokenInfo[];
/**
 * Get supported chains
 */
declare function getSupportedChains(): Record<string, SupportedChain>;
/**
 * Get chain information by namespace
 */
declare function getChainByNamespace(namespace: string): SupportedChain | undefined;
/**
 * Get tokens by source chain
 */
declare function getTokensByChain(chainName: string): TokenInfo[];

export { type ChainInfo, DEFAULT_CHAIN_ID, DEFAULT_FACILITATOR_ADDRESS, DEFAULT_PUSH_CHAIN_RPC, DEFAULT_PUSH_NETWORK, type NetworkPreset$1 as NetworkPreset, PUSH_CHAIN_DONUT_TESTNET, type PaymentProcessorResponse, type PaymentProof, type PaymentRequirements, type PushChainClient, type PushNetwork, SUPPORTED_CHAINS, SUPPORTED_TOKENS, type SolanaKeypair, type SupportedChain, type TokenInfo, type UniversalSigner, type ViemWalletClient, type WalletProvider, X402ClientBuilder, type X402ClientConfig, X402Error, X402ErrorCode, type X402Response, createConfig, createX402Client, getChainByNamespace, getDefaultConfig, getPresetConfig, getSupportedChains, getSupportedTokens, getTokenByAddress, getTokenBySymbol, getTokensByChain, loadConfigFromEnv, mergeConfig };
