const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🔐 Granting OPERATOR_ROLE to client wallet...\n");

    const YELLOW_CHANNEL_MANAGER = process.env.YELLOW_CHANNEL_MANAGER || "0x8e57c8a1E1F2D2d79bA4F41ED12C26E966EBDd1b";
    const CLIENT_WALLET = process.env.CLIENT_WALLET; // Add your client wallet address

    if (!CLIENT_WALLET) {
        console.error("❌ Please set CLIENT_WALLET in .env file");
        process.exit(1);
    }

    // Get the contract (use v2)
    const YellowChannelManager = await ethers.getContractAt(
        "contracts/integrations/YellowChannelManager_v2.sol:YellowChannelManager",
        YELLOW_CHANNEL_MANAGER
    );

    // OPERATOR_ROLE hash
    const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));

    console.log(`📋 Contract: ${YELLOW_CHANNEL_MANAGER}`);
    console.log(`👤 Client Wallet: ${CLIENT_WALLET}`);
    console.log(`🔑 Role: OPERATOR_ROLE`);
    console.log();

    // Check if already has role
    const hasRole = await YellowChannelManager.hasRole(OPERATOR_ROLE, CLIENT_WALLET);
    
    if (hasRole) {
        console.log("✅ Client wallet already has OPERATOR_ROLE!");
        return;
    }

    // Grant role
    console.log("⏳ Granting OPERATOR_ROLE...");
    const tx = await YellowChannelManager.grantRole(OPERATOR_ROLE, CLIENT_WALLET);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    
    await tx.wait();
    console.log("✅ OPERATOR_ROLE granted successfully!");
    console.log();
    console.log("🎉 Client wallet can now:");
    console.log("   • Record deposits (recordDeposit)");
    console.log("   • Release payments (releasePayment)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
