import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Grant VALIDATOR_ROLE to an address
 * This allows the address to validate and approve milestones
 */

async function main() {
  console.log("🔐 Granting VALIDATOR_ROLE...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Using account:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // WorkEscrow contract address (Base Sepolia)
  const WORK_ESCROW_ADDRESS = "0x9B1CD4b71e50936D45413dA1d948b8e1d5AB42Da";
  
  // Address to grant VALIDATOR_ROLE to (your client wallet)
  // REPLACE THIS WITH YOUR CLIENT WALLET ADDRESS
  const VALIDATOR_ADDRESS = "0xda4626FcE97748B7A78b613c754419c5e3FDAdCA";

  console.log("📄 WorkEscrow contract:", WORK_ESCROW_ADDRESS);
  console.log("👤 Granting VALIDATOR_ROLE to:", VALIDATOR_ADDRESS);
  console.log("");

  // Get contract instance
  const WorkEscrow = await ethers.getContractAt("WorkEscrow", WORK_ESCROW_ADDRESS);

  // Get VALIDATOR_ROLE hash
  const VALIDATOR_ROLE = await WorkEscrow.VALIDATOR_ROLE();
  console.log("🔑 VALIDATOR_ROLE hash:", VALIDATOR_ROLE);

  // Check if already has role
  const hasRole = await WorkEscrow.hasRole(VALIDATOR_ROLE, VALIDATOR_ADDRESS);
  if (hasRole) {
    console.log("✅ Address already has VALIDATOR_ROLE!");
    return;
  }

  // Grant role
  console.log("⏳ Granting role...");
  const tx = await WorkEscrow.grantRole(VALIDATOR_ROLE, VALIDATOR_ADDRESS);
  console.log("📝 Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("✅ VALIDATOR_ROLE granted!");
  
  // Verify
  const hasRoleNow = await WorkEscrow.hasRole(VALIDATOR_ROLE, VALIDATOR_ADDRESS);
  console.log("🔍 Verification:", hasRoleNow ? "SUCCESS ✅" : "FAILED ❌");
  
  console.log("\n🎉 Done! The address can now validate milestones.");
  console.log("💡 You can now approve milestones and release payments!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
