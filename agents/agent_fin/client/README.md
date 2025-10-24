# 🏢 Client Agent - Job Posting System

## Overview
The Client Agent allows clients to post jobs on-chain using the WorkEscrow smart contract on Base Sepolia. It integrates with the AI Model Agent to provide enhanced confirmation messages.

---

## 🎯 Features

- ✅ **Wallet Integration** - Uses your private key to sign transactions
- ✅ **On-Chain Job Posting** - Creates projects in WorkEscrow contract
- ✅ **Milestone Support** - Define multiple milestones with budgets
- ✅ **AI Confirmation** - Receives AI-enhanced success messages
- ✅ **Transaction Tracking** - Get BaseScan links for verification
- ✅ **Error Handling** - Clear error messages and recovery steps

---

## 📁 Files

```
client/
├── client_agent.py          # Main client agent
├── test_client_agent.py     # Test script
├── WALLET_SETUP.md          # Wallet connection guide
└── README.md                # This file
```

---

## 🚀 Quick Start

### 1. Setup Wallet

Follow the [WALLET_SETUP.md](./WALLET_SETUP.md) guide to:
- Create a testnet wallet
- Export your private key
- Get Base Sepolia ETH
- Configure `.env`

### 2. Start Agents

**Terminal 1 - Client Agent:**
```bash
cd d:\ReputeFlow\agents\agent_fin\client
python client_agent.py
```

**Terminal 2 - AI Model Agent:**
```bash
cd d:\ReputeFlow\agents\agent_fin\freelancer
python ai_model_agent.py
```

### 3. Run Test

**Terminal 3 - Test:**
```bash
# Copy Client Agent address from Terminal 1
# Add to .env: CLIENT_AGENT_ADDRESS=agent1q...

cd d:\ReputeFlow\agents\agent_fin\client
python test_client_agent.py
```

---

## 📊 Message Flow

```
┌─────────────┐
│ Test Agent  │
└──────┬──────┘
       │ JobPostRequest
       ▼
┌─────────────┐
│Client Agent │ ──► Posts job on-chain (uses wallet)
└──────┬──────┘
       │ JobPosted
       ▼
┌─────────────┐
│ AI Model    │ ──► Generates AI confirmation
└──────┬──────┘
       │ JobPostConfirmation
       ▼
┌─────────────┐
│Client Agent │ ──► Displays enhanced message
└─────────────┘
```

---

## 💬 Message Models

### JobPostRequest
```python
class JobPostRequest(Model):
    client_address: str
    title: str
    description: str
    budget: float
    required_skills: List[str]
    milestones: List[Dict]  # [{"description": str, "amount": float}]
```

### JobPosted
```python
class JobPosted(Model):
    client_address: str
    job_id: int
    tx_hash: str
    success: bool
    message: str
    timestamp: int
```

### JobPostConfirmation
```python
class JobPostConfirmation(Model):
    client_address: str
    job_id: int
    tx_hash: str
    ai_message: str
    next_steps: List[str]
    timestamp: int
```

---

## 🔧 Configuration

### Required Environment Variables

```env
# Wallet
PRIVATE_KEY=your_testnet_private_key_without_0x

# Network
WEB3_PROVIDER_URL=https://sepolia.base.org

# Contracts
WORK_ESCROW=0x9B1CD4b71e50936D45413dA1d948b8e1d5AB42Da

# Agents
CLIENT_AGENT_SEED=reputeflow_client_2025_secure_seed
AI_MODEL_AGENT_ADDRESS=agent1qf3jdnqdpnkzxffmv0rs5wv4tvefzp0cr29w4rwtwlyx72ac2l8k6zrddqh
CLIENT_AGENT_ADDRESS=agent1q...  # Set after running client_agent.py
```

---

## 📝 Example Job Posting

```python
job_request = JobPostRequest(
    client_address=test_agent.address,
    title="Build DeFi Dashboard with Web3 Integration",
    description="Looking for an experienced blockchain developer...",
    budget=5000.0,
    required_skills=["solidity", "react", "web3", "typescript", "defi"],
    milestones=[
        {
            "description": "Frontend UI/UX Design and Setup",
            "amount": 1500.0
        },
        {
            "description": "Smart Contract Integration",
            "amount": 2000.0
        },
        {
            "description": "Testing and Deployment",
            "amount": 1500.0
        }
    ]
)
```

---

## ✅ Expected Output

