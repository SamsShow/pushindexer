import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { PaymentRequirements, PaymentProof, PaymentProcessorResponse, X402ClientConfig } from './types';

// Dynamic import for ethers (peer dependency)
// Users must install ethers if using walletProvider
let ethers: any;
try {
  // Try CommonJS require first
  if (typeof require !== 'undefined') {
    ethers = require('ethers');
  }
} catch {
  // ethers not available - will throw error if walletProvider is used
}

/**
 * Validates payment requirements from a 402 response
 */
function validatePaymentRequirements(requirements: any): PaymentRequirements {
  if (!requirements || typeof requirements !== 'object') {
    throw new Error('Invalid payment requirements: response data is not an object');
  }

  const recipient = requirements.payTo || requirements.recipient;
  const amount = requirements.maxAmountRequired || requirements.amount;

  if (!recipient || typeof recipient !== 'string') {
    throw new Error('Invalid payment requirements: recipient address is required');
  }

  if (!amount || (typeof amount !== 'string' && typeof amount !== 'number')) {
    throw new Error('Invalid payment requirements: amount is required');
  }

  return requirements as PaymentRequirements;
}

/**
 * Default public facilitator API endpoint
 */
const DEFAULT_PAYMENT_ENDPOINT = 'https://pushindexer.vercel.app/api/payment/process';
const DEFAULT_FACILITATOR_ADDRESS = '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7';
const DEFAULT_CHAIN_ID = 42101;

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
export function createX402Client(config: X402ClientConfig = {}): AxiosInstance {
  const {
    paymentEndpoint = DEFAULT_PAYMENT_ENDPOINT,
    facilitatorAddress = DEFAULT_FACILITATOR_ADDRESS,
    chainId = DEFAULT_CHAIN_ID,
    baseURL,
    axiosConfig = {},
    onPaymentStatus,
    privateKey,
    walletProvider,
  } = config;

  // Create axios instance
  const axiosInstance = axios.create({
    baseURL,
    ...axiosConfig,
  });

  // Track retry attempts to prevent infinite loops
  const retryAttempts = new WeakMap<AxiosRequestConfig, number>();
  const MAX_RETRIES = 1; // Only retry once per request

  // Add response interceptor to handle 402 responses
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response, // Pass through successful responses
    async (error: AxiosError) => {
      // Check if it's a 402 Payment Required response
      if (error.response?.status === 402) {
        const originalConfig = error.config as AxiosRequestConfig;
        
        // Prevent infinite retry loops
        if (originalConfig) {
          const attempts = retryAttempts.get(originalConfig) || 0;
          if (attempts >= MAX_RETRIES) {
            const errorMessage = 'Maximum retry attempts reached for payment processing';
            if (onPaymentStatus) {
              onPaymentStatus(`Error: ${errorMessage}`);
            }
            return Promise.reject(new Error(errorMessage));
          }
          retryAttempts.set(originalConfig, attempts + 1);
        }

        let paymentRequirements: PaymentRequirements;
        try {
          paymentRequirements = validatePaymentRequirements(error.response.data);
        } catch (validationError: any) {
          const errorMessage = `Invalid 402 response: ${validationError.message}`;
          if (onPaymentStatus) {
            onPaymentStatus(`Error: ${errorMessage}`);
          }
          return Promise.reject(new Error(errorMessage));
        }

        // Notify status callback if provided
        if (onPaymentStatus) {
          const amount = paymentRequirements.maxAmountRequired || paymentRequirements.amount || 'unknown';
          const currency = paymentRequirements.asset || paymentRequirements.currency || '';
          onPaymentStatus(`Payment required: ${amount} ${currency}`);
        }

        try {
          // Process payment
          if (onPaymentStatus) {
            onPaymentStatus('Processing payment on blockchain...');
          }

          const recipient = paymentRequirements.payTo || paymentRequirements.recipient;
          const amount = paymentRequirements.maxAmountRequired || paymentRequirements.amount;

          if (!recipient || !amount) {
            throw new Error('Missing recipient or amount in payment requirements');
          }

          let paymentResult: PaymentProcessorResponse;

          // Option 1: Use wallet provider (browser/client-side)
          if (walletProvider) {
            if (!ethers) {
              throw new Error('ethers.js is required when using walletProvider. Please install: npm install ethers');
            }

            if (onPaymentStatus) {
              onPaymentStatus('Waiting for wallet approval...');
            }

            // Sign transaction with wallet provider
            const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;
            const facilitatorAbi = [
              'function facilitateNativeTransfer(address recipient, uint256 amount) external payable',
            ];

            const signer = await walletProvider.getSigner();
            const contract = new ethers.Contract(facilitatorContractAddress, facilitatorAbi, signer);
            const amountWei = ethers.parseEther(amount.toString());

            // Estimate gas
            const gasEstimate = await contract.facilitateNativeTransfer.estimateGas(
              recipient,
              amountWei,
              { value: amountWei }
            );

            // Send transaction (will prompt user for approval)
            const tx = await contract.facilitateNativeTransfer(recipient, amountWei, {
              value: amountWei,
              gasLimit: gasEstimate,
            });

            if (onPaymentStatus) {
              onPaymentStatus('Transaction sent, waiting for confirmation...');
            }

            // Wait for transaction
            const receipt = await tx.wait();
            const network = await walletProvider.getNetwork();

            paymentResult = {
              success: true,
              txHash: tx.hash,
              recipient,
              amount: amount.toString(),
              chainId: network.chainId.toString(),
              blockNumber: receipt.blockNumber,
            };
          }
          // Option 2: Use private key (agents/server-side)
          else if (privateKey) {
            const paymentPayload: any = {
              recipient,
              amount,
              privateKey,
            };

            const paymentResponse = await axios.post<PaymentProcessorResponse>(
              paymentEndpoint,
              paymentPayload,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                timeout: 60000,
              }
            );

            if (!paymentResponse.data) {
              throw new Error('Payment processing failed: Empty response from payment endpoint');
            }

            if (!paymentResponse.data.success) {
              const errorMsg = paymentResponse.data.txHash 
                ? 'Payment processing failed: Transaction may have failed'
                : 'Payment processing failed: No transaction hash received';
              throw new Error(errorMsg);
            }

            if (!paymentResponse.data.txHash || typeof paymentResponse.data.txHash !== 'string') {
              throw new Error('Payment processing failed: Invalid transaction hash received');
            }

            paymentResult = paymentResponse.data;
          }
          // Option 3: Use public endpoint (requires server-side setup)
          else {
            const paymentPayload: any = {
              recipient,
              amount,
            };

            const paymentResponse = await axios.post<PaymentProcessorResponse>(
              paymentEndpoint,
              paymentPayload,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                timeout: 60000,
              }
            );

            if (!paymentResponse.data) {
              throw new Error('Payment processing failed: Empty response from payment endpoint. Make sure you have BUYER_PRIVATE_KEY set up server-side or provide privateKey/walletProvider in SDK config.');
            }

            if (!paymentResponse.data.success) {
              const errorMsg = paymentResponse.data.txHash 
                ? 'Payment processing failed: Transaction may have failed'
                : 'Payment processing failed: No transaction hash received';
              throw new Error(errorMsg);
            }

            if (!paymentResponse.data.txHash || typeof paymentResponse.data.txHash !== 'string') {
              throw new Error('Payment processing failed: Invalid transaction hash received');
            }

            paymentResult = paymentResponse.data;
          }

          // Create payment proof in x402 format
          const paymentProof: PaymentProof = {
            scheme: paymentRequirements.scheme || 'exact',
            amount: String(paymentRequirements.maxAmountRequired || paymentRequirements.amount || '0'),
            currency: paymentRequirements.asset || paymentRequirements.currency || 'PUSH',
            recipient: String(recipient),
            facilitator: facilitatorAddress || paymentRequirements.facilitator || '',
            network: paymentRequirements.network || 'push',
            chainId: paymentRequirements.chainId || paymentResult.chainId || chainId,
            txHash: paymentResult.txHash,
            timestamp: Date.now(),
          };

          // Retry the original request with X-PAYMENT header
          if (!originalConfig) {
            throw new Error('Original request config not found - cannot retry request');
          }

          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers['X-PAYMENT'] = JSON.stringify(paymentProof);

          if (onPaymentStatus) {
            onPaymentStatus('Retrying request with payment proof...');
          }

          // Retry the request with payment header
          return axiosInstance.request(originalConfig);
        } catch (paymentError: any) {
          const errorMessage = paymentError.response?.data?.message 
            || paymentError.message 
            || 'Unknown payment processing error';
          
          if (onPaymentStatus) {
            onPaymentStatus(`Payment failed: ${errorMessage}`);
          }
          
          // Create a more informative error
          const enhancedError = new Error(`x402 Payment Processing Failed: ${errorMessage}`);
          if (paymentError.response) {
            (enhancedError as any).response = paymentError.response;
          }
          if (paymentError.request) {
            (enhancedError as any).request = paymentError.request;
          }
          
          return Promise.reject(enhancedError);
        }
      }

      // For non-402 errors, pass through
      return Promise.reject(error);
    }
  );

  return axiosInstance;
}

