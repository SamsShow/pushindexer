import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    // In a real implementation, you would verify the payment here
    // For demo purposes, we'll just return the resource
    
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

    // Set response headers with timing information
    res.setHeader("x-payment-response", paymentHeader as string);
    res.setHeader("x-settlement-time", "128");
    res.setHeader("x-verification-time", "64");
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

