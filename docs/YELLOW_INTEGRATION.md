# Yellow Network Integration Guide

## 🎯 Overview

ReputeFlow integrates with **Yellow Network** using the **Nitrolite SDK** to enable gasless, instant streaming payments through state channels. This integration allows freelancers to receive payments in real-time without paying gas fees for every transaction.

---

## 🏗️ Architecture

### Components

1. **YellowChannelManager.sol** - Smart contract for on-chain channel management
2. **YellowNetworkService** - Backend service for ClearNode communication
3. **Nitrolite SDK** - Official Yellow Network SDK for state channel operations

### Flow

```
Client Payment → WorkEscrow → YellowChannelManager → ClearNode → Freelancer
                                      ↓
                              State Channel Updates
                                      ↓
                              Gasless Transactions
```

---

## 📦 Installation

### 1. Install Dependencies

```bash
npm install @erc7824/nitrolite ws ethers
```

### 2. Configure Environment

Add to your `.env` file:

```env
# Yellow Network Configuration
YELLOW_CLEARNODE_URL=wss://clearnet.yellow.com/ws
YELLOW_STATE_WALLET_KEY=your_state_wallet_private_key
YELLOW_APPLICATION_ADDRESS=0x_your_app_address_from_apps_yellow_com
YELLOW_APP_NAME=ReputeFlow
```

---

## 🚀 Getting Started

### Step 1: Create a Channel on Yellow Network

