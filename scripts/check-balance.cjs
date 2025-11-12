require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.PUSH_CHAIN_RPC_URL || "https://evm.rpc-testnet-donut-node1.push.org/"
  );
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
  
  const address = await wallet.getAddress();
  const balance = await provider.getBalance(address);
  
  console.log("Address:", address);
  console.log("Balance:", ethers.formatEther(balance), "PUSH");
  console.log("Balance (wei):", balance.toString());
}

main().catch(console.error);

