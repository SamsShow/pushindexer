import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { PaymentRequirements, PaymentProof, PaymentProcessorResponse, X402ClientConfig, ChainInfo, PushNetwork, ViemWalletClient, SolanaKeypair } from './types';
import { X402Error, X402ErrorCode } from './types';
import { mergeConfig, DEFAULT_FACILITATOR_ADDRESS, DEFAULT_CHAIN_ID, DEFAULT_PUSH_CHAIN_RPC } from './config';
import { getPresetConfig } from './presets';

// Lazy loading for peer dependencies (browser-compatible)
// These are loaded on-demand when needed, not at module load time
let ethers: any;
let ethersPromise: Promise<any> | null = null;

async function loadEthers(): Promise<any> {
  if (ethers) {
    return ethers;
  }
  
  if (ethersPromise) {
    return ethersPromise;
  }

  ethersPromise = (async () => {
    try {
      // Try dynamic import (works in both ESM and browser environments)
      const ethersModule = await import('ethers');
      ethers = ethersModule.default || ethersModule;
      return ethers;
    } catch (error) {
      // Fallback to require for Node.js CommonJS environments
      if (typeof require !== 'undefined') {
        try {
          ethers = require('ethers');
          return ethers;
        } catch {
          // ethers not available
        }
      }
      throw new Error('ethers.js is not available. Please install it: npm install ethers');
    }
  })();

  return ethersPromise;
}

let PushChain: any;
let pushChainPromise: Promise<any> | null = null;

async function loadPushChain(): Promise<any> {
  if (PushChain) {
    return PushChain;
  }
  
  if (pushChainPromise) {
    return pushChainPromise;
  }

  pushChainPromise = (async () => {
    try {
      // Try dynamic import (works in both ESM and browser environments)
      const pushChainModule = await import('@pushchain/core');
      PushChain = pushChainModule.default || pushChainModule;
      return PushChain;
    } catch (error) {
      // Fallback to require for Node.js CommonJS environments
      if (typeof require !== 'undefined') {
        try {
          PushChain = require('@pushchain/core');
          return PushChain;
        } catch {
          // Push Chain SDK not available
        }
      }
      return null; // Push Chain is optional, return null if not available
    }
  })();

  return pushChainPromise;
}

// Lazy loading for Viem (optional peer dependency)
let viem: any;
let viemPromise: Promise<any> | null = null;

async function loadViem(): Promise<any> {
  if (viem) {
    return viem;
  }
  
  if (viemPromise) {
    return viemPromise;
  }

  viemPromise = (async () => {
    try {
      const viemModule = await import('viem');
      viem = viemModule.default || viemModule;
      return viem;
    } catch (error) {
      if (typeof require !== 'undefined') {
        try {
          viem = require('viem');
          return viem;
        } catch {
          // viem not available
        }
      }
      return null; // viem is optional
    }
  })();

  return viemPromise;
}

// Lazy loading for @solana/web3.js (optional peer dependency)
let solanaWeb3: any;
let solanaPromise: Promise<any> | null = null;

