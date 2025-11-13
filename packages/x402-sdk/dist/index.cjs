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
  createX402Client: () => createX402Client
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_axios = __toESM(require("axios"), 1);
function createX402Client(config) {
  const {
    paymentEndpoint,
    facilitatorAddress,
    chainId = 42101,
    baseURL,
    axiosConfig = {},
    onPaymentStatus
  } = config;
  const axiosInstance = import_axios.default.create({
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
          const paymentResponse = await import_axios.default.post(
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createX402Client
});