1. Visit [apps.yellow.com](https://apps.yellow.com)
2. Sign up or log in
3. Navigate to "Channels"
4. Click "Create New Channel"
5. Configure your channel settings
6. Copy your application address

### Step 2: Initialize the Service

```typescript
import { initializeYellowService } from './services/yellowService';

const yellowService = await initializeYellowService();
```

### Step 3: Connect to ClearNode

```typescript
await yellowService.connect();

// Check status
const status = yellowService.getStatus();
console.log('Connected:', status.connected);
console.log('Authenticated:', status.authenticated);
```

---

## 💡 Key Features

### ✅ Gasless Transactions
- No gas fees for state channel updates
- Instant payment finality
- Off-chain state management

### ✅ Streaming Payments
- Real-time payment streams
- Configurable payment rates
- Automatic settlement

### ✅ Multi-Party Channels
- Support for multiple participants
- Collaborative state updates
- Fair dispute resolution

### ✅ Challenge Period
- Configurable security period
- Fraud prevention
- Safe settlement mechanism

---

## 🔧 API Reference

### YellowNetworkService

#### `connect(): Promise<void>`
Establishes WebSocket connection to ClearNode and authenticates.

```typescript
await yellowService.connect();
```

#### `getChannels(): Promise<void>`
Retrieves all channels for the authenticated user.

```typescript
await yellowService.getChannels();
```

#### `getLedgerBalances(channelId: string): Promise<void>`
Gets current balances for a specific channel.

```typescript
await yellowService.getLedgerBalances('0x...');
```

#### `getConfig(): Promise<void>`
Fetches ClearNode configuration.

```typescript
await yellowService.getConfig();
```

#### `createSignedRequest(method: string, params: any[]): Promise<string>`
Creates a signed request for custom operations.

```typescript
const request = await yellowService.createSignedRequest('custom_method', [param1, param2]);
```

#### `disconnect(): void`
Closes the WebSocket connection.

```typescript
yellowService.disconnect();
```

---

## 🔐 Authentication Flow

### 1. Initial Connection
```typescript
// WebSocket opens
ws.onopen = () => {
  // Send auth_request
  const authRequest = createAuthRequestMessage({...});
  ws.send(authRequest);
};
```

### 2. Challenge Response
```typescript
// Receive auth_challenge
ws.onmessage = (message) => {
  if (message.method === 'auth_challenge') {
    // Sign with EIP-712
    const authVerify = createAuthVerifyMessage(...);
    ws.send(authVerify);
  }
};
```

### 3. Authentication Success
```typescript
// Receive auth_success
if (message.method === 'auth_verify' && message.params.success) {
  // Store JWT token
  jwtToken = message.params.jwtToken;
  // Now authenticated!
}
```

---

## 📊 Channel Management

### Creating a Channel

Channels are created through [apps.yellow.com](https://apps.yellow.com). Once created, you can interact with them programmatically:

```typescript
// Get all channels
await yellowService.getChannels();

// Response format:
{
  channel_id: "0x...",
  participant: "0x...",
  status: "open",
  token: "0x...",
  amount: "100000",
  chain_id: 137,
  adjudicator: "0x...",
  challenge: 86400,
  nonce: 1,
  version: 2,
  created_at: "2023-05-01T12:00:00Z",
  updated_at: "2023-05-01T12:30:00Z"
}
```

### Channel States

- **open** - Active and ready for transactions
- **closed** - Finalized and settled
- **settling** - In settlement process
- **disputed** - Under dispute resolution

---

## 💰 Streaming Payments

### Configure Streaming

```typescript
// In YellowChannelManager contract
await yellowChannelManager.configureStreaming(
  channelId,
  streamRate,    // e.g., 0.0001 ETH per second
  streamDuration // e.g., 3600 seconds (1 hour)
);
```

### Start Streaming

```typescript
await yellowChannelManager.startStreaming(channelId);
```

### Stop Streaming

```typescript
await yellowChannelManager.stopStreaming(channelId);
```

---

## 🔄 Integration with WorkEscrow

### Workflow

1. **Project Created** → WorkEscrow creates escrow
2. **Channel Opened** → YellowChannelManager creates state channel
3. **Work Starts** → Streaming payment begins
4. **Milestone Completed** → Channel state updated
5. **Project Finished** → Channel settled on-chain

### Example Integration

```typescript
// In WorkEscrow contract
function createProject(...) {
  // Create escrow
  projects[projectId] = Project({...});
  
  // Open Yellow channel for streaming
  yellowChannelManager.createChannel(
    [client, freelancer],
    [clientDeposit, 0],
    challengePeriod
  );
}
```

---

## 🧪 Testing

### Run Integration Test

```bash
cd backend
npx ts-node test-yellow-sdk.ts
```

### Expected Output

```
🧪 Testing Yellow Network SDK Integration
================================================================================
📦 Initializing Yellow Network service...
🔗 Connecting to Yellow Network ClearNode...
✅ WebSocket connection established
🔐 Starting authentication...
🔑 Received auth challenge
✅ Authentication successful
📋 Received channels information
✅ Successfully connected to Yellow Network!
🎉 Nitrolite SDK integration is working!
================================================================================
```

---

## 📋 Smart Contract Integration

### YellowChannelManager.sol

Key functions:

```solidity
// Create a new state channel
function createChannel(
    address[] calldata participants,
    uint256[] calldata initialBalances,
    uint256 challengePeriod
) external payable returns (bytes32 channelId);

// Update channel state
function updateChannelState(
    bytes32 channelId,
    uint256 nonce,
    uint256[] calldata balances,
    bytes[] calldata signatures
) external;

// Configure streaming payment
function configureStreaming(
    bytes32 channelId,
    uint256 streamRate,
    uint256 streamDuration
) external;

// Settle channel on-chain
function settleChannel(bytes32 channelId) external;
```

---

## 🔍 Monitoring & Debugging

### Check Connection Status

```typescript
const status = yellowService.getStatus();
console.log('Status:', status);
```

### Listen to Custom Events

```typescript
yellowService.onMessage('custom_event', (data) => {
  console.log('Received custom event:', data);
});
```

### Error Handling

```typescript
try {
  await yellowService.connect();
} catch (error) {
  console.error('Connection failed:', error);
  // Implement retry logic
}
```

---

## 🎯 Best Practices

### 1. Secure Key Management
- Never commit private keys
- Use environment variables
- Implement key rotation

### 2. Connection Management
- Implement reconnection logic
- Handle WebSocket errors gracefully
- Monitor connection health

### 3. State Synchronization
- Keep off-chain and on-chain state in sync
- Implement conflict resolution
- Regular state backups

### 4. Gas Optimization
- Use state channels for frequent updates
- Settle on-chain only when necessary
- Batch operations when possible

---

## 🚨 Troubleshooting

### Connection Issues

**Problem:** Cannot connect to ClearNode
**Solution:**
- Check `YELLOW_CLEARNODE_URL` is correct
- Verify network connectivity
- Ensure firewall allows WebSocket connections

### Authentication Failures

**Problem:** Authentication fails
**Solution:**
- Verify `YELLOW_STATE_WALLET_KEY` is valid
- Check application address is correct
- Ensure channel exists at apps.yellow.com

### Channel Not Found

**Problem:** Channel operations fail
**Solution:**
- Create channel at apps.yellow.com first
- Verify channel ID is correct
- Check channel status

---

## 📚 Resources

- **Yellow Network Docs:** https://docs.yellow.com
- **Nitrolite SDK:** https://www.npmjs.com/package/@erc7824/nitrolite
- **Apps Portal:** https://apps.yellow.com
- **ClearNode URL:** wss://clearnet.yellow.com/ws

---

## 🎊 Integration Status

✅ **Nitrolite SDK:** Installed and configured
✅ **YellowNetworkService:** Implemented
✅ **Authentication:** Working
✅ **Channel Operations:** Functional
✅ **Smart Contract:** Deployed on Base Sepolia
✅ **WorkEscrow Integration:** Ready

**Status:** Production-ready for Yellow Network integration!

---

## 📞 Support

For issues or questions:
1. Check Yellow Network documentation
2. Review integration examples
3. Test with the provided test script
4. Contact Yellow Network support

---

**Last Updated:** October 18, 2025
**Integration Version:** 1.0.0
**SDK Version:** @erc7824/nitrolite@latest
