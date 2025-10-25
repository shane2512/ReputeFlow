const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🚨 Emergency PYUSD Release\n");

    const YELLOW_CHANNEL_MANAGER = process.env.YELLOW_CHANNEL_MANAGER || "0x8e57c8a1E1F2D2d79bA4F41ED12C26E966EBDd1b";
    const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"; // Ethereum Sepolia PYUSD
    const FREELANCER_ADDRESS = "0xBEfF34e255Dd06Ed96bFC345e2D354615bf7EC17";
    const AMOUNT = ethers.parseUnits("21", 6); // 20 PYUSD (6 decimals)

    console.log(`📋 YellowChannelManager: ${YELLOW_CHANNEL_MANAGER}`);
    console.log(`💰 PYUSD Token: ${PYUSD_ADDRESS}`);
    console.log(`👤 Freelancer: ${FREELANCER_ADDRESS}`);
    console.log(`💵 Amount: 20 PYUSD\n`);

    // Get the contract
    const YellowChannelManager = await ethers.getContractAt(
        "contracts/integrations/YellowChannelManager_v2.sol:YellowChannelManager",
        YELLOW_CHANNEL_MANAGER
    );

    // Check contract balance
    const ERC20_ABI = [
        "function balanceOf(address) view returns (uint256)"
    ];
    const pyusdToken = await ethers.getContractAt(ERC20_ABI, PYUSD_ADDRESS);
    const balance = await pyusdToken.balanceOf(YELLOW_CHANNEL_MANAGER);
    
    console.log(`📊 Contract PYUSD Balance: ${ethers.formatUnits(balance, 6)} PYUSD`);
    
    if (balance < AMOUNT) {
        console.error(`❌ Insufficient balance in contract. Have: ${ethers.formatUnits(balance, 6)}, Need: 20`);
        process.exit(1);
    }

    // Use emergencyWithdraw to send PYUSD to freelancer
    console.log("\n⏳ Calling emergencyWithdraw...");
    const tx = await YellowChannelManager.emergencyWithdraw(
        PYUSD_ADDRESS,
        FREELANCER_ADDRESS,
        AMOUNT
    );
    
    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    await tx.wait();
    
    console.log("\n✅ PYUSD successfully released to freelancer!");
    console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
    
    // Check new balance
    const newBalance = await pyusdToken.balanceOf(YELLOW_CHANNEL_MANAGER);
    console.log(`\n📊 New Contract Balance: ${ethers.formatUnits(newBalance, 6)} PYUSD`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
