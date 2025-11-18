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
  return config;
}
function getDefaultConfig() {
  return {
    facilitatorAddress: DEFAULT_FACILITATOR_ADDRESS,
    chainId: DEFAULT_CHAIN_ID,
    pushChainRpcUrl: DEFAULT_PUSH_CHAIN_RPC
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
  pushChainRpcUrl: "https://evm.donut.rpc.push.org/"
};
var PUSH_MAINNET_CONFIG = {
  facilitatorAddress: "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7",
  // TODO: Update when mainnet is available
  chainId: 42101,
  // TODO: Update when mainnet is available
  pushChainRpcUrl: "https://evm.rpc-testnet-donut-node1.push.org/"
  // TODO: Update when mainnet is available
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
      PushChain = pushChainModule.default || pushChainModule;
      return PushChain;
    } catch (error) {
      if (typeof require !== "undefined") {
        try {
          PushChain = require("@pushchain/core");
          return PushChain;
        } catch {
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
    // No default - users must provide walletProvider, privateKey, universalSigner, or their own endpoint
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
    debug = false
  } = finalConfig;
  debugLog(finalConfig, "Creating x402 client", {
    hasWalletProvider: !!walletProvider,
    hasPrivateKey: !!privateKey,
    hasUniversalSigner: !!providedUniversalSigner,
    hasPaymentEndpoint: !!paymentEndpoint,
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
          if (providedUniversalSigner || PushChainModule && PushChainModule.utils && PushChainModule.utils.signer && (walletProvider || privateKey)) {
            try {
              if (onPaymentStatus) {
                onPaymentStatus(`Using Universal Signer for ${isTokenTransfer ? "token" : "native"} transfer...`);
              }
              let universalSigner = providedUniversalSigner;
              if (!universalSigner && walletProvider && ethersModule && PushChainModule && PushChainModule.utils && PushChainModule.utils.signer) {
                if (onPaymentStatus) {
                  onPaymentStatus("Creating Universal Signer from wallet provider...");
                }
                if (!walletProvider.getSigner) {
                  throw new Error("Wallet provider does not support getSigner()");
                }
                const chainSigner = await walletProvider.getSigner();
                universalSigner = await PushChainModule.utils.signer.toUniversal(chainSigner);
              }
              if (!universalSigner && privateKey && ethersModule && PushChainModule && PushChainModule.utils && PushChainModule.utils.signer) {
                if (onPaymentStatus) {
                  onPaymentStatus("Creating Universal Signer from private key...");
                }
                const provider = new ethersModule.JsonRpcProvider(chainInfo.rpcUrl);
                const ethersSigner = new ethersModule.Wallet(privateKey, provider);
                universalSigner = await PushChainModule.utils.signer.toUniversal(ethersSigner);
              }
              if (!universalSigner) {
                throw new Error("Failed to create Universal Signer");
              }
              const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;
              let facilitatorAbi;
              let data;
              let txValue = BigInt(0);
              if (isTokenTransfer) {
                const amountWei = ethersModule ? ethersModule.parseEther(amount.toString()) : BigInt(Number(amount) * 1e18);
                facilitatorAbi = [
                  "function facilitateTokenTransfer(address token, address recipient, uint256 amount) external"
                ];
                const iface = ethersModule ? new ethersModule.Interface(facilitatorAbi) : null;
                data = iface ? iface.encodeFunctionData("facilitateTokenTransfer", [tokenAddress, recipient, amountWei]) : "0x";
                if (onPaymentStatus) {
                  onPaymentStatus(`Preparing token transfer: ${amount} tokens from ${tokenAddress}...`);
                }
              } else {
                const amountWei = ethersModule ? ethersModule.parseEther(amount.toString()) : BigInt(Number(amount) * 1e18);
                txValue = amountWei;
                facilitatorAbi = [
                  "function facilitateNativeTransfer(address recipient, uint256 amount) external payable"
                ];
                const iface = ethersModule ? new ethersModule.Interface(facilitatorAbi) : null;
                data = iface ? iface.encodeFunctionData("facilitateNativeTransfer", [recipient, amountWei]) : "0x";
              }
              let txResult;
              if (typeof universalSigner.sendTransaction === "function") {
                const txRequest = {
                  to: facilitatorContractAddress,
                  data
                };
                if (!isTokenTransfer) {
                  txRequest.value = txValue;
                }
                txResult = await universalSigner.sendTransaction(txRequest);
              } else if (walletProvider && ethersModule) {
                if (onPaymentStatus) {
                  onPaymentStatus("Universal Signer: Using underlying wallet provider for transaction...");
                }
                if (!walletProvider.getSigner) {
                  throw new Error("Wallet provider does not support getSigner()");
                }
                const signer = await walletProvider.getSigner();
                const contract = new ethersModule.Contract(facilitatorContractAddress, facilitatorAbi, signer);
                if (isTokenTransfer) {
                  const amountWei = ethersModule.parseEther(amount.toString());
                  const tokenAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
                  const tokenContract = new ethersModule.Contract(tokenAddress, tokenAbi, signer);
                  if (onPaymentStatus) {
                    onPaymentStatus("Approving token spend...");
                  }
                  const allowanceAbi = ["function allowance(address owner, address spender) external view returns (uint256)"];
                  const allowanceContract = new ethersModule.Contract(tokenAddress, allowanceAbi, signer);
                  const currentAllowance = await allowanceContract.allowance(await signer.getAddress(), facilitatorContractAddress);
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
                  const receipt = await tx.wait();
                  let chainId2 = chainInfo.chainId;
                  if (walletProvider.getNetwork) {
                    const network = await walletProvider.getNetwork();
                    chainId2 = typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString();
                  }
                  txResult = {
                    hash: tx.hash,
                    chainId: chainId2.toString(),
                    blockNumber: receipt.blockNumber
                  };
                } else {
                  const amountWei = ethersModule.parseEther(amount.toString());
                  const gasEstimate = await contract.facilitateNativeTransfer.estimateGas(
                    recipient,
                    amountWei,
                    { value: amountWei }
                  );
                  const tx = await contract.facilitateNativeTransfer(recipient, amountWei, {
                    value: amountWei,
                    gasLimit: gasEstimate
                  });
                  const receipt = await tx.wait();
                  let chainId2 = chainInfo.chainId;
                  if (walletProvider.getNetwork) {
                    const network = await walletProvider.getNetwork();
                    chainId2 = typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString();
                  }
                  txResult = {
                    hash: tx.hash,
                    chainId: chainId2.toString(),
                    blockNumber: receipt.blockNumber
                  };
                }
              } else if (privateKey && ethersModule) {
                if (onPaymentStatus) {
                  onPaymentStatus(`Using private key with Universal Signer for ${isTokenTransfer ? "token" : "native"} transfer...`);
                }
                const provider = new ethersModule.JsonRpcProvider(chainInfo.rpcUrl);
                const ethersSigner = new ethersModule.Wallet(privateKey, provider);
                const contract = new ethersModule.Contract(facilitatorContractAddress, facilitatorAbi, ethersSigner);
                if (isTokenTransfer) {
                  const amountWei = ethersModule.parseEther(amount.toString());
                  const tokenAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
                  const tokenContract = new ethersModule.Contract(tokenAddress, tokenAbi, ethersSigner);
                  if (onPaymentStatus) {
                    onPaymentStatus("Approving token spend...");
                  }
                  const allowanceAbi = ["function allowance(address owner, address spender) external view returns (uint256)"];
                  const allowanceContract = new ethersModule.Contract(tokenAddress, allowanceAbi, ethersSigner);
                  const currentAllowance = await allowanceContract.allowance(await ethersSigner.getAddress(), facilitatorContractAddress);
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
                  const receipt = await tx.wait();
                  const network = await provider.getNetwork();
                  txResult = {
                    hash: tx.hash,
                    chainId: typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString(),
                    blockNumber: receipt.blockNumber
                  };
                } else {
                  const amountWei = ethersModule.parseEther(amount.toString());
                  const gasEstimate = await contract.facilitateNativeTransfer.estimateGas(
                    recipient,
                    amountWei,
                    { value: amountWei }
                  );
                  const tx = await contract.facilitateNativeTransfer(recipient, amountWei, {
                    value: amountWei,
                    gasLimit: gasEstimate
                  });
                  const receipt = await tx.wait();
                  const network = await provider.getNetwork();
                  txResult = {
                    hash: tx.hash,
                    chainId: typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString(),
                    blockNumber: receipt.blockNumber
                  };
                }
              } else {
                throw new Error("Cannot use Universal Signer without walletProvider or privateKey");
              }
              if (onPaymentStatus) {
                onPaymentStatus("Transaction sent, waiting for confirmation...");
              }
              const txHash = typeof txResult === "string" ? txResult : txResult?.hash || txResult?.txHash || String(txResult);
              if (!txHash || txHash === "[object Object]") {
                throw new Error("Invalid transaction result from Universal Signer");
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
              const isBytesLikeError = universalError.message?.includes("invalid BytesLike value") || universalError.code === "INVALID_ARGUMENT";
              if (isBytesLikeError) {
                console.warn("Universal Signer incompatible with current ethers.js version. Skipping Universal Signer.");
                if (onPaymentStatus) {
                  onPaymentStatus("Universal Signer incompatible. Using ethers.js fallback...");
                }
              } else {
                console.warn("Universal Signer failed, falling back to ethers.js:", universalError);
                if (onPaymentStatus) {
                  onPaymentStatus(`Universal Signer failed: ${universalError.message}. Using fallback...`);
                }
              }
              paymentResult = void 0;
            }
          }
          if (!paymentResult && walletProvider) {
            const ethersForWallet = await loadEthers();
            if (onPaymentStatus) {
              onPaymentStatus(`Waiting for wallet approval for ${isTokenTransfer ? "token" : "native"} transfer...`);
            }
            const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;
            if (!walletProvider.getSigner) {
              throw new X402Error(
                "Wallet provider does not support getSigner()",
                "PAYMENT_METHOD_NOT_AVAILABLE" /* PAYMENT_METHOD_NOT_AVAILABLE */
              );
            }
            const signer = await walletProvider.getSigner();
            const amountWei = ethersForWallet.parseEther(amount.toString());
            if (isTokenTransfer) {
              const facilitatorAbi = [
                "function facilitateTokenTransfer(address token, address recipient, uint256 amount) external"
              ];
              const contract = new ethersForWallet.Contract(facilitatorContractAddress, facilitatorAbi, signer);
              const tokenAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
              const tokenContract = new ethersForWallet.Contract(tokenAddress, tokenAbi, signer);
              if (onPaymentStatus) {
                onPaymentStatus("Approving token spend...");
              }
              const allowanceAbi = ["function allowance(address owner, address spender) external view returns (uint256)"];
              const allowanceContract = new ethersForWallet.Contract(tokenAddress, allowanceAbi, signer);
              const currentAllowance = await allowanceContract.allowance(await signer.getAddress(), facilitatorContractAddress);
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
              let chainId2 = chainInfo.chainId;
              if (walletProvider.getNetwork) {
                const network = await walletProvider.getNetwork();
                chainId2 = typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString();
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
              const contract = new ethersForWallet.Contract(facilitatorContractAddress, facilitatorAbi, signer);
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
              if (walletProvider.getNetwork) {
                const network = await walletProvider.getNetwork();
                chainId2 = typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString();
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
          if (!paymentResult && paymentEndpoint) {
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
                timeout: 6e4,
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
            const errorMessage = "Payment processing failed: No payment method available. Please provide one of: walletProvider, privateKey, universalSigner, or paymentEndpoint. The SDK calls the facilitator contract directly - no serverless API required!";
            debugLog(finalConfig, "No payment method available", {
              hasWalletProvider: !!walletProvider,
              hasPrivateKey: !!privateKey,
              hasUniversalSigner: !!providedUniversalSigner,
              hasPaymentEndpoint: !!paymentEndpoint
            });
            throw new X402Error(errorMessage, "PAYMENT_METHOD_NOT_AVAILABLE" /* PAYMENT_METHOD_NOT_AVAILABLE */, {
              hasWalletProvider: !!walletProvider,
              hasPrivateKey: !!privateKey,
              hasUniversalSigner: !!providedUniversalSigner,
              hasPaymentEndpoint: !!paymentEndpoint
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
          const errorMessage = paymentError.response?.data?.message || paymentError.message || "Unknown payment processing error";
          let errorCode = "PAYMENT_FAILED" /* PAYMENT_FAILED */;
          if (paymentError.message?.includes("insufficient funds") || paymentError.message?.includes("balance")) {
            errorCode = "INSUFFICIENT_FUNDS" /* INSUFFICIENT_FUNDS */;
          } else if (paymentError.message?.includes("transaction") || paymentError.message?.includes("revert")) {
            errorCode = "TRANSACTION_FAILED" /* TRANSACTION_FAILED */;
          } else if (paymentError.code === "ECONNREFUSED" || paymentError.code === "ETIMEDOUT") {
            errorCode = "NETWORK_ERROR" /* NETWORK_ERROR */;
          }
          debugLog(finalConfig, "Payment processing error", {
            message: errorMessage,
            code: errorCode,
            status: paymentError.response?.status,
            statusText: paymentError.response?.statusText,
            method: paymentError.config?.method,
            url: paymentError.config?.url,
            responseData: paymentError.response?.data
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
  "solana-devnet": {
    name: "Solana Devnet",
    namespace: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    gatewayAddress: "CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS"
  }
};
var SUPPORTED_TOKENS = [
  {
    name: "Push Chain Native Token",
    symbol: "PC",
    address: "0x0000000000000000000000000000000000000000",
    // Native token, no address needed
    chain: "Push Chain",
    namespace: "eip155:42101",
    decimals: 18
  },
  {
    name: "Solana (SOL)",
    symbol: "SOL",
    address: "0x0000000000000000000000000000000000000000",
    // TODO: Find wrapped SOL address on Push Chain
    chain: "Solana Devnet",
    namespace: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    gatewayAddress: "CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS",
    decimals: 9
    // Solana uses 9 decimals
  },
  {
    name: "Ethereum (ETH)",
    symbol: "ETH",
    address: "0x0000000000000000000000000000000000000000",
    // TODO: Find wrapped ETH address on Push Chain
    chain: "Ethereum Sepolia",
    namespace: "eip155:11155111",
    gatewayAddress: "0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A",
    decimals: 18
  },
  {
    name: "USDC",
    symbol: "USDC",
    address: "0x0000000000000000000000000000000000000000",
    // TODO: Find USDC address on Push Chain
    chain: "Multi-chain",
    decimals: 6
    // USDC uses 6 decimals
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  loadConfigFromEnv,
  mergeConfig
});
