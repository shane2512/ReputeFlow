const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying YellowChannelManager to Ethereum Sepolia...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Constructor parameters
  const yellowSdkAdapter = "0x0000000000000000000000000000000000000000"; // Placeholder
  const workEscrow = "0x6cb8943A19eE396D9279793d20cfB8B763C4D05f"; // Your Base Sepolia WorkEscrow
  const admin = deployer.address;

  console.log("\n📋 Deployment Parameters:");
  console.log("  Yellow SDK Adapter:", yellowSdkAdapter);
  console.log("  Work Escrow:", workEscrow);
  console.log("  Admin:", admin);

  // Deploy YellowChannelManager
  console.log("\n⏳ Deploying YellowChannelManager...");
  const YellowChannelManager = await hre.ethers.getContractFactory("YellowChannelManager");
  const yellowChannel = await YellowChannelManager.deploy(
    yellowSdkAdapter,
    workEscrow,
    admin
  );

  await yellowChannel.waitForDeployment();
  const yellowChannelAddress = await yellowChannel.getAddress();

  console.log("\n✅ YellowChannelManager deployed to:", yellowChannelAddress);

  // Wait for block confirmations
  console.log("\n⏳ Waiting for block confirmations...");
  await yellowChannel.deploymentTransaction().wait(5);

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📝 Contract Addresses:");
  console.log("  YellowChannelManager:", yellowChannelAddress);

  console.log("\n🔍 Verify on Etherscan:");
  console.log(`  https://sepolia.etherscan.io/address/${yellowChannelAddress}`);

  console.log("\n📋 Update your .env file:");
  console.log(`  YELLOW_CHANNEL_MANAGER=${yellowChannelAddress}`);

  // Verify contract on Etherscan
  console.log("\n⏳ Waiting before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  try {
    console.log("\n🔍 Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: yellowChannelAddress,
      constructorArguments: [yellowSdkAdapter, workEscrow, admin],
    });
    console.log("✅ Contract verified!");
  } catch (error) {
    console.log("⚠️ Verification failed:", error.message);
    console.log("You can verify manually later with:");
    console.log(`npx hardhat verify --network sepolia ${yellowChannelAddress} ${yellowSdkAdapter} ${workEscrow} ${admin}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
