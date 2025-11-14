// Use require for Vercel serverless compatibility - must be at top level
const ethers = require("ethers");
import type { NextApiRequest, NextApiResponse } from "next";

const FACILITATOR_ABI = [
  "function owner() view returns (address)",
  "function totalFacilitated() view returns (uint256)",
  "function facilitatedByAddress(address) view returns (uint256)",
];

// Hardcoded defaults for Vercel compatibility
const DEFAULT_FACILITATOR_ADDRESS = "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7";
const DEFAULT_RPC_URL = "https://evm.rpc-testnet-donut-node1.push.org/";
const DEFAULT_CHAIN_ID = "42101";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  } catch (e) {
    // Continue if header setting fails
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Always return basic facilitator info even if RPC calls fail
  const contractAddress = process.env.FACILITATOR_CONTRACT_ADDRESS || DEFAULT_FACILITATOR_ADDRESS;
  const chainId = process.env.PUSH_CHAIN_ID || DEFAULT_CHAIN_ID;

  // Default response - always return this at minimum
  const defaultResponse = {
    contractAddress,
    chainId: chainId.toString(),
    network: "push",
    owner: "0x0000000000000000000000000000000000000000",
    totalFacilitated: "0.0",
  };

  try {
    // Use environment variables with fallbacks
    const rpcUrl = process.env.PUSH_CHAIN_RPC_URL || DEFAULT_RPC_URL;

    // Try to fetch live data, but don't fail if it doesn't work
    try {
      // Create provider with timeout
      const provider = new ethers.JsonRpcProvider(rpcUrl, {
        name: "push",
        chainId: parseInt(chainId, 10),
      });

      // Set a timeout for RPC calls
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("RPC call timeout")), 5000); // 5 second timeout
      });

      const contract = new ethers.Contract(contractAddress, FACILITATOR_ABI, provider);

      // Try to fetch data with fallbacks and timeout protection
      let network: any = { chainId: BigInt(chainId), name: "push" };
      let owner: string = defaultResponse.owner;
      let totalFacilitated: bigint = BigInt(0);

      try {
        network = await Promise.race([
          provider.getNetwork(),
          timeoutPromise,
        ]) as any;
      } catch (error) {
        // Use defaults
      }

      try {
        owner = await Promise.race([
          contract.owner(),
          timeoutPromise,
        ]) as string;
      } catch (error) {
        // Use defaults
      }

      try {
        totalFacilitated = await Promise.race([
          contract.totalFacilitated(),
          timeoutPromise,
        ]) as bigint;
      } catch (error) {
        // Use defaults
      }

      return res.status(200).json({
        contractAddress,
        chainId: network.chainId?.toString() || chainId,
        owner: owner || defaultResponse.owner,
        totalFacilitated: ethers.formatEther(totalFacilitated || BigInt(0)),
        network: network.name || "push",
      });
    } catch (rpcError) {
      // If RPC fails, return default response
      console.warn("RPC call failed, returning default facilitator info:", rpcError);
      return res.status(200).json(defaultResponse);
    }
  } catch (error: any) {
    // Even if everything fails, return basic info
    console.error("Error in facilitator endpoint:", error);
    return res.status(200).json(defaultResponse);
  }
}

