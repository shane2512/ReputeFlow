# 🔐 Wallet Setup Guide for Client Agent

## Overview
The Client Agent uses your wallet's private key to sign and send transactions on Base Sepolia testnet. This guide shows you how to safely connect your wallet.

---

## ⚠️ IMPORTANT SECURITY NOTES

1. **NEVER use your mainnet wallet private key**
2. **ONLY use testnet wallets with no real funds**
3. **NEVER commit your private key to Git**
4. **The .env file is already in .gitignore**

---

## 🚀 Step-by-Step Setup

### 1. Create a Testnet Wallet

**Option A: Using MetaMask**
1. Open MetaMask
2. Click your account icon → "Create Account"
3. Name it "ReputeFlow Testnet" or similar
4. Switch to this account

**Option B: Generate New Wallet with Web3.py**
```python
from eth_account import Account
import secrets

# Generate new account
priv = secrets.token_hex(32)
private_key = "0x" + priv
acct = Account.from_key(private_key)

print(f"Address: {acct.address}")
print(f"Private Key: {private_key}")
```

### 2. Export Private Key from MetaMask

1. Click the 3 dots next to your testnet account
2. Select "Account Details"
3. Click "Show Private Key"
4. Enter your MetaMask password
5. Click to reveal and copy the private key

### 3. Add Private Key to .env

Open `d:\ReputeFlow\agents\agent_fin\.env` and update:

```env
# Your testnet wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here_without_0x
```

**Example:**
```env
PRIVATE_KEY=bca1a949dd18c49712217e3cea297f00d80ed2177de7d8d0048c0c358a0dae44
```

### 4. Get Base Sepolia Testnet ETH

Your wallet needs ETH to pay for gas fees.

**Get Free Testnet ETH:**
1. Visit: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
2. Enter your wallet address
3. Complete the captcha
4. Wait 1-2 minutes for ETH to arrive

**Check Your Balance:**
```bash
# In the agent_fin directory
python -c "from web3 import Web3; from dotenv import load_dotenv; import os; load_dotenv(); w3 = Web3(Web3.HTTPProvider('https://sepolia.base.org')); from eth_account import Account; acc = Account.from_key(os.getenv('PRIVATE_KEY')); print(f'Balance: {w3.from_wei(w3.eth.get_balance(acc.address), \"ether\")} ETH')"
```

---

## 🧪 Test Your Wallet Connection

### Run the Client Agent:

```bash
cd d:\ReputeFlow\agents\agent_fin\client
python client_agent.py
```

**Expected Output:**
```
============================================================
🏢 ReputeFlow Client Agent
============================================================

Wallet Integration:
  Network: Base Sepolia
  RPC: https://sepolia.base.org
  Contract: 0x9B1CD4b71e50936D45413dA1d948b8e1d5AB42Da
  Wallet: 0xYourWalletAddress
  Balance: 0.5 ETH

============================================================
🏢 CLIENT AGENT STARTING
============================================================
Agent Address: agent1q...
💼 Wallet Connected: 0xYourWalletAddress
💰 Balance: 0.5 ETH
```

---

## 📝 Post Your First Job

### 1. Start Required Agents:

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

**Terminal 3 - Test Script:**
```bash
cd d:\ReputeFlow\agents\agent_fin\client
python test_client_agent.py
```

### 2. Update Test Script:

Copy the Client Agent address from Terminal 1 and update `.env`:

```env
CLIENT_AGENT_ADDRESS=agent1q...your_client_agent_address
```

### 3. Watch the Flow:

1. **Test Agent** sends `JobPostRequest` to **Client Agent**
2. **Client Agent** posts job on-chain (uses your wallet)
3. **Client Agent** sends `JobPosted` to **AI Model Agent**
4. **AI Model Agent** sends `JobPostConfirmation` back to **Client Agent**
5. **Client Agent** logs the AI-enhanced confirmation

---

## 🔍 Verify On-Chain

After posting a job, you'll see a transaction hash. View it on BaseScan:

```
https://sepolia.basescan.org/tx/0xYourTransactionHash
```

You can also check the contract:
```
https://sepolia.basescan.org/address/0x9B1CD4b71e50936D45413dA1d948b8e1d5AB42Da
```

---

## 🛠️ Troubleshooting

### "Insufficient balance" Error
- Get more testnet ETH from the faucet
- Wait a few minutes for the transaction to confirm

### "Private key not configured" Error
- Check that PRIVATE_KEY is set in `.env`
- Remove any "0x" prefix from the private key
- Ensure no extra spaces or quotes

### "Transaction failed" Error
- Check your wallet has enough ETH for gas
- Verify the contract address is correct
- Check Base Sepolia network is not congested

### "Nonce too low" Error
- Your wallet sent multiple transactions
- Wait a few seconds and try again
- Clear pending transactions in MetaMask

---

## 📊 Gas Costs

Typical gas costs on Base Sepolia:
- **Create Project**: ~0.001-0.003 ETH
- **Fund Project**: ~0.0005-0.002 ETH
- **Approve Milestone**: ~0.0005-0.001 ETH

**Recommendation:** Keep at least 0.1 ETH in your testnet wallet for testing.

---

## 🔒 Security Best Practices

1. ✅ Use a dedicated testnet wallet
2. ✅ Never share your private key
3. ✅ Keep `.env` in `.gitignore`
4. ✅ Use environment variables in production
5. ✅ Rotate keys regularly
6. ❌ Never commit private keys to Git
7. ❌ Never use mainnet keys for testing
8. ❌ Never share your `.env` file

---

## 🎉 Success!

Once you see this output, your wallet is connected:

```
✅ JOB POSTED SUCCESSFULLY
============================================================
Job ID: 22
TX Hash: 0x1234...5678
View on BaseScan: https://sepolia.basescan.org/tx/0x1234...5678

🤖 AI CONFIRMATION RECEIVED
============================================================
🎉 Congratulations! Your job has been successfully posted on-chain!

📊 Job Details:
   • Job ID: #22
   • Transaction: 0x1234...5678
   • Network: Base Sepolia
   • Status: ✅ Confirmed on blockchain
```

Your Client Agent is now ready to post jobs on-chain! 🚀
