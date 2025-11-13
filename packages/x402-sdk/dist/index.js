// src/client.ts
import axios from "axios";
function createX402Client(config) {
  const {
    paymentEndpoint,
    facilitatorAddress,
    chainId = 42101,
    baseURL,
    axiosConfig = {},
    onPaymentStatus
  } = config;
  const axiosInstance = axios.create({
    baseURL,
    ...axiosConfig
  });
  axiosInstance.interceptors.response.use(
    (response) => response,
    // Pass through successful responses
    async (error) => {
      if (error.response?.status === 402) {
        const paymentRequirements = error.response.data;
        if (onPaymentStatus) {
          onPaymentStatus(`Payment required: ${paymentRequirements.amount || paymentRequirements.maxAmountRequired || "unknown"} ${paymentRequirements.currency || paymentRequirements.asset || ""}`);
        }
        try {
          if (onPaymentStatus) {
            onPaymentStatus("Processing payment on blockchain...");
          }
          const paymentResponse = await axios.post(
            paymentEndpoint,
            {
              recipient: paymentRequirements.payTo || paymentRequirements.recipient,
              amount: paymentRequirements.maxAmountRequired || paymentRequirements.amount
            },
            {
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
          if (!paymentResponse.data.success || !paymentResponse.data.txHash) {
            throw new Error("Payment processing failed: No transaction hash received");
          }
          const paymentResult = paymentResponse.data;
          const paymentProof = {
            scheme: paymentRequirements.scheme || "exact",
            amount: paymentRequirements.maxAmountRequired || paymentRequirements.amount || "0",
            currency: paymentRequirements.asset || paymentRequirements.currency || "PUSH",
            recipient: paymentRequirements.payTo || paymentRequirements.recipient || "",
            facilitator: facilitatorAddress || paymentRequirements.facilitator || "",
            network: paymentRequirements.network || "push",
            chainId: paymentRequirements.chainId || paymentResult.chainId || chainId,
            txHash: paymentResult.txHash,
            timestamp: Date.now()
          };
          const originalConfig = error.config;
          if (!originalConfig) {
            throw new Error("Original request config not found");
          }
          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers["X-PAYMENT"] = JSON.stringify(paymentProof);
          return axiosInstance.request(originalConfig);
        } catch (paymentError) {
          if (onPaymentStatus) {
            onPaymentStatus(`Payment failed: ${paymentError.message || "Unknown error"}`);
          }
          throw paymentError;
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
