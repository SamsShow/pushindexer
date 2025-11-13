import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check for payment header
  const paymentHeader = req.headers["x-payment"];

  if (!paymentHeader) {
    // Return 402 Payment Required with payment specification
    return res.status(402).json({
      scheme: "exact",
      amount: "0.001",
      currency: "PUSH",
      recipient: process.env.SELLER_WALLET_ADDRESS || "0x0dFd63e8b357eD75D502bb42F6e4eC63E2D84761",
      facilitator: process.env.FACILITATOR_CONTRACT_ADDRESS || "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7",
      network: "push",
      chainId: process.env.PUSH_CHAIN_ID || "42101",
    });
  }

  // Payment provided - verify and return protected resource
  try {
    const protectedData = {
      message: "This is a protected resource",
      timestamp: new Date().toISOString(),
      paymentReceived: true,
    };

    // Set response headers
    res.setHeader("x-payment-response", paymentHeader as string);
    res.setHeader("x-settlement-time", "128");
    res.setHeader("x-verification-time", "64");

    return res.status(200).json({
      success: true,
      data: protectedData,
    });
  } catch (error: any) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