async function loadSolanaWeb3(): Promise<any> {
  if (solanaWeb3) {
    return solanaWeb3;
  }
  
  if (solanaPromise) {
    return solanaPromise;
  }

  solanaPromise = (async () => {
    try {
      const solanaModule = await import('@solana/web3.js');
      solanaWeb3 = solanaModule.default || solanaModule;
      return solanaWeb3;
    } catch (error) {
      if (typeof require !== 'undefined') {
        try {
          solanaWeb3 = require('@solana/web3.js');
          return solanaWeb3;
        } catch {
          // solana/web3.js not available
        }
      }
      return null; // solana is optional
    }
  })();

  return solanaPromise;
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
 * Debug logging helper
 */
function debugLog(config: X402ClientConfig, message: string, data?: any): void {
  if (config.debug) {
    const timestamp = new Date().toISOString();
    const logData = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    console.log(`[x402-sdk:${timestamp}] ${message}${logData}`);
  }
}

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
 * Creates a Universal Signer from ethers.js v6 signer
 * @param ethersSigner - An ethers.js Signer (Wallet or connected signer)
 * @returns Universal Signer or null if Push Chain SDK is not available
 */
async function createUniversalSignerFromEthersSigner(
  ethersSigner: any
): Promise<any | null> {
  const PushChainModule = await loadPushChain();
  if (!PushChainModule || !PushChainModule.utils || !PushChainModule.utils.signer) {
    console.warn('Push Chain SDK not available for Universal Signer creation');
    return null;
  }

  try {
    const universalSigner = await PushChainModule.utils.signer.toUniversal(ethersSigner);
    return universalSigner;
  } catch (error) {
    console.warn('Failed to create Universal Signer from ethers:', error);
    return null;
  }
}

/**
 * Creates a Universal Signer from Viem wallet client
 * @param viemClient - A Viem WalletClient
 * @returns Universal Signer or null if Push Chain SDK is not available
 */
async function createUniversalSignerFromViemClient(
  viemClient: ViemWalletClient
): Promise<any | null> {
  const PushChainModule = await loadPushChain();
  if (!PushChainModule || !PushChainModule.utils || !PushChainModule.utils.signer) {
    console.warn('Push Chain SDK not available for Universal Signer creation');
    return null;
  }

  try {
    // Viem clients can be converted directly using toUniversal
    const universalSigner = await PushChainModule.utils.signer.toUniversal(viemClient);
    return universalSigner;
  } catch (error) {
    console.warn('Failed to create Universal Signer from Viem:', error);
    return null;
  }
}

/**
 * Creates a Universal Signer from Solana Keypair
 * @param keypair - A Solana Keypair from @solana/web3.js
 * @param chain - The Solana chain to use (defaults to SOLANA_DEVNET)
 * @returns Universal Signer or null if Push Chain SDK is not available
 */
async function createUniversalSignerFromSolanaKeypair(
  keypair: SolanaKeypair,
  chain?: string
): Promise<any | null> {
  const PushChainModule = await loadPushChain();
  if (!PushChainModule || !PushChainModule.utils || !PushChainModule.utils.signer) {
    console.warn('Push Chain SDK not available for Universal Signer creation');
    return null;
  }

  try {
    // Solana uses toUniversalFromKeypair with chain and library options
    const universalSigner = await PushChainModule.utils.signer.toUniversalFromKeypair(keypair, {
      chain: chain || PushChainModule.CONSTANTS.CHAIN.SOLANA_DEVNET,
      library: PushChainModule.CONSTANTS.LIBRARY.SOLANA_WEB3JS,
    });
    return universalSigner;
  } catch (error) {
    console.warn('Failed to create Universal Signer from Solana keypair:', error);
    return null;
  }
}

/**
 * Initializes a Push Chain Client with the given Universal Signer
 * This is required for proper Universal Transaction flow
 * @param universalSigner - A Universal Signer created from ethers/viem/solana
 * @param pushNetwork - The Push network to use ('testnet' or 'mainnet')
 * @param onPaymentStatus - Optional callback for progress updates
 * @returns Initialized Push Chain Client
 */
async function initializePushChainClient(
  universalSigner: any,
  pushNetwork: PushNetwork = 'testnet',
  onPaymentStatus?: (status: string) => void
): Promise<any> {
  const PushChainModule = await loadPushChain();
  if (!PushChainModule) {
    throw new Error('@pushchain/core is not available. Please install it: npm install @pushchain/core');
  }

  const networkConstant = pushNetwork === 'mainnet'
    ? PushChainModule.CONSTANTS.PUSH_NETWORK.MAINNET
    : PushChainModule.CONSTANTS.PUSH_NETWORK.TESTNET;

  const initOptions: any = {
    network: networkConstant,
  };

  // Add progress hook if status callback is provided
  if (onPaymentStatus) {
    initOptions.progressHook = async (progress: { title: string; timestamp: number }) => {
      onPaymentStatus(progress.title);
    };
  }

  const pushChainClient = await PushChainModule.initialize(universalSigner, initOptions);
  return pushChainClient;
}

/**
 * Sends a Universal Transaction using the Push Chain Client
 * @param pushChainClient - Initialized Push Chain Client
 * @param txParams - Transaction parameters (to, value, data)
 * @returns Transaction response with hash
 */
async function sendUniversalTransaction(
  pushChainClient: any,
  txParams: { to: string; value?: bigint | string; data?: string }
): Promise<{ hash: string; [key: string]: any }> {
  if (!pushChainClient || !pushChainClient.universal || !pushChainClient.universal.sendTransaction) {
    throw new Error('Invalid Push Chain Client: universal.sendTransaction not available');
  }

  const txResponse = await pushChainClient.universal.sendTransaction(txParams);
  return txResponse;
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
  // Handle network preset if provided
  let finalConfig = config;
  if (config.network) {
    const presetConfig = getPresetConfig(config.network);
    finalConfig = {
      ...presetConfig,
      ...config, // User config overrides preset
    };
  }

  // Merge with defaults and environment variables
  finalConfig = mergeConfig(finalConfig);

  const {
    paymentEndpoint, // No default - users must provide walletProvider, privateKey, universalSigner, viemClient, solanaKeypair, or their own endpoint
    facilitatorAddress = DEFAULT_FACILITATOR_ADDRESS,
    chainId = DEFAULT_CHAIN_ID,
    baseURL,
    axiosConfig = {},
    onPaymentStatus,
    privateKey,
    walletProvider,
    universalSigner: providedUniversalSigner,
    viemClient,
    solanaKeypair,
    pushNetwork = 'testnet',
    pushChainRpcUrl,
    chainRpcMap,
    debug = false,
  } = finalConfig;

  debugLog(finalConfig, 'Creating x402 client', {
    hasWalletProvider: !!walletProvider,
    hasPrivateKey: !!privateKey,
    hasUniversalSigner: !!providedUniversalSigner,
    hasViemClient: !!viemClient,
    hasSolanaKeypair: !!solanaKeypair,
    hasPaymentEndpoint: !!paymentEndpoint,
    pushNetwork,
    facilitatorAddress,
    chainId,
    baseURL,
  });

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
            debugLog(finalConfig, 'Max retries exceeded', { attempts, maxRetries: MAX_RETRIES });
            if (onPaymentStatus) {
              onPaymentStatus(`Error: ${errorMessage}`);
            }
            return Promise.reject(
              new X402Error(errorMessage, X402ErrorCode.MAX_RETRIES_EXCEEDED, { attempts, maxRetries: MAX_RETRIES })
            );
          }
          retryAttempts.set(originalConfig, attempts + 1);
        }

        debugLog(finalConfig, '402 Payment Required detected', {
          url: originalConfig?.url,
          method: originalConfig?.method,
          responseData: error.response?.data,
        });

        let paymentRequirements: PaymentRequirements;
        try {
          paymentRequirements = validatePaymentRequirements(error.response.data);
          debugLog(finalConfig, 'Payment requirements validated', {
            recipient: paymentRequirements.payTo || paymentRequirements.recipient,
            amount: paymentRequirements.maxAmountRequired || paymentRequirements.amount,
            currency: paymentRequirements.asset || paymentRequirements.currency,
            chainId: paymentRequirements.chainId,
          });
        } catch (validationError: any) {
          const errorMessage = `Invalid 402 response: ${validationError.message}`;
          debugLog(finalConfig, 'Payment requirements validation failed', { error: validationError.message });
          if (onPaymentStatus) {
            onPaymentStatus(`Error: ${errorMessage}`);
          }
          return Promise.reject(
            new X402Error(errorMessage, X402ErrorCode.INVALID_PAYMENT_REQUIREMENTS, validationError)
          );
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
          const tokenAddress = paymentRequirements.token || paymentRequirements.asset; // Support both 'token' and 'asset' fields

          if (!recipient || !amount) {
            throw new Error('Missing recipient or amount in payment requirements');
          }

          // Detect chain information from payment requirements
          const chainInfo = detectChainInfo(paymentRequirements, config);

          // Determine if this is a token transfer or native transfer
          const isTokenTransfer = !!tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000';

          // Load peer dependencies lazily when needed
          const PushChainModule = walletProvider || privateKey ? await loadPushChain() : null;
          const ethersModule = walletProvider || privateKey ? await loadEthers() : null;

          let paymentResult: PaymentProcessorResponse | undefined;

          // Option 1: Use Push Chain Universal Transaction (multi-chain support, highest priority)
          // This follows the proper Push Chain flow: Universal Signer -> Push Chain Client -> universal.sendTransaction()
          const canUseUniversalTx = providedUniversalSigner || viemClient || solanaKeypair || 
            (PushChainModule && PushChainModule.utils && PushChainModule.utils.signer && (walletProvider || privateKey));
          
          if (canUseUniversalTx) {
            try {
              if (onPaymentStatus) {
                onPaymentStatus(`Using Push Chain Universal Transaction for ${isTokenTransfer ? 'token' : 'native'} transfer...`);
              }

              let universalSigner = providedUniversalSigner;
              
              // Priority 1: Use provided Universal Signer
              // Priority 2: Create from Viem client
              if (!universalSigner && viemClient) {
                if (onPaymentStatus) {
                  onPaymentStatus('Creating Universal Signer from Viem client...');
                }
                universalSigner = await createUniversalSignerFromViemClient(viemClient);
              }
              
              // Priority 3: Create from Solana keypair
              if (!universalSigner && solanaKeypair) {
                if (onPaymentStatus) {
                  onPaymentStatus('Creating Universal Signer from Solana keypair...');
                }
                universalSigner = await createUniversalSignerFromSolanaKeypair(solanaKeypair);
              }
              
              // Priority 4: Create from wallet provider (ethers.js)
              if (!universalSigner && walletProvider && ethersModule) {
                if (onPaymentStatus) {
                  onPaymentStatus('Creating Universal Signer from wallet provider...');
                }
                if (!walletProvider.getSigner) {
                  throw new Error('Wallet provider does not support getSigner()');
                }
                const chainSigner = await walletProvider.getSigner();
                universalSigner = await createUniversalSignerFromEthersSigner(chainSigner);
              }
              
              // Priority 5: Create from private key (ethers.js)
              if (!universalSigner && privateKey && ethersModule) {
                if (onPaymentStatus) {
                  onPaymentStatus('Creating Universal Signer from private key...');
                }
                const provider = new ethersModule.JsonRpcProvider(chainInfo.rpcUrl);
                const ethersSigner = new ethersModule.Wallet(privateKey, provider);
                universalSigner = await createUniversalSignerFromEthersSigner(ethersSigner);
              }

              if (!universalSigner) {
                throw new Error('Failed to create Universal Signer');
              }

              // Initialize Push Chain Client (required for proper Universal Transaction flow)
              if (onPaymentStatus) {
                onPaymentStatus(`Initializing Push Chain Client (${pushNetwork})...`);
              }
              
              const pushChainClient = await initializePushChainClient(
                universalSigner,
                pushNetwork,
                onPaymentStatus
              );

              // Prepare transaction parameters for Universal Transaction
              const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;
              
              // Use PushChain.utils.helpers.parseUnits for proper value formatting
              const amountValue = PushChainModule.utils.helpers.parseUnits(amount.toString(), 18);
              
              let txData: string | undefined;
              let txValue: bigint = BigInt(0);
              
              if (isTokenTransfer) {
                // Token transfer - encode facilitateTokenTransfer call
                if (ethersModule) {
                  const facilitatorAbi = [
                    'function facilitateTokenTransfer(address token, address recipient, uint256 amount) external',
                  ];
                  const iface = new ethersModule.Interface(facilitatorAbi);
                  txData = iface.encodeFunctionData('facilitateTokenTransfer', [tokenAddress, recipient, amountValue]);
                }
                
                if (onPaymentStatus) {
                  onPaymentStatus(`Preparing token transfer: ${amount} tokens from ${tokenAddress}...`);
                }
              } else {
                // Native transfer - encode facilitateNativeTransfer call
                txValue = amountValue;
                if (ethersModule) {
                  const facilitatorAbi = [
                    'function facilitateNativeTransfer(address recipient, uint256 amount) external payable',
                  ];
                  const iface = new ethersModule.Interface(facilitatorAbi);
                  txData = iface.encodeFunctionData('facilitateNativeTransfer', [recipient, amountValue]);
                }
              }

              // Send Universal Transaction via Push Chain Client
              if (onPaymentStatus) {
                onPaymentStatus('Sending Universal Transaction...');
              }

              const txParams: { to: string; value?: bigint; data?: string } = {
                to: facilitatorContractAddress,
              };
              
              if (!isTokenTransfer) {
                txParams.value = txValue;
              }
              
              if (txData) {
                txParams.data = txData;
              }

              const txResponse = await sendUniversalTransaction(pushChainClient, txParams);

              if (onPaymentStatus) {
                onPaymentStatus('Transaction sent, waiting for confirmation...');
              }

              const txHash = txResponse.hash || txResponse.txHash || String(txResponse);

              if (!txHash || txHash === '[object Object]') {
                throw new Error('Invalid transaction result from Universal Transaction');
              }

              // Get chain info from Universal Signer account
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
              console.warn('Universal Transaction failed, falling back to direct ethers.js:', universalError);
              if (onPaymentStatus) {
                onPaymentStatus(`Universal Transaction failed: ${universalError.message}. Using fallback...`);
              }
              // Continue to ethers.js fallback below - don't throw, let it fall through
              paymentResult = undefined;
            }
          }

          // Option 2: Use wallet provider (browser/client-side) - fallback if Universal Signer not available
          if (!paymentResult && walletProvider) {
            const ethersForWallet = await loadEthers();

            if (onPaymentStatus) {
              onPaymentStatus(`Waiting for wallet approval for ${isTokenTransfer ? 'token' : 'native'} transfer...`);
            }

            // Sign transaction with wallet provider
            const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;

            // Get signer from wallet provider
            if (!walletProvider.getSigner) {
              throw new X402Error(
                'Wallet provider does not support getSigner()',
                X402ErrorCode.PAYMENT_METHOD_NOT_AVAILABLE
              );
            }
            const signer = await walletProvider.getSigner();
            const amountWei = ethersForWallet.parseEther(amount.toString());

            if (isTokenTransfer) {
              // Token transfer
              const facilitatorAbi = [
                'function facilitateTokenTransfer(address token, address recipient, uint256 amount) external',
              ];
              const contract = new ethersForWallet.Contract(facilitatorContractAddress, facilitatorAbi, signer);
              
              // Approve token spend first
              const tokenAbi = ['function approve(address spender, uint256 amount) external returns (bool)'];
              const tokenContract = new ethersForWallet.Contract(tokenAddress, tokenAbi, signer);
              
              if (onPaymentStatus) {
                onPaymentStatus('Approving token spend...');
              }
              
              // Check current allowance
              const allowanceAbi = ['function allowance(address owner, address spender) external view returns (uint256)'];
              const allowanceContract = new ethersForWallet.Contract(tokenAddress, allowanceAbi, signer);
              const currentAllowance = await allowanceContract.allowance(await signer.getAddress(), facilitatorContractAddress);
              
              if (currentAllowance < amountWei) {
                const approveTx = await tokenContract.approve(facilitatorContractAddress, amountWei);
                await approveTx.wait();
                if (onPaymentStatus) {
                  onPaymentStatus('Token approval confirmed, proceeding with transfer...');
                }
              }

              // Estimate gas and send token transfer
              const gasEstimate = await contract.facilitateTokenTransfer.estimateGas(
                tokenAddress,
                recipient,
                amountWei
              );

              const tx = await contract.facilitateTokenTransfer(tokenAddress, recipient, amountWei, {
                gasLimit: gasEstimate,
              });

              if (onPaymentStatus) {
                onPaymentStatus('Transaction sent, waiting for confirmation...');
              }

              const receipt = await tx.wait();
              let chainId: string | number = chainInfo.chainId;
              if (walletProvider.getNetwork) {
                const network = await walletProvider.getNetwork();
                chainId = typeof network.chainId === 'bigint' ? network.chainId.toString() : network.chainId.toString();
              }

              paymentResult = {
                success: true,
                txHash: tx.hash,
                recipient,
                amount: amount.toString(),
                chainId: chainId.toString(),
                blockNumber: receipt.blockNumber,
              };
            } else {
              // Native transfer
              const facilitatorAbi = [
                'function facilitateNativeTransfer(address recipient, uint256 amount) external payable',
              ];
              const contract = new ethersForWallet.Contract(facilitatorContractAddress, facilitatorAbi, signer);

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
              let chainId: string | number = chainInfo.chainId;
              if (walletProvider.getNetwork) {
                const network = await walletProvider.getNetwork();
                chainId = typeof network.chainId === 'bigint' ? network.chainId.toString() : network.chainId.toString();
              }

              paymentResult = {
                success: true,
                txHash: tx.hash,
                recipient,
                amount: amount.toString(),
                chainId: chainId.toString(),
                blockNumber: receipt.blockNumber,
              };
            }
          }
          // Option 3: Use private key directly with facilitator contract (agents/server-side)
          if (!paymentResult && privateKey) {
            const ethersForPrivateKey = await loadEthers();

            if (onPaymentStatus) {
              onPaymentStatus(`Processing ${isTokenTransfer ? 'token' : 'native'} payment with private key...`);
            }

            // Call facilitator contract directly - no serverless API needed!
            const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;

            // Create provider and wallet from private key
            const provider = new ethersForPrivateKey.JsonRpcProvider(chainInfo.rpcUrl);
            const wallet = new ethersForPrivateKey.Wallet(privateKey, provider);
            const amountWei = ethersForPrivateKey.parseEther(amount.toString());

            if (isTokenTransfer) {
              // Token transfer
              const facilitatorAbi = [
                'function facilitateTokenTransfer(address token, address recipient, uint256 amount) external',
              ];
              const contract = new ethersForPrivateKey.Contract(facilitatorContractAddress, facilitatorAbi, wallet);
              
              // Approve token spend first
              const tokenAbi = ['function approve(address spender, uint256 amount) external returns (bool)'];
              const tokenContract = new ethersForPrivateKey.Contract(tokenAddress, tokenAbi, wallet);
              
              if (onPaymentStatus) {
                onPaymentStatus('Approving token spend...');
              }
              
              // Check current allowance
              const allowanceAbi = ['function allowance(address owner, address spender) external view returns (uint256)'];
              const allowanceContract = new ethersForPrivateKey.Contract(tokenAddress, allowanceAbi, wallet);
              const currentAllowance = await allowanceContract.allowance(await wallet.getAddress(), facilitatorContractAddress);
              
              if (currentAllowance < amountWei) {
                const approveTx = await tokenContract.approve(facilitatorContractAddress, amountWei);
                await approveTx.wait();
                if (onPaymentStatus) {
                  onPaymentStatus('Token approval confirmed, proceeding with transfer...');
                }
              }

              // Estimate gas and send token transfer
              const gasEstimate = await contract.facilitateTokenTransfer.estimateGas(
                tokenAddress,
                recipient,
                amountWei
              );

              const tx = await contract.facilitateTokenTransfer(tokenAddress, recipient, amountWei, {
                gasLimit: gasEstimate,
              });

              if (onPaymentStatus) {
                onPaymentStatus('Transaction sent, waiting for confirmation...');
              }

              const receipt = await tx.wait();
              const network = await provider.getNetwork();

              paymentResult = {
                success: true,
                txHash: tx.hash,
                recipient,
                amount: amount.toString(),
                chainId: network.chainId.toString(),
                blockNumber: receipt.blockNumber,
              };
            } else {
              // Native transfer
              const facilitatorAbi = [
                'function facilitateNativeTransfer(address recipient, uint256 amount) external payable',
              ];
              const contract = new ethersForPrivateKey.Contract(facilitatorContractAddress, facilitatorAbi, wallet);

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

              if (onPaymentStatus) {
                onPaymentStatus('Transaction sent, waiting for confirmation...');
              }

              // Wait for transaction
              const receipt = await tx.wait();
              const network = await provider.getNetwork();

              paymentResult = {
                success: true,
                txHash: tx.hash,
                recipient,
                amount: amount.toString(),
                chainId: network.chainId.toString(),
                blockNumber: receipt.blockNumber,
              };
            }
          }
          // Option 4: Use custom payment endpoint (optional - only if explicitly provided)
          if (!paymentResult && paymentEndpoint) {
            // Only use payment endpoint if user explicitly provided one
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
            
            // Include token address if this is a token transfer
            if (isTokenTransfer && tokenAddress) {
              paymentPayload.token = tokenAddress;
            }

            console.log('[x402-sdk] Making payment request to custom endpoint:', {
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
                timeout: 180000, // 3 minutes - allows time for blockchain confirmation
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

          // Ensure paymentResult is assigned
          if (!paymentResult) {
            const errorMessage =
              'Payment processing failed: No payment method available. ' +
              'Please provide one of: walletProvider, privateKey, universalSigner, viemClient, solanaKeypair, or paymentEndpoint. ' +
              'The SDK uses Push Chain Universal Transactions for multi-chain support!';
            debugLog(finalConfig, 'No payment method available', {
              hasWalletProvider: !!walletProvider,
              hasPrivateKey: !!privateKey,
              hasUniversalSigner: !!providedUniversalSigner,
              hasViemClient: !!viemClient,
              hasSolanaKeypair: !!solanaKeypair,
              hasPaymentEndpoint: !!paymentEndpoint,
            });
            throw new X402Error(errorMessage, X402ErrorCode.PAYMENT_METHOD_NOT_AVAILABLE, {
              hasWalletProvider: !!walletProvider,
              hasPrivateKey: !!privateKey,
              hasUniversalSigner: !!providedUniversalSigner,
              hasViemClient: !!viemClient,
              hasSolanaKeypair: !!solanaKeypair,
              hasPaymentEndpoint: !!paymentEndpoint,
            });
          }

          debugLog(finalConfig, 'Payment processed successfully', {
            txHash: paymentResult.txHash,
            chainId: paymentResult.chainId,
            recipient: paymentResult.recipient,
            amount: paymentResult.amount,
          });

          // Create payment proof in x402 format
          const paymentProof: PaymentProof = {
            scheme: paymentRequirements.scheme || 'exact',
            amount: String(paymentRequirements.maxAmountRequired || paymentRequirements.amount || '0'),
            currency: paymentRequirements.asset || paymentRequirements.currency || (isTokenTransfer ? 'TOKEN' : 'PUSH'),
            recipient: String(recipient),
            facilitator: facilitatorAddress || paymentRequirements.facilitator || '',
            network: paymentRequirements.network || 'push',
            chainId: paymentRequirements.chainId || paymentResult.chainId || chainId,
            txHash: paymentResult.txHash,
            timestamp: Date.now(),
            ...(isTokenTransfer && tokenAddress ? { token: tokenAddress } : {}),
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
          debugLog(finalConfig, 'Retrying original request with payment proof', {
            url: originalConfig.url,
            method: originalConfig.method,
            paymentProof: {
              txHash: paymentProof.txHash,
              amount: paymentProof.amount,
              currency: paymentProof.currency,
            },
          });
          return axiosInstance.request(originalConfig);
        } catch (paymentError: any) {
          const errorMessage = paymentError.response?.data?.message 
            || paymentError.message 
            || 'Unknown payment processing error';
          
          // Determine error code based on error type
          let errorCode = X402ErrorCode.PAYMENT_FAILED;
          if (paymentError.message?.includes('insufficient funds') || paymentError.message?.includes('balance')) {
            errorCode = X402ErrorCode.INSUFFICIENT_FUNDS;
          } else if (paymentError.message?.includes('transaction') || paymentError.message?.includes('revert')) {
            errorCode = X402ErrorCode.TRANSACTION_FAILED;
          } else if (paymentError.code === 'ECONNREFUSED' || paymentError.code === 'ETIMEDOUT') {
            errorCode = X402ErrorCode.NETWORK_ERROR;
          }
          
          // Enhanced error logging
          debugLog(finalConfig, 'Payment processing error', {
            message: errorMessage,
            code: errorCode,
            status: paymentError.response?.status,
            statusText: paymentError.response?.statusText,
            method: paymentError.config?.method,
            url: paymentError.config?.url,
            responseData: paymentError.response?.data,
          });
          
          if (onPaymentStatus) {
            onPaymentStatus(`Payment failed: ${errorMessage}`);
          }
          
          // Create a more informative error with proper error code
          const enhancedError = X402Error.fromError(paymentError, errorCode);
          enhancedError.message = `x402 Payment Processing Failed: ${errorMessage}`;
          
          return Promise.reject(enhancedError);
        }
      }

      // For non-402 errors, pass through
      return Promise.reject(error);
    }
  );

  return axiosInstance;
}