### Client Agent Startup:
```
============================================================
🏢 CLIENT AGENT STARTING
============================================================
Agent Address: agent1q2vx...
💼 Wallet Connected: 0x1234...5678
💰 Balance: 0.5 ETH
📜 WorkEscrow Contract: 0x9B1C...42Da
🌐 Network: https://sepolia.base.org
🤖 AI Model Agent: agent1qf3j...rddqh
============================================================
```

### Job Posting Success:
```
============================================================
📝 JOB POST REQUEST RECEIVED
============================================================
From: agent1q...
Client: agent1q...
Title: Build DeFi Dashboard with Web3 Integration
Budget: $5000.00
Skills: ['solidity', 'react', 'web3', 'typescript', 'defi']
Milestones: 3

💼 Posting job from wallet: 0x1234...5678
💰 Wallet balance: 0.5 ETH
📝 Creating project ID: 22
📤 Sending transaction...
⏳ Waiting for confirmation...
✅ Job posted successfully!
   Job ID: 22
   TX Hash: 0xabcd...1234

============================================================
✅ JOB POSTED SUCCESSFULLY
============================================================
Job ID: 22
TX Hash: 0xabcd...1234
View on BaseScan: https://sepolia.basescan.org/tx/0xabcd...1234
📤 Sent confirmation to AI Model Agent
```

### AI Confirmation:
```
============================================================
🤖 AI CONFIRMATION RECEIVED
============================================================
Job ID: 22
TX Hash: 0xabcd...1234

🎉 Congratulations! Your job has been successfully posted on-chain!

📊 Job Details:
   • Job ID: #22
   • Transaction: 0xabcd...1234
   • Network: Base Sepolia
   • Status: ✅ Confirmed on blockchain

🔗 View Transaction:
   https://sepolia.basescan.org/tx/0xabcd...1234

Your job is now visible to all freelancers in the ReputeFlow network.
The AI-powered matching system will automatically connect you with qualified candidates.

📋 Next Steps:
  1. Monitor incoming proposals from freelancers
  2. Review freelancer profiles and reputation scores
  3. Use the AI recommendations to select the best candidate
  4. Fund the escrow contract to activate the project
  5. Track milestone progress through the dashboard
============================================================
```

---

## 🔍 Verification

### Check Transaction on BaseScan:
```
https://sepolia.basescan.org/tx/YOUR_TX_HASH
```

### Check Contract State:
```
https://sepolia.basescan.org/address/0x9B1CD4b71e50936D45413dA1d948b8e1d5AB42Da#readContract
```

### Query Job Details:
```python
from web3 import Web3
w3 = Web3(Web3.HTTPProvider('https://sepolia.base.org'))
contract = w3.eth.contract(address='0x9B1CD4b71e50936D45413dA1d948b8e1d5AB42Da', abi=ABI)
project = contract.functions.projects(22).call()
print(project)
```

---

## 🛠️ Troubleshooting

### Common Issues:

1. **"Private key not configured"**
   - Set `PRIVATE_KEY` in `.env`
   - Remove "0x" prefix

2. **"Insufficient balance"**
   - Get testnet ETH from faucet
   - https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

3. **"Transaction failed"**
   - Check wallet balance
   - Verify contract address
   - Check network status

4. **"AI Model Agent not configured"**
   - Set `AI_MODEL_AGENT_ADDRESS` in `.env`
   - Ensure AI Model Agent is running

---

## 🔐 Security

- ✅ Only use testnet wallets
- ✅ Never commit private keys
- ✅ Keep `.env` in `.gitignore`
- ✅ Use environment variables
- ❌ Never use mainnet keys

---

## 📚 Related Documentation

- [Wallet Setup Guide](./WALLET_SETUP.md)
- [WorkEscrow Contract](../work_escrow_abi.json)
- [Shared Models](../shared_models.py)
- [AI Model Agent](../freelancer/ai_model_agent.py)

---

## 🎉 Success Criteria

Your Client Agent is working correctly when:

1. ✅ Agent starts with wallet connected
2. ✅ Balance shows > 0 ETH
3. ✅ Job posting transaction succeeds
4. ✅ Transaction appears on BaseScan
5. ✅ AI confirmation is received
6. ✅ Job appears in contract state

---

## 🚀 Next Steps

1. **Test job posting** - Run the test script
2. **Verify on-chain** - Check BaseScan
3. **Monitor proposals** - Wait for freelancers
4. **Fund escrow** - Activate the project
5. **Track milestones** - Monitor progress

Your Client Agent is ready to post jobs on-chain! 🎊
