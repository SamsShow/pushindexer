import { ethers } from "hardhat";
async function main() {
    console.log("Deploying Facilitator contract...");
    const Facilitator = await ethers.getContractFactory("Facilitator");
    const facilitator = await Facilitator.deploy();
    await facilitator.waitForDeployment();
    const address = await facilitator.getAddress();
    console.log("Facilitator deployed to:", address);
    // Verify deployment
    const owner = await facilitator.owner();
    console.log("Contract owner:", owner);
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=deploy.js.map