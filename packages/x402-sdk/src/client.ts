import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { PaymentRequirements, PaymentProof, PaymentProcessorResponse, X402ClientConfig, ChainInfo } from './types';

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

// Dynamic import for Push Chain SDK (peer dependency)
// Users must install @pushchain/core if using Universal Signer
let PushChain: any;
try {
  if (typeof require !== 'undefined') {
    PushChain = require('@pushchain/core');
  }
} catch {
  // Push Chain SDK not available - will fallback to ethers.js
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
 * Can be overridden via config.paymentEndpoint
 */
const DEFAULT_PAYMENT_ENDPOINT = 'https://pushindexer.vercel.app/api/payment/process';
const DEFAULT_FACILITATOR_ADDRESS = '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7';
const DEFAULT_CHAIN_ID = 42101;
const DEFAULT_PUSH_CHAIN_RPC = 'https://evm.rpc-testnet-donut-node1.push.org/';

/**
 * Detects chain information from payment requirements
 * Priority: paymentRequirements.rpcUrl → paymentRequirements.chainId → config → default
 */
function detectChainInfo(
  paymentRequirements: PaymentRequirements,
  config: X402ClientConfig
): ChainInfo {
  // Priority 1: RPC URL directly from payment requirements
  if (paymentRequirements.rpcUrl) {
    return {
      chainId: paymentRequirements.chainId || DEFAULT_CHAIN_ID,
      rpcUrl: paymentRequirements.rpcUrl,
      network: paymentRequirements.network,
    };
  }

  // Priority 2: Chain ID from payment requirements + chainRpcMap
  if (paymentRequirements.chainId && config.chainRpcMap) {
    const chainIdStr = String(paymentRequirements.chainId);
    const rpcUrl = config.chainRpcMap[chainIdStr] || config.chainRpcMap[paymentRequirements.chainId];
    if (rpcUrl) {
      return {
        chainId: paymentRequirements.chainId,
        rpcUrl,
        network: paymentRequirements.network,
      };
    }
  }

  // Priority 3: Config pushChainRpcUrl
  if (config.pushChainRpcUrl) {
    return {
      chainId: paymentRequirements.chainId || config.chainId || DEFAULT_CHAIN_ID,
      rpcUrl: config.pushChainRpcUrl,
      network: paymentRequirements.network,
    };
  }

  // Priority 4: Chain ID from payment requirements (use default Push Chain RPC)
  if (paymentRequirements.chainId) {
    return {
      chainId: paymentRequirements.chainId,
      rpcUrl: DEFAULT_PUSH_CHAIN_RPC,
      network: paymentRequirements.network,
    };
  }

  // Priority 5: Config chainId
  if (config.chainId) {
    return {
      chainId: config.chainId,
      rpcUrl: DEFAULT_PUSH_CHAIN_RPC,
      network: paymentRequirements.network,
    };
  }

  // Default: Push Chain testnet
  return {
    chainId: DEFAULT_CHAIN_ID,
    rpcUrl: DEFAULT_PUSH_CHAIN_RPC,
    network: 'push',
  };
}

/**
 * Creates a Universal Signer from ethers signer if Push Chain SDK is available
 */
async function createUniversalSignerFromEthers(
  ethersSigner: any,
  rpcUrl: string
): Promise<any | null> {
  if (!PushChain || !PushChain.utils || !PushChain.utils.signer) {
    return null;
  }

  try {
    // Create Universal Signer from ethers signer
    const universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);
    return universalSigner;
  } catch (error) {
    console.warn('Failed to create Universal Signer, falling back to ethers.js:', error);
    return null;
  }
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
    universalSigner: providedUniversalSigner,
    pushChainRpcUrl,
    chainRpcMap,
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

          // Detect chain information from payment requirements
          const chainInfo = detectChainInfo(paymentRequirements, config);

          let paymentResult: PaymentProcessorResponse | undefined;

          // Option 1: Use Universal Signer (multi-chain support, highest priority)
          // Universal Signer is a core component for Push Chain - try to use it when available
          if (providedUniversalSigner || (PushChain && PushChain.utils && PushChain.utils.signer && (walletProvider || privateKey))) {
            try {
              if (onPaymentStatus) {
                onPaymentStatus('Using Universal Signer for multi-chain transaction...');
              }

              let universalSigner = providedUniversalSigner;
              
              // Create Universal Signer from walletProvider if not provided
              if (!universalSigner && walletProvider && ethers && PushChain && PushChain.utils && PushChain.utils.signer) {
                if (onPaymentStatus) {
                  onPaymentStatus('Creating Universal Signer from wallet provider...');
                }
                // Get signer from wallet provider
                // Note: Universal Signer will use the provider's RPC, so we need to ensure
                // the wallet provider is connected to the correct chain
                const chainSigner = await walletProvider.getSigner();
                universalSigner = await PushChain.utils.signer.toUniversal(chainSigner);
              }
              
              // Create Universal Signer from privateKey if not provided
              if (!universalSigner && privateKey && ethers && PushChain && PushChain.utils && PushChain.utils.signer) {
                if (onPaymentStatus) {
                  onPaymentStatus('Creating Universal Signer from private key...');
                }
                const provider = new ethers.JsonRpcProvider(chainInfo.rpcUrl);
                const ethersSigner = new ethers.Wallet(privateKey, provider);
                universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);
              }

              if (!universalSigner) {
                throw new Error('Failed to create Universal Signer');
              }

              // Use Universal Signer for cross-chain support
              // Universal Signer wraps ethers signers and provides a unified interface
              // When wrapping ethers signers, we can access the underlying signer's sendTransaction
              const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;
              const amountWei = ethers ? ethers.parseEther(amount.toString()) : BigInt(Number(amount) * 1e18);

              // Prepare transaction data
              const facilitatorAbi = [
                'function facilitateNativeTransfer(address recipient, uint256 amount) external payable',
              ];
              
              // Encode function call
              const iface = ethers ? new ethers.Interface(facilitatorAbi) : null;
              const data = iface ? iface.encodeFunctionData('facilitateNativeTransfer', [recipient, amountWei]) : '0x';

              // Universal Signer wraps ethers signers
              // When wrapping ethers signers, Universal Signer should handle sendTransaction internally
              // However, signAndSendTransaction expects Uint8Array, so we need to use the underlying signer
              // Try to access the original ethers signer that was wrapped
              let txResult;
              
              // Check if Universal Signer exposes sendTransaction (some implementations do)
              if (typeof universalSigner.sendTransaction === 'function') {
                const txRequest = {
                  to: facilitatorContractAddress,
                  value: amountWei,
                  data: data,
                };
                txResult = await universalSigner.sendTransaction(txRequest);
              } else if (walletProvider && ethers) {
                // If Universal Signer doesn't expose sendTransaction, use the original walletProvider
                // This maintains Universal Signer's chain detection benefits while using ethers directly
                // Universal Signer is still used for multi-chain support and chain detection
                if (onPaymentStatus) {
                  onPaymentStatus('Universal Signer: Using underlying wallet provider for transaction...');
                }
                const signer = await walletProvider.getSigner();
                const contract = new ethers.Contract(facilitatorContractAddress, facilitatorAbi, signer);
                
                // Estimate gas
                const gasEstimate = await contract.facilitateNativeTransfer.estimateGas(
                  recipient,
                  amountWei,
                  { value: amountWei }
                );

                // Send transaction
                const tx = await contract.facilitateNativeTransfer(recipient, amountWei, {
                  value: amountWei,
                  gasLimit: gasEstimate,
                });

                // Wait for transaction
                const receipt = await tx.wait();
                const network = await walletProvider.getNetwork();

                txResult = {
                  hash: tx.hash,
                  chainId: typeof network.chainId === 'bigint' ? network.chainId.toString() : network.chainId.toString(),
                  blockNumber: receipt.blockNumber,
                };
              } else if (privateKey && ethers) {
                // Use privateKey with Universal Signer's chain detection
                if (onPaymentStatus) {
                  onPaymentStatus('Using private key with Universal Signer chain detection...');
                }
                const provider = new ethers.JsonRpcProvider(chainInfo.rpcUrl);
                const ethersSigner = new ethers.Wallet(privateKey, provider);
                const contract = new ethers.Contract(facilitatorContractAddress, facilitatorAbi, ethersSigner);
                
                const gasEstimate = await contract.facilitateNativeTransfer.estimateGas(
                  recipient,
                  amountWei,
                  { value: amountWei }
                );

                const tx = await contract.facilitateNativeTransfer(recipient, amountWei, {
                  value: amountWei,
                  gasLimit: gasEstimate,
                });

                const receipt = await tx.wait();
                const network = await provider.getNetwork();

                txResult = {
                  hash: tx.hash,
                  chainId: typeof network.chainId === 'bigint' ? network.chainId.toString() : network.chainId.toString(),
                  blockNumber: receipt.blockNumber,
                };
              } else {
                throw new Error('Cannot use Universal Signer without walletProvider or privateKey');
              }

              if (onPaymentStatus) {
                onPaymentStatus('Transaction sent, waiting for confirmation...');
              }

              // Wait for transaction confirmation
              // Universal Signer returns transaction hash, we may need to wait for it
              const txHash = typeof txResult === 'string' ? txResult : (txResult?.hash || txResult?.txHash || String(txResult));

              if (!txHash || txHash === '[object Object]') {
                throw new Error('Invalid transaction result from Universal Signer');
              }

              // Get network info from Universal Signer account
              const accountChainId = universalSigner.account?.chain || chainInfo.chainId;
              const resolvedChainId = typeof accountChainId === 'string' 
                ? accountChainId.split(':')[1] || accountChainId 
                : accountChainId;

              paymentResult = {
                success: true,
                txHash: String(txHash),
                recipient,
                amount: amount.toString(),
                chainId: String(resolvedChainId || chainInfo.chainId),
              };
            } catch (universalError: any) {
              // Check if this is the known BytesLike error - indicates Universal Signer incompatibility
              const isBytesLikeError = universalError.message?.includes('invalid BytesLike value') || 
                                       universalError.code === 'INVALID_ARGUMENT';
              
              if (isBytesLikeError) {
                console.warn('Universal Signer incompatible with current ethers.js version. Skipping Universal Signer.');
                if (onPaymentStatus) {
                  onPaymentStatus('Universal Signer incompatible. Using ethers.js fallback...');
                }
              } else {
                console.warn('Universal Signer failed, falling back to ethers.js:', universalError);
                if (onPaymentStatus) {
                  onPaymentStatus(`Universal Signer failed: ${universalError.message}. Using fallback...`);
                }
              }
              // Continue to ethers.js fallback below - don't throw, let it fall through
              paymentResult = undefined;
            }
          }

          // Option 2: Use wallet provider (browser/client-side) - fallback if Universal Signer not available
          if (!paymentResult && walletProvider) {
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

            // Get signer from wallet provider
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
              chainId: typeof network.chainId === 'bigint' ? network.chainId.toString() : network.chainId.toString(),
              blockNumber: receipt.blockNumber,
            };
          }
          // Option 3: Use private key (agents/server-side) - fallback if Universal Signer not available
          if (!paymentResult && privateKey) {
            // Use baseURL if available, otherwise use paymentEndpoint
            // Ensure no double slashes in URL
            const baseUrlClean = baseURL?.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
            const endpointUrl = baseURL 
              ? `${baseUrlClean}/api/payment/process`
              : paymentEndpoint;

            const paymentPayload: any = {
              recipient,
              amount,
              privateKey,
            };

            // Enhanced logging for debugging
            console.log('[x402-sdk] Making payment request with privateKey:', {
              method: 'POST',
              url: endpointUrl,
              payload: { ...paymentPayload, privateKey: '[REDACTED]' },
            });

            const paymentResponse = await axios.post<PaymentProcessorResponse>(
              endpointUrl,
              paymentPayload,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                timeout: 60000,
                withCredentials: false,
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
          // Option 4: Use public endpoint (requires server-side setup)
          if (!paymentResult) {
            // Use baseURL if available, otherwise use paymentEndpoint
            // Ensure no double slashes in URL
            const baseUrlClean = baseURL?.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
            const endpointUrl = baseURL 
              ? `${baseUrlClean}/api/payment/process`
              : paymentEndpoint;

            const paymentPayload: any = {
              recipient,
              amount,
              chainId: chainInfo.chainId,
              rpcUrl: chainInfo.rpcUrl,
            };

            // Enhanced logging for debugging
            console.log('[x402-sdk] Making payment request:', {
              method: 'POST',
              url: endpointUrl,
              payload: { ...paymentPayload, rpcUrl: paymentPayload.rpcUrl ? '[REDACTED]' : undefined },
            });

            const paymentResponse = await axios.post<PaymentProcessorResponse>(
              endpointUrl,
              paymentPayload,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                timeout: 60000,
                // Add withCredentials if needed for CORS
                withCredentials: false,
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

          // Ensure paymentResult is assigned
          if (!paymentResult) {
            throw new Error('Payment processing failed: No payment method available or all methods failed');
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
          
          // Enhanced error logging
          console.error('[x402-sdk] Payment processing error:', {
            message: errorMessage,
            status: paymentError.response?.status,
            statusText: paymentError.response?.statusText,
            method: paymentError.config?.method,
            url: paymentError.config?.url,
            responseData: paymentError.response?.data,
          });
          
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
          if (paymentError.config) {
            (enhancedError as any).config = {
              method: paymentError.config.method,
              url: paymentError.config.url,
            };
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

