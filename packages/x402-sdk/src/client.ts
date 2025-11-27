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
      console.log('[x402-sdk] @pushchain/core imported:', {
        hasDefault: !!pushChainModule.default,
        keys: Object.keys(pushChainModule).slice(0, 10), // Limit keys for logging
        hasPushChainExport: !!pushChainModule.PushChain,
      });
      
      // @pushchain/core exports PushChain as a NAMED export (not default)
      // PushChain.utils is a STATIC property on the class
      if (pushChainModule.PushChain) {
        PushChain = pushChainModule.PushChain;
      } else if (pushChainModule.default?.PushChain) {
        // Some bundlers might wrap it
        PushChain = pushChainModule.default.PushChain;
      } else if (pushChainModule.default) {
        PushChain = pushChainModule.default;
      } else {
        PushChain = pushChainModule;
      }
      
      console.log('[x402-sdk] PushChain loaded:', {
        hasUtils: !!PushChain?.utils,
        hasSigner: !!PushChain?.utils?.signer,
        hasToUniversal: typeof PushChain?.utils?.signer?.toUniversal === 'function',
        hasConstants: !!PushChain?.CONSTANTS,
        hasInitialize: typeof PushChain?.initialize === 'function',
        type: typeof PushChain,
      });
      
      return PushChain;
    } catch (error: any) {
      console.warn('[x402-sdk] Failed to import @pushchain/core:', error?.message || error);
      // Fallback to require for Node.js CommonJS environments
      if (typeof require !== 'undefined') {
        try {
          const reqModule = require('@pushchain/core');
          // Same named export handling for require
          PushChain = reqModule.PushChain || reqModule.default?.PushChain || reqModule;
          console.log('[x402-sdk] PushChain loaded via require:', {
            hasUtils: !!PushChain?.utils,
            hasSigner: !!PushChain?.utils?.signer,
          });
          return PushChain;
        } catch (reqError: any) {
          console.warn('[x402-sdk] Failed to require @pushchain/core:', reqError?.message || reqError);
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
 * Push Chain Donut Testnet chain ID
 */
const PUSH_CHAIN_ID = '42101';

/**
 * Mapping of source chain IDs to their moveable token accessors
 * Used for cross-chain fund transfers via Universal Transaction
 */
const SOURCE_CHAIN_TOKEN_MAP: Record<string, Record<string, string>> = {
  // Ethereum Sepolia (11155111)
  '11155111': {
    'native': 'ETH',
    'USDT': 'USDT',
    'USDC': 'USDC',
    'WETH': 'WETH',
    'stETH': 'stETH',
  },
  // Base Sepolia (84532)
  '84532': {
    'native': 'ETH',
    'USDT': 'USDT',
    'USDC': 'USDC',
  },
  // Arbitrum Sepolia (421614)
  '421614': {
    'native': 'ETH',
    'USDT': 'USDT',
    'USDC': 'USDC',
  },
  // BNB Testnet (97)
  '97': {
    'native': 'BNB',
    'USDT': 'USDT',
  },
};

/**
 * Detects the wallet's current chain ID
 * Returns the chain ID as a string, or undefined if detection fails
 */
async function detectWalletChainId(
  walletProvider?: any,
  signer?: any,
  debugConfig?: X402ClientConfig
): Promise<string | undefined> {
  let walletChainId: string | undefined;
  
  // Method 1 (HIGHEST PRIORITY): Get chainId directly from wallet via ethereum.request
  // Check for browser environment
  const isBrowser = typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined';
  const ethereumProvider = isBrowser ? (globalThis as any).window?.ethereum : undefined;
  
  if (ethereumProvider) {
    try {
      const chainId = await ethereumProvider.request({ method: 'eth_chainId' });
      if (chainId) {
        walletChainId = parseInt(chainId, 16).toString();
        if (debugConfig) {
          debugLog(debugConfig, 'Chain ID from ethereum.request', { walletChainId, hex: chainId });
        }
        return walletChainId;
      }
    } catch (ethError) {
      console.warn('Could not get chainId from ethereum.request:', ethError);
    }
  }
  
  // Method 2: Try wallet provider's getNetwork
  if (!walletChainId && walletProvider?.getNetwork) {
    try {
      const network = await walletProvider.getNetwork();
      walletChainId = typeof network.chainId === 'bigint' 
        ? network.chainId.toString() 
        : network.chainId.toString();
      if (debugConfig) {
        debugLog(debugConfig, 'Chain ID from wallet provider', { walletChainId });
      }
      return walletChainId;
    } catch (networkError) {
      console.warn('Could not get network from wallet provider:', networkError);
    }
  }
  
  // Method 3: Try signer's provider
  if (!walletChainId && signer?.provider) {
    try {
      const network = await signer.provider.getNetwork();
      walletChainId = typeof network.chainId === 'bigint' 
        ? network.chainId.toString() 
        : network.chainId.toString();
      if (debugConfig) {
        debugLog(debugConfig, 'Chain ID from signer provider', { walletChainId });
      }
      return walletChainId;
    } catch (providerError) {
      console.warn('Could not get network from signer provider:', providerError);
    }
  }
  
  return undefined;
}

/**
 * Creates a Universal Signer from ethers.js v6 signer
 * CUSTOM IMPLEMENTATION: The Push Chain SDK's toUniversal doesn't properly handle
 * browser wallets (JsonRpcSigner) because it passes Transaction objects directly
 * to sendTransaction, but browser wallets expect TransactionRequest objects.
 * 
 * This custom implementation:
 * 1. Parses the serialized transaction from viem
 * 2. Converts it to an ethers TransactionRequest
 * 3. Properly sends it to the browser wallet
 * 
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
    // Get address and chain from the signer
    const address = await ethersSigner.getAddress();
    const network = await ethersSigner.provider?.getNetwork();
    const chainId = network?.chainId?.toString();
    
    // Map chainId to Push Chain's CHAIN enum
    let chain: string;
    switch (chainId) {
      case '11155111':
        chain = PushChainModule.CONSTANTS.CHAIN.ETHEREUM_SEPOLIA;
        break;
      case '1':
        chain = PushChainModule.CONSTANTS.CHAIN.ETHEREUM_MAINNET;
        break;
      case '42101':
        chain = PushChainModule.CONSTANTS.CHAIN.PUSH_TESTNET;
        break;
      case '9':
        chain = PushChainModule.CONSTANTS.CHAIN.PUSH_MAINNET;
        break;
      default:
        throw new Error(`Unsupported chainId: ${chainId}`);
    }

    console.log('[x402-sdk] Creating custom Universal Signer for browser wallet:', {
      address,
      chainId,
      chain,
    });

    // Check if this is a browser signer (JsonRpcSigner) by checking if it has a private key
    const isBrowserSigner = !ethersSigner.privateKey;
    
    // Import ethers dynamically for parsing
    const ethersModule = await import('ethers');
    const ethers = ethersModule.default || ethersModule;

    // Create a custom Universal Signer that properly handles browser wallets
    const universalSigner = PushChainModule.utils.signer.construct(
      { address, chain },
      {
        // Sign raw message bytes
        signMessage: async (data: Uint8Array): Promise<Uint8Array> => {
          const sigHex = await ethersSigner.signMessage(data);
          return ethers.getBytes(sigHex);
        },
        
        // Sign and send transaction - CUSTOM implementation for browser wallets
        signAndSendTransaction: async (rawUnsignedTx: Uint8Array): Promise<Uint8Array> => {
          const unsignedHex = ethers.hexlify(rawUnsignedTx);
          
          console.log('[x402-sdk] signAndSendTransaction called with raw tx:', {
            hexLength: unsignedHex.length,
            isBrowserSigner,
          });
          
          if (isBrowserSigner) {
            // BROWSER WALLET PATH: Parse the serialized tx and convert to TransactionRequest
            // The raw transaction is RLP-encoded by viem, parse it to extract fields
            const parsedTx = ethers.Transaction.from(unsignedHex);
            
            console.log('[x402-sdk] Parsed transaction for browser wallet:', {
              to: parsedTx.to,
              value: parsedTx.value?.toString(),
              data: parsedTx.data?.slice(0, 20) + '...',
              gasLimit: parsedTx.gasLimit?.toString(),
              chainId: parsedTx.chainId?.toString(),
            });
            
            // Create a proper TransactionRequest object for the browser wallet
            const txRequest: any = {
              to: parsedTx.to,
              data: parsedTx.data,
              value: parsedTx.value,
              gasLimit: parsedTx.gasLimit,
              maxFeePerGas: parsedTx.maxFeePerGas,
              maxPriorityFeePerGas: parsedTx.maxPriorityFeePerGas,
              nonce: parsedTx.nonce,
              chainId: parsedTx.chainId,
              type: parsedTx.type,
            };
            
            // Remove undefined fields
            Object.keys(txRequest).forEach(key => {
              if (txRequest[key] === undefined || txRequest[key] === null) {
                delete txRequest[key];
              }
            });
            
            console.log('[x402-sdk] Sending TransactionRequest to browser wallet:', txRequest);
            
            const txResponse = await ethersSigner.sendTransaction(txRequest);
            console.log('[x402-sdk] Browser wallet transaction sent:', txResponse.hash);
            
            // Return hash as bytes
            return ethers.getBytes(txResponse.hash);
          } else {
            // PRIVATE KEY WALLET PATH: Use the standard ethers approach
            const tx = ethers.Transaction.from(unsignedHex);
            const txResponse = await ethersSigner.sendTransaction(tx);
            return ethers.getBytes(txResponse.hash);
          }
        },
        
        // Sign EIP-712 typed data
        signTypedData: async ({ domain, types, primaryType, message }: any): Promise<Uint8Array> => {
          const sigHex = await ethersSigner.signTypedData(domain, types, message);
          return ethers.getBytes(sigHex);
        },
      }
    );

    console.log('[x402-sdk] Custom Universal Signer created successfully');
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
    // Provide faster RPC URLs for confirmation polling
    rpcUrls: {
      // Use public Sepolia RPCs for faster block polling
      [PushChainModule.CONSTANTS.CHAIN.ETHEREUM_SEPOLIA]: [
        'https://eth-sepolia.public.blastapi.io',
        'https://rpc.sepolia.org',
        'https://sepolia.drpc.org',
      ],
      [PushChainModule.CONSTANTS.CHAIN.ETHEREUM_MAINNET]: [
        'https://eth.llamarpc.com',
        'https://cloudflare-eth.com',
      ],
    },
  };

  // Add progress hook if status callback is provided
  if (onPaymentStatus) {
    initOptions.progressHook = async (progress: { title: string; timestamp: number; message?: string }) => {
      // Include the confirmation count in the status message
      const statusMsg = progress.message || progress.title;
      console.log('[x402-sdk] Progress:', statusMsg);
      onPaymentStatus(statusMsg);
    };
  }

  const pushChainClient = await PushChainModule.initialize(universalSigner, initOptions);
  return pushChainClient;
}

/**
 * Sends a Universal Transaction using the Push Chain Client
 * @param pushChainClient - Initialized Push Chain Client
 * @param txParams - Transaction parameters (to, value, data, funds)
 * @param onPaymentStatus - Optional callback for status updates
 * @returns Transaction response with hash
 */
async function sendUniversalTransaction(
  pushChainClient: any,
  txParams: { to: string; value?: bigint | string; data?: string; funds?: any },
  onPaymentStatus?: (status: string) => void
): Promise<{ hash: string; [key: string]: any }> {
  if (!pushChainClient || !pushChainClient.universal || !pushChainClient.universal.sendTransaction) {
    throw new Error('Invalid Push Chain Client: universal.sendTransaction not available');
  }

  if (onPaymentStatus) {
    onPaymentStatus('Submitting Universal Transaction to Push Chain...');
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

          // ═══════════════════════════════════════════════════════════════════════════════════
          // DETECT WALLET'S CURRENT CHAIN
          // Universal Transaction works FROM any chain - we need to know which chain to route properly
          // ═══════════════════════════════════════════════════════════════════════════════════
          let walletChainId: string | undefined;
          let signer: any;
          
          if (walletProvider && ethersModule) {
            try {
              if (walletProvider.getSigner) {
                signer = await walletProvider.getSigner();
              }
              walletChainId = await detectWalletChainId(walletProvider, signer, finalConfig);
            } catch (e) {
              console.warn('Could not detect wallet chain:', e);
            }
          }
          
          // Check if wallet is on Push Chain
          const isWalletOnPushChain = walletChainId === PUSH_CHAIN_ID;
          
              if (onPaymentStatus) {
            if (walletChainId) {
              onPaymentStatus(`Detected wallet on chain ${walletChainId}${isWalletOnPushChain ? ' (Push Chain)' : ' (External Chain)'}`);
            } else {
              onPaymentStatus('Could not detect wallet chain, will attempt payment...');
            }
          }
          
          debugLog(finalConfig, 'Wallet chain detection result', {
            walletChainId,
            isWalletOnPushChain,
            pushChainId: PUSH_CHAIN_ID,
            targetChainId: chainInfo.chainId,
          });

          // ═══════════════════════════════════════════════════════════════════════════════════
          // PAYMENT FLOW ROUTING
          // - If wallet is on Push Chain → Use direct contract call (no bridging needed)
          // - If wallet is on external chain → Use Universal Transaction with funds field for bridging
          // ═══════════════════════════════════════════════════════════════════════════════════

          // Option 1: Use Push Chain Universal Transaction for CROSS-CHAIN payments (from external chains)
          // This uses the funds field to bridge assets from the source chain to Push Chain
          // NOTE: Push Chain SDK only supports ERC-20 tokens for cross-chain, NOT native tokens!
          const hasPushChainSigner = PushChainModule && PushChainModule.utils && PushChainModule.utils.signer;
          const canUseUniversalTx = !isWalletOnPushChain && (
            providedUniversalSigner || viemClient || solanaKeypair || 
            (hasPushChainSigner && (walletProvider || privateKey))
          );
          
          // Debug logging for Universal Tx availability
          console.log('[x402-sdk] Universal Transaction check:', {
            isWalletOnPushChain,
            walletChainId,
            pushChainId: PUSH_CHAIN_ID,
            hasPushChainModule: !!PushChainModule,
            hasPushChainUtils: !!PushChainModule?.utils,
            hasPushChainSigner: !!PushChainModule?.utils?.signer,
            hasWalletProvider: !!walletProvider,
            hasPrivateKey: !!privateKey,
            canUseUniversalTx,
            isTokenTransfer,
          });
          
          if (canUseUniversalTx) {
            try {
              if (onPaymentStatus) {
                onPaymentStatus(`Using Push Chain Universal Transaction for cross-chain ${isTokenTransfer ? 'token' : 'native'} transfer from chain ${walletChainId}...`);
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

              // ═══════════════════════════════════════════════════════════════════════════════════
              // UNIVERSAL TRANSACTION SETUP
              // 
              // Key insight from Push Chain SDK:
              // - Funds-only (NO data field): Supports BOTH native ETH and ERC-20
              // - Funds + Payload (WITH data field): Only ERC-20 with 'approve' mechanism
              // 
              // For simple cross-chain PAYMENTS, we just bridge funds directly to recipient
              // WITHOUT calling a contract - this enables native token support!
              // ═══════════════════════════════════════════════════════════════════════════════════

              if (onPaymentStatus) {
                onPaymentStatus(`Preparing cross-chain ${isTokenTransfer ? 'token' : 'native'} transfer from chain ${walletChainId}...`);
              }

              // Get the moveable token accessor from Push Chain Client
              // The token must match what's available on the source chain
              let moveableToken: any;
              
              if (isTokenTransfer) {
                // For ERC-20 tokens, find the corresponding moveable token
                const tokenSymbol = paymentRequirements.tokenSymbol || 'USDC'; // Default to USDC for token transfers
                try {
                  moveableToken = pushChainClient.moveable?.token?.[tokenSymbol];
                  if (!moveableToken) {
                    // Try USDT as fallback
                    moveableToken = pushChainClient.moveable?.token?.USDT;
                  }
                } catch (e) {
                  console.warn(`Could not find moveable token ${tokenSymbol}:`, e);
                }
                
                if (!moveableToken) {
                  throw new Error(`Token ${tokenSymbol} is not available for bridging from this chain. Please use USDC or USDT.`);
                }
                
                if (onPaymentStatus) {
                  onPaymentStatus(`Using ${moveableToken.symbol} for cross-chain bridge...`);
                }
              } else {
                // For native tokens (ETH), use the native token accessor
                try {
                  moveableToken = pushChainClient.moveable?.token?.ETH;
                } catch (e) {
                  console.warn('Could not find ETH moveable token:', e);
                }
                
                if (!moveableToken) {
                  throw new Error('Native ETH bridging is not available from this chain.');
                }
                
                if (onPaymentStatus) {
                  onPaymentStatus(`Using native ${moveableToken.symbol} for cross-chain bridge...`);
                }
              }

              // Parse amount with correct decimals
              const decimals = moveableToken?.decimals || 18;
              const amountValue = PushChainModule.utils.helpers.parseUnits(amount.toString(), decimals);

              console.log('[x402-sdk] Universal Transaction setup:', {
                recipient,
                amount: amount.toString(),
                decimals,
                amountValue: amountValue.toString(),
                tokenSymbol: moveableToken?.symbol,
                tokenMechanism: moveableToken?.mechanism,
                isTokenTransfer,
              });

              // ═══════════════════════════════════════════════════════════════════════════════════
              // SIMPLE CROSS-CHAIN PAYMENT
              // 
              // Just bridge funds directly to recipient - NO contract call needed!
              // This path supports BOTH native (ETH) and ERC-20 tokens
              // ═══════════════════════════════════════════════════════════════════════════════════
              
              const txParams: any = {
                to: recipient,  // Send directly to recipient on Push Chain
                funds: {
                  amount: amountValue,
                  token: moveableToken,
                },
                // NO 'data' field = pure bridging = supports native ETH!
              };

              if (onPaymentStatus) {
                onPaymentStatus(`Sending ${moveableToken?.symbol || 'tokens'} to ${recipient.slice(0, 10)}... on Push Chain...`);
              }

              debugLog(finalConfig, 'Universal Transaction params', {
                to: txParams.to,
                hasData: !!txParams.data,
                hasFunds: !!txParams.funds,
                hasValue: !!txParams.value,
                sourceChain: walletChainId,
              });

              const txResponse = await sendUniversalTransaction(pushChainClient, txParams, onPaymentStatus);

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

          // Option 2: Use wallet provider (browser/client-side) - for Push Chain direct calls
          // This is used when wallet is on Push Chain (no cross-chain bridging needed)
          if (!paymentResult && walletProvider) {
            try {
            const ethersForWallet = await loadEthers();

              // Check if we should use this path
              // We only use direct wallet calls when on Push Chain
              // If on external chain, cross-chain tx should have been handled by Option 1
              const currentWalletChain = walletChainId || await detectWalletChainId(walletProvider, signer, finalConfig);
              
              if (currentWalletChain && currentWalletChain !== PUSH_CHAIN_ID) {
                // Wallet is on external chain - cannot use direct call
                // Push Chain contracts don't exist on external chains
                const errorMsg = `Your wallet is on chain ${currentWalletChain}, but payment requires Push Chain (${PUSH_CHAIN_ID}). ` +
                  `Please either: 1) Enable "Use Universal Transaction" for cross-chain payment, or ` +
                  `2) Switch your wallet to Push Chain.`;

            if (onPaymentStatus) {
                  onPaymentStatus(`Error: ${errorMsg}`);
                }
                
                throw new X402Error(
                  errorMsg,
                  X402ErrorCode.NETWORK_ERROR,
                  { 
                    walletChainId: currentWalletChain, 
                    expectedChainId: PUSH_CHAIN_ID,
                    suggestion: 'Enable Universal Transaction or switch to Push Chain'
                  }
                );
              }

              if (onPaymentStatus) {
                onPaymentStatus(`Processing ${isTokenTransfer ? 'token' : 'native'} transfer on Push Chain...`);
            }

            // Sign transaction with wallet provider
            const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;

              // Get signer from wallet provider (may already be available from earlier detection)
              const walletSigner = signer || (walletProvider.getSigner ? await walletProvider.getSigner() : null);
              
              if (!walletSigner) {
              throw new X402Error(
                'Wallet provider does not support getSigner()',
                X402ErrorCode.PAYMENT_METHOD_NOT_AVAILABLE
              );
            }
            
            const amountWei = ethersForWallet.parseEther(amount.toString());

            if (isTokenTransfer) {
              // Token transfer
              const facilitatorAbi = [
                'function facilitateTokenTransfer(address token, address recipient, uint256 amount) external',
              ];
              const contract = new ethersForWallet.Contract(facilitatorContractAddress, facilitatorAbi, walletSigner);
              
              // Verify token contract exists by checking code size (non-blocking)
              // This is a soft check - we'll continue anyway and let the actual token call fail if needed
              try {
                const provider = walletSigner.provider || new ethersForWallet.JsonRpcProvider(chainInfo.rpcUrl);
                const code = await provider.getCode(tokenAddress);
                if (code === '0x' || code === '0x0') {
                  // Log warning but DON'T throw - RPC might have issues
                  console.warn(`[x402] Token contract code check returned empty for ${tokenAddress}. This may be an RPC issue. Continuing anyway...`);
                  debugLog(finalConfig, 'Token contract code check returned empty', {
                    tokenAddress,
                    chainId: chainInfo.chainId,
                    provider: provider.constructor.name,
                    note: 'Continuing with token transfer attempt'
                  });
                } else {
                  debugLog(finalConfig, 'Token contract verified', { tokenAddress, codeLength: code.length });
                }
              } catch (codeError: any) {
                // If we can't check code, continue anyway - not a critical check
                console.warn('[x402] Could not verify token contract existence:', codeError.message);
              }
              
              // Approve token spend first
              const tokenAbi = ['function approve(address spender, uint256 amount) external returns (bool)'];
              const tokenContract = new ethersForWallet.Contract(tokenAddress, tokenAbi, walletSigner);
              
              if (onPaymentStatus) {
                onPaymentStatus('Checking token allowance...');
              }
              
              // Check current allowance (with error handling)
              const allowanceAbi = ['function allowance(address owner, address spender) external view returns (uint256)'];
              const allowanceContract = new ethersForWallet.Contract(tokenAddress, allowanceAbi, walletSigner);
              
              let currentAllowance = BigInt(0);
              try {
                currentAllowance = await allowanceContract.allowance(await walletSigner.getAddress(), facilitatorContractAddress);
                debugLog(finalConfig, 'Token allowance check passed', { currentAllowance: currentAllowance.toString() });
              } catch (allowanceError: any) {
                // If allowance check fails, DON'T throw - try to proceed with approval
                // The allowance check can fail due to RPC issues even if the contract exists
                const errorMsg = allowanceError.message || String(allowanceError);
                console.warn('[x402] Allowance check failed, will attempt approval anyway:', errorMsg);
                debugLog(finalConfig, 'Allowance check failed, continuing', {
                  errorMsg,
                  errorCode: allowanceError.code,
                  tokenAddress,
                });
                
                if (onPaymentStatus) {
                  onPaymentStatus('Allowance check skipped, attempting direct approval...');
                }
                // Set to 0 to force approval attempt
                currentAllowance = BigInt(0);
              }
              
              if (currentAllowance < amountWei) {
                if (onPaymentStatus) {
                  onPaymentStatus('Approving token spend...');
                }
                try {
                const approveTx = await tokenContract.approve(facilitatorContractAddress, amountWei);
                await approveTx.wait();
                if (onPaymentStatus) {
                  onPaymentStatus('Token approval confirmed, proceeding with transfer...');
                  }
                } catch (approveError: any) {
                  const errorMsg = approveError.message || String(approveError);
                  const errorCode = approveError.code;
                  
                  // Check for user rejection
                  if (errorMsg.includes('user rejected') || errorCode === 'ACTION_REJECTED' || errorCode === 4001) {
                    throw new X402Error(
                      'Token approval was rejected by user',
                      X402ErrorCode.PAYMENT_FAILED,
                      { tokenAddress, userRejected: true }
                    );
                  }
                  
                  // Check for contract/decode errors
                  const isContractError = 
                    errorMsg.includes('could not decode') || 
                    errorMsg.includes('value="0x"') ||
                    errorCode === 'BAD_DATA' ||
                    errorCode === 'CALL_EXCEPTION';
                  
                  if (isContractError) {
                    // This might be RPC issues or contract issues
                    // Log detailed info for debugging
                    console.error('[x402] Token approve failed:', {
                      tokenAddress,
                      errorMsg,
                      errorCode,
                      chainId: chainInfo.chainId,
                    });
                    
                    const friendlyMsg = `Token approval failed. The token contract at ${tokenAddress} may not support approvals or there's an RPC issue. ` +
                      `Please try again or use a different token. (Chain: ${chainInfo.chainId})`;
                    if (onPaymentStatus) {
                      onPaymentStatus(`Error: ${friendlyMsg}`);
                    }
                    throw new X402Error(
                      friendlyMsg,
                      X402ErrorCode.TRANSACTION_FAILED,
                      { tokenAddress, chainId: chainInfo.chainId, walletChainId, originalError: errorMsg }
                    );
                  }
                  throw approveError;
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
              
              // Get chain ID - wrap in try-catch to handle "network changed" errors
              let chainId: string | number = chainInfo.chainId;
              try {
              if (walletProvider.getNetwork) {
                const network = await walletProvider.getNetwork();
                chainId = typeof network.chainId === 'bigint' ? network.chainId.toString() : network.chainId.toString();
                }
              } catch (networkError: any) {
                console.warn('Could not get network after tx confirmation (using default):', networkError.message);
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
              const contract = new ethersForWallet.Contract(facilitatorContractAddress, facilitatorAbi, walletSigner);

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
              
              // Get chain ID - wrap in try-catch to handle "network changed" errors
              // that can occur if user switches networks after tx confirmation
              let chainId: string | number = chainInfo.chainId;
              try {
              if (walletProvider.getNetwork) {
                const network = await walletProvider.getNetwork();
                chainId = typeof network.chainId === 'bigint' ? network.chainId.toString() : network.chainId.toString();
                }
              } catch (networkError: any) {
                // Ignore network detection errors - tx already confirmed
                console.warn('Could not get network after tx confirmation (using default):', networkError.message);
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
            } catch (walletError: any) {
              // If it's already an X402Error, re-throw it
              if (walletError instanceof X402Error) {
                throw walletError;
              }
              
              // Check for decode/chain errors
              const errorMsg = walletError.message || String(walletError);
              const errorCode = walletError.code || walletError.error?.code;
              
              // Check for "network changed" error - this can happen if user switches chains
              // during the transaction process. Provide helpful error message.
              const isNetworkChangedError = 
                errorMsg.includes('network changed') ||
                (errorCode === 'NETWORK_ERROR' && errorMsg.includes('=>'));
              
              if (isNetworkChangedError) {
                const errorMessage = `Network changed during transaction. Please stay on Push Chain (${PUSH_CHAIN_ID}) while the transaction is processing. If you switched networks, please switch back and try again.`;
                if (onPaymentStatus) {
                  onPaymentStatus(`Error: ${errorMessage}`);
                }
                throw new X402Error(
                  errorMessage,
                  X402ErrorCode.NETWORK_ERROR,
                  { 
                    originalError: errorMsg,
                    suggestion: 'Keep wallet on Push Chain during transaction'
                  }
                );
              }
              
              // Check for specific error types
              const isUserRejection = 
                errorMsg.includes('user rejected') || 
                errorCode === 'ACTION_REJECTED' || 
                errorCode === 4001;
              
              if (isUserRejection) {
                throw new X402Error(
                  'Transaction was rejected by user',
                  X402ErrorCode.PAYMENT_FAILED,
                  { userRejected: true }
                );
              }
              
              const isInsufficientFunds = 
                errorMsg.includes('insufficient funds') ||
                errorMsg.includes('exceeds balance') ||
                errorMsg.includes('INSUFFICIENT_FUNDS');
              
              if (isInsufficientFunds) {
                throw new X402Error(
                  `Insufficient funds for ${isTokenTransfer ? 'token' : 'native'} transfer. Please ensure you have enough balance.`,
                  X402ErrorCode.INSUFFICIENT_FUNDS,
                  { isTokenTransfer, tokenAddress }
                );
              }
              
              // For contract call errors (gas estimation, execution), provide helpful context
              const isCallError = 
                errorCode === 'CALL_EXCEPTION' ||
                errorCode === 'BAD_DATA' ||
                errorMsg.includes('could not decode') ||
                errorMsg.includes('execution reverted');
              
              if (isCallError && isTokenTransfer) {
                // This could be: token not on chain, no approval, insufficient token balance, etc.
                const errorMessage = `Token transfer failed. This could be due to: insufficient token balance, missing approval, or contract issue. ` +
                  `Token: ${tokenAddress}. Try approving more tokens or check your balance.`;
                console.error('[x402] Token transfer call failed:', {
                  errorMsg,
                  errorCode,
                  tokenAddress,
                  facilitatorAddress,
                });
                if (onPaymentStatus) {
                  onPaymentStatus(`Error: ${errorMessage}`);
                }
                throw new X402Error(
                  errorMessage,
                  X402ErrorCode.TRANSACTION_FAILED,
                  { 
                    tokenAddress, 
                    chainId: chainInfo.chainId,
                    originalError: errorMsg 
                  }
                );
              }
              
              // For other errors, re-throw as-is (will be caught by outer catch)
              throw walletError;
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
          // Option 4: Use custom payment endpoint (only if NO wallet/key methods are configured)
          // This prevents falling back to server endpoint when browser wallet should be used
          const hasWalletMethod = walletProvider || privateKey || providedUniversalSigner || viemClient || solanaKeypair;
          
          if (!paymentResult && paymentEndpoint && !hasWalletMethod) {
            // Only use payment endpoint if user explicitly provided one AND no wallet methods are configured
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
            let errorMessage: string;
            
            if (walletProvider && walletChainId && walletChainId !== PUSH_CHAIN_ID) {
              // Browser wallet on external chain - need Universal Transaction
              errorMessage =
                `Payment failed: Your wallet is on chain ${walletChainId}, not Push Chain (${PUSH_CHAIN_ID}). ` +
                'For cross-chain payments, please enable "Use Universal Transaction" in settings. ' +
                'This allows the SDK to bridge your assets to Push Chain automatically.';
            } else if (walletProvider) {
              // Browser wallet configured but failed for other reason
              errorMessage =
                'Payment failed: Browser wallet payment was not completed. ' +
                'Please ensure your wallet is connected and on Push Chain (chainId: 42101), then try again.';
            } else {
              errorMessage =
              'Payment processing failed: No payment method available. ' +
                'Please provide one of: walletProvider, privateKey, universalSigner, viemClient, solanaKeypair, or paymentEndpoint. ' +
                'The SDK uses Push Chain Universal Transactions for multi-chain support!';
            }
            
            debugLog(finalConfig, 'Payment method failed or not available', {
              hasWalletProvider: !!walletProvider,
              hasPrivateKey: !!privateKey,
              hasUniversalSigner: !!providedUniversalSigner,
              hasViemClient: !!viemClient,
              hasSolanaKeypair: !!solanaKeypair,
              hasPaymentEndpoint: !!paymentEndpoint,
              walletChainId,
              isWalletOnPushChain,
            });
            throw new X402Error(errorMessage, X402ErrorCode.PAYMENT_METHOD_NOT_AVAILABLE, {
              hasWalletProvider: !!walletProvider,
              hasPrivateKey: !!privateKey,
              hasUniversalSigner: !!providedUniversalSigner,
              hasViemClient: !!viemClient,
              hasSolanaKeypair: !!solanaKeypair,
              hasPaymentEndpoint: !!paymentEndpoint,
              walletChainId,
              suggestion: walletChainId !== PUSH_CHAIN_ID 
                ? 'Enable Universal Transaction for cross-chain payments' 
                : 'Ensure wallet is connected to Push Chain',
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
          // If it's already an X402Error, pass it through
          if (paymentError instanceof X402Error) {
            if (onPaymentStatus) {
              onPaymentStatus(`Payment failed: ${paymentError.message}`);
            }
            return Promise.reject(paymentError);
          }
          
          const errorMessage = paymentError.response?.data?.message 
            || paymentError.message 
            || 'Unknown payment processing error';
          
          // Determine error code based on error type
          let errorCode = X402ErrorCode.PAYMENT_FAILED;
          if (paymentError.message?.includes('insufficient funds') || paymentError.message?.includes('balance')) {
            errorCode = X402ErrorCode.INSUFFICIENT_FUNDS;
          } else if (paymentError.message?.includes('transaction') || paymentError.message?.includes('revert')) {
            errorCode = X402ErrorCode.TRANSACTION_FAILED;
          } else if (paymentError.code === 'ECONNREFUSED' || paymentError.code === 'ETIMEDOUT' || paymentError.code === 'BAD_DATA' || paymentError.code === 'CALL_EXCEPTION') {
            errorCode = X402ErrorCode.NETWORK_ERROR;
          } else if (paymentError.message?.includes('could not decode') || paymentError.message?.includes('Token contract not found')) {
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
            originalError: paymentError,
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

