// Use require for Vercel serverless compatibility - must be at top level
const ethers = require("ethers");
import type { VercelRequest, VercelResponse } from "@vercel/node";

const FACILITATOR_ABI = [
  "function facilitateCrossChain(address target, uint256 value, bytes calldata data) external payable",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { target, value, data } = req.body;

    if (!target || value === undefined) {
      return res.status(400).json({ error: "target and value are required" });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) {
      return res.status(400).json({ error: "Invalid target address" });
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

    const valueWei = ethers.parseEther(value.toString());
    const callData = data || "0x";

    const gasEstimate = await contract.facilitateCrossChain.estimateGas(
      target,
      valueWei,
      callData,
      { value: valueWei }
    );

    const tx = await contract.facilitateCrossChain(target, valueWei, callData, {
      value: valueWei,
      gasLimit: gasEstimate,
    });

    return res.status(200).json({
      success: true,
      txHash: tx.hash,
      target,
      value: value.toString(),
      chainId: (await provider.getNetwork()).chainId.toString(),
    });
  } catch (error: any) {
    console.error("Error facilitating cross-chain operation:", error);
    return res.status(500).json({
      error: "Transaction failed",
      message: error.message || "Unknown error",
    });
  }
}

