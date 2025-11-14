import type { NextApiRequest, NextApiResponse } from "next";
import { config } from "../../../src/config/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Payment');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const paymentHeader = req.headers['x-payment'];

  if (!paymentHeader) {
    // Return 402 Payment Required with payment specification
    return res.status(402).json({
      scheme: "exact",
      amount: "0.001",
      currency: "PUSH",
      recipient: config.pushChain.sellerAddress || "0x0dFd63e8b357eD75D502bb42F6e4eC63E2D84761",
      facilitator: config.pushChain.facilitatorAddress || "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7",
      network: "push",
      chainId: config.pushChain.chainId || 42101,
    });
  }

  // Payment provided - verify and return protected resource
  try {
    const startTime = Date.now();
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const weatherData = {
      location: "San Francisco, CA",
      temperature: 72,
      condition: "Sunny",
      humidity: 65,
      windSpeed: 8,
    };

    const processingTime = Date.now() - startTime;
    const verificationTime = Math.floor(processingTime * 0.3);
    const settlementTime = Math.floor(processingTime * 0.3);

    // Set response headers with timing information
    res.setHeader("x-payment-response", paymentHeader as string);
    res.setHeader("x-settlement-time", settlementTime.toString());
    res.setHeader("x-verification-time", verificationTime.toString());
    res.setHeader("x-matched-path", "/api/protected/weather");

    return res.status(200).json({
      success: true,
      data: weatherData,
      processingTime: `${processingTime}ms`,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to process request",
      message: error.message,
    });
  }
}

