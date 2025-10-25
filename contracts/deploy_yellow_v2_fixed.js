const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🚀 Deploying Fixed YellowChannelManager v2...\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying from:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

    // PYUSD address on Ethereum Sepolia
    const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
    const ADMIN_ADDRESS = deployer.address;

    console.log("📋 Constructor Parameters:");
    console.log("   PYUSD Token:", PYUSD_ADDRESS);
    console.log("   Admin:", ADMIN_ADDRESS);
    console.log();

    // Deploy YellowChannelManager
    console.log("⏳ Deploying YellowChannelManager...");
    const YellowChannelManager = await ethers.getContractFactory(
        "contracts/integrations/YellowChannelManager_v2.sol:YellowChannelManager"
    );
    
    const yellowManager = await YellowChannelManager.deploy(
        PYUSD_ADDRESS,
        ADMIN_ADDRESS
    );

    await yellowManager.waitForDeployment();
    const address = await yellowManager.getAddress();

    console.log("✅ YellowChannelManager deployed to:", address);
    console.log();

    // Grant OPERATOR_ROLE to deployer (so they can call recordDeposit and releasePayment)
    const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
    console.log("⏳ Granting OPERATOR_ROLE to deployer...");
    const grantTx = await yellowManager.grantRole(OPERATOR_ROLE, deployer.address);
    await grantTx.wait();
    console.log("✅ OPERATOR_ROLE granted");
    console.log();

    console.log("📝 Update your .env file:");
    console.log(`YELLOW_CHANNEL_MANAGER=${address}`);
    console.log();
    console.log("🔍 View on Etherscan:");
    console.log(`https://sepolia.etherscan.io/address/${address}`);
    console.log();
    console.log("✅ Deployment complete!");
    console.log();
    console.log("🔧 Bug Fixed:");
    console.log("   • State updates now happen AFTER successful transfer");
    console.log("   • Follows Checks-Effects-Interactions pattern");
    console.log("   • Prevents funds from being locked if transfer fails");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
