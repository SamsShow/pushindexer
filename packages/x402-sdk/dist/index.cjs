"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DEFAULT_CHAIN_ID: () => DEFAULT_CHAIN_ID,
  DEFAULT_FACILITATOR_ADDRESS: () => DEFAULT_FACILITATOR_ADDRESS,
  DEFAULT_PUSH_CHAIN_RPC: () => DEFAULT_PUSH_CHAIN_RPC,
  DEFAULT_PUSH_NETWORK: () => DEFAULT_PUSH_NETWORK,
  PUSH_CHAIN_DONUT_TESTNET: () => PUSH_CHAIN_DONUT_TESTNET,
  SUPPORTED_CHAINS: () => SUPPORTED_CHAINS,
  SUPPORTED_TOKENS: () => SUPPORTED_TOKENS,
  X402ClientBuilder: () => X402ClientBuilder,
  X402Error: () => X402Error,
  X402ErrorCode: () => X402ErrorCode,
  createConfig: () => createConfig,
  createX402Client: () => createX402Client,
  getChainByNamespace: () => getChainByNamespace,
  getDefaultConfig: () => getDefaultConfig,
  getPresetConfig: () => getPresetConfig,
  getSupportedChains: () => getSupportedChains,
  getSupportedTokens: () => getSupportedTokens,
  getTokenByAddress: () => getTokenByAddress,
  getTokenBySymbol: () => getTokenBySymbol,
  getTokensByChain: () => getTokensByChain,
  loadConfigFromEnv: () => loadConfigFromEnv,
  mergeConfig: () => mergeConfig
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_axios = __toESM(require("axios"), 1);

