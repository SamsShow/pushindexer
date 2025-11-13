import type { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Payment requirements from a 402 response
 */
export interface PaymentRequirements {
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
export interface PaymentProof {
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
export interface X402ClientConfig {
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
}

/**
 * Payment processor response
 */
export interface PaymentProcessorResponse {
  success: boolean;
  txHash: string;
  recipient: string;
  amount: string;
  chainId: string;
  blockNumber?: number;
}

