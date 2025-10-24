# ReputeFlow Smart Contracts Deployment Guide

## 📋 Prerequisites

### Required Software
- Node.js 18+ and npm
- Git
- MetaMask or compatible Web3 wallet

### Required Accounts & API Keys
1. **Private Key** - Wallet with testnet/mainnet ETH
2. **RPC URLs** - Alchemy, Infura, or public RPCs
3. **Block Explorer API Keys** - For contract verification
   - Etherscan API key
   - Basescan API key
   - Polygonscan API key

### Testnet Faucets
- **Base Sepolia**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Polygon Amoy**: https://faucet.polygon.technology/
- **Ethereum Sepolia**: https://sepoliafaucet.com/

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd contracts
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Private Keys (NEVER commit actual keys!)
PRIVATE_KEY=your_private_key_here

# RPC URLs
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Block Explorer API Keys
BASESCAN_API_KEY=your_basescan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 15 Solidity files successfully
```

### 4. Run Tests

```bash
npx hardhat test
```

### 5. Deploy to Testnet

#### Base Sepolia (Recommended)
```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

#### Polygon Amoy
```bash
npx hardhat run scripts/deploy.ts --network polygonAmoy
```

#### Ethereum Sepolia
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

---

## 📦 Deployment Order

Contracts are deployed in this specific order due to dependencies:

1. **PythOracleAdapter** - No dependencies
2. **ReputationRegistry** - Requires Pyth
3. **AgentMatcher** - Requires Pyth + Entropy
4. **LighthouseStorageAdapter** - No dependencies
5. **DataCoinFactory** - Requires LighthouseAdapter + ReputationRegistry
6. **YellowChannelManager** - Placeholder dependencies
7. **AvailIntentRouter** - Placeholder dependencies
8. **DisputeResolver** - Requires Pyth + ReputationRegistry
9. **WorkEscrow** - Requires all above contracts

---

## 🔗 Network-Specific Configurations

### Base Sepolia (Chain ID: 84532)

**Pyth Contracts:**
- Oracle: `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729`
- Entropy: `0x98046Bd286715D3B0BC227Dd7a956b83D8978603`

**Explorer:** https://sepolia.basescan.org

**Deployment Command:**
```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

### Polygon Amoy (Chain ID: 80002)

**Pyth Contracts:**
- Oracle: `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729`

**Explorer:** https://amoy.polygonscan.com

**Deployment Command:**
```bash
npx hardhat run scripts/deploy.ts --network polygonAmoy
```

### Base Mainnet (Chain ID: 8453)

**Pyth Contracts:**
- Oracle: `0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a`
- Entropy: `0x98046Bd286715D3B0BC227Dd7a956b83D8978603`

**Explorer:** https://basescan.org

**Deployment Command:**
```bash
npx hardhat run scripts/deploy.ts --network base
```

---

## ✅ Post-Deployment Verification

### 1. Verify Contracts on Block Explorer

After deployment, verify each contract:

```bash
# ReputationRegistry
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> \
  "<PYTH_ADDRESS>" \
  "<ADMIN_ADDRESS>"

# WorkEscrow
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> \
  "<PYTH_ADDRESS>" \
  "<YELLOW_MANAGER_ADDRESS>" \
  "<AVAIL_ROUTER_ADDRESS>" \
  "<VALIDATOR_REGISTRY_ADDRESS>" \
  "<FEE_COLLECTOR_ADDRESS>" \
  "<ADMIN_ADDRESS>"

# AgentMatcher
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> \
  "<PYTH_ADDRESS>" \
  "<PYTH_ENTROPY_ADDRESS>" \
  "<ADMIN_ADDRESS>"

# ... (repeat for all contracts)
```

### 2. Check Deployment File

Deployment addresses are saved to `deployments/<network>-<chainId>.json`:

```json
{
  "network": "baseSepolia",
  "chainId": "84532",
  "timestamp": "2025-10-18T...",
  "deployer": "0x...",
  "contracts": {
    "ReputationRegistry": "0x...",
    "WorkEscrow": "0x...",
    ...
  }
}
```

### 3. Test Contract Interactions

```bash
# Open Hardhat console
npx hardhat console --network baseSepolia

# Load contract
const ReputationRegistry = await ethers.getContractAt(
  "ReputationRegistry",
  "0x..." // deployed address
);

