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
    const { 
      recipient, 
      amount, 
      token, 
      privateKey: requestPrivateKey, 
      chainId, 
      rpcUrl: requestRpcUrl,
      pushNetwork = 'testnet' // 'testnet' or 'mainnet'
    } = req.body;

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

    // Check if Push Chain SDK is available
    if (!PushChain || !PushChain.utils || !PushChain.utils.signer) {
      return res.status(500).json({ 
        error: "Push Chain SDK not available",
        message: "@pushchain/core is not installed or not available"
      });
    }

    // Determine if this is a token transfer
    const isTokenTransfer = !!token && token !== '0x0000000000000000000000000000000000000000';
    
    if (isTokenTransfer && !/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return res.status(400).json({ error: "Invalid token address" });
    }

    console.log(`Using Push Chain Universal Transaction for ${isTokenTransfer ? 'token' : 'native'} payment processing`);

    // Step 1: Create ethers signer
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const ethersSigner = new ethers.Wallet(privateKey, provider);
    
    // Step 2: Convert to Universal Signer
    console.log('Converting to Universal Signer...');
    const universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);

    // Step 3: Initialize Push Chain Client (required for proper Universal Transaction flow)
    console.log(`Initializing Push Chain Client (${pushNetwork})...`);
    const networkConstant = pushNetwork === 'mainnet'
      ? PushChain.CONSTANTS.PUSH_NETWORK.MAINNET
      : PushChain.CONSTANTS.PUSH_NETWORK.TESTNET;

    const pushChainClient = await PushChain.initialize(universalSigner, {
      network: networkConstant,
      progressHook: async (progress: { title: string; timestamp: number }) => {
        console.log('TX Progress:', progress.title, '| Time:', progress.timestamp);
      }
    });

    // Use PushChain.utils.helpers.parseUnits for proper value formatting
    const amountValue = PushChain.utils.helpers.parseUnits(amount.toString(), 18);

    // Handle token approval if needed (still use ethers for approval)
    if (isTokenTransfer) {
      const tokenContract = new ethers.Contract(token, TOKEN_ABI, ethersSigner);
      const currentAllowance = await tokenContract.allowance(await ethersSigner.getAddress(), contractAddress);
      
      if (currentAllowance < amountValue) {
        console.log('Approving token spend...');
        const approveTx = await tokenContract.approve(contractAddress, amountValue);
        await approveTx.wait();
        console.log('Token approval confirmed');
      }
    }

    // Step 4: Prepare transaction data
    let txData: string;
    let txValue: bigint = BigInt(0);

    if (isTokenTransfer) {
      const iface = new ethers.Interface(FACILITATOR_ABI_TOKEN);
      txData = iface.encodeFunctionData("facilitateTokenTransfer", [token, recipient, amountValue]);
    } else {
      txValue = amountValue;
      const iface = new ethers.Interface(FACILITATOR_ABI_NATIVE);
      txData = iface.encodeFunctionData("facilitateNativeTransfer", [recipient, amountValue]);
    }

    // Step 5: Send Universal Transaction via Push Chain Client
    console.log('Sending Universal Transaction...');
    const txParams: { to: string; value?: bigint; data: string } = {
      to: contractAddress,
      data: txData,
    };

    if (!isTokenTransfer) {
      txParams.value = txValue;
    }

    const txResponse = await pushChainClient.universal.sendTransaction(txParams);

    const txHash = txResponse.hash || txResponse.txHash || String(txResponse);
    const accountChainId = universalSigner.account?.chain || (await provider.getNetwork()).chainId;
    const resolvedChainId = typeof accountChainId === 'string' 
      ? accountChainId.split(':')[1] || accountChainId 
      : accountChainId;

    console.log(`Universal Transaction ${isTokenTransfer ? 'token' : 'native'} sent:`, txHash);

    return res.status(200).json({
      success: true,
      txHash,
      recipient,
      amount: amount.toString(),
      chainId: String(resolvedChainId || (await provider.getNetwork()).chainId),
      method: 'universal-transaction',
      token: isTokenTransfer ? token : undefined,
    });
  } catch (error: any) {
    console.error("Error processing Universal Transaction:", error);
    return res.status(500).json({
      error: "Transaction failed",
      message: error.message || "Unknown error",
      method: 'universal-transaction',
    });
  }
}
