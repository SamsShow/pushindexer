// Use require for ethers to avoid ESM/CommonJS issues on Vercel
const ethers = require("ethers");
import type { NextApiRequest, NextApiResponse } from "next";

const DEFAULT_FACILITATOR_ADDRESS = "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7";
const DEFAULT_RPC_URL = "https://evm.rpc-testnet-donut-node1.push.org/";
const DEFAULT_CHAIN_ID = 42101;

const FACILITATOR_ABI = [
  "function owner() view returns (address)",
  "function totalFacilitated() view returns (uint256)",
  "function facilitatedByAddress(address) view returns (uint256)",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  try {
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  } catch (headerError) {
    console.error('Error setting CORS headers:', headerError);
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rpcUrl = process.env.PUSH_CHAIN_RPC_URL || DEFAULT_RPC_URL;
    const contractAddress = process.env.FACILITATOR_CONTRACT_ADDRESS || DEFAULT_FACILITATOR_ADDRESS;
    const chainIdEnv = process.env.PUSH_CHAIN_ID;
    const chainId = chainIdEnv ? parseInt(chainIdEnv, 10) : DEFAULT_CHAIN_ID;
    const finalChainId = isNaN(chainId) ? DEFAULT_CHAIN_ID : chainId;

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
      chainId: network.chainId?.toString() || String(finalChainId),
      owner: owner || "0x0000000000000000000000000000000000000000",
      totalFacilitated: ethers.formatEther(totalFacilitated || BigInt(0)),
      network: network.name || "unknown",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("Error fetching contract info:", {
      message: errorMessage,
      stack: errorStack,
      method: req.method,
      url: req.url,
    });

    return res.status(500).json({
      error: "Failed to fetch contract info",
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {}),
    });
  }
}

