const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🚀 Deploying WorkEscrow Contract...\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying from:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

    // Constructor parameters
    const PYTH_CONTRACT = "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729"; // Base Sepolia Pyth
    const YELLOW_SDK_ADAPTER = "0x0000000000000000000000000000000000000001"; // Placeholder
    const AVAIL_ROUTER = "0x0000000000000000000000000000000000000002"; // Placeholder
    const VALIDATOR_REGISTRY = "0x0000000000000000000000000000000000000003"; // Placeholder
    const FEE_COLLECTOR = deployer.address;
    const ADMIN = deployer.address;

    console.log("📋 Constructor Parameters:");
    console.log("   Pyth Contract:", PYTH_CONTRACT);
    console.log("   Yellow SDK Adapter:", YELLOW_SDK_ADAPTER);
    console.log("   Avail Router:", AVAIL_ROUTER);
    console.log("   Validator Registry:", VALIDATOR_REGISTRY);
    console.log("   Fee Collector:", FEE_COLLECTOR);
    console.log("   Admin:", ADMIN);
    console.log();

    // Deploy
    console.log("⏳ Deploying WorkEscrow...");
    const WorkEscrow = await ethers.getContractFactory("core/WorkEscrow.sol:WorkEscrow");
    const workEscrow = await WorkEscrow.deploy(
        PYTH_CONTRACT,
        YELLOW_SDK_ADAPTER,
        AVAIL_ROUTER,
        VALIDATOR_REGISTRY,
        FEE_COLLECTOR,
        ADMIN
    );

    await workEscrow.waitForDeployment();
    const address = await workEscrow.getAddress();

    console.log("✅ WorkEscrow deployed to:", address);
    console.log();
    console.log("📝 Update your .env file:");
    console.log(`WORK_ESCROW=${address}`);
    console.log();
    console.log("🔍 View on BaseScan:");
    console.log(`https://sepolia.basescan.org/address/${address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
