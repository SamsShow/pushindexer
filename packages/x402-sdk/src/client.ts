import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { PaymentRequirements, PaymentProof, PaymentProcessorResponse, X402ClientConfig } from './types';

/**
 * Creates an axios instance with x402 payment interceptor
 * Automatically handles 402 Payment Required responses
 */
export function createX402Client(config: X402ClientConfig): AxiosInstance {
  const {
    paymentEndpoint,
    facilitatorAddress,
    chainId = 42101,
    baseURL,
    axiosConfig = {},
    onPaymentStatus,
  } = config;

  // Create axios instance
  const axiosInstance = axios.create({
    baseURL,
    ...axiosConfig,
  });

  // Add response interceptor to handle 402 responses
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response, // Pass through successful responses
    async (error: AxiosError) => {
      // Check if it's a 402 Payment Required response
      if (error.response?.status === 402) {
        const paymentRequirements = error.response.data as PaymentRequirements;

        // Notify status callback if provided
        if (onPaymentStatus) {
          onPaymentStatus(`Payment required: ${paymentRequirements.amount || paymentRequirements.maxAmountRequired || 'unknown'} ${paymentRequirements.currency || paymentRequirements.asset || ''}`);
        }

        try {
          // Process payment via server-side endpoint
          if (onPaymentStatus) {
            onPaymentStatus('Processing payment on blockchain...');
          }

          const paymentResponse = await axios.post<PaymentProcessorResponse>(
            paymentEndpoint,
            {
              recipient: paymentRequirements.payTo || paymentRequirements.recipient,
              amount: paymentRequirements.maxAmountRequired || paymentRequirements.amount,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (!paymentResponse.data.success || !paymentResponse.data.txHash) {
            throw new Error('Payment processing failed: No transaction hash received');
          }

          const paymentResult = paymentResponse.data;

          // Create payment proof in x402 format
          const paymentProof: PaymentProof = {
            scheme: paymentRequirements.scheme || 'exact',
            amount: paymentRequirements.maxAmountRequired || paymentRequirements.amount || '0',
            currency: paymentRequirements.asset || paymentRequirements.currency || 'PUSH',
            recipient: paymentRequirements.payTo || paymentRequirements.recipient || '',
            facilitator: facilitatorAddress || paymentRequirements.facilitator || '',
            network: paymentRequirements.network || 'push',
            chainId: paymentRequirements.chainId || paymentResult.chainId || chainId,
            txHash: paymentResult.txHash,
            timestamp: Date.now(),
          };

          // Retry the original request with X-PAYMENT header
          const originalConfig = error.config as AxiosRequestConfig;
          if (!originalConfig) {
            throw new Error('Original request config not found');
          }

          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers['X-PAYMENT'] = JSON.stringify(paymentProof);

          // Retry the request with payment header
          return axiosInstance.request(originalConfig);
        } catch (paymentError: any) {
          if (onPaymentStatus) {
            onPaymentStatus(`Payment failed: ${paymentError.message || 'Unknown error'}`);
          }
          throw paymentError;
        }
      }

      // For non-402 errors, pass through
      return Promise.reject(error);
    }
  );

  return axiosInstance;
}

