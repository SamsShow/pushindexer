import type { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Wallet provider interface (compatible with ethers.js providers)
 * This is a minimal interface that works with ethers BrowserProvider, JsonRpcProvider, etc.
 */
export interface WalletProvider {
  getSigner?: () => Promise<any>;
  getNetwork?: () => Promise<{ chainId: bigint | number | string }>;
  [key: string]: any;
}

/**
 * Universal Signer type from @pushchain/core
 * This is a placeholder type - actual type would come from @pushchain/core if available
 */
export type UniversalSigner = any;

/**
 * Network preset type
 */
export type NetworkPreset = 'push-testnet' | 'push-mainnet';

/**
 * Payment requirements from a 402 response
 */
export interface PaymentRequirements {
  scheme?: string;
  amount?: string;
  maxAmountRequired?: string;
  currency?: string;
  asset?: string;
  token?: string; // ERC20 token contract address (if token payment)
  recipient?: string;
  payTo?: string;
  facilitator?: string;
  network?: string;
  chainId?: string | number;
  rpcUrl?: string; // Optional RPC URL for the target chain
  [key: string]: any;
}

/**
 * Chain detection result from payment requirements
 */
export interface ChainInfo {
  chainId: string | number;
  rpcUrl: string;
  network?: string;
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
  token?: string; // ERC20 token contract address (if token payment)
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
  network?: NetworkPreset;

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
export interface PaymentProcessorResponse {
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
export enum X402ErrorCode {
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVALID_PAYMENT_REQUIREMENTS = 'INVALID_PAYMENT_REQUIREMENTS',
  PAYMENT_METHOD_NOT_AVAILABLE = 'PAYMENT_METHOD_NOT_AVAILABLE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Enhanced error class for x402 payment processing
 */
export class X402Error extends Error {
  public readonly code: X402ErrorCode;
  public readonly details?: any;
  public response?: any;
  public request?: any;

  constructor(
    message: string,
    code: X402ErrorCode = X402ErrorCode.UNKNOWN_ERROR,
    details?: any
  ) {
    super(message);
    this.name = 'X402Error';
    this.code = code;
    this.details = details;
    
    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, X402Error);
    }
  }

  /**
   * Create X402Error from an existing error
   */
  static fromError(error: any, code?: X402ErrorCode): X402Error {
    if (error instanceof X402Error) {
      return error;
    }

    const x402Error = new X402Error(
      error.message || 'Unknown error occurred',
      code || X402ErrorCode.UNKNOWN_ERROR,
      error
    );

    if (error.response) {
      x402Error.response = error.response;
    }
    if (error.request) {
      x402Error.request = error.request;
    }

    return x402Error;
  }
}

/**
 * Typed response wrapper for x402 requests
 * Extends AxiosResponse with payment-specific fields
 */
export interface X402Response<T = any> extends AxiosResponse<T> {
  /**
   * Payment proof if payment was processed during this request
   */
  paymentProof?: PaymentProof;
  
  /**
   * Whether payment was required and processed
   */
  paymentProcessed?: boolean;
}

