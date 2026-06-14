const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying DeFi Lending Platform...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    const LendingPool = await ethers.getContractFactory("LendingPool");
    const lendingPool = await LendingPool.deploy();
    await lendingPool.waitForDeployment();

    console.log("LendingPool deployed to:", await lendingPool.getAddress());
    console.log("Deployment complete!");

    console.log("\n--- COPY THESE FOR FRONTEND ---");
    console.log("LendingPool Address:", await lendingPool.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });