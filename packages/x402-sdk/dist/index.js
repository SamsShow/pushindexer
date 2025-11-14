var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/client.ts
import axios from "axios";
var ethers;
try {
  if (typeof __require !== "undefined") {
    ethers = __require("ethers");
  }
} catch {
}
var PushChain;
try {
  if (typeof __require !== "undefined") {
    PushChain = __require("@pushchain/core");
  }
} catch {
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
var DEFAULT_FACILITATOR_ADDRESS = "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7";
var DEFAULT_CHAIN_ID = 42101;
var DEFAULT_PUSH_CHAIN_RPC = "https://evm.rpc-testnet-donut-node1.push.org/";
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
    chainRpcMap
  } = config;
  const axiosInstance = axios.create({
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
            if (onPaymentStatus) {
              onPaymentStatus(`Error: ${errorMessage}`);
            }
            return Promise.reject(new Error(errorMessage));
          }
          retryAttempts.set(originalConfig, attempts + 1);
        }
        let paymentRequirements;
        try {
          paymentRequirements = validatePaymentRequirements(error.response.data);
        } catch (validationError) {
          const errorMessage = `Invalid 402 response: ${validationError.message}`;
          if (onPaymentStatus) {
            onPaymentStatus(`Error: ${errorMessage}`);
          }
          return Promise.reject(new Error(errorMessage));
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
          if (!recipient || !amount) {
            throw new Error("Missing recipient or amount in payment requirements");
          }
          const chainInfo = detectChainInfo(paymentRequirements, config);
          let paymentResult;
          if (providedUniversalSigner || PushChain && PushChain.utils && PushChain.utils.signer && (walletProvider || privateKey)) {
            try {
              if (onPaymentStatus) {
                onPaymentStatus("Using Universal Signer for multi-chain transaction...");
              }
              let universalSigner = providedUniversalSigner;
              if (!universalSigner && walletProvider && ethers && PushChain && PushChain.utils && PushChain.utils.signer) {
                if (onPaymentStatus) {
                  onPaymentStatus("Creating Universal Signer from wallet provider...");
                }
                const chainSigner = await walletProvider.getSigner();
                universalSigner = await PushChain.utils.signer.toUniversal(chainSigner);
              }
              if (!universalSigner && privateKey && ethers && PushChain && PushChain.utils && PushChain.utils.signer) {
                if (onPaymentStatus) {
                  onPaymentStatus("Creating Universal Signer from private key...");
                }
                const provider = new ethers.JsonRpcProvider(chainInfo.rpcUrl);
                const ethersSigner = new ethers.Wallet(privateKey, provider);
                universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);
              }
              if (!universalSigner) {
                throw new Error("Failed to create Universal Signer");
              }
              const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;
              const amountWei = ethers ? ethers.parseEther(amount.toString()) : BigInt(Number(amount) * 1e18);
              const facilitatorAbi = [
                "function facilitateNativeTransfer(address recipient, uint256 amount) external payable"
              ];
              const iface = ethers ? new ethers.Interface(facilitatorAbi) : null;
              const data = iface ? iface.encodeFunctionData("facilitateNativeTransfer", [recipient, amountWei]) : "0x";
              let txResult;
              if (typeof universalSigner.sendTransaction === "function") {
                const txRequest = {
                  to: facilitatorContractAddress,
                  value: amountWei,
                  data
                };
                txResult = await universalSigner.sendTransaction(txRequest);
              } else if (walletProvider && ethers) {
                if (onPaymentStatus) {
                  onPaymentStatus("Universal Signer: Using underlying wallet provider for transaction...");
                }
                const signer = await walletProvider.getSigner();
                const contract = new ethers.Contract(facilitatorContractAddress, facilitatorAbi, signer);
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
                const network = await walletProvider.getNetwork();
                txResult = {
                  hash: tx.hash,
                  chainId: typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString(),
                  blockNumber: receipt.blockNumber
                };
              } else if (privateKey && ethers) {
                if (onPaymentStatus) {
                  onPaymentStatus("Using private key with Universal Signer chain detection...");
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
            if (!ethers) {
              throw new Error("ethers.js is required when using walletProvider. Please install: npm install ethers");
            }
            if (onPaymentStatus) {
              onPaymentStatus("Waiting for wallet approval...");
            }
            const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;
            const facilitatorAbi = [
              "function facilitateNativeTransfer(address recipient, uint256 amount) external payable"
            ];
            const signer = await walletProvider.getSigner();
            const contract = new ethers.Contract(facilitatorContractAddress, facilitatorAbi, signer);
            const amountWei = ethers.parseEther(amount.toString());
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
            const network = await walletProvider.getNetwork();
            paymentResult = {
              success: true,
              txHash: tx.hash,
              recipient,
              amount: amount.toString(),
              chainId: typeof network.chainId === "bigint" ? network.chainId.toString() : network.chainId.toString(),
              blockNumber: receipt.blockNumber
            };
          }
          if (!paymentResult && privateKey) {
            if (!ethers) {
              throw new Error("ethers.js is required when using privateKey. Please install: npm install ethers");
            }
            if (onPaymentStatus) {
              onPaymentStatus("Processing payment with private key...");
            }
            const facilitatorContractAddress = facilitatorAddress || paymentRequirements.facilitator || DEFAULT_FACILITATOR_ADDRESS;
            const facilitatorAbi = [
              "function facilitateNativeTransfer(address recipient, uint256 amount) external payable"
            ];
            const provider = new ethers.JsonRpcProvider(chainInfo.rpcUrl);
            const wallet = new ethers.Wallet(privateKey, provider);
            const contract = new ethers.Contract(facilitatorContractAddress, facilitatorAbi, wallet);
            const amountWei = ethers.parseEther(amount.toString());
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
          if (!paymentResult && paymentEndpoint) {
            const baseUrlClean = baseURL?.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
            const endpointUrl = baseURL ? `${baseUrlClean}/api/payment/process` : paymentEndpoint;
            const paymentPayload = {
              recipient,
              amount,
              chainId: chainInfo.chainId,
              rpcUrl: chainInfo.rpcUrl
            };
            console.log("[x402-sdk] Making payment request to custom endpoint:", {
              method: "POST",
              url: endpointUrl,
              payload: { ...paymentPayload, rpcUrl: paymentPayload.rpcUrl ? "[REDACTED]" : void 0 }
            });
            const paymentResponse = await axios.post(
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
            throw new Error(
              "Payment processing failed: No payment method available. Please provide one of: walletProvider, privateKey, universalSigner, or paymentEndpoint. The SDK calls the facilitator contract directly - no serverless API required!"
            );
          }
          const paymentProof = {
            scheme: paymentRequirements.scheme || "exact",
            amount: String(paymentRequirements.maxAmountRequired || paymentRequirements.amount || "0"),
            currency: paymentRequirements.asset || paymentRequirements.currency || "PUSH",
            recipient: String(recipient),
            facilitator: facilitatorAddress || paymentRequirements.facilitator || "",
            network: paymentRequirements.network || "push",
            chainId: paymentRequirements.chainId || paymentResult.chainId || chainId,
            txHash: paymentResult.txHash,
            timestamp: Date.now()
          };
          if (!originalConfig) {
            throw new Error("Original request config not found - cannot retry request");
          }
          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers["X-PAYMENT"] = JSON.stringify(paymentProof);
          if (onPaymentStatus) {
            onPaymentStatus("Retrying request with payment proof...");
          }
          return axiosInstance.request(originalConfig);
        } catch (paymentError) {
          const errorMessage = paymentError.response?.data?.message || paymentError.message || "Unknown payment processing error";
          console.error("[x402-sdk] Payment processing error:", {
            message: errorMessage,
            status: paymentError.response?.status,
            statusText: paymentError.response?.statusText,
            method: paymentError.config?.method,
            url: paymentError.config?.url,
            responseData: paymentError.response?.data
          });
          if (onPaymentStatus) {
            onPaymentStatus(`Payment failed: ${errorMessage}`);
          }
          const enhancedError = new Error(`x402 Payment Processing Failed: ${errorMessage}`);
          if (paymentError.response) {
            enhancedError.response = paymentError.response;
          }
          if (paymentError.request) {
            enhancedError.request = paymentError.request;
          }
          if (paymentError.config) {
            enhancedError.config = {
              method: paymentError.config.method,
              url: paymentError.config.url
            };
          }
          return Promise.reject(enhancedError);
        }
      }
      return Promise.reject(error);
    }
  );
  return axiosInstance;
}
export {
  createX402Client
};
