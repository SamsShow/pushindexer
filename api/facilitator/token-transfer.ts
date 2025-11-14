// Use require for Vercel serverless compatibility - must be at top level
// @ts-ignore - Vercel serverless functions use CommonJS
const ethers = require("ethers");
import type { VercelRequest, VercelResponse } from "@vercel/node";

const FACILITATOR_ABI = [
  "function facilitateTokenTransfer(address token, address recipient, uint256 amount) external",
];

module.exports = async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, recipient, amount } = req.body;

    if (!token || !recipient || !amount) {
      return res.status(400).json({ error: "token, recipient, and amount are required" });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(token) || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return res.status(400).json({ error: "Invalid address format" });
    }

    const rpcUrl = process.env.PUSH_CHAIN_RPC_URL;
    const contractAddress = process.env.FACILITATOR_CONTRACT_ADDRESS;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !contractAddress || !privateKey) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, FACILITATOR_ABI, wallet);

    const amountWei = ethers.parseEther(amount.toString());

    const gasEstimate = await contract.facilitateTokenTransfer.estimateGas(
      token,
      recipient,
      amountWei
    );

    const tx = await contract.facilitateTokenTransfer(token, recipient, amountWei, {
      gasLimit: gasEstimate,
    });

    return res.status(200).json({
      success: true,
      txHash: tx.hash,
      token,
      recipient,
      amount: amount.toString(),
      chainId: (await provider.getNetwork()).chainId.toString(),
    });
  } catch (error: any) {
    console.error("Error facilitating token transfer:", error);
    return res.status(500).json({
      error: "Transaction failed",
      message: error.message || "Unknown error",
    });
  }
}

// Make this file a module to avoid TypeScript scope conflicts
export {};

