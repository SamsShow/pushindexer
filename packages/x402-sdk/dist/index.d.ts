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
     * Endpoint URL for processing payments (server-side payment processor)
     */
    paymentEndpoint: string;
    /**
     * Facilitator contract address
     */
    facilitatorAddress?: string;
    /**
     * Chain ID (default: 42101 for Push Chain testnet)
     */
    chainId?: number | string;
    /**
     * Base URL for API calls (optional, defaults to current origin in browser)
     */
    baseURL?: string;
    /**
     * Custom axios request config
     */
    axiosConfig?: AxiosRequestConfig;
    /**
     * Callback for payment status updates (optional)
     */
    onPaymentStatus?: (status: string) => void;
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
 */
declare function createX402Client(config: X402ClientConfig): AxiosInstance;

export { type PaymentProcessorResponse, type PaymentProof, type PaymentRequirements, type X402ClientConfig, createX402Client };
