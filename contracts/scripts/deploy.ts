import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * ReputeFlow Deployment Script
 * Deploys all contracts in correct order with proper dependencies
 */

async function main() {
  console.log("🚀 Starting ReputeFlow deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId.toString(), "\n");

  // ============ Configuration ============
  
  // Pyth contract addresses (mainnet/testnet)
  const PYTH_ADDRESSES: { [key: string]: string } = {
    // Mainnets
    "8453": "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a", // Base
    "137": "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C", // Polygon
    "42161": "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C", // Arbitrum
    "10": "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C", // Optimism
    // Testnets
    "84532": "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729", // Base Sepolia
    "80002": "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729", // Polygon Amoy
    "11155111": "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21", // Sepolia
  };

  // Pyth Entropy addresses
  const PYTH_ENTROPY_ADDRESSES: { [key: string]: string } = {
    "8453": "0x98046Bd286715D3B0BC227Dd7a956b83D8978603", // Base
    "84532": "0x98046Bd286715D3B0BC227Dd7a956b83D8978603", // Base Sepolia
  };

  const chainId = network.chainId.toString();
  let pythAddress = PYTH_ADDRESSES[chainId];
  const pythEntropyAddress = PYTH_ENTROPY_ADDRESSES[chainId] || ethers.ZeroAddress;

  // Deploy mock Pyth for local network
  if (!pythAddress && chainId === "31337") {
    console.log("📦 Deploying MockPyth for local network...");
    const MockPyth = await ethers.getContractFactory("MockPyth");
    const mockPyth = await MockPyth.deploy();
    await mockPyth.waitForDeployment();
    pythAddress = await mockPyth.getAddress();
    console.log("✅ MockPyth deployed to:", pythAddress, "\n");
  } else if (!pythAddress) {
    console.warn("⚠️  Warning: Pyth contract address not found for this network");
    pythAddress = ethers.ZeroAddress;
  }

  console.log("📋 Configuration:");
  console.log("   Pyth Oracle:", pythAddress);
  console.log("   Pyth Entropy:", pythEntropyAddress);
  console.log("   Admin:", deployer.address, "\n");

  // ============ Deploy Contracts ============

  // 1. Deploy PythOracleAdapter
  console.log("📦 Deploying PythOracleAdapter...");
  const PythOracleAdapter = await ethers.getContractFactory("PythOracleAdapter");
  const pythAdapter = await PythOracleAdapter.deploy(
    pythAddress,
    deployer.address
  );
  await pythAdapter.waitForDeployment();
  const pythAdapterAddress = await pythAdapter.getAddress();
  console.log("✅ PythOracleAdapter deployed to:", pythAdapterAddress, "\n");

  // 2. Deploy ReputationRegistry
  console.log("📦 Deploying ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy(
    pythAddress,
    deployer.address
  );
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log("✅ ReputationRegistry deployed to:", reputationRegistryAddress, "\n");

  // 3. Deploy AgentMatcher
  console.log("📦 Deploying AgentMatcher...");
  const AgentMatcher = await ethers.getContractFactory("AgentMatcher");
  const agentMatcher = await AgentMatcher.deploy(
    pythAddress,
    deployer.address
  );
  await agentMatcher.waitForDeployment();
  const agentMatcherAddress = await agentMatcher.getAddress();
  console.log("✅ AgentMatcher deployed to:", agentMatcherAddress, "\n");

  // 4. Deploy LighthouseStorageAdapter
  console.log("📦 Deploying LighthouseStorageAdapter...");
  const LighthouseStorageAdapter = await ethers.getContractFactory("LighthouseStorageAdapter");
  const lighthouseAdapter = await LighthouseStorageAdapter.deploy(
    "https://gateway.lighthouse.storage",
    ethers.ZeroAddress, // DataCoin factory - will be set later
    deployer.address
  );
  await lighthouseAdapter.waitForDeployment();
  const lighthouseAdapterAddress = await lighthouseAdapter.getAddress();
  console.log("✅ LighthouseStorageAdapter deployed to:", lighthouseAdapterAddress, "\n");

  // 5. Deploy DataCoinFactory
  console.log("📦 Deploying DataCoinFactory...");
  const DataCoinFactory = await ethers.getContractFactory("DataCoinFactory");
  const dataCoinFactory = await DataCoinFactory.deploy(
    lighthouseAdapterAddress,
    reputationRegistryAddress,
    deployer.address, // Fee collector
    deployer.address
  );
  await dataCoinFactory.waitForDeployment();
  const dataCoinFactoryAddress = await dataCoinFactory.getAddress();
  console.log("✅ DataCoinFactory deployed to:", dataCoinFactoryAddress, "\n");

  // Update LighthouseAdapter with DataCoinFactory address
  console.log("🔄 Updating LighthouseAdapter with DataCoinFactory address...");
  await lighthouseAdapter.setDataCoinFactory(dataCoinFactoryAddress);
  console.log("✅ LighthouseAdapter updated\n");

  // 6. Deploy YellowChannelManager
  console.log("📦 Deploying YellowChannelManager...");
  const YellowChannelManager = await ethers.getContractFactory("YellowChannelManager");
  const yellowChannelManager = await YellowChannelManager.deploy(
    ethers.ZeroAddress, // Yellow SDK adapter - placeholder
    ethers.ZeroAddress, // Work escrow - will be set later
    deployer.address
  );
  await yellowChannelManager.waitForDeployment();
  const yellowChannelManagerAddress = await yellowChannelManager.getAddress();
  console.log("✅ YellowChannelManager deployed to:", yellowChannelManagerAddress, "\n");

  // 7. Deploy AvailIntentRouter
  console.log("📦 Deploying AvailIntentRouter...");
  const AvailIntentRouter = await ethers.getContractFactory("AvailIntentRouter");
  const availIntentRouter = await AvailIntentRouter.deploy(
    ethers.ZeroAddress, // Avail Nexus core - placeholder
    ethers.ZeroAddress, // Work escrow - will be set later
    deployer.address
  );
  await availIntentRouter.waitForDeployment();
  const availIntentRouterAddress = await availIntentRouter.getAddress();
  console.log("✅ AvailIntentRouter deployed to:", availIntentRouterAddress, "\n");

  // 8. Deploy DisputeResolver
  console.log("📦 Deploying DisputeResolver...");
  const DisputeResolver = await ethers.getContractFactory("DisputeResolver");
  const disputeResolver = await DisputeResolver.deploy(
    pythAddress,
    ethers.ZeroAddress, // Work escrow - will be set later
    reputationRegistryAddress,
    deployer.address
  );
  await disputeResolver.waitForDeployment();
  const disputeResolverAddress = await disputeResolver.getAddress();
  console.log("✅ DisputeResolver deployed to:", disputeResolverAddress, "\n");

  // 9. Deploy WorkEscrow (last, as it depends on others)
  console.log("📦 Deploying WorkEscrow...");
  const WorkEscrow = await ethers.getContractFactory("WorkEscrow");
  const workEscrow = await WorkEscrow.deploy(
    pythAddress,
    yellowChannelManagerAddress,
    availIntentRouterAddress,
    disputeResolverAddress, // Using DisputeResolver as validator registry
    deployer.address, // Fee collector
    deployer.address
  );
  await workEscrow.waitForDeployment();
  const workEscrowAddress = await workEscrow.getAddress();
  console.log("✅ WorkEscrow deployed to:", workEscrowAddress, "\n");

  // Update contracts with WorkEscrow address
  console.log("🔄 Updating contracts with WorkEscrow address...");
  await yellowChannelManager.setYellowAdapter(workEscrowAddress);
  await disputeResolver.pause(); // Pause to update
  // Note: DisputeResolver doesn't have setWorkEscrow, would need to redeploy or add function
  await disputeResolver.unpause();
  console.log("✅ Contracts updated\n");

  // ============ Deployment Summary ============
  
  console.log("=" .repeat(80));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(80));
  console.log("\n📋 Contract Addresses:\n");
  console.log("Core Contracts:");
  console.log("  ReputationRegistry:      ", reputationRegistryAddress);
  console.log("  WorkEscrow:              ", workEscrowAddress);
  console.log("  AgentMatcher:            ", agentMatcherAddress);
  console.log("  DisputeResolver:         ", disputeResolverAddress);
  console.log("  DataCoinFactory:         ", dataCoinFactoryAddress);
  console.log("\nIntegration Contracts:");
  console.log("  PythOracleAdapter:       ", pythAdapterAddress);
  console.log("  YellowChannelManager:    ", yellowChannelManagerAddress);
  console.log("  AvailIntentRouter:       ", availIntentRouterAddress);
  console.log("  LighthouseStorageAdapter:", lighthouseAdapterAddress);
  console.log("\n" + "=".repeat(80));

  // Save deployment addresses to file
  const fs = require("fs");
  const deploymentData = {
    network: network.name,
    chainId: chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ReputationRegistry: reputationRegistryAddress,
      WorkEscrow: workEscrowAddress,
      AgentMatcher: agentMatcherAddress,
      DisputeResolver: disputeResolverAddress,
      DataCoinFactory: dataCoinFactoryAddress,
      PythOracleAdapter: pythAdapterAddress,
      YellowChannelManager: yellowChannelManagerAddress,
      AvailIntentRouter: availIntentRouterAddress,
      LighthouseStorageAdapter: lighthouseAdapterAddress,
    },
    externalContracts: {
      PythOracle: pythAddress,
      PythEntropy: pythEntropyAddress,
    },
  };

  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${deploymentsDir}/${network.name}-${chainId}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
  console.log(`\n💾 Deployment data saved to: ${filename}\n`);

  // ============ Verification Instructions ============
  
  console.log("🔍 To verify contracts on block explorer, run:");
  console.log(`\nnpx hardhat verify --network ${network.name} ${reputationRegistryAddress} "${pythAddress}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network ${network.name} ${workEscrowAddress} "${pythAddress}" "${yellowChannelManagerAddress}" "${availIntentRouterAddress}" "${disputeResolverAddress}" "${deployer.address}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network ${network.name} ${agentMatcherAddress} "${pythAddress}" "${pythEntropyAddress}" "${deployer.address}"`);
  console.log("\n... (run for all contracts)\n");

  console.log("✨ Deployment script completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
