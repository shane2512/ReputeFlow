import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Create Yellow Network Channel on Base Sepolia
 * This script creates a state channel directly on the testnet
 */

async function main() {
  console.log("🎯 Creating Yellow Network Channel on Base Sepolia\n");

  // Load deployment data
  const deploymentData = JSON.parse(
    fs.readFileSync("./deployments/baseSepolia-84532.json", "utf8")
  );

  const [deployer] = await ethers.getSigners();
  console.log("📍 Account:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Get YellowChannelManager contract
  const yellowManager = await ethers.getContractAt(
    "YellowChannelManager",
    deploymentData.contracts.yellowChannelManager
  );

  console.log("📋 YellowChannelManager:", deploymentData.contracts.yellowChannelManager);

  // Channel configuration
  const participant2 = ethers.Wallet.createRandom().address; // Create random second participant for testing
  const participants = [deployer.address, participant2];
  const initialDeposits = [
    ethers.parseEther("0.01"), // 0.01 ETH for deployer (minimum required)
    ethers.parseEther("0")      // 0 ETH for participant 2
  ];
  const totalDeposit = ethers.parseEther("0.01");

  console.log("\n📝 Channel Configuration:");
  console.log("  Participant 1 (You):", participants[0]);
  console.log("  Participant 2 (Test):", participants[1]);
  console.log("  Initial Deposit 1:", ethers.formatEther(initialDeposits[0]), "ETH");
  console.log("  Initial Deposit 2:", ethers.formatEther(initialDeposits[1]), "ETH");
  console.log("  Total Deposit:", ethers.formatEther(totalDeposit), "ETH");

  console.log("\n🔄 Creating channel...");

  try {
    const tx = await yellowManager.createChannel(
      participants,
      initialDeposits,
      { value: totalDeposit }
    );

    console.log("⏳ Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");

    // Get channel ID from event
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = yellowManager.interface.parseLog(log);
        return parsed?.name === "ChannelCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = yellowManager.interface.parseLog(event);
      const channelId = parsed?.args[0];

      console.log("\n" + "=".repeat(80));
      console.log("🎉 CHANNEL CREATED SUCCESSFULLY!");
      console.log("=".repeat(80));
      console.log("\n📊 Channel Details:");
      console.log("  Channel ID:", channelId);
      console.log("  Transaction Hash:", receipt?.hash);
      console.log("  Block Number:", receipt?.blockNumber);

      // Get channel details
      const channel = await yellowManager.getChannel(channelId);
      console.log("\n📋 Channel State:");
      console.log("  Status:", channel.status);
      console.log("  Participants:", channel.participants.length);
      console.log("  Nonce:", channel.nonce.toString());

      console.log("\n🔗 View on BaseScan:");
      console.log(`  https://sepolia.basescan.org/tx/${receipt?.hash}`);

      // Save channel info
      const channelInfo = {
        channelId: channelId.toString(),
        participants,
        initialDeposits: initialDeposits.map((b: any) => b.toString()),
        transactionHash: receipt?.hash,
        blockNumber: receipt?.blockNumber,
        timestamp: new Date().toISOString(),
        network: "baseSepolia",
        chainId: 84532,
      };

      const channelsDir = "./channels";
      if (!fs.existsSync(channelsDir)) {
        fs.mkdirSync(channelsDir);
      }

      const filename = `${channelsDir}/channel-${channelId.toString().substring(0, 10)}.json`;
      fs.writeFileSync(filename, JSON.stringify(channelInfo, null, 2));
      console.log(`\n💾 Channel info saved to: ${filename}`);

      console.log("\n✨ Next Steps:");
      console.log("  1. Use this Channel ID in your Yellow Network service");
      console.log("  2. Configure streaming payments");
      console.log("  3. Start making gasless transactions!");
      console.log("\n📝 Update your .env file:");
      console.log(`  YELLOW_CHANNEL_ID=${channelId}`);

    } else {
      console.log("⚠️  Channel created but couldn't extract Channel ID from events");
    }

  } catch (error: any) {
    console.error("\n❌ Failed to create channel:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Get more testnet ETH from faucet:");
      console.log("   https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
    }
    
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ Channel creation complete!");
  console.log("=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
