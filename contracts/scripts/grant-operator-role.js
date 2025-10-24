const hre = require("hardhat");

async function main() {
  console.log("🔑 Granting OPERATOR_ROLE to client wallet...\n");

  const YELLOW_CHANNEL_MANAGER = "0x8e57c8a1E1F2D2d79bA4F41ED12C26E966EBDd1b";
  const CLIENT_WALLET = "0xda4626FcE97748B7A78b613c754419c5e3FDAdCA"; // Your client wallet

  const [deployer] = await hre.ethers.getSigners();
  console.log("Granting role with account:", deployer.address);

  // Get contract instance (use fully qualified name for v2)
  const yellowChannel = await hre.ethers.getContractAt(
    "contracts/integrations/YellowChannelManager_v2.sol:YellowChannelManager",
    YELLOW_CHANNEL_MANAGER
  );

  // Calculate OPERATOR_ROLE hash
  const OPERATOR_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("OPERATOR_ROLE"));
  
  console.log("Contract:", YELLOW_CHANNEL_MANAGER);
  console.log("Client Wallet:", CLIENT_WALLET);
  console.log("OPERATOR_ROLE:", OPERATOR_ROLE);

  // Check if already has role
  const hasRole = await yellowChannel.hasRole(OPERATOR_ROLE, CLIENT_WALLET);
  
  if (hasRole) {
    console.log("\n✅ Client wallet already has OPERATOR_ROLE!");
  } else {
    console.log("\n⏳ Granting OPERATOR_ROLE...");
    
    const tx = await yellowChannel.grantRole(OPERATOR_ROLE, CLIENT_WALLET);
    console.log("Transaction hash:", tx.hash);
    
    await tx.wait();
    console.log("✅ OPERATOR_ROLE granted successfully!");
  }

  console.log("\n🎉 Setup complete! Client can now release payments.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
