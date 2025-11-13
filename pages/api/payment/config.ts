import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log FIRST to verify this route is being hit
  console.log('🔵 PAYMENT CONFIG HANDLER CALLED (Next.js)', {
    method: req.method,
    url: req.url,
    query: req.query,
    timestamp: new Date().toISOString(),
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const config = {
      facilitatorAddress: process.env.FACILITATOR_CONTRACT_ADDRESS || "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7",
      chainId: parseInt(process.env.PUSH_CHAIN_ID || "42101"),
      rpcUrl: process.env.PUSH_CHAIN_RPC_URL || "https://evm.rpc-testnet-donut-node1.push.org/",
      sellerAddress: process.env.SELLER_WALLET_ADDRESS || "",
      buyerAddress: process.env.BUYER_WALLET_ADDRESS || "",
      abi: [
        "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
      ],
      _handler: 'pages/api/payment/config.ts', // Debug identifier
    };

    console.log('Payment config response prepared:', {
      hasFacilitatorAddress: !!config.facilitatorAddress,
      chainId: config.chainId,
      hasRpcUrl: !!config.rpcUrl,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json(config);
  } catch (error: any) {
    console.error('Payment config error:', error);
    return res.status(500).json({
      error: "Failed to load payment config",
      message: error.message,
    });
  }
}

