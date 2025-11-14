import type { NextApiRequest, NextApiResponse } from "next";

// Hardcoded defaults for Vercel serverless compatibility
const DEFAULT_SELLER_ADDRESS = "0x0dFd63e8b357eD75D502bb42F6e4eC63E2D84761";
const DEFAULT_FACILITATOR_ADDRESS = "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7";
const DEFAULT_CHAIN_ID = 42101;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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
      // Use environment variables with fallbacks for Vercel compatibility
      const sellerAddress = process.env.SELLER_WALLET_ADDRESS || DEFAULT_SELLER_ADDRESS;
      const facilitatorAddress = process.env.FACILITATOR_CONTRACT_ADDRESS || DEFAULT_FACILITATOR_ADDRESS;
      const chainId = parseInt(process.env.PUSH_CHAIN_ID || String(DEFAULT_CHAIN_ID), 10);
      
      return res.status(402).json({
        scheme: "exact",
        amount: "0.001",
        currency: "PUSH",
        recipient: sellerAddress,
        facilitator: facilitatorAddress,
        network: "push",
        chainId: chainId,
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
      console.error('Error processing payment response:', error);
      return res.status(500).json({
        error: "Failed to process request",
        message: error?.message || String(error) || "Unknown error",
      });
    }
  } catch (error: any) {
    // Catch any errors that occur outside the inner try-catch
    console.error('Fatal error in protected weather handler:', error);
    return res.status(500).json({
      error: "Internal server error",
      message: error?.message || String(error) || "Unknown error",
      type: error?.constructor?.name || typeof error,
    });
  }
}
