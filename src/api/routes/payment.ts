import { FastifyInstance } from "fastify";
import { ethers } from "ethers";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

const FACILITATOR_ABI = [
  "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
];

export async function paymentRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: {
      recipient: string;
      amount: string;
    };
  }>("/api/payment/process", async (request, reply) => {
    try {
      const { recipient, amount } = request.body;

      if (!recipient || !amount) {
        return reply.code(400).send({ error: "recipient and amount are required" });
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        return reply.code(400).send({ error: "Invalid recipient address" });
      }

      const rpcUrl = config.pushChain.rpcUrl;
      const contractAddress = config.pushChain.facilitatorAddress;
      const privateKey = process.env.PRIVATE_KEY;

      if (!rpcUrl || !contractAddress || !privateKey) {
        return reply.code(500).send({ error: "Server configuration error" });
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

      logger.info(`Payment transaction sent: ${tx.hash}`);

      // Wait for transaction to be mined (optional - you can return immediately)
      // const receipt = await tx.wait();
      // logger.info(`Transaction confirmed in block: ${receipt.blockNumber}`);

      return reply.send({
        success: true,
        txHash: tx.hash,
        recipient,
        amount: amount.toString(),
        chainId: (await provider.getNetwork()).chainId.toString(),
      });
    } catch (error: any) {
      logger.error("Error processing payment:", error);
      return reply.code(500).send({
        error: "Transaction failed",
        message: error.message || "Unknown error",
      });
    }
  });
}

