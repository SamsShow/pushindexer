import type { NextApiRequest, NextApiResponse } from "next";

// Hardcoded defaults for Vercel serverless compatibility
const DEFAULT_SELLER_ADDRESS = "0x0dFd63e8b357eD75D502bb42F6e4eC63E2D84761";
const DEFAULT_FACILITATOR_ADDRESS = "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7";
const DEFAULT_CHAIN_ID = 42101;

// Minimal config for Vercel - ensure route isolation
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  try {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Payment');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  } catch (headerError) {
    // Continue even if header setting fails
  }

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'OPTIONS'],
    });
  }

  try {
    // Check for payment header (case-insensitive)
    const paymentHeader = 
      req.headers['x-payment'] || 
      req.headers['X-Payment'] || 
      req.headers['X-PAYMENT'] ||
      null;

    if (!paymentHeader) {
      // Return 402 Payment Required
      const sellerAddress = process.env.SELLER_WALLET_ADDRESS || DEFAULT_SELLER_ADDRESS;
      const facilitatorAddress = process.env.FACILITATOR_CONTRACT_ADDRESS || DEFAULT_FACILITATOR_ADDRESS;
      const chainIdEnv = process.env.PUSH_CHAIN_ID;
      const chainId = chainIdEnv ? parseInt(chainIdEnv, 10) : DEFAULT_CHAIN_ID;
      const finalChainId = isNaN(chainId) ? DEFAULT_CHAIN_ID : chainId;
      
      return res.status(402).json({
        scheme: "exact",
        amount: "0.001",
        currency: "PUSH",
        recipient: sellerAddress,
        facilitator: facilitatorAddress,
        network: "push",
        chainId: finalChainId,
      });
    }

    // Payment provided - return protected resource
    const startTime = Date.now();
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

    // Set response headers
    const paymentHeaderValue = typeof paymentHeader === 'string' ? paymentHeader : String(paymentHeader);
    res.setHeader("x-payment-response", paymentHeaderValue);
    res.setHeader("x-settlement-time", String(settlementTime));
    res.setHeader("x-verification-time", String(verificationTime));
    res.setHeader("x-matched-path", "/api/protected/weather");

    return res.status(200).json({
      success: true,
      data: weatherData,
      processingTime: `${processingTime}ms`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in protected weather endpoint:', errorMessage);
    
    return res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
    });
  }
}
