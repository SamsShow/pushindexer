require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.PUSH_CHAIN_RPC_URL || "https://evm.rpc-testnet-donut-node1.push.org/"
  );
  
  const contractAddress = process.env.FACILITATOR_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.error("FACILITATOR_CONTRACT_ADDRESS not set in .env");
    process.exit(1);
  }

  console.log("Verifying contract at:", contractAddress);
  
  // Check if contract has code
  const code = await provider.getCode(contractAddress);
  const isDeployed = code !== "0x";
  
  console.log("Contract deployed:", isDeployed ? "Yes ✓" : "No ✗");
  
  if (isDeployed) {
    console.log("Contract code length:", code.length, "characters");
    
    // Try to call owner() function
    const contract = new ethers.Contract(
      contractAddress,
      ["function owner() view returns (address)"],
      provider
    );
    
    try {
      const owner = await contract.owner();
      console.log("Contract owner:", owner);
      
      // Check totalFacilitated
      const totalFacilitated = await contract.totalFacilitated();
      console.log("Total facilitated:", ethers.formatEther(totalFacilitated), "PUSH");
    } catch (error) {
      console.log("Could not fetch contract state:", error.message);
    }
  } else {
    console.error("No contract code found at this address!");
  }
}

main().catch(console.error);

