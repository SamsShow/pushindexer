import { FastifyInstance } from "fastify";
import { ethers } from "ethers";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

const FACILITATOR_ABI = [
  "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
];

const FACILITATOR_ABI_TOKEN = [
  "function facilitateTokenTransfer(address token, address recipient, uint256 amount) external",
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
      token?: string;
      chainId?: string | number;
      rpcUrl?: string;
      privateKey?: string;
      pushNetwork?: 'testnet' | 'mainnet';
    };
  }>("/api/payment/process", async (request, reply) => {
    try {
      const { 
        recipient, 
        amount, 
        token,
        chainId, 
        rpcUrl: requestRpcUrl, 
        privateKey: requestPrivateKey,
        pushNetwork = 'testnet'
      } = request.body;

      if (!recipient || !amount) {
        return reply.code(400).send({ error: "recipient and amount are required" });
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        return reply.code(400).send({ error: "Invalid recipient address" });
      }

      // Determine if this is a token transfer
      const isTokenTransfer = !!token && token !== '0x0000000000000000000000000000000000000000';
      
      if (isTokenTransfer && !/^0x[a-fA-F0-9]{40}$/.test(token)) {
        return reply.code(400).send({ error: "Invalid token address" });
      }

      // Determine RPC URL (from request or config)
      const rpcUrl = requestRpcUrl || getChainRpcUrl(request.body);
      const contractAddress = config.pushChain.facilitatorAddress;
      // Use request private key, then buyer's private key, then fall back to PRIVATE_KEY
      const privateKey = requestPrivateKey || config.pushChain.buyerPrivateKey || process.env.PRIVATE_KEY;

      if (!rpcUrl || !contractAddress || !privateKey) {
        return reply.code(500).send({ error: "Server configuration error: Missing RPC URL, contract address, or private key" });
      }

      // Try Push Chain Universal Transaction first if available
      if (PushChain && PushChain.utils && PushChain.utils.signer) {
        try {
          logger.info(`Using Push Chain Universal Transaction for ${isTokenTransfer ? 'token' : 'native'} payment on ${pushNetwork}`);
          
          // Step 1: Create ethers signer
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const ethersSigner = new ethers.Wallet(privateKey, provider);
          
          // Step 2: Convert to Universal Signer
          logger.info('Converting to Universal Signer...');
          const universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);

          // Step 3: Initialize Push Chain Client
          logger.info(`Initializing Push Chain Client (${pushNetwork})...`);
          const networkConstant = pushNetwork === 'mainnet'
            ? PushChain.CONSTANTS.PUSH_NETWORK.MAINNET
            : PushChain.CONSTANTS.PUSH_NETWORK.TESTNET;

          const pushChainClient = await PushChain.initialize(universalSigner, {
            network: networkConstant,
            progressHook: async (progress: { title: string; timestamp: number }) => {
              logger.info(`TX Progress: ${progress.title} | Time: ${progress.timestamp}`);
            }
          });

          // Use PushChain.utils.helpers.parseUnits for proper value formatting
          const amountValue = PushChain.utils.helpers.parseUnits(amount.toString(), 18);

          // Handle token approval if needed
          if (isTokenTransfer) {
            const tokenAbi = [
              "function approve(address spender, uint256 amount) external returns (bool)",
              "function allowance(address owner, address spender) external view returns (uint256)",
            ];
            const tokenContract = new ethers.Contract(token, tokenAbi, ethersSigner);
            const currentAllowance = await tokenContract.allowance(await ethersSigner.getAddress(), contractAddress);
            
            if (currentAllowance < amountValue) {
              logger.info('Approving token spend...');
              const approveTx = await tokenContract.approve(contractAddress, amountValue);
              await approveTx.wait();
              logger.info('Token approval confirmed');
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
            const iface = new ethers.Interface(FACILITATOR_ABI);
            txData = iface.encodeFunctionData("facilitateNativeTransfer", [recipient, amountValue]);
          }

          // Step 5: Send Universal Transaction via Push Chain Client
          logger.info('Sending Universal Transaction...');
          const txParams: { to: string; value?: bigint; data: string } = {
            to: contractAddress,
            data: txData,
          };

          if (!isTokenTransfer) {
            txParams.value = txValue;
          }

          const txResponse = await pushChainClient.universal.sendTransaction(txParams);

          const txHash = txResponse.hash || txResponse.txHash || String(txResponse);
          const accountChainId = universalSigner.account?.chain || chainId || config.pushChain.chainId;
          const resolvedChainId = typeof accountChainId === 'string' 
            ? accountChainId.split(':')[1] || accountChainId 
            : accountChainId;

          logger.info(`Universal Transaction ${isTokenTransfer ? 'token' : 'native'} sent: ${txHash}`);

          return reply.send({
            success: true,
            txHash,
            recipient,
            amount: amount.toString(),
            chainId: String(resolvedChainId || chainId || (await provider.getNetwork()).chainId),
            method: 'universal-transaction',
            token: isTokenTransfer ? token : undefined,
          });
        } catch (universalError: unknown) {
          logger.warn("Universal Transaction failed, falling back to ethers.js:", universalError);
          // Fall through to ethers.js implementation
        }
      }

      // Fallback to ethers.js (backward compatibility)
      logger.info(`Using ethers.js for ${isTokenTransfer ? 'token' : 'native'} payment on chain ${chainId || 'default'}`);
      
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const amountWei = ethers.parseEther(amount.toString());

      if (isTokenTransfer) {
        // Token transfer
        const contract = new ethers.Contract(contractAddress, FACILITATOR_ABI_TOKEN, wallet);
        
        // Approve token spend first
        const tokenAbi = [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function allowance(address owner, address spender) external view returns (uint256)",
        ];
        const tokenContract = new ethers.Contract(token, tokenAbi, wallet);
        const currentAllowance = await tokenContract.allowance(await wallet.getAddress(), contractAddress);
        
        if (currentAllowance < amountWei) {
          logger.info('Approving token spend...');
          const approveTx = await tokenContract.approve(contractAddress, amountWei);
          await approveTx.wait();
          logger.info('Token approval confirmed');
        }

        // Estimate gas and send
        const gasEstimate = await contract.facilitateTokenTransfer.estimateGas(
          token,
          recipient,
          amountWei
        );

        const tx = await contract.facilitateTokenTransfer(token, recipient, amountWei, {
          gasLimit: gasEstimate,
        });

        logger.info(`Token payment transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        logger.info(`Transaction confirmed in block: ${receipt.blockNumber}`);

        return reply.send({
          success: true,
          txHash: receipt.transactionHash,
          recipient,
          amount: amount.toString(),
          chainId: (await provider.getNetwork()).chainId.toString(),
          blockNumber: receipt.blockNumber,
          method: 'ethers-fallback',
          token,
        });
      } else {
        // Native transfer
        const contract = new ethers.Contract(contractAddress, FACILITATOR_ABI, wallet);

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
          method: 'ethers-fallback',
        });
      }
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
