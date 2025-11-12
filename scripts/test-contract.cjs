require("dotenv").config();
const { ethers } = require("ethers");

// Facilitator ABI (just the functions we need)
const FACILITATOR_ABI = [
  "function facilitateNativeTransfer(address recipient, uint256 amount) external payable",
  "function facilitateTokenTransfer(address token, address recipient, uint256 amount) external",
  "function facilitateCrossChain(address target, uint256 value, bytes calldata data) external payable",
  "function owner() view returns (address)",
  "function totalFacilitated() view returns (uint256)",
  "function facilitatedByAddress(address) view returns (uint256)",
  "event FacilitatedTx(address indexed sender, address indexed target, address indexed token, uint256 value, bytes32 txHash, uint256 timestamp, uint8 txType)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.PUSH_CHAIN_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
  const contractAddress = process.env.FACILITATOR_CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error("FACILITATOR_CONTRACT_ADDRESS not set in .env");
    process.exit(1);
  }

  console.log("=== Facilitator Contract Test ===\n");
  console.log("Contract Address:", contractAddress);
  console.log("Your Address:", wallet.address);
  console.log("Network:", await provider.getNetwork().then(n => `${n.name} (${n.chainId})`));
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Your Balance:", ethers.formatEther(balance), "PUSH\n");

  if (balance === 0n) {
    console.error("⚠️  Your account has no balance. You need testnet tokens to interact with the contract.");
    console.error("Please fund your account:", wallet.address);
    process.exit(1);
  }

  const contract = new ethers.Contract(contractAddress, FACILITATOR_ABI, wallet);

  // Check contract state
  try {
    const owner = await contract.owner();
    const totalFacilitated = await contract.totalFacilitated();
    console.log("Contract Owner:", owner);
    console.log("Total Facilitated:", ethers.formatEther(totalFacilitated), "PUSH\n");
  } catch (error) {
    console.log("Could not fetch contract state:", error.message, "\n");
  }

  // Example: Facilitate a native transfer
  console.log("=== Testing Native Transfer ===\n");
  
  // Send to yourself as a test
  const recipient = wallet.address;
  const amount = ethers.parseEther("0.001"); // 0.001 PUSH
  
  console.log(`Sending ${ethers.formatEther(amount)} PUSH to ${recipient}...`);
  
  try {
    const tx = await contract.facilitateNativeTransfer(recipient, amount, {
      value: amount,
    });
    
    console.log("Transaction Hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✓ Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas Used:", receipt.gasUsed.toString());
    
    // Check events
    const logs = await contract.queryFilter(contract.filters.FacilitatedTx(), receipt.blockNumber, receipt.blockNumber);
    if (logs.length > 0) {
      console.log("\n✓ Event emitted:", logs[0].eventName);
      const event = logs[0].args;
      console.log("  Sender:", event.sender);
      console.log("  Target:", event.target);
      console.log("  Value:", ethers.formatEther(event.value), "PUSH");
      console.log("  Type:", event.txType.toString());
    }
    
  } catch (error) {
    console.error("✗ Transaction failed:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main().catch(console.error);

