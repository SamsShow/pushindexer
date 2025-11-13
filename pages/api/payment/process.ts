import { ethers } from "ethers";
import type { NextApiRequest, NextApiResponse } from "next";

const FACILITATOR_ABI = [
  "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log('Next.js payment process endpoint called', {
    method: req.method,
    body: req.body,
    hasRpcUrl: !!process.env.PUSH_CHAIN_RPC_URL,
    hasContractAddress: !!process.env.FACILITATOR_CONTRACT_ADDRESS,
    hasBuyerKey: !!process.env.BUYER_PRIVATE_KEY,
    hasPrivateKey: !!process.env.PRIVATE_KEY,
  });

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
    // Use buyer's private key if available, otherwise fall back to PRIVATE_KEY
    const privateKey = process.env.BUYER_PRIVATE_KEY || process.env.PRIVATE_KEY;

    if (!rpcUrl || !contractAddress || !privateKey) {
      return res.status(500).json({ 
        error: "Server configuration error: Missing RPC URL, contract address, or private key" 
      });
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

    console.log('Transaction sent, hash:', tx.hash);

    // Wait for transaction to be mined for demo purposes
    const receipt = await tx.wait();

    console.log('Transaction receipt:', {
      hash: receipt.hash,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    });

    // In ethers v6, use tx.hash or receipt.hash (they're the same)
    const transactionHash = tx.hash || receipt.hash || receipt.transactionHash;

    if (!transactionHash) {
      console.error('No transaction hash found in tx or receipt!', { tx, receipt });
    }

    return res.status(200).json({
      success: true,
      txHash: transactionHash,
      recipient,
      amount: amount.toString(),
      chainId: (await provider.getNetwork()).chainId.toString(),
      blockNumber: receipt.blockNumber,
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return res.status(500).json({
      error: "Transaction failed",
      message: error.message || "Unknown error",
    });
  }
}

