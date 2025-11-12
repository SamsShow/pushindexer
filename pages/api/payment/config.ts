import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    return res.status(200).json({
      facilitatorAddress: process.env.FACILITATOR_CONTRACT_ADDRESS || "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7",
      chainId: parseInt(process.env.PUSH_CHAIN_ID || "42101"),
      rpcUrl: process.env.PUSH_CHAIN_RPC_URL || "https://evm.rpc-testnet-donut-node1.push.org/",
      sellerAddress: process.env.SELLER_WALLET_ADDRESS || "",
      buyerAddress: process.env.BUYER_WALLET_ADDRESS || "",
      abi: [
        "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
      ],
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to load payment config",
      message: error.message,
    });
  }
}