// src/types.ts
var X402ErrorCode = /* @__PURE__ */ ((X402ErrorCode2) => {
  X402ErrorCode2["PAYMENT_REQUIRED"] = "PAYMENT_REQUIRED";
  X402ErrorCode2["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
  X402ErrorCode2["PAYMENT_FAILED"] = "PAYMENT_FAILED";
  X402ErrorCode2["INVALID_PAYMENT_REQUIREMENTS"] = "INVALID_PAYMENT_REQUIREMENTS";
  X402ErrorCode2["PAYMENT_METHOD_NOT_AVAILABLE"] = "PAYMENT_METHOD_NOT_AVAILABLE";
  X402ErrorCode2["TRANSACTION_FAILED"] = "TRANSACTION_FAILED";
  X402ErrorCode2["NETWORK_ERROR"] = "NETWORK_ERROR";
  X402ErrorCode2["MAX_RETRIES_EXCEEDED"] = "MAX_RETRIES_EXCEEDED";
  X402ErrorCode2["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
  return X402ErrorCode2;
})(X402ErrorCode || {});
var X402Error = class _X402Error extends Error {
  code;
  details;
  response;
  request;
  constructor(message, code = "UNKNOWN_ERROR" /* UNKNOWN_ERROR */, details) {
    super(message);
    this.name = "X402Error";
    this.code = code;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _X402Error);
    }
  }
  /**
   * Create X402Error from an existing error
   */
  static fromError(error, code) {
    if (error instanceof _X402Error) {
      return error;
    }
    const x402Error = new _X402Error(
      error.message || "Unknown error occurred",
      code || "UNKNOWN_ERROR" /* UNKNOWN_ERROR */,
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
};

// src/config.ts
var DEFAULT_FACILITATOR_ADDRESS = "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7";
var DEFAULT_CHAIN_ID = 42101;
var DEFAULT_PUSH_CHAIN_RPC = "https://evm.donut.rpc.push.org/";
var DEFAULT_PUSH_NETWORK = "testnet";
function getEnvVar(key) {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return void 0;
}
function loadConfigFromEnv() {
  const config = {};
  const facilitatorAddress = getEnvVar("PUSH_X402_FACILITATOR_ADDRESS");
  if (facilitatorAddress) {
    config.facilitatorAddress = facilitatorAddress;
  }
  const chainId = getEnvVar("PUSH_X402_CHAIN_ID");
  if (chainId) {
    const parsed = parseInt(chainId, 10);
    if (!isNaN(parsed)) {
      config.chainId = parsed;
    }
  }
  const rpcUrl = getEnvVar("PUSH_X402_RPC_URL");
  if (rpcUrl) {
    config.pushChainRpcUrl = rpcUrl;
  }
  const privateKey = getEnvVar("PUSH_X402_PRIVATE_KEY");
  if (privateKey) {
    config.privateKey = privateKey;
  }
  const pushNetwork = getEnvVar("PUSH_X402_NETWORK");
  if (pushNetwork === "testnet" || pushNetwork === "mainnet") {
    config.pushNetwork = pushNetwork;
  }
  return config;
}
function getDefaultConfig() {
  return {
    facilitatorAddress: DEFAULT_FACILITATOR_ADDRESS,
    chainId: DEFAULT_CHAIN_ID,
    pushChainRpcUrl: DEFAULT_PUSH_CHAIN_RPC,
    pushNetwork: DEFAULT_PUSH_NETWORK
  };
}
function mergeConfig(userConfig = {}) {
  const defaults = getDefaultConfig();
  const envConfig = loadConfigFromEnv();
  const merged = {
    ...defaults,
    ...envConfig,
    ...userConfig
  };
  if (!merged.baseURL) {
    try {
      const globalWindow = typeof globalThis !== "undefined" ? globalThis.window : void 0;
      if (globalWindow && globalWindow.location && globalWindow.location.origin) {
        merged.baseURL = globalWindow.location.origin;
      }
    } catch {
    }
  }
  return merged;
}
function createConfig(userConfig = {}) {
  return mergeConfig(userConfig);
}

// src/presets.ts
var PUSH_TESTNET_CONFIG = {
  facilitatorAddress: "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7",
  chainId: 42101,
  pushChainRpcUrl: "https://evm.donut.rpc.push.org/",
  pushNetwork: "testnet"
};
var PUSH_MAINNET_CONFIG = {
  facilitatorAddress: "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7",
  // TODO: Update when mainnet is available
  chainId: 42101,
  // TODO: Update when mainnet is available
  pushChainRpcUrl: "https://evm.rpc-testnet-donut-node1.push.org/",
  // TODO: Update when mainnet is available
  pushNetwork: "mainnet"
};
function getPresetConfig(network) {
  switch (network) {
    case "push-testnet":
      return { ...PUSH_TESTNET_CONFIG };
    case "push-mainnet":
      return { ...PUSH_MAINNET_CONFIG };
    default:
      throw new Error(`Unknown network preset: ${network}. Supported presets: 'push-testnet', 'push-mainnet'`);
  }
}

// src/client.ts
var ethers;
var ethersPromise = null;
async function loadEthers() {
  if (ethers) {
    return ethers;
  }
  if (ethersPromise) {
    return ethersPromise;
  }
  ethersPromise = (async () => {
    try {
      const ethersModule = await import("ethers");
      ethers = ethersModule.default || ethersModule;
      return ethers;
    } catch (error) {
      if (typeof require !== "undefined") {
        try {
          ethers = require("ethers");
          return ethers;
        } catch {
        }
      }
      throw new Error("ethers.js is not available. Please install it: npm install ethers");
    }
  })();
  return ethersPromise;
}
var PushChain;
var pushChainPromise = null;
async function loadPushChain() {
  if (PushChain) {
    return PushChain;
  }
  if (pushChainPromise) {
    return pushChainPromise;
  }
  pushChainPromise = (async () => {
    try {
      const pushChainModule = await import("@pushchain/core");
      console.log("[x402-sdk] @pushchain/core imported:", {
        hasDefault: !!pushChainModule.default,
        keys: Object.keys(pushChainModule).slice(0, 10),
        // Limit keys for logging
        hasPushChainExport: !!pushChainModule.PushChain
      });
      if (pushChainModule.PushChain) {
        PushChain = pushChainModule.PushChain;
      } else if (pushChainModule.default?.PushChain) {
        PushChain = pushChainModule.default.PushChain;
      } else if (pushChainModule.default) {
        PushChain = pushChainModule.default;
      } else {
        PushChain = pushChainModule;
      }
      console.log("[x402-sdk] PushChain loaded:", {
        hasUtils: !!PushChain?.utils,
        hasSigner: !!PushChain?.utils?.signer,
        hasToUniversal: typeof PushChain?.utils?.signer?.toUniversal === "function",
        hasConstants: !!PushChain?.CONSTANTS,
        hasInitialize: typeof PushChain?.initialize === "function",
        type: typeof PushChain
      });
      return PushChain;
    } catch (error) {
      console.warn("[x402-sdk] Failed to import @pushchain/core:", error?.message || error);
      if (typeof require !== "undefined") {
        try {
          const reqModule = require("@pushchain/core");
          PushChain = reqModule.PushChain || reqModule.default?.PushChain || reqModule;
          console.log("[x402-sdk] PushChain loaded via require:", {
            hasUtils: !!PushChain?.utils,
            hasSigner: !!PushChain?.utils?.signer
          });
          return PushChain;
        } catch (reqError) {
          console.warn("[x402-sdk] Failed to require @pushchain/core:", reqError?.message || reqError);
        }
      }
      return null;
    }
  })();
  return pushChainPromise;
}
function validatePaymentRequirements(requirements) {
  if (!requirements || typeof requirements !== "object") {
    throw new Error("Invalid payment requirements: response data is not an object");
  }
  const recipient = requirements.payTo || requirements.recipient;
  const amount = requirements.maxAmountRequired || requirements.amount;
  if (!recipient || typeof recipient !== "string") {
    throw new Error("Invalid payment requirements: recipient address is required");
  }
  if (!amount || typeof amount !== "string" && typeof amount !== "number") {
    throw new Error("Invalid payment requirements: amount is required");
  }
  return requirements;
}
function debugLog(config, message, data) {
  if (config.debug) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const logData = data ? ` ${JSON.stringify(data, null, 2)}` : "";
    console.log(`[x402-sdk:${timestamp}] ${message}${logData}`);
  }
}
function detectChainInfo(paymentRequirements, config) {
  if (paymentRequirements.rpcUrl) {
    return {
      chainId: paymentRequirements.chainId || DEFAULT_CHAIN_ID,
      rpcUrl: paymentRequirements.rpcUrl,
      network: paymentRequirements.network
    };
  }
  if (paymentRequirements.chainId && config.chainRpcMap) {
    const chainIdStr = String(paymentRequirements.chainId);
    const rpcUrl = config.chainRpcMap[chainIdStr] || config.chainRpcMap[paymentRequirements.chainId];
    if (rpcUrl) {
      return {
        chainId: paymentRequirements.chainId,
        rpcUrl,
        network: paymentRequirements.network
      };
    }
  }
  if (config.pushChainRpcUrl) {
    return {
      chainId: paymentRequirements.chainId || config.chainId || DEFAULT_CHAIN_ID,
      rpcUrl: config.pushChainRpcUrl,
      network: paymentRequirements.network
    };
  }
  if (paymentRequirements.chainId) {
    return {
      chainId: paymentRequirements.chainId,
      rpcUrl: DEFAULT_PUSH_CHAIN_RPC,
      network: paymentRequirements.network
    };
  }
  if (config.chainId) {
    return {
      chainId: config.chainId,
      rpcUrl: DEFAULT_PUSH_CHAIN_RPC,
      network: paymentRequirements.network
    };
  }
  return {
    chainId: DEFAULT_CHAIN_ID,
    rpcUrl: DEFAULT_PUSH_CHAIN_RPC,
    network: "push"
  };
}
var PUSH_CHAIN_ID = "42101";
async function detectWalletChainId(walletProvider, signer, debugConfig) {
  let walletChainId;
  const isBrowser = typeof globalThis !== "undefined" && typeof globalThis.window !== "undefined";
  const ethereumProvider = isBrowser ? globalThis.window?.ethereum : void 0;
  if (ethereumProvider) {
    try {
      const chainId = await ethereumProvider.request({ method: "eth_chainId" });
      if (chainId) {
        walletChainId = parseInt(chainId, 16).toString();
        if (debugConfig) {
          debugLog(debugConfig, "Chain ID from ethereum.request", { walletChainId, hex: chainId });
        }
        return walletChainId;
      }
    } catch (ethError) {
      console.warn("Could not get chainId from ethereum.request:", ethError);
    }
  }
  if (!walletChainId && walletProvider?.getNetwork) {
    try {
      const network = await walletProvider.getNetwork();
      walletChainId = typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString();
      if (debugConfig) {
        debugLog(debugConfig, "Chain ID from wallet provider", { walletChainId });
      }
      return walletChainId;
    } catch (networkError) {
      console.warn("Could not get network from wallet provider:", networkError);
    }
  }
  if (!walletChainId && signer?.provider) {
    try {
      const network = await signer.provider.getNetwork();
      walletChainId = typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString();
      if (debugConfig) {
        debugLog(debugConfig, "Chain ID from signer provider", { walletChainId });
      }
      return walletChainId;
    } catch (providerError) {
      console.warn("Could not get network from signer provider:", providerError);
    }
  }
  return void 0;
}
async function createUniversalSignerFromEthersSigner(ethersSigner) {
  const PushChainModule = await loadPushChain();
  if (!PushChainModule || !PushChainModule.utils || !PushChainModule.utils.signer) {
    console.warn("Push Chain SDK not available for Universal Signer creation");
    return null;
  }
  try {
    const universalSigner = await PushChainModule.utils.signer.toUniversal(ethersSigner);
    return universalSigner;
  } catch (error) {
    console.warn("Failed to create Universal Signer from ethers:", error);
    return null;
  }
}
async function createUniversalSignerFromViemClient(viemClient) {
  const PushChainModule = await loadPushChain();
  if (!PushChainModule || !PushChainModule.utils || !PushChainModule.utils.signer) {
    console.warn("Push Chain SDK not available for Universal Signer creation");
    return null;
  }
  try {
    const universalSigner = await PushChainModule.utils.signer.toUniversal(viemClient);
    return universalSigner;
  } catch (error) {
    console.warn("Failed to create Universal Signer from Viem:", error);
    return null;
  }
}
async function createUniversalSignerFromSolanaKeypair(keypair, chain) {
  const PushChainModule = await loadPushChain();
  if (!PushChainModule || !PushChainModule.utils || !PushChainModule.utils.signer) {
    console.warn("Push Chain SDK not available for Universal Signer creation");
    return null;
  }
  try {
    const universalSigner = await PushChainModule.utils.signer.toUniversalFromKeypair(keypair, {
      chain: chain || PushChainModule.CONSTANTS.CHAIN.SOLANA_DEVNET,
      library: PushChainModule.CONSTANTS.LIBRARY.SOLANA_WEB3JS
    });
    return universalSigner;
  } catch (error) {
    console.warn("Failed to create Universal Signer from Solana keypair:", error);
    return null;
  }
}
async function initializePushChainClient(universalSigner, pushNetwork = "testnet", onPaymentStatus) {
  const PushChainModule = await loadPushChain();
  if (!PushChainModule) {
    throw new Error("@pushchain/core is not available. Please install it: npm install @pushchain/core");
  }
  const networkConstant = pushNetwork === "mainnet" ? PushChainModule.CONSTANTS.PUSH_NETWORK.MAINNET : PushChainModule.CONSTANTS.PUSH_NETWORK.TESTNET;
  const initOptions = {
    network: networkConstant
  };
  if (onPaymentStatus) {
    initOptions.progressHook = async (progress) => {
      onPaymentStatus(progress.title);
    };
  }
  const pushChainClient = await PushChainModule.initialize(universalSigner, initOptions);
  return pushChainClient;
}
async function sendUniversalTransaction(pushChainClient, txParams, onPaymentStatus) {
  if (!pushChainClient || !pushChainClient.universal || !pushChainClient.universal.sendTransaction) {
    throw new Error("Invalid Push Chain Client: universal.sendTransaction not available");
  }
  if (onPaymentStatus) {
    onPaymentStatus("Submitting Universal Transaction to Push Chain...");
  }
  const txResponse = await pushChainClient.universal.sendTransaction(txParams);
  return txResponse;
}
function createX402Client(config = {}) {
  let finalConfig = config;
  if (config.network) {
    const presetConfig = getPresetConfig(config.network);
    finalConfig = {
      ...presetConfig,
      ...config
      // User config overrides preset
    };
  }
  finalConfig = mergeConfig(finalConfig);
  const {
    paymentEndpoint,
    // No default - users must provide walletProvider, privateKey, universalSigner, viemClient, solanaKeypair, or their own endpoint
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
    pushNetwork = "testnet",
    pushChainRpcUrl,
    chainRpcMap,
    debug = false
  } = finalConfig;
  debugLog(finalConfig, "Creating x402 client", {
    hasWalletProvider: !!walletProvider,
    hasPrivateKey: !!privateKey,
    hasUniversalSigner: !!providedUniversalSigner,
    hasViemClient: !!viemClient,
    hasSolanaKeypair: !!solanaKeypair,
    hasPaymentEndpoint: !!paymentEndpoint,
    pushNetwork,
    facilitatorAddress,
    chainId,
    baseURL
  });
  const axiosInstance = import_axios.default.create({
    baseURL,
    ...axiosConfig
  });
  const retryAttempts = /* @__PURE__ */ new WeakMap();
  const MAX_RETRIES = 1;
  axiosInstance.interceptors.response.use(
    (response) => response,
    // Pass through successful responses
    async (error) => {
      if (error.response?.status === 402) {
        const originalConfig = error.config;
        if (originalConfig) {
          const attempts = retryAttempts.get(originalConfig) || 0;
          if (attempts >= MAX_RETRIES) {
            const errorMessage = "Maximum retry attempts reached for payment processing";
            debugLog(finalConfig, "Max retries exceeded", { attempts, maxRetries: MAX_RETRIES });
            if (onPaymentStatus) {
              onPaymentStatus(`Error: ${errorMessage}`);
            }
            return Promise.reject(
              new X402Error(errorMessage, "MAX_RETRIES_EXCEEDED" /* MAX_RETRIES_EXCEEDED */, { attempts, maxRetries: MAX_RETRIES })
            );
          }
          retryAttempts.set(originalConfig, attempts + 1);
        }
        debugLog(finalConfig, "402 Payment Required detected", {
          url: originalConfig?.url,
          method: originalConfig?.method,
          responseData: error.response?.data
        });
        let paymentRequirements;
        try {
          paymentRequirements = validatePaymentRequirements(error.response.data);
          debugLog(finalConfig, "Payment requirements validated", {
            recipient: paymentRequirements.payTo || paymentRequirements.recipient,
            amount: paymentRequirements.maxAmountRequired || paymentRequirements.amount,
            currency: paymentRequirements.asset || paymentRequirements.currency,
            chainId: paymentRequirements.chainId
          });
        } catch (validationError) {
          const errorMessage = `Invalid 402 response: ${validationError.message}`;
          debugLog(finalConfig, "Payment requirements validation failed", { error: validationError.message });
          if (onPaymentStatus) {
            onPaymentStatus(`Error: ${errorMessage}`);
          }
          return Promise.reject(
            new X402Error(errorMessage, "INVALID_PAYMENT_REQUIREMENTS" /* INVALID_PAYMENT_REQUIREMENTS */, validationError)
          );
        }
        if (onPaymentStatus) {
          const amount = paymentRequirements.maxAmountRequired || paymentRequirements.amount || "unknown";
          const currency = paymentRequirements.asset || paymentRequirements.currency || "";
          onPaymentStatus(`Payment required: ${amount} ${currency}`);
        }
        try {
          if (onPaymentStatus) {
            onPaymentStatus("Processing payment on blockchain...");
          }
          const recipient = paymentRequirements.payTo || paymentRequirements.recipient;
          const amount = paymentRequirements.maxAmountRequired || paymentRequirements.amount;
          const tokenAddress = paymentRequirements.token || paymentRequirements.asset;
          if (!recipient || !amount) {
            throw new Error("Missing recipient or amount in payment requirements");
          }
          const chainInfo = detectChainInfo(paymentRequirements, config);
          const isTokenTransfer = !!tokenAddress && tokenAddress !== "0x0000000000000000000000000000000000000000";
          const PushChainModule = walletProvider || privateKey ? await loadPushChain() : null;
          const ethersModule = walletProvider || privateKey ? await loadEthers() : null;
          let paymentResult;
          let walletChainId;
          let signer;
          if (walletProvider && ethersModule) {
            try {
              if (walletProvider.getSigner) {
                signer = await walletProvider.getSigner();
              }
              walletChainId = await detectWalletChainId(walletProvider, signer, finalConfig);
            } catch (e) {
              console.warn("Could not detect wallet chain:", e);
            }
          }
          const isWalletOnPushChain = walletChainId === PUSH_CHAIN_ID;
          if (onPaymentStatus) {
            if (walletChainId) {
              onPaymentStatus(`Detected wallet on chain ${walletChainId}${isWalletOnPushChain ? " (Push Chain)" : " (External Chain)"}`);
            } else {
              onPaymentStatus("Could not detect wallet chain, will attempt payment...");
            }
          }
          debugLog(finalConfig, "Wallet chain detection result", {
            walletChainId,
            isWalletOnPushChain,
            pushChainId: PUSH_CHAIN_ID,
            targetChainId: chainInfo.chainId
          });
          const hasPushChainSigner = PushChainModule && PushChainModule.utils && PushChainModule.utils.signer;
          const canUseUniversalTx = !isWalletOnPushChain && (providedUniversalSigner || viemClient || solanaKeypair || hasPushChainSigner && (walletProvider || privateKey));
          console.log("[x402-sdk] Universal Transaction check:", {
            isWalletOnPushChain,
            walletChainId,
            pushChainId: PUSH_CHAIN_ID,
            hasPushChainModule: !!PushChainModule,
            hasPushChainUtils: !!PushChainModule?.utils,
            hasPushChainSigner: !!PushChainModule?.utils?.signer,
            hasWalletProvider: !!walletProvider,
            hasPrivateKey: !!privateKey,
            canUseUniversalTx,
            isTokenTransfer
          });
          if (canUseUniversalTx) {
            try {
              if (onPaymentStatus) {
                onPaymentStatus(`Using Push Chain Universal Transaction for cross-chain ${isTokenTransfer ? "token" : "native"} transfer from chain ${walletChainId}...`);
              }
              let universalSigner = providedUniversalSigner;
              if (!universalSigner && viemClient) {
                if (onPaymentStatus) {
                  onPaymentStatus("Creating Universal Signer from Viem client...");
                }
                universalSigner = await createUniversalSignerFromViemClient(viemClient);
              }
              if (!universalSigner && solanaKeypair) {
                if (onPaymentStatus) {
                  onPaymentStatus("Creating Universal Signer from Solana keypair...");
                }
                universalSigner = await createUniversalSignerFromSolanaKeypair(solanaKeypair);
              }
              if (!universalSigner && walletProvider && ethersModule) {
                if (onPaymentStatus) {
                  onPaymentStatus("Creating Universal Signer from wallet provider...");
                }
                if (!walletProvider.getSigner) {
                  throw new Error("Wallet provider does not support getSigner()");
                }
                const chainSigner = await walletProvider.getSigner();
                universalSigner = await createUniversalSignerFromEthersSigner(chainSigner);
              }
              if (!universalSigner && privateKey && ethersModule) {
                if (onPaymentStatus) {
                  onPaymentStatus("Creating Universal Signer from private key...");
                }
                const provider = new ethersModule.JsonRpcProvider(chainInfo.rpcUrl);
                const ethersSigner = new ethersModule.Wallet(privateKey, provider);
                universalSigner = await createUniversalSignerFromEthersSigner(ethersSigner);
              }
              if (!universalSigner) {
                throw new Error("Failed to create Universal Signer");
              }
              if (onPaymentStatus) {
                onPaymentStatus(`Initializing Push Chain Client (${pushNetwork})...`);
              }
              const pushChainClient = await initializePushChainClient(
                universalSigner,
                pushNetwork,
                onPaymentStatus
              );
              if (onPaymentStatus) {
                onPaymentStatus(`Preparing cross-chain ${isTokenTransfer ? "token" : "native"} transfer from chain ${walletChainId}...`);
              }
              let moveableToken;
              if (isTokenTransfer) {
                const tokenSymbol = paymentRequirements.tokenSymbol || "USDC";
                try {
                  moveableToken = pushChainClient.moveable?.token?.[tokenSymbol];
                  if (!moveableToken) {
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
                try {
                  moveableToken = pushChainClient.moveable?.token?.ETH;
                } catch (e) {
                  console.warn("Could not find ETH moveable token:", e);
                }
                if (!moveableToken) {
                  throw new Error("Native ETH bridging is not available from this chain.");
                }
                if (onPaymentStatus) {
                  onPaymentStatus(`Using native ${moveableToken.symbol} for cross-chain bridge...`);
                }
              }
              const decimals = moveableToken?.decimals || 18;
              const amountValue = PushChainModule.utils.helpers.parseUnits(amount.toString(), decimals);
              console.log("[x402-sdk] Universal Transaction setup:", {
                recipient,
                amount: amount.toString(),
                decimals,
                amountValue: amountValue.toString(),
                tokenSymbol: moveableToken?.symbol,
                tokenMechanism: moveableToken?.mechanism,
                isTokenTransfer
              });
              const txParams = {
                to: recipient,
                // Send directly to recipient on Push Chain
                funds: {
                  amount: amountValue,
                  token: moveableToken
                }
                // NO 'data' field = pure bridging = supports native ETH!
              };
              if (onPaymentStatus) {
                onPaymentStatus(`Sending ${moveableToken?.symbol || "tokens"} to ${recipient.slice(0, 10)}... on Push Chain...`);
              }
              debugLog(finalConfig, "Universal Transaction params", {
                to: txParams.to,
                hasData: !!txParams.data,
                hasFunds: !!txParams.funds,
                hasValue: !!txParams.value,
                sourceChain: walletChainId
              });
              const txResponse = await sendUniversalTransaction(pushChainClient, txParams, onPaymentStatus);
              if (onPaymentStatus) {
                onPaymentStatus("Transaction sent, waiting for confirmation...");
              }
              const txHash = txResponse.hash || txResponse.txHash || String(txResponse);
              if (!txHash || txHash === "[object Object]") {
                throw new Error("Invalid transaction result from Universal Transaction");
              }
              const accountChainId = universalSigner.account?.chain || chainInfo.chainId;
              const resolvedChainId = typeof accountChainId === "string" ? accountChainId.split(":")[1] || accountChainId : accountChainId;
              paymentResult = {
                success: true,
                txHash: String(txHash),
                recipient,
                amount: amount.toString(),
                chainId: String(resolvedChainId || chainInfo.chainId)
              };
            } catch (universalError) {
              console.warn("Universal Transaction failed, falling back to direct ethers.js:", universalError);
              if (onPaymentStatus) {
                onPaymentStatus(`Universal Transaction failed: ${universalError.message}. Using fallback...`);
              }
              paymentResult = void 0;
            }
          }
          if (!paymentResult && walletProvider) {
            try {
              const ethersForWallet = await loadEthers();
              const currentWalletChain = walletChainId || await detectWalletChainId(walletProvider, signer, finalConfig);
              if (currentWalletChain && currentWalletChain !== PUSH_CHAIN_ID) {
                const errorMsg = `Your wallet is on chain ${currentWalletChain}, but payment requires Push Chain (${PUSH_CHAIN_ID}). Please either: 1) Enable "Use Universal Transaction" for cross-chain payment, or 2) Switch your wallet to Push Chain.`;
                if (onPaymentStatus) {
                  onPaymentStatus(`Error: ${errorMsg}`);
                }
                throw new X402Error(
                  errorMsg,
                  "NETWORK_ERROR" /* NETWORK_ERROR */,
                  {
                    walletChainId: currentWalletChain,
                    expectedChainId: PUSH_CHAIN_ID,
                    suggestion: "Enable Universal Transaction or switch to Push Chain"
                  }
                );
              }
              if (onPaymentStatus) {
                onPaymentStatus(`Processing ${isTokenTransfer ? "token" : "native"} transfer on Push Chain...`);
              }
              const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;
              const walletSigner = signer || (walletProvider.getSigner ? await walletProvider.getSigner() : null);
              if (!walletSigner) {
                throw new X402Error(
                  "Wallet provider does not support getSigner()",
                  "PAYMENT_METHOD_NOT_AVAILABLE" /* PAYMENT_METHOD_NOT_AVAILABLE */
                );
              }
              const amountWei = ethersForWallet.parseEther(amount.toString());
              if (isTokenTransfer) {
                const facilitatorAbi = [
                  "function facilitateTokenTransfer(address token, address recipient, uint256 amount) external"
                ];
                const contract = new ethersForWallet.Contract(facilitatorContractAddress, facilitatorAbi, walletSigner);
                try {
                  const provider = walletSigner.provider || new ethersForWallet.JsonRpcProvider(chainInfo.rpcUrl);
                  const code = await provider.getCode(tokenAddress);
                  if (code === "0x" || code === "0x0") {
                    console.warn(`[x402] Token contract code check returned empty for ${tokenAddress}. This may be an RPC issue. Continuing anyway...`);
                    debugLog(finalConfig, "Token contract code check returned empty", {
                      tokenAddress,
                      chainId: chainInfo.chainId,
                      provider: provider.constructor.name,
                      note: "Continuing with token transfer attempt"
                    });
                  } else {
                    debugLog(finalConfig, "Token contract verified", { tokenAddress, codeLength: code.length });
                  }
                } catch (codeError) {
                  console.warn("[x402] Could not verify token contract existence:", codeError.message);
                }
                const tokenAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
                const tokenContract = new ethersForWallet.Contract(tokenAddress, tokenAbi, walletSigner);
                if (onPaymentStatus) {
                  onPaymentStatus("Checking token allowance...");
                }
                const allowanceAbi = ["function allowance(address owner, address spender) external view returns (uint256)"];
                const allowanceContract = new ethersForWallet.Contract(tokenAddress, allowanceAbi, walletSigner);
                let currentAllowance = BigInt(0);
                try {
                  currentAllowance = await allowanceContract.allowance(await walletSigner.getAddress(), facilitatorContractAddress);
                  debugLog(finalConfig, "Token allowance check passed", { currentAllowance: currentAllowance.toString() });
                } catch (allowanceError) {
                  const errorMsg = allowanceError.message || String(allowanceError);
                  console.warn("[x402] Allowance check failed, will attempt approval anyway:", errorMsg);
                  debugLog(finalConfig, "Allowance check failed, continuing", {
                    errorMsg,
                    errorCode: allowanceError.code,
                    tokenAddress
                  });
                  if (onPaymentStatus) {
                    onPaymentStatus("Allowance check skipped, attempting direct approval...");
                  }
                  currentAllowance = BigInt(0);
                }
                if (currentAllowance < amountWei) {
                  if (onPaymentStatus) {
                    onPaymentStatus("Approving token spend...");
                  }
                  try {
                    const approveTx = await tokenContract.approve(facilitatorContractAddress, amountWei);
                    await approveTx.wait();
                    if (onPaymentStatus) {
                      onPaymentStatus("Token approval confirmed, proceeding with transfer...");
                    }
                  } catch (approveError) {
                    const errorMsg = approveError.message || String(approveError);
                    const errorCode = approveError.code;
                    if (errorMsg.includes("user rejected") || errorCode === "ACTION_REJECTED" || errorCode === 4001) {
                      throw new X402Error(
                        "Token approval was rejected by user",
                        "PAYMENT_FAILED" /* PAYMENT_FAILED */,
                        { tokenAddress, userRejected: true }
                      );
                    }
                    const isContractError = errorMsg.includes("could not decode") || errorMsg.includes('value="0x"') || errorCode === "BAD_DATA" || errorCode === "CALL_EXCEPTION";
                    if (isContractError) {
                      console.error("[x402] Token approve failed:", {
                        tokenAddress,
                        errorMsg,
                        errorCode,
                        chainId: chainInfo.chainId
                      });
                      const friendlyMsg = `Token approval failed. The token contract at ${tokenAddress} may not support approvals or there's an RPC issue. Please try again or use a different token. (Chain: ${chainInfo.chainId})`;
                      if (onPaymentStatus) {
                        onPaymentStatus(`Error: ${friendlyMsg}`);
                      }
                      throw new X402Error(
                        friendlyMsg,
                        "TRANSACTION_FAILED" /* TRANSACTION_FAILED */,
                        { tokenAddress, chainId: chainInfo.chainId, walletChainId, originalError: errorMsg }
                      );
                    }
                    throw approveError;
                  }
                }
                const gasEstimate = await contract.facilitateTokenTransfer.estimateGas(
                  tokenAddress,
                  recipient,
                  amountWei
                );
                const tx = await contract.facilitateTokenTransfer(tokenAddress, recipient, amountWei, {
                  gasLimit: gasEstimate
                });
                if (onPaymentStatus) {
                  onPaymentStatus("Transaction sent, waiting for confirmation...");
                }
                const receipt = await tx.wait();
                let chainId2 = chainInfo.chainId;
                try {
                  if (walletProvider.getNetwork) {
                    const network = await walletProvider.getNetwork();
                    chainId2 = typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString();
                  }
                } catch (networkError) {
                  console.warn("Could not get network after tx confirmation (using default):", networkError.message);
                }
                paymentResult = {
                  success: true,
                  txHash: tx.hash,
                  recipient,
                  amount: amount.toString(),
                  chainId: chainId2.toString(),
                  blockNumber: receipt.blockNumber
                };
              } else {
                const facilitatorAbi = [
                  "function facilitateNativeTransfer(address recipient, uint256 amount) external payable"
                ];
                const contract = new ethersForWallet.Contract(facilitatorContractAddress, facilitatorAbi, walletSigner);
                const gasEstimate = await contract.facilitateNativeTransfer.estimateGas(
                  recipient,
                  amountWei,
                  { value: amountWei }
                );
                const tx = await contract.facilitateNativeTransfer(recipient, amountWei, {
                  value: amountWei,
                  gasLimit: gasEstimate
                });
                if (onPaymentStatus) {
                  onPaymentStatus("Transaction sent, waiting for confirmation...");
                }
                const receipt = await tx.wait();
                let chainId2 = chainInfo.chainId;
                try {
                  if (walletProvider.getNetwork) {
                    const network = await walletProvider.getNetwork();
                    chainId2 = typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString();
                  }
                } catch (networkError) {
                  console.warn("Could not get network after tx confirmation (using default):", networkError.message);
                }
                paymentResult = {
                  success: true,
                  txHash: tx.hash,
                  recipient,
                  amount: amount.toString(),
                  chainId: chainId2.toString(),
                  blockNumber: receipt.blockNumber
                };
              }
            } catch (walletError) {
              if (walletError instanceof X402Error) {
                throw walletError;
              }
              const errorMsg = walletError.message || String(walletError);
              const errorCode = walletError.code || walletError.error?.code;
              const isNetworkChangedError = errorMsg.includes("network changed") || errorCode === "NETWORK_ERROR" && errorMsg.includes("=>");
              if (isNetworkChangedError) {
                const errorMessage = `Network changed during transaction. Please stay on Push Chain (${PUSH_CHAIN_ID}) while the transaction is processing. If you switched networks, please switch back and try again.`;
                if (onPaymentStatus) {
                  onPaymentStatus(`Error: ${errorMessage}`);
                }
                throw new X402Error(
                  errorMessage,
                  "NETWORK_ERROR" /* NETWORK_ERROR */,
                  {
                    originalError: errorMsg,
                    suggestion: "Keep wallet on Push Chain during transaction"
                  }
                );
              }
              const isUserRejection = errorMsg.includes("user rejected") || errorCode === "ACTION_REJECTED" || errorCode === 4001;
              if (isUserRejection) {
                throw new X402Error(
                  "Transaction was rejected by user",
                  "PAYMENT_FAILED" /* PAYMENT_FAILED */,
                  { userRejected: true }
                );
              }
              const isInsufficientFunds = errorMsg.includes("insufficient funds") || errorMsg.includes("exceeds balance") || errorMsg.includes("INSUFFICIENT_FUNDS");
              if (isInsufficientFunds) {
                throw new X402Error(
                  `Insufficient funds for ${isTokenTransfer ? "token" : "native"} transfer. Please ensure you have enough balance.`,
                  "INSUFFICIENT_FUNDS" /* INSUFFICIENT_FUNDS */,
                  { isTokenTransfer, tokenAddress }
                );
              }
              const isCallError = errorCode === "CALL_EXCEPTION" || errorCode === "BAD_DATA" || errorMsg.includes("could not decode") || errorMsg.includes("execution reverted");
              if (isCallError && isTokenTransfer) {
                const errorMessage = `Token transfer failed. This could be due to: insufficient token balance, missing approval, or contract issue. Token: ${tokenAddress}. Try approving more tokens or check your balance.`;
                console.error("[x402] Token transfer call failed:", {
                  errorMsg,
                  errorCode,
                  tokenAddress,
                  facilitatorAddress
                });
                if (onPaymentStatus) {
                  onPaymentStatus(`Error: ${errorMessage}`);
                }
                throw new X402Error(
                  errorMessage,
                  "TRANSACTION_FAILED" /* TRANSACTION_FAILED */,
                  {
                    tokenAddress,
                    chainId: chainInfo.chainId,
                    originalError: errorMsg
                  }
                );
              }
              throw walletError;
            }
          }
          if (!paymentResult && privateKey) {
            const ethersForPrivateKey = await loadEthers();
            if (onPaymentStatus) {
              onPaymentStatus(`Processing ${isTokenTransfer ? "token" : "native"} payment with private key...`);
            }
            const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;
            const provider = new ethersForPrivateKey.JsonRpcProvider(chainInfo.rpcUrl);
            const wallet = new ethersForPrivateKey.Wallet(privateKey, provider);
            const amountWei = ethersForPrivateKey.parseEther(amount.toString());
            if (isTokenTransfer) {
              const facilitatorAbi = [
                "function facilitateTokenTransfer(address token, address recipient, uint256 amount) external"
              ];
              const contract = new ethersForPrivateKey.Contract(facilitatorContractAddress, facilitatorAbi, wallet);
              const tokenAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
              const tokenContract = new ethersForPrivateKey.Contract(tokenAddress, tokenAbi, wallet);
              if (onPaymentStatus) {
                onPaymentStatus("Approving token spend...");
              }
              const allowanceAbi = ["function allowance(address owner, address spender) external view returns (uint256)"];
              const allowanceContract = new ethersForPrivateKey.Contract(tokenAddress, allowanceAbi, wallet);
              const currentAllowance = await allowanceContract.allowance(await wallet.getAddress(), facilitatorContractAddress);
              if (currentAllowance < amountWei) {
                const approveTx = await tokenContract.approve(facilitatorContractAddress, amountWei);
                await approveTx.wait();
                if (onPaymentStatus) {
                  onPaymentStatus("Token approval confirmed, proceeding with transfer...");
                }
              }
              const gasEstimate = await contract.facilitateTokenTransfer.estimateGas(
                tokenAddress,
                recipient,
                amountWei
              );
              const tx = await contract.facilitateTokenTransfer(tokenAddress, recipient, amountWei, {
                gasLimit: gasEstimate
              });
              if (onPaymentStatus) {
                onPaymentStatus("Transaction sent, waiting for confirmation...");
              }
              const receipt = await tx.wait();
              const network = await provider.getNetwork();
              paymentResult = {
                success: true,
                txHash: tx.hash,
                recipient,
                amount: amount.toString(),
                chainId: network.chainId.toString(),
                blockNumber: receipt.blockNumber
              };
            } else {
              const facilitatorAbi = [
                "function facilitateNativeTransfer(address recipient, uint256 amount) external payable"
              ];
              const contract = new ethersForPrivateKey.Contract(facilitatorContractAddress, facilitatorAbi, wallet);
              const gasEstimate = await contract.facilitateNativeTransfer.estimateGas(
                recipient,
                amountWei,
                { value: amountWei }
              );
              const tx = await contract.facilitateNativeTransfer(recipient, amountWei, {
                value: amountWei,
                gasLimit: gasEstimate
              });
              if (onPaymentStatus) {
                onPaymentStatus("Transaction sent, waiting for confirmation...");
              }
              const receipt = await tx.wait();
              const network = await provider.getNetwork();
              paymentResult = {
                success: true,
                txHash: tx.hash,
                recipient,
                amount: amount.toString(),
                chainId: network.chainId.toString(),
                blockNumber: receipt.blockNumber
              };
            }
          }
          const hasWalletMethod = walletProvider || privateKey || providedUniversalSigner || viemClient || solanaKeypair;
          if (!paymentResult && paymentEndpoint && !hasWalletMethod) {
            const baseUrlClean = baseURL?.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
            const endpointUrl = baseURL ? `${baseUrlClean}/api/payment/process` : paymentEndpoint;
            const paymentPayload = {
              recipient,
              amount,
              chainId: chainInfo.chainId,
              rpcUrl: chainInfo.rpcUrl
            };
            if (isTokenTransfer && tokenAddress) {
              paymentPayload.token = tokenAddress;
            }
            console.log("[x402-sdk] Making payment request to custom endpoint:", {
              method: "POST",
              url: endpointUrl,
              payload: { ...paymentPayload, rpcUrl: paymentPayload.rpcUrl ? "[REDACTED]" : void 0 }
            });
            const paymentResponse = await import_axios.default.post(
              endpointUrl,
              paymentPayload,
              {
                headers: {
                  "Content-Type": "application/json"
                },
                timeout: 18e4,
                // 3 minutes - allows time for blockchain confirmation
                withCredentials: false
              }
            );
            if (!paymentResponse.data) {
              throw new Error("Payment processing failed: Empty response from payment endpoint");
            }
            if (!paymentResponse.data.success) {
              const errorMsg = paymentResponse.data.txHash ? "Payment processing failed: Transaction may have failed" : "Payment processing failed: No transaction hash received";
              throw new Error(errorMsg);
            }
            if (!paymentResponse.data.txHash || typeof paymentResponse.data.txHash !== "string") {
              throw new Error("Payment processing failed: Invalid transaction hash received");
            }
            paymentResult = paymentResponse.data;
          }
          if (!paymentResult) {
            let errorMessage;
            if (walletProvider && walletChainId && walletChainId !== PUSH_CHAIN_ID) {
              errorMessage = `Payment failed: Your wallet is on chain ${walletChainId}, not Push Chain (${PUSH_CHAIN_ID}). For cross-chain payments, please enable "Use Universal Transaction" in settings. This allows the SDK to bridge your assets to Push Chain automatically.`;
            } else if (walletProvider) {
              errorMessage = "Payment failed: Browser wallet payment was not completed. Please ensure your wallet is connected and on Push Chain (chainId: 42101), then try again.";
            } else {
              errorMessage = "Payment processing failed: No payment method available. Please provide one of: walletProvider, privateKey, universalSigner, viemClient, solanaKeypair, or paymentEndpoint. The SDK uses Push Chain Universal Transactions for multi-chain support!";
            }
            debugLog(finalConfig, "Payment method failed or not available", {
              hasWalletProvider: !!walletProvider,
              hasPrivateKey: !!privateKey,
              hasUniversalSigner: !!providedUniversalSigner,
              hasViemClient: !!viemClient,
              hasSolanaKeypair: !!solanaKeypair,
              hasPaymentEndpoint: !!paymentEndpoint,
              walletChainId,
              isWalletOnPushChain
            });
            throw new X402Error(errorMessage, "PAYMENT_METHOD_NOT_AVAILABLE" /* PAYMENT_METHOD_NOT_AVAILABLE */, {
              hasWalletProvider: !!walletProvider,
              hasPrivateKey: !!privateKey,
              hasUniversalSigner: !!providedUniversalSigner,
              hasViemClient: !!viemClient,
              hasSolanaKeypair: !!solanaKeypair,
              hasPaymentEndpoint: !!paymentEndpoint,
              walletChainId,
              suggestion: walletChainId !== PUSH_CHAIN_ID ? "Enable Universal Transaction for cross-chain payments" : "Ensure wallet is connected to Push Chain"
            });
          }
          debugLog(finalConfig, "Payment processed successfully", {
            txHash: paymentResult.txHash,
            chainId: paymentResult.chainId,
            recipient: paymentResult.recipient,
            amount: paymentResult.amount
          });
          const paymentProof = {
            scheme: paymentRequirements.scheme || "exact",
            amount: String(paymentRequirements.maxAmountRequired || paymentRequirements.amount || "0"),
            currency: paymentRequirements.asset || paymentRequirements.currency || (isTokenTransfer ? "TOKEN" : "PUSH"),
            recipient: String(recipient),
            facilitator: facilitatorAddress || paymentRequirements.facilitator || "",
            network: paymentRequirements.network || "push",
            chainId: paymentRequirements.chainId || paymentResult.chainId || chainId,
            txHash: paymentResult.txHash,
            timestamp: Date.now(),
            ...isTokenTransfer && tokenAddress ? { token: tokenAddress } : {}
          };
          if (!originalConfig) {
            throw new Error("Original request config not found - cannot retry request");
          }
          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers["X-PAYMENT"] = JSON.stringify(paymentProof);
          if (onPaymentStatus) {
            onPaymentStatus("Retrying request with payment proof...");
          }
          debugLog(finalConfig, "Retrying original request with payment proof", {
            url: originalConfig.url,
            method: originalConfig.method,
            paymentProof: {
              txHash: paymentProof.txHash,
              amount: paymentProof.amount,
              currency: paymentProof.currency
            }
          });
          return axiosInstance.request(originalConfig);
        } catch (paymentError) {
          if (paymentError instanceof X402Error) {
            if (onPaymentStatus) {
              onPaymentStatus(`Payment failed: ${paymentError.message}`);
            }
            return Promise.reject(paymentError);
          }
          const errorMessage = paymentError.response?.data?.message || paymentError.message || "Unknown payment processing error";
          let errorCode = "PAYMENT_FAILED" /* PAYMENT_FAILED */;
          if (paymentError.message?.includes("insufficient funds") || paymentError.message?.includes("balance")) {
            errorCode = "INSUFFICIENT_FUNDS" /* INSUFFICIENT_FUNDS */;
          } else if (paymentError.message?.includes("transaction") || paymentError.message?.includes("revert")) {
            errorCode = "TRANSACTION_FAILED" /* TRANSACTION_FAILED */;
          } else if (paymentError.code === "ECONNREFUSED" || paymentError.code === "ETIMEDOUT" || paymentError.code === "BAD_DATA" || paymentError.code === "CALL_EXCEPTION") {
            errorCode = "NETWORK_ERROR" /* NETWORK_ERROR */;
          } else if (paymentError.message?.includes("could not decode") || paymentError.message?.includes("Token contract not found")) {
            errorCode = "NETWORK_ERROR" /* NETWORK_ERROR */;
          }
          debugLog(finalConfig, "Payment processing error", {
            message: errorMessage,
            code: errorCode,
            status: paymentError.response?.status,
            statusText: paymentError.response?.statusText,
            method: paymentError.config?.method,
            url: paymentError.config?.url,
            responseData: paymentError.response?.data,
            originalError: paymentError
          });
          if (onPaymentStatus) {
            onPaymentStatus(`Payment failed: ${errorMessage}`);
          }
          const enhancedError = X402Error.fromError(paymentError, errorCode);
          enhancedError.message = `x402 Payment Processing Failed: ${errorMessage}`;
          return Promise.reject(enhancedError);
        }
      }
      return Promise.reject(error);
    }
  );
  return axiosInstance;
}

// src/builder.ts
var X402ClientBuilder = class _X402ClientBuilder {
  config = {};
  /**
   * Create a builder instance for Push Chain testnet
   */
  static forTestnet() {
    const builder = new _X402ClientBuilder();
    builder.config = { ...getPresetConfig("push-testnet") };
    return builder;
  }
  /**
   * Create a builder instance for Push Chain mainnet
   */
  static forMainnet() {
    const builder = new _X402ClientBuilder();
    builder.config = { ...getPresetConfig("push-mainnet") };
    return builder;
  }
  /**
   * Create a builder instance with custom network preset
   */
  static forNetwork(network) {
    const builder = new _X402ClientBuilder();
    builder.config = { ...getPresetConfig(network) };
    return builder;
  }
  /**
   * Create a builder instance with custom configuration
   */
  static withConfig(config) {
    const builder = new _X402ClientBuilder();
    builder.config = { ...config };
    return builder;
  }
  /**
   * Set wallet provider for browser/client-side transactions
   */
  withWallet(walletProvider) {
    this.config.walletProvider = walletProvider;
    return this;
  }
  /**
   * Set private key for server-side/agent transactions
   * ⚠️ WARNING: Only use in secure server-side environments!
   */
  withPrivateKey(privateKey) {
    this.config.privateKey = privateKey;
    return this;
  }
  /**
   * Set Universal Signer for multi-chain support
   */
  withUniversalSigner(universalSigner) {
    this.config.universalSigner = universalSigner;
    return this;
  }
  /**
   * Set Viem wallet client for Viem-based applications
   */
  withViemClient(viemClient) {
    this.config.viemClient = viemClient;
    return this;
  }
  /**
   * Set Solana keypair for Solana-based transactions
   */
  withSolanaKeypair(keypair) {
    this.config.solanaKeypair = keypair;
    return this;
  }
  /**
   * Set Push Network ('testnet' or 'mainnet')
   */
  withPushNetwork(network) {
    this.config.pushNetwork = network;
    return this;
  }
  /**
   * Set payment status callback
   */
  withStatusCallback(callback) {
    this.config.onPaymentStatus = callback;
    return this;
  }
  /**
   * Set base URL for API calls
   */
  withBaseURL(baseURL) {
    this.config.baseURL = baseURL;
    return this;
  }
  /**
   * Set facilitator contract address
   */
  withFacilitatorAddress(address) {
    this.config.facilitatorAddress = address;
    return this;
  }
  /**
   * Set chain ID
   */
  withChainId(chainId) {
    this.config.chainId = chainId;
    return this;
  }
  /**
   * Set Push Chain RPC URL
   */
  withRpcUrl(rpcUrl) {
    this.config.pushChainRpcUrl = rpcUrl;
    return this;
  }
  /**
   * Set chain RPC mapping for multi-chain support
   */
  withChainRpcMap(chainRpcMap) {
    this.config.chainRpcMap = chainRpcMap;
    return this;
  }
  /**
   * Set custom payment endpoint
   */
  withPaymentEndpoint(endpoint) {
    this.config.paymentEndpoint = endpoint;
    return this;
  }
  /**
   * Enable debug mode for detailed logging
   */
  withDebug(enabled = true) {
    this.config.debug = enabled;
    return this;
  }
  /**
   * Set custom axios configuration
   */
  withAxiosConfig(axiosConfig) {
    this.config.axiosConfig = axiosConfig;
    return this;
  }
  /**
   * Build and return the configured x402 client
   * The createX402Client function will handle merging with defaults and env vars
   */
  build() {
    return createX402Client(this.config);
  }
};

// src/tokens.ts
var PUSH_CHAIN_DONUT_TESTNET = {
  name: "Push Chain Donut Testnet",
  namespace: "eip155:42101",
  chainId: 42101,
  rpcUrl: "https://evm.donut.rpc.push.org/"
};
var SUPPORTED_CHAINS = {
  "push-testnet": PUSH_CHAIN_DONUT_TESTNET,
  "ethereum-sepolia": {
    name: "Ethereum Sepolia Testnet",
    namespace: "eip155:11155111",
    chainId: 11155111,
    gatewayAddress: "0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A"
  },
  "arbitrum-sepolia": {
    name: "Arbitrum Sepolia Testnet",
    namespace: "eip155:421614",
    chainId: 421614,
    gatewayAddress: "0x2cd870e0166Ba458dEC615168Fd659AacD795f34"
  },
  "base-sepolia": {
    name: "Base Sepolia Testnet",
    namespace: "eip155:84532",
    chainId: 84532,
    gatewayAddress: "0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16"
  },
  "bnb-testnet": {
    name: "BNB Testnet",
    namespace: "eip155:97",
    chainId: 97,
    gatewayAddress: "0x44aFFC61983F4348DdddB886349eb992C061EaC0"
  },
  "solana-devnet": {
    name: "Solana Devnet",
    namespace: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    gatewayAddress: "CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS"
  }
};
var SUPPORTED_TOKENS = [
  // ═══════════════════════════════════════════════════════════════
  // NATIVE TOKEN
  // ═══════════════════════════════════════════════════════════════
  {
    name: "Push Chain Native Token",
    symbol: "PC",
    address: "0x0000000000000000000000000000000000000000",
    // Native token
    chain: "Push Chain",
    namespace: "eip155:42101",
    decimals: 18
  },
  // ═══════════════════════════════════════════════════════════════
  // ETHEREUM SEPOLIA TOKENS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "Wrapped ETH (Ethereum Sepolia)",
    symbol: "pETH",
    address: "0x2971824Db68229D087931155C2b8bB820B275809",
    chain: "Ethereum Sepolia",
    sourceAddress: "0x0000000000000000000000000000000000000000",
    namespace: "eip155:11155111",
    gatewayAddress: "0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A",
    decimals: 18
  },
  {
    name: "Wrapped ETH (WETH)",
    symbol: "WETH.eth",
    address: "0x0d0dF7E8807430A81104EA84d926139816eC7586",
    chain: "Ethereum Sepolia",
    sourceAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    namespace: "eip155:11155111",
    gatewayAddress: "0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A",
    decimals: 18
  },
  {
    name: "USDT (Ethereum Sepolia)",
    symbol: "USDT.eth",
    address: "0xCA0C5E6F002A389E1580F0DB7cd06e4549B5F9d3",
    chain: "Ethereum Sepolia",
    sourceAddress: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
    namespace: "eip155:11155111",
    gatewayAddress: "0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A",
    decimals: 6
  },
  {
    name: "stETH (Ethereum Sepolia)",
    symbol: "stETH.eth",
    address: "0xaf89E805949c628ebde3262e91dc4ab9eA12668E",
    chain: "Ethereum Sepolia",
    sourceAddress: "0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af",
    namespace: "eip155:11155111",
    gatewayAddress: "0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A",
    decimals: 18
  },
  {
    name: "USDC (Ethereum Sepolia)",
    symbol: "USDC.eth",
    address: "0x387b9C8Db60E74999aAAC5A2b7825b400F12d68E",
    chain: "Ethereum Sepolia",
    sourceAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    namespace: "eip155:11155111",
    gatewayAddress: "0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A",
    decimals: 6
  },
  // ═══════════════════════════════════════════════════════════════
  // SOLANA DEVNET TOKENS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "Wrapped SOL (Solana Devnet)",
    symbol: "pSOL",
    address: "0x5D525Df2bD99a6e7ec58b76aF2fd95F39874EBed",
    chain: "Solana Devnet",
    namespace: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    gatewayAddress: "CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS",
    decimals: 9
  },
  {
    name: "USDC (Solana Devnet)",
    symbol: "USDC.sol",
    address: "0x04B8F634ABC7C879763F623e0f0550a4b5c4426F",
    chain: "Solana Devnet",
    sourceAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    namespace: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    gatewayAddress: "CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS",
    decimals: 6
  },
  {
    name: "USDT (Solana Devnet)",
    symbol: "USDT.sol",
    address: "0x4f1A3D22d170a2F4Bddb37845a962322e24f4e34",
    chain: "Solana Devnet",
    sourceAddress: "EiXDnrAg9ea2Q6vEPV7E5TpTU1vh41jcuZqKjU5Dc4ZF",
    namespace: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    gatewayAddress: "CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS",
    decimals: 6
  },
  {
    name: "DAI (Solana Devnet)",
    symbol: "DAI.sol",
    address: "0x5861f56A556c990358cc9cccd8B5baa3767982A8",
    chain: "Solana Devnet",
    sourceAddress: "G2ZLaRhpohW23KTEX3fBjZXtNTFFwemqCaWWnWVTj4TB",
    namespace: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    gatewayAddress: "CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS",
    decimals: 18
  },
  // ═══════════════════════════════════════════════════════════════
  // BASE SEPOLIA TOKENS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "Wrapped ETH (Base Sepolia)",
    symbol: "pETH.base",
    address: "0xc7007af2B24D4eb963fc9633B0c66e1d2D90Fc21",
    chain: "Base Sepolia",
    sourceAddress: "0x0000000000000000000000000000000000000000",
    namespace: "eip155:84532",
    gatewayAddress: "0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16",
    decimals: 18
  },
  {
    name: "USDT (Base Sepolia)",
    symbol: "USDT.base",
    address: "0x2C455189D2af6643B924A981a9080CcC63d5a567",
    chain: "Base Sepolia",
    sourceAddress: "0x9FF5a186f53F6E6964B00320Da1D2024DE11E0cB",
    namespace: "eip155:84532",
    gatewayAddress: "0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16",
    decimals: 6
  },
  {
    name: "USDC (Base Sepolia)",
    symbol: "USDC.base",
    address: "0x84B62e44F667F692F7739Ca6040cD17DA02068A8",
    chain: "Base Sepolia",
    sourceAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    namespace: "eip155:84532",
    gatewayAddress: "0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16",
    decimals: 6
  },
  // ═══════════════════════════════════════════════════════════════
  // ARBITRUM SEPOLIA TOKENS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "Wrapped ETH (Arbitrum Sepolia)",
    symbol: "pETH.arb",
    address: "0xc0a821a1AfEd1322c5e15f1F4586C0B8cE65400e",
    chain: "Arbitrum Sepolia",
    sourceAddress: "0x0000000000000000000000000000000000000000",
    namespace: "eip155:421614",
    gatewayAddress: "0x2cd870e0166Ba458dEC615168Fd659AacD795f34",
    decimals: 18
  },
  {
    name: "USDC (Arbitrum Sepolia)",
    symbol: "USDC.arb",
    address: "0xa261A10e94aE4bA88EE8c5845CbE7266bD679DD6",
    chain: "Arbitrum Sepolia",
    sourceAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    namespace: "eip155:421614",
    gatewayAddress: "0x2cd870e0166Ba458dEC615168Fd659AacD795f34",
    decimals: 6
  },
  {
    name: "USDT (Arbitrum Sepolia)",
    symbol: "USDT.arb",
    address: "0x76Ad08339dF606BeEDe06f90e3FaF82c5b2fb2E9",
    chain: "Arbitrum Sepolia",
    sourceAddress: "0x1419d7C74D234fA6B73E06A2ce7822C1d37922f0",
    namespace: "eip155:421614",
    gatewayAddress: "0x2cd870e0166Ba458dEC615168Fd659AacD795f34",
    decimals: 6
  },
  // ═══════════════════════════════════════════════════════════════
  // BNB TESTNET TOKENS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "Wrapped BNB (BNB Testnet)",
    symbol: "pBNB",
    address: "0x7a9082dA308f3fa005beA7dB0d203b3b86664E36",
    chain: "BNB Testnet",
    sourceAddress: "0x0000000000000000000000000000000000000000",
    namespace: "eip155:97",
    gatewayAddress: "0x44aFFC61983F4348DdddB886349eb992C061EaC0",
    decimals: 18
  },
  {
    name: "USDT (BNB Testnet)",
    symbol: "USDT.bnb",
    address: "0x2f98B4235FD2BA0173a2B056D722879360B12E7b",
    chain: "BNB Testnet",
    sourceAddress: "0xBC14F348BC9667be46b35Edc9B68653d86013DC5",
    namespace: "eip155:97",
    gatewayAddress: "0x44aFFC61983F4348DdddB886349eb992C061EaC0",
    decimals: 6
  }
];
function getTokenBySymbol(symbol) {
  return SUPPORTED_TOKENS.find((token) => token.symbol.toUpperCase() === symbol.toUpperCase());
}
function getTokenByAddress(address) {
  return SUPPORTED_TOKENS.find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}
function getSupportedTokens() {
  return [...SUPPORTED_TOKENS];
}
function getSupportedChains() {
  return { ...SUPPORTED_CHAINS };
}
function getChainByNamespace(namespace) {
  return Object.values(SUPPORTED_CHAINS).find((chain) => chain.namespace === namespace);
}
function getTokensByChain(chainName) {
  return SUPPORTED_TOKENS.filter(
    (token) => token.chain.toLowerCase().includes(chainName.toLowerCase())
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_CHAIN_ID,
  DEFAULT_FACILITATOR_ADDRESS,
  DEFAULT_PUSH_CHAIN_RPC,
  DEFAULT_PUSH_NETWORK,
  PUSH_CHAIN_DONUT_TESTNET,
  SUPPORTED_CHAINS,
  SUPPORTED_TOKENS,
  X402ClientBuilder,
  X402Error,
  X402ErrorCode,
  createConfig,
  createX402Client,
  getChainByNamespace,
  getDefaultConfig,
  getPresetConfig,
  getSupportedChains,
  getSupportedTokens,
  getTokenByAddress,
  getTokenBySymbol,
  getTokensByChain,
  loadConfigFromEnv,
  mergeConfig
});
