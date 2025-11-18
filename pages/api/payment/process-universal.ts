// Use require for Vercel serverless compatibility
const { ethers } = require("ethers");
import type { NextApiRequest, NextApiResponse } from "next";

const FACILITATOR_ABI_NATIVE = [
  "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
];

const FACILITATOR_ABI_TOKEN = [
  "function facilitateTokenTransfer(address token, address recipient, uint256 amount) external",
];

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
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
    const { recipient, amount, token, privateKey: requestPrivateKey, chainId, rpcUrl: requestRpcUrl } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({ error: "recipient and amount are required" });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return res.status(400).json({ error: "Invalid recipient address" });
    }

    const rpcUrl = requestRpcUrl || process.env.PUSH_CHAIN_RPC_URL;
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

    // Determine if this is a token transfer
    const isTokenTransfer = !!token && token !== '0x0000000000000000000000000000000000000000';
    
    if (isTokenTransfer && !/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return res.status(400).json({ error: "Invalid token address" });
    }

    console.log(`Using Universal Signer for ${isTokenTransfer ? 'token' : 'native'} payment processing`);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const ethersSigner = new ethers.Wallet(privateKey, provider);
    
    // Create Universal Signer from ethers signer
    const universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);

    const amountWei = ethers.parseEther(amount.toString());
    let facilitatorAbi: string[];
    let data: string;
    let txValue: bigint = BigInt(0);

    if (isTokenTransfer) {
      // Token transfer - need to approve first
      facilitatorAbi = FACILITATOR_ABI_TOKEN;
      
      const tokenContract = new ethers.Contract(token, TOKEN_ABI, ethersSigner);
      
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(await ethersSigner.getAddress(), contractAddress);
      
      if (currentAllowance < amountWei) {
        console.log('Approving token spend...');
        const approveTx = await tokenContract.approve(contractAddress, amountWei);
        await approveTx.wait();
        console.log('Token approval confirmed');
      }
      
      const iface = new ethers.Interface(facilitatorAbi);
      data = iface.encodeFunctionData("facilitateTokenTransfer", [token, recipient, amountWei]);
    } else {
      // Native transfer
      facilitatorAbi = FACILITATOR_ABI_NATIVE;
      txValue = amountWei;
      const iface = new ethers.Interface(facilitatorAbi);
      data = iface.encodeFunctionData("facilitateNativeTransfer", [recipient, amountWei]);
    }

    // Send transaction using Universal Signer
    let txResult;
    if (universalSigner.sendTransaction) {
      // Use sendTransaction which accepts ethers transaction objects
      const txRequest: any = {
        to: contractAddress,
        data: data,
      };
      if (!isTokenTransfer) {
        txRequest.value = txValue;
      }
      txResult = await universalSigner.sendTransaction(txRequest);
    } else {
      // Fallback to ethers.js if sendTransaction not available
      const contract = new ethers.Contract(contractAddress, facilitatorAbi, ethersSigner);
      
      if (isTokenTransfer) {
        const gasEstimate = await contract.facilitateTokenTransfer.estimateGas(
          token,
          recipient,
          amountWei
        );
        const tx = await contract.facilitateTokenTransfer(token, recipient, amountWei, {
          gasLimit: gasEstimate,
        });
        const receipt = await tx.wait();
        txResult = {
          hash: tx.hash,
          blockNumber: receipt.blockNumber,
        };
      } else {
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
    }

    const txHash = typeof txResult === 'string' ? txResult : txResult.hash || txResult.txHash;
    const accountChainId = universalSigner.account?.chain || (await provider.getNetwork()).chainId;
    const resolvedChainId = typeof accountChainId === 'string' 
      ? accountChainId.split(':')[1] || accountChainId 
      : accountChainId;

    console.log(`Universal Signer ${isTokenTransfer ? 'token' : 'native'} transaction sent:`, txHash);

    return res.status(200).json({
      success: true,
      txHash,
      recipient,
      amount: amount.toString(),
      chainId: String(resolvedChainId || (await provider.getNetwork()).chainId),
      method: 'universal-signer',
      token: isTokenTransfer ? token : undefined,
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