# Test function call
const score = await ReputationRegistry.getReputationScore("0x...");
console.log(score);
```

---

## 🧪 Testing

### Run All Tests
```bash
npx hardhat test
```

### Run Specific Test File
```bash
npx hardhat test test/ReputationRegistry.test.ts
```

### Run with Gas Reporter
```bash
REPORT_GAS=true npx hardhat test
```

### Run with Coverage
```bash
npx hardhat coverage
```

Target: **>80% coverage** for all contracts

---

## 🔧 Troubleshooting

### Issue: "Insufficient funds for gas"

**Solution:** Ensure your wallet has enough testnet ETH. Use faucets listed above.

### Issue: "Nonce too high"

**Solution:** Reset your MetaMask account or use:
```bash
npx hardhat clean
```

### Issue: "Contract verification failed"

**Solution:** 
1. Ensure constructor arguments match exactly
2. Wait 1-2 minutes after deployment
3. Check API key is valid
4. Use `--force` flag if needed

### Issue: "Compilation failed"

**Solution:**
```bash
npx hardhat clean
rm -rf cache artifacts
npm install
npx hardhat compile
```

### Issue: "Pyth contract not found"

**Solution:** Check network configuration in `deploy.ts`. Pyth may not be deployed on all networks.

---

## 📊 Gas Estimates

Approximate gas costs for deployment (Base Sepolia):

| Contract | Gas Used | Cost (0.1 gwei) |
|----------|----------|-----------------|
| ReputationRegistry | ~3.5M | ~0.00035 ETH |
| WorkEscrow | ~4.2M | ~0.00042 ETH |
| AgentMatcher | ~3.8M | ~0.00038 ETH |
| DisputeResolver | ~3.9M | ~0.00039 ETH |
| DataCoinFactory | ~3.2M | ~0.00032 ETH |
| PythOracleAdapter | ~2.8M | ~0.00028 ETH |
| YellowChannelManager | ~3.5M | ~0.00035 ETH |
| AvailIntentRouter | ~3.3M | ~0.00033 ETH |
| LighthouseStorageAdapter | ~2.9M | ~0.00029 ETH |
| **Total** | **~31M** | **~0.0031 ETH** |

---

## 🔐 Security Checklist

Before mainnet deployment:

- [ ] All tests passing (>80% coverage)
- [ ] External audit completed
- [ ] Access control roles configured correctly
- [ ] Emergency pause mechanisms tested
- [ ] Timelock configured for admin functions
- [ ] Multi-sig wallet for admin role
- [ ] Rate limiting implemented where needed
- [ ] Reentrancy guards on all payment functions
- [ ] Input validation on all public functions
- [ ] Events emitted for all state changes

---

## 📝 Contract Addresses

### Base Sepolia Deployment

```
ReputationRegistry:       0x...
WorkEscrow:               0x...
AgentMatcher:             0x...
DisputeResolver:          0x...
DataCoinFactory:          0x...
PythOracleAdapter:        0x...
YellowChannelManager:     0x...
AvailIntentRouter:        0x...
LighthouseStorageAdapter: 0x...
```

*(Update after deployment)*

---

## 🎯 Next Steps After Deployment

1. **Configure Pyth Price Feeds**
   - Add skill-to-feed-ID mappings
   - Test price feed updates
   - Monitor Hermes API

2. **Setup Yellow SDK Integration**
   - Configure state channel parameters
   - Test gasless transactions
   - Integrate with backend

3. **Configure Avail Nexus**
   - Add supported chains
   - Test cross-chain intents
   - Setup routing optimization

4. **Setup Lighthouse Storage**
   - Configure API keys
   - Test file uploads
   - Verify access control

5. **Deploy Agent System**
   - Register agents in Almanac
   - Connect to Agentverse
   - Test agent communication

6. **Launch Backend Services**
   - Start blockchain indexer
   - Configure payment processor
   - Setup notification service

7. **Deploy Frontend**
   - Update contract addresses
   - Test wallet connections
   - Verify all workflows

---

## 📞 Support

- **Documentation:** https://docs.reputeflow.io
- **Discord:** https://discord.gg/reputeflow
- **GitHub Issues:** https://github.com/reputeflow/contracts/issues

---

## 📄 License

MIT License - see LICENSE file for details
