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
var DEFAULT_PAYMENT_ENDPOINT = "https://pushindexer.vercel.app/api/payment/process";
var DEFAULT_FACILITATOR_ADDRESS = "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7";
var DEFAULT_CHAIN_ID = 42101;
function createX402Client(config = {}) {
  const {
    paymentEndpoint = DEFAULT_PAYMENT_ENDPOINT,
    facilitatorAddress = DEFAULT_FACILITATOR_ADDRESS,
    chainId = DEFAULT_CHAIN_ID,
    baseURL,
    axiosConfig = {},
    onPaymentStatus,
    privateKey,
    walletProvider
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
          let paymentResult;
          if (walletProvider) {
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
              chainId: network.chainId.toString(),
              blockNumber: receipt.blockNumber
            };
          } else if (privateKey) {
            const paymentPayload = {
              recipient,
              amount,
              privateKey
            };
            const paymentResponse = await axios.post(
              paymentEndpoint,
              paymentPayload,
              {
                headers: {
                  "Content-Type": "application/json"
                },
                timeout: 6e4
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
          } else {
            const paymentPayload = {
              recipient,
              amount
            };
            const paymentResponse = await axios.post(
              paymentEndpoint,
              paymentPayload,
              {
                headers: {
                  "Content-Type": "application/json"
                },
                timeout: 6e4
              }
            );
            if (!paymentResponse.data) {
              throw new Error("Payment processing failed: Empty response from payment endpoint. Make sure you have BUYER_PRIVATE_KEY set up server-side or provide privateKey/walletProvider in SDK config.");
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
