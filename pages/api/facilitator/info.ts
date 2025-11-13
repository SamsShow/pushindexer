import { ethers } from "ethers";
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

    if (!rpcUrl || !contractAddress) {
      return res.status(500).json({ 
        error: "Server configuration error",
        message: "PUSH_CHAIN_RPC_URL or FACILITATOR_CONTRACT_ADDRESS not configured"
      });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, FACILITATOR_ABI, provider);
    const network = await provider.getNetwork();

    const [owner, totalFacilitated] = await Promise.all([
      contract.owner(),
      contract.totalFacilitated(),
    ]);

    return res.status(200).json({
      contractAddress,
      chainId: network.chainId.toString(),
      owner,
      totalFacilitated: ethers.formatEther(totalFacilitated),
      network: network.name,
    });
  } catch (error: any) {
    console.error("Error fetching contract info:", error);
    return res.status(500).json({
      error: "Failed to fetch contract info",
      message: error.message || "Unknown error",
    });
  }
}

