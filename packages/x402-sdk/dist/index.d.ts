import { AxiosRequestConfig, AxiosInstance } from 'axios';

/**
 * Payment requirements from a 402 response
 */
interface PaymentRequirements {
    scheme?: string;
    amount?: string;
    maxAmountRequired?: string;
    currency?: string;
    asset?: string;
    recipient?: string;
    payTo?: string;
    facilitator?: string;
    network?: string;
    chainId?: string | number;
    [key: string]: any;
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
     * Optional: Override public facilitator API endpoint
     * Default: https://pushindexer.vercel.app/api/payment/process
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
    walletProvider?: any;
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

export { type PaymentProcessorResponse, type PaymentProof, type PaymentRequirements, type X402ClientConfig, createX402Client };
