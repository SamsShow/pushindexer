// Use require for Vercel serverless compatibility - must be at top level
const ethers = require("ethers");
import type { VercelRequest, VercelResponse } from "@vercel/node";

const FACILITATOR_ABI = [
  "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
  "event FacilitatedTx(address indexed sender, address indexed target, address indexed token, uint256 value, bytes32 txHash, uint256 timestamp, uint8 txType)",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { recipient, amount } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({ error: "recipient and amount are required" });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return res.status(400).json({ error: "Invalid recipient address" });
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

    // Estimate gas first
    const gasEstimate = await contract.facilitateNativeTransfer.estimateGas(
      recipient,
      amountWei,
      { value: amountWei }
    );

    // Send transaction
    const tx = await contract.facilitateNativeTransfer(recipient, amountWei, {
      value: amountWei,
      gasLimit: gasEstimate,
    });

    return res.status(200).json({
      success: true,
      txHash: tx.hash,
      recipient,
      amount: amount.toString(),
      chainId: (await provider.getNetwork()).chainId.toString(),
    });
  } catch (error: any) {
    console.error("Error facilitating native transfer:", error);
    return res.status(500).json({
      error: "Transaction failed",
      message: error.message || "Unknown error",
    });
  }
}

