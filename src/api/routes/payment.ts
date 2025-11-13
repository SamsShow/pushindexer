import { FastifyInstance } from "fastify";
import { ethers } from "ethers";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

const FACILITATOR_ABI = [
  "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
];

// Dynamic import for Push Chain SDK (optional)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PushChain: any;
try {
  PushChain = require("@pushchain/core");
} catch {
  // Push Chain SDK not available - will use ethers.js only
}

/**
 * Detects chain RPC URL from request or config
 */
function getChainRpcUrl(requestBody: { rpcUrl?: string; chainId?: string | number }): string {
  // Priority 1: RPC URL from request
  if (requestBody.rpcUrl) {
    return requestBody.rpcUrl;
  }

  // Priority 2: Chain ID mapping from config
  if (requestBody.chainId && config.pushChain.chainRpcMap) {
    const chainIdStr = String(requestBody.chainId);
    const rpcUrl = config.pushChain.chainRpcMap[chainIdStr] || config.pushChain.chainRpcMap[requestBody.chainId];
    if (rpcUrl) {
      return rpcUrl;
    }
  }

  // Priority 3: Default config RPC URL
  return config.pushChain.rpcUrl;
}

export async function paymentRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: {
      recipient: string;
      amount: string;
      chainId?: string | number;
      rpcUrl?: string;
      privateKey?: string;
    };
  }>("/api/payment/process", async (request, reply) => {
    try {
      const { recipient, amount, chainId, rpcUrl: requestRpcUrl, privateKey: requestPrivateKey } = request.body;

      if (!recipient || !amount) {
        return reply.code(400).send({ error: "recipient and amount are required" });
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        return reply.code(400).send({ error: "Invalid recipient address" });
      }

      // Determine RPC URL (from request or config)
      const rpcUrl = requestRpcUrl || getChainRpcUrl(request.body);
      const contractAddress = config.pushChain.facilitatorAddress;
      // Use request private key, then buyer's private key, then fall back to PRIVATE_KEY
      const privateKey = requestPrivateKey || config.pushChain.buyerPrivateKey || process.env.PRIVATE_KEY;

      if (!rpcUrl || !contractAddress || !privateKey) {
        return reply.code(500).send({ error: "Server configuration error: Missing RPC URL, contract address, or private key" });
      }

      // Try Universal Signer first if available
      if (PushChain && PushChain.utils && PushChain.utils.signer) {
        try {
          logger.info(`Using Universal Signer for payment on chain ${chainId || 'default'}`);
          
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const ethersSigner = new ethers.Wallet(privateKey, provider);
          const universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);

          const amountWei = ethers.parseEther(amount.toString());
          const facilitatorAbi = [
            "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
          ];
          const iface = new ethers.Interface(facilitatorAbi);
          const data = iface.encodeFunctionData("facilitateNativeTransfer", [recipient, amountWei]);

          // Send transaction using Universal Signer
          // Universal Signer wraps ethers signers - use sendTransaction method
          // Universal Signer's signAndSendTransaction expects Uint8Array (RLP bytes),
          // but when wrapping ethers signers, sendTransaction accepts transaction objects
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
            throw new Error('Universal Signer does not expose sendTransaction');
          }

          const txHash = typeof txResult === 'string' ? txResult : txResult.hash || txResult.txHash;
          const accountChainId = universalSigner.account?.chain || chainId || config.pushChain.chainId;
          const resolvedChainId = typeof accountChainId === 'string' 
            ? accountChainId.split(':')[1] || accountChainId 
            : accountChainId;

          logger.info(`Payment transaction sent via Universal Signer: ${txHash}`);

          return reply.send({
            success: true,
            txHash,
            recipient,
            amount: amount.toString(),
            chainId: String(resolvedChainId || chainId || (await provider.getNetwork()).chainId),
          });
        } catch (universalError: unknown) {
          logger.warn("Universal Signer failed, falling back to ethers.js:", universalError);
          // Fall through to ethers.js implementation
        }
      }

      // Fallback to ethers.js (backward compatibility)
      logger.info(`Using ethers.js for payment on chain ${chainId || 'default'}`);
      
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

      logger.info(`Payment transaction sent: ${tx.hash}`);

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      logger.info(`Transaction confirmed in block: ${receipt.blockNumber}`);

      return reply.send({
        success: true,
        txHash: receipt.transactionHash,
        recipient,
        amount: amount.toString(),
        chainId: (await provider.getNetwork()).chainId.toString(),
        blockNumber: receipt.blockNumber,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Error processing payment:", error);
      return reply.code(500).send({
        error: "Transaction failed",
        message: errorMessage,
      });
    }
  });
}

