// Use require for Vercel serverless compatibility
const { ethers } = require("ethers");
import type { NextApiRequest, NextApiResponse } from "next";

const FACILITATOR_ABI = [
  "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
];

// Dynamic import for Push Chain SDK
let PushChain: any;
try {
  PushChain = require("@pushchain/core");
} catch {
  // Push Chain SDK not available
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Payment');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { recipient, amount, privateKey: requestPrivateKey } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({ error: "recipient and amount are required" });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return res.status(400).json({ error: "Invalid recipient address" });
    }

    const rpcUrl = process.env.PUSH_CHAIN_RPC_URL;
    const contractAddress = process.env.FACILITATOR_CONTRACT_ADDRESS;
    const privateKey = requestPrivateKey || process.env.BUYER_PRIVATE_KEY || process.env.PRIVATE_KEY;

    if (!rpcUrl || !contractAddress || !privateKey) {
      return res.status(500).json({ 
        error: "Server configuration error: Missing RPC URL, contract address, or private key"
      });
    }

    // Check if Universal Signer is available
    if (!PushChain || !PushChain.utils || !PushChain.utils.signer) {
      return res.status(500).json({ 
        error: "Universal Signer not available",
        message: "@pushchain/core is not installed or not available"
      });
    }

    console.log('Using Universal Signer for payment processing');

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const ethersSigner = new ethers.Wallet(privateKey, provider);
    
    // Create Universal Signer from ethers signer
    const universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);

    const amountWei = ethers.parseEther(amount.toString());
    const facilitatorAbi = [
      "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
    ];
    const iface = new ethers.Interface(facilitatorAbi);
    const data = iface.encodeFunctionData("facilitateNativeTransfer", [recipient, amountWei]);

    // Send transaction using Universal Signer
    let txResult;
    if (universalSigner.sendTransaction) {
      // Use sendTransaction which accepts ethers transaction objects
      txResult = await universalSigner.sendTransaction({
        to: contractAddress,
        value: amountWei,
        data: data,
      });
    } else {
      // Fallback to ethers.js if sendTransaction not available
      const contract = new ethers.Contract(contractAddress, FACILITATOR_ABI, ethersSigner);
      const gasEstimate = await contract.facilitateNativeTransfer.estimateGas(
        recipient,
        amountWei,
        { value: amountWei }
      );
      const tx = await contract.facilitateNativeTransfer(recipient, amountWei, {
        value: amountWei,
        gasLimit: gasEstimate,
      });
      const receipt = await tx.wait();
      txResult = {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    }

    const txHash = typeof txResult === 'string' ? txResult : txResult.hash || txResult.txHash;
    const accountChainId = universalSigner.account?.chain || (await provider.getNetwork()).chainId;
    const resolvedChainId = typeof accountChainId === 'string' 
      ? accountChainId.split(':')[1] || accountChainId 
      : accountChainId;

    console.log('Universal Signer transaction sent:', txHash);

    return res.status(200).json({
      success: true,
      txHash,
      recipient,
      amount: amount.toString(),
      chainId: String(resolvedChainId || (await provider.getNetwork()).chainId),
      method: 'universal-signer',
      blockNumber: typeof txResult === 'object' && txResult.blockNumber ? txResult.blockNumber : undefined,
    });
  } catch (error: any) {
    console.error("Error processing payment with Universal Signer:", error);
    return res.status(500).json({
      error: "Transaction failed",
      message: error.message || "Unknown error",
      method: 'universal-signer',
    });
  }
}

