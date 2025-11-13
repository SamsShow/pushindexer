// src/client.ts
import axios from "axios";
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
    onPaymentStatus
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
          const paymentResponse = await axios.post(
            paymentEndpoint,
            {
              recipient,
              amount
            },
            {
              headers: {
                "Content-Type": "application/json"
              },
              timeout: 6e4
              // 60 second timeout for blockchain transactions
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
          const paymentResult = paymentResponse.data;
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
