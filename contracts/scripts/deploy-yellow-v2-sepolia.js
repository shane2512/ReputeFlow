const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying YellowChannelManager v2 to Ethereum Sepolia...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // PYUSD token address on Ethereum Sepolia
  const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
  const ADMIN_ADDRESS = deployer.address;

  console.log("\n📋 Deployment Parameters:");
  console.log("  PYUSD Token:", PYUSD_ADDRESS);
  console.log("  Admin:", ADMIN_ADDRESS);

  // Deploy YellowChannelManager v2
  console.log("\n⏳ Deploying YellowChannelManager v2...");
  const YellowChannelManager = await hre.ethers.getContractFactory("YellowChannelManager");
  const yellowChannel = await YellowChannelManager.deploy(
    PYUSD_ADDRESS,
    ADMIN_ADDRESS
  );

  await yellowChannel.waitForDeployment();
  const yellowChannelAddress = await yellowChannel.getAddress();

  console.log("\n✅ YellowChannelManager v2 deployed to:", yellowChannelAddress);

  // Wait for block confirmations
  console.log("\n⏳ Waiting for block confirmations...");
  await yellowChannel.deploymentTransaction().wait(5);

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📝 Contract Address:");
  console.log("  YellowChannelManager v2:", yellowChannelAddress);

  console.log("\n🔍 Verify on Etherscan:");
  console.log(`  https://sepolia.etherscan.io/address/${yellowChannelAddress}`);

  console.log("\n📋 Update your .env file:");
  console.log(`  YELLOW_CHANNEL_MANAGER=${yellowChannelAddress}`);

  console.log("\n🔑 Important: Grant OPERATOR_ROLE to client wallet");
  console.log("  Run: npx hardhat run scripts/grant-operator-role.js --network sepolia");

  // Verify contract on Etherscan
  console.log("\n⏳ Waiting before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  try {
    console.log("\n🔍 Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: yellowChannelAddress,
      constructorArguments: [PYUSD_ADDRESS, ADMIN_ADDRESS],
    });
    console.log("✅ Contract verified!");
  } catch (error) {
    console.log("⚠️ Verification failed:", error.message);
    console.log("You can verify manually later with:");
    console.log(`npx hardhat verify --network sepolia ${yellowChannelAddress} ${PYUSD_ADDRESS} ${ADMIN_ADDRESS}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
