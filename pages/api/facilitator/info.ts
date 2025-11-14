// Use require for ethers to avoid ESM/CommonJS issues on Vercel
const ethers = require("ethers");
import type { NextApiRequest, NextApiResponse } from "next";

const FACILITATOR_ABI = [
  "function owner() view returns (address)",
  "function totalFacilitated() view returns (uint256)",
  "function facilitatedByAddress(address) view returns (uint256)",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rpcUrl = process.env.PUSH_CHAIN_RPC_URL;
    const contractAddress = process.env.FACILITATOR_CONTRACT_ADDRESS;
    const chainId = process.env.PUSH_CHAIN_ID || "42101";

    if (!rpcUrl || !contractAddress) {
      return res.status(500).json({ 
        error: "Server configuration error",
        message: "PUSH_CHAIN_RPC_URL or FACILITATOR_CONTRACT_ADDRESS not configured"
      });
    }

    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, FACILITATOR_ABI, provider);

    // Try to fetch data with fallbacks
    let network: any;
    let owner: string = "0x0000000000000000000000000000000000000000";
    let totalFacilitated: bigint = BigInt(0);

    try {
      network = await provider.getNetwork();
    } catch (error) {
      console.warn("Failed to get network, using chainId from env:", error);
      network = { chainId: BigInt(chainId), name: "unknown" };
    }

    try {
      owner = await contract.owner();
    } catch (error) {
      console.warn("Failed to get owner:", error);
    }

    try {
      totalFacilitated = await contract.totalFacilitated();
    } catch (error) {
      console.warn("Failed to get totalFacilitated:", error);
    }

    return res.status(200).json({
      contractAddress,
      chainId: network.chainId?.toString() || chainId,
      owner: owner || "0x0000000000000000000000000000000000000000",
      totalFacilitated: ethers.formatEther(totalFacilitated || BigInt(0)),
      network: network.name || "unknown",
    });
  } catch (error: any) {
    console.error("Error fetching contract info:", error);
    return res.status(500).json({
      error: "Failed to fetch contract info",
      message: error.message || "Unknown error",
    });
  }
}

