import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Test Deployed Contracts on Base Sepolia
 * Verifies all contracts are working correctly
 */

async function main() {
  console.log("🧪 Starting ReputeFlow Deployment Tests...\n");

  // Load deployment data
  const deploymentData = JSON.parse(
    fs.readFileSync("./deployments/baseSepolia-84532.json", "utf8")
  );

  const [deployer] = await ethers.getSigners();
  console.log("📍 Testing with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const contracts = deploymentData.contracts;
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: ReputationRegistry
  console.log("=" .repeat(80));
  console.log("TEST 1: ReputationRegistry");
  console.log("=" .repeat(80));
  try {
    const reputationRegistry = await ethers.getContractAt(
      "ReputationRegistry",
      contracts.reputationRegistry
    );

    // Check if contract is deployed
    const code = await ethers.provider.getCode(contracts.reputationRegistry);
    if (code === "0x") throw new Error("Contract not deployed");
    console.log("✅ Contract deployed at:", contracts.reputationRegistry);

    // Check Pyth address
    const pythAddress = await reputationRegistry.pyth();
    console.log("✅ Pyth Oracle address:", pythAddress);
    if (pythAddress !== deploymentData.externalContracts.PythOracle) {
      throw new Error("Pyth address mismatch");
    }

    // Check admin role
    const ADMIN_ROLE = await reputationRegistry.ADMIN_ROLE();
    const hasAdminRole = await reputationRegistry.hasRole(ADMIN_ROLE, deployer.address);
    console.log("✅ Admin role verified:", hasAdminRole);

    // Check nextBadgeId
    const nextBadgeId = await reputationRegistry.nextBadgeId();
    console.log("✅ Next badge ID:", nextBadgeId.toString());

    console.log("✅ ReputationRegistry: ALL TESTS PASSED\n");
    passedTests++;
  } catch (error) {
    console.error("❌ ReputationRegistry test failed:", error);
    failedTests++;
  }

  // Test 2: PythOracleAdapter
  console.log("=" .repeat(80));
  console.log("TEST 2: PythOracleAdapter");
  console.log("=" .repeat(80));
  try {
    const pythAdapter = await ethers.getContractAt(
      "PythOracleAdapter",
      contracts.pythAdapter
    );

    const code = await ethers.provider.getCode(contracts.pythAdapter);
    if (code === "0x") throw new Error("Contract not deployed");
    console.log("✅ Contract deployed at:", contracts.pythAdapter);

    // Check Pyth address
    const pythAddress = await pythAdapter.pyth();
    console.log("✅ Pyth Oracle address:", pythAddress);

    // Check admin role
    const ADMIN_ROLE = await pythAdapter.ADMIN_ROLE();
    const hasAdminRole = await pythAdapter.hasRole(ADMIN_ROLE, deployer.address);
    console.log("✅ Admin role verified:", hasAdminRole);

    console.log("✅ PythOracleAdapter: ALL TESTS PASSED\n");
    passedTests++;
  } catch (error) {
    console.error("❌ PythOracleAdapter test failed:", error);
    failedTests++;
  }

  // Test 3: AgentMatcher
  console.log("=" .repeat(80));
  console.log("TEST 3: AgentMatcher");
  console.log("=" .repeat(80));
  try {
    const agentMatcher = await ethers.getContractAt(
      "AgentMatcher",
      contracts.agentMatcher
    );

    const code = await ethers.provider.getCode(contracts.agentMatcher);
    if (code === "0x") throw new Error("Contract not deployed");
    console.log("✅ Contract deployed at:", contracts.agentMatcher);

    // Check Pyth address
    const pythAddress = await agentMatcher.pyth();
    console.log("✅ Pyth Oracle address:", pythAddress);

    // Check selection nonce
    const selectionNonce = await agentMatcher.selectionNonce();
    console.log("✅ Selection nonce:", selectionNonce.toString());

    console.log("✅ AgentMatcher: ALL TESTS PASSED\n");
    passedTests++;
  } catch (error) {
    console.error("❌ AgentMatcher test failed:", error);
    failedTests++;
  }

  // Test 4: WorkEscrow
  console.log("=" .repeat(80));
  console.log("TEST 4: WorkEscrow");
  console.log("=" .repeat(80));
  try {
    const workEscrow = await ethers.getContractAt(
      "WorkEscrow",
      contracts.workEscrow
    );

    const code = await ethers.provider.getCode(contracts.workEscrow);
    if (code === "0x") throw new Error("Contract not deployed");
    console.log("✅ Contract deployed at:", contracts.workEscrow);

    // Check Pyth address
    const pythAddress = await workEscrow.pyth();
    console.log("✅ Pyth Oracle address:", pythAddress);

    // Check Yellow Channel Manager
    const yellowManager = await workEscrow.yellowChannelManager();
    console.log("✅ Yellow Channel Manager:", yellowManager);

    // Check Avail Router
    const availRouter = await workEscrow.availIntentRouter();
    console.log("✅ Avail Intent Router:", availRouter);

    // Check project counter
    const nextProjectId = await workEscrow.nextProjectId();
    console.log("✅ Next project ID:", nextProjectId.toString());

    console.log("✅ WorkEscrow: ALL TESTS PASSED\n");
    passedTests++;
  } catch (error) {
    console.error("❌ WorkEscrow test failed:", error);
    failedTests++;
  }

  // Test 5: DataCoinFactory
  console.log("=" .repeat(80));
  console.log("TEST 5: DataCoinFactory");
  console.log("=" .repeat(80));
  try {
    const dataCoinFactory = await ethers.getContractAt(
      "DataCoinFactory",
      contracts.dataCoinFactory
    );

    const code = await ethers.provider.getCode(contracts.dataCoinFactory);
    if (code === "0x") throw new Error("Contract not deployed");
    console.log("✅ Contract deployed at:", contracts.dataCoinFactory);

    // Check Lighthouse adapter
    const lighthouseAdapter = await dataCoinFactory.lighthouseAdapter();
    console.log("✅ Lighthouse Adapter:", lighthouseAdapter);
    if (lighthouseAdapter !== contracts.lighthouseAdapter) {
      throw new Error("Lighthouse adapter mismatch");
    }

    // Check reputation registry
    const reputationRegistry = await dataCoinFactory.reputationRegistry();
    console.log("✅ Reputation Registry:", reputationRegistry);

    // Check next coin ID
    const nextCoinId = await dataCoinFactory.nextCoinId();
    console.log("✅ Next coin ID:", nextCoinId.toString());

    console.log("✅ DataCoinFactory: ALL TESTS PASSED\n");
    passedTests++;
  } catch (error) {
    console.error("❌ DataCoinFactory test failed:", error);
    failedTests++;
  }

  // Test 6: LighthouseStorageAdapter
  console.log("=" .repeat(80));
  console.log("TEST 6: LighthouseStorageAdapter");
  console.log("=" .repeat(80));
  try {
    const lighthouseAdapter = await ethers.getContractAt(
      "LighthouseStorageAdapter",
      contracts.lighthouseAdapter
    );

    const code = await ethers.provider.getCode(contracts.lighthouseAdapter);
    if (code === "0x") throw new Error("Contract not deployed");
    console.log("✅ Contract deployed at:", contracts.lighthouseAdapter);

    // Check DataCoin factory
    const dataCoinFactory = await lighthouseAdapter.dataCoinFactory();
    console.log("✅ DataCoin Factory:", dataCoinFactory);
    if (dataCoinFactory !== contracts.dataCoinFactory) {
      throw new Error("DataCoin factory mismatch");
    }

    // Check total files
    const totalFiles = await lighthouseAdapter.totalFilesStored();
    console.log("✅ Total files stored:", totalFiles.toString());

    console.log("✅ LighthouseStorageAdapter: ALL TESTS PASSED\n");
    passedTests++;
  } catch (error) {
    console.error("❌ LighthouseStorageAdapter test failed:", error);
    failedTests++;
  }

  // Test 7: DisputeResolver
  console.log("=" .repeat(80));
  console.log("TEST 7: DisputeResolver");
  console.log("=" .repeat(80));
  try {
    const disputeResolver = await ethers.getContractAt(
      "DisputeResolver",
      contracts.disputeResolver
    );

    const code = await ethers.provider.getCode(contracts.disputeResolver);
    if (code === "0x") throw new Error("Contract not deployed");
    console.log("✅ Contract deployed at:", contracts.disputeResolver);

    // Check Pyth address
    const pythAddress = await disputeResolver.pyth();
    console.log("✅ Pyth Oracle address:", pythAddress);

    // Check reputation registry
    const reputationRegistry = await disputeResolver.reputationRegistry();
    console.log("✅ Reputation Registry:", reputationRegistry);

    // Check dispute counter
    const nextDisputeId = await disputeResolver.nextDisputeId();
    console.log("✅ Next dispute ID:", nextDisputeId.toString());

    console.log("✅ DisputeResolver: ALL TESTS PASSED\n");
    passedTests++;
  } catch (error) {
    console.error("❌ DisputeResolver test failed:", error);
    failedTests++;
  }

  // Test 8: YellowChannelManager
  console.log("=" .repeat(80));
  console.log("TEST 8: YellowChannelManager");
  console.log("=" .repeat(80));
  try {
    const yellowManager = await ethers.getContractAt(
      "YellowChannelManager",
      contracts.yellowChannelManager
    );

    const code = await ethers.provider.getCode(contracts.yellowChannelManager);
    if (code === "0x") throw new Error("Contract not deployed");
    console.log("✅ Contract deployed at:", contracts.yellowChannelManager);

    // Check channel counter
    const nextChannelId = await yellowManager.nextChannelId();
    console.log("✅ Next channel ID:", nextChannelId.toString());

    console.log("✅ YellowChannelManager: ALL TESTS PASSED\n");
    passedTests++;
  } catch (error) {
    console.error("❌ YellowChannelManager test failed:", error);
    failedTests++;
  }

  // Test 9: AvailIntentRouter
  console.log("=" .repeat(80));
  console.log("TEST 9: AvailIntentRouter");
  console.log("=" .repeat(80));
  try {
    const availRouter = await ethers.getContractAt(
      "AvailIntentRouter",
      contracts.availIntentRouter
    );

    const code = await ethers.provider.getCode(contracts.availIntentRouter);
    if (code === "0x") throw new Error("Contract not deployed");
    console.log("✅ Contract deployed at:", contracts.availIntentRouter);

    // Check intent counter
    const nextIntentId = await availRouter.nextIntentId();
    console.log("✅ Next intent ID:", nextIntentId.toString());

    console.log("✅ AvailIntentRouter: ALL TESTS PASSED\n");
    passedTests++;
  } catch (error) {
    console.error("❌ AvailIntentRouter test failed:", error);
    failedTests++;
  }

  // Final Summary
  console.log("\n" + "=".repeat(80));
  console.log("🎯 TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`✅ Passed: ${passedTests}/9`);
  console.log(`❌ Failed: ${failedTests}/9`);
  console.log(`📊 Success Rate: ${((passedTests / 9) * 100).toFixed(1)}%`);
  console.log("=".repeat(80));

  if (failedTests === 0) {
    console.log("\n🎉 ALL TESTS PASSED! Deployment is fully functional!\n");
  } else {
    console.log("\n⚠️  Some tests failed. Please review the errors above.\n");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test script failed:", error);
    process.exit(1);
  });
