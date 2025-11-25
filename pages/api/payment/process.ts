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
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS with proper headers
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Payment');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    console.error('❌ METHOD NOT ALLOWED:', {
      receivedMethod: req.method,
      allowedMethods: ['POST', 'OPTIONS'],
      url: req.url,
      headers: req.headers,
    });
    return res.status(405).json({ 
      error: "Method not allowed",
      receivedMethod: req.method,
      allowedMethods: ['POST', 'OPTIONS'],
    });
  }

  // Log to verify this route is being hit
  console.log('✅ NEXT.JS PAYMENT PROCESS ENDPOINT CALLED', {
    method: req.method,
    url: req.url,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      origin: req.headers.origin,
    },
    body: req.body,
    hasRpcUrl: !!process.env.PUSH_CHAIN_RPC_URL,
    hasContractAddress: !!process.env.FACILITATOR_CONTRACT_ADDRESS,
    hasBuyerKey: !!process.env.BUYER_PRIVATE_KEY,
    hasPrivateKey: !!process.env.PRIVATE_KEY,
    timestamp: new Date().toISOString(),
  });

  try {
    const { recipient, amount, token, privateKey: requestPrivateKey } = req.body;

    if (!recipient || !amount) {
      console.error('Missing recipient or amount', { recipient, amount });
      return res.status(400).json({ error: "recipient and amount are required" });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      console.error('Invalid recipient address', { recipient });
      return res.status(400).json({ error: "Invalid recipient address" });
    }

    // Determine if this is a token transfer
    const isTokenTransfer = !!token && token !== '0x0000000000000000000000000000000000000000';
    
    if (isTokenTransfer && !/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return res.status(400).json({ error: "Invalid token address" });
    }

    const rpcUrl = process.env.PUSH_CHAIN_RPC_URL;
    const contractAddress = process.env.FACILITATOR_CONTRACT_ADDRESS;
    // Use private key from request (buyer's key) if provided, otherwise fall back to env vars
    const privateKey = requestPrivateKey || process.env.BUYER_PRIVATE_KEY || process.env.PRIVATE_KEY;

    if (!rpcUrl || !contractAddress || !privateKey) {
      console.error('Missing environment variables', {
        hasRpcUrl: !!rpcUrl,
        hasContractAddress: !!contractAddress,
        hasPrivateKey: !!privateKey,
      });
      return res.status(500).json({ 
        error: "Server configuration error: Missing RPC URL, contract address, or private key",
        details: {
          hasRpcUrl: !!rpcUrl,
          hasContractAddress: !!contractAddress,
          hasPrivateKey: !!privateKey,
        }
      });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    let tx: any;

    if (isTokenTransfer) {
      // Token transfer
      console.log(`Processing token transfer: ${amount} of token ${token}`);
      
      const tokenContract = new ethers.Contract(token, TOKEN_ABI, wallet);
      const walletAddress = await wallet.getAddress();
      
      // Get token decimals (default to 18 if not available)
      let tokenDecimals = 18;
      try {
        tokenDecimals = await tokenContract.decimals();
        console.log(`Token decimals: ${tokenDecimals}`);
      } catch (error) {
        console.warn('Could not fetch token decimals, assuming 18:', error);
      }
      
      // Parse amount with correct decimals
      const amountWei = ethers.parseUnits(amount.toString(), tokenDecimals);
      console.log(`Amount in token units: ${amountWei.toString()}`);
      
      // Check token balance
      const balance = await tokenContract.balanceOf(walletAddress);
      console.log(`Wallet token balance: ${balance.toString()}`);
      
      if (balance < amountWei) {
        const errorMsg = `Insufficient token balance. Required: ${amountWei.toString()}, Available: ${balance.toString()}`;
        console.error(errorMsg);
        return res.status(400).json({
          error: "Insufficient token balance",
          message: errorMsg,
          required: amountWei.toString(),
          available: balance.toString(),
        });
      }
      
      // Check and approve token spend if needed
      const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
      console.log(`Current allowance: ${currentAllowance.toString()}`);
      
      if (currentAllowance < amountWei) {
        console.log('Approving token spend...');
        const approveTx = await tokenContract.approve(contractAddress, amountWei);
        const approveReceipt = await approveTx.wait();
        console.log('Token approval confirmed in block:', approveReceipt.blockNumber);
        
        // Verify approval was successful
        const newAllowance = await tokenContract.allowance(walletAddress, contractAddress);
        if (newAllowance < amountWei) {
          const errorMsg = `Token approval failed. Expected: ${amountWei.toString()}, Got: ${newAllowance.toString()}`;
          console.error(errorMsg);
          return res.status(500).json({
            error: "Token approval failed",
            message: errorMsg,
          });
        }
        console.log('Approval verified:', newAllowance.toString());
      }

      // Then call facilitator contract for token transfer
      const contract = new ethers.Contract(contractAddress, FACILITATOR_ABI_TOKEN, wallet);
      
      try {
        const gasEstimate = await contract.facilitateTokenTransfer.estimateGas(
          token,
          recipient,
          amountWei
        );
        console.log('Gas estimate:', gasEstimate.toString());

        tx = await contract.facilitateTokenTransfer(token, recipient, amountWei, {
          gasLimit: gasEstimate,
        });
      } catch (estimateError: any) {
        console.error('Gas estimation failed:', estimateError);
        // Try to decode the error if possible
        let errorMessage = estimateError.message || 'Transaction would revert';
        if (estimateError.data) {
          errorMessage += ` (Error data: ${estimateError.data})`;
        }
        return res.status(400).json({
          error: "Transaction would revert",
          message: errorMessage,
          details: {
            token,
            recipient,
            amount: amountWei.toString(),
            walletBalance: balance.toString(),
            allowance: currentAllowance.toString(),
          },
        });
      }
    } else {
      // Native transfer (PC)
      console.log(`Processing native transfer: ${amount} PC`);
      const amountWei = ethers.parseEther(amount.toString());
      const contract = new ethers.Contract(contractAddress, FACILITATOR_ABI_NATIVE, wallet);

      const gasEstimate = await contract.facilitateNativeTransfer.estimateGas(
        recipient,
        amountWei,
        { value: amountWei }
      );

      tx = await contract.facilitateNativeTransfer(recipient, amountWei, {
        value: amountWei,
        gasLimit: gasEstimate,
      });
    }

    console.log('Transaction sent, hash:', tx.hash);

    // Return immediately with transaction hash
    // Don't wait for confirmation to avoid timeout issues
    // The transaction will be confirmed on-chain, and users can check the explorer
    const transactionHash = tx.hash;

    if (!transactionHash) {
      console.error('No transaction hash found!', { tx });
      return res.status(500).json({
        error: "Transaction failed",
        message: "Could not retrieve transaction hash",
      });
    }

    // Optionally wait for confirmation in the background (non-blocking)
    // This allows the response to be sent immediately while confirmation happens async
    tx.wait().then((receipt: any) => {
      console.log('Transaction confirmed:', {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });
    }).catch((error: any) => {
      console.error('Transaction confirmation error (non-blocking):', error);
    });

    return res.status(200).json({
      success: true,
      txHash: transactionHash,
      recipient,
      amount: amount.toString(),
      chainId: (await provider.getNetwork()).chainId.toString(),
      token: isTokenTransfer ? token : undefined,
      method: isTokenTransfer ? 'token-transfer' : 'native-transfer',
      // blockNumber omitted since we're not waiting for confirmation
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return res.status(500).json({
      error: "Transaction failed",
      message: error.message || "Unknown error",
    });
  }
}

