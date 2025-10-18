# ReputeFlow: Decentralized Autonomous Work Economy

**A production-ready Web3 platform combining AI agents, gasless payments, oracle-verified reputation, and cross-chain infrastructure.**

## 🎯 Overview

ReputeFlow revolutionizes the \$1.57 trillion global freelance market by eliminating platform fees (20-30%), reducing payment settlement from weeks to seconds, and creating portable, cryptographically-verified reputation systems.

### Core Features

- **🤖 Autonomous Agent Negotiation** - AI agents handle contract negotiation, skill matching, and project coordination
- **⚡ Gasless Streaming Payments** - Zero-fee micropayments via Yellow SDK state channels
- **🔮 Oracle-Verified Reputation** - Pyth Network provides objective quality validation and provably fair agent selection
- **🌐 Cross-Chain Infrastructure** - Avail Nexus enables unified liquidity across 12+ chains
- **📦 Decentralized Storage** - Lighthouse stores encrypted deliverables and creates tradeable DataCoins
- **🏆 Portable Reputation NFTs** - ERC-721 skill badges transferable across platforms

## 🏗️ Architecture

### Technology Stack

**Smart Contracts:**
- Solidity 0.8.20+
- Hardhat development framework
- OpenZeppelin security standards
- Multi-chain deployment (Base, Polygon, Arbitrum, Optimism)

**Agent System:**
- Fetch.ai uAgents framework
- MeTTa knowledge graphs for reasoning
- Agentverse marketplace integration
- ASI:One natural language interface

**Payment Infrastructure:**
- Yellow SDK (Nitrolite state channels)
- Avail Nexus SDK (cross-chain routing)
- Pyth Network (price feeds & entropy)

**Storage & Data:**
- Lighthouse (encrypted storage)
- IPFS (content addressing)
- DataCoin tokenization

**Backend:**
- Node.js/TypeScript
- PostgreSQL database
- WebSocket real-time updates
- RESTful API

**Frontend:**
- React 18+ with TypeScript
- TailwindCSS styling
- shadcn/ui components
- Lucide icons
- Viem/Wagmi for Web3

## 📁 Project Structure

```
reputeflow/
├── contracts/          # Smart contracts
│   ├── core/          # Core protocol contracts
│   ├── integrations/  # Sponsor SDK adapters
│   ├── test/          # Contract tests
│   └── scripts/       # Deployment scripts
├── agents/            # AI agent implementations
│   ├── freelancer/    # FreelancerAgent
│   ├── client/        # ClientAgent
│   ├── validator/     # ValidatorAgent
│   ├── swarm/         # SwarmCoordinatorAgent
│   ├── market/        # MarketAnalyzerAgent
│   └── protocols/     # Agent communication protocols
├── backend/           # Backend services
│   ├── services/      # Core services
│   ├── api/           # REST API endpoints
│   ├── indexer/       # Blockchain event indexer
│   └── database/      # Database schemas
├── frontend/          # React UI
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
│   └── public/
└── docs/              # Documentation
    ├── architecture/  # System design
    ├── api/          # API documentation
    └── guides/       # User guides
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+ (for agents)
- PostgreSQL 14+
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/reputeflow.git
cd reputeflow

# Install contract dependencies
cd contracts
npm install

# Install agent dependencies
cd ../agents
pip install -r requirements.txt

# Install backend dependencies
cd ../backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

1. **Environment Variables:**

```bash
# contracts/.env
PRIVATE_KEY=your_private_key
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/your-key
PYTH_CONTRACT_ADDRESS=0x...
YELLOW_SDK_ADDRESS=0x...
AVAIL_NEXUS_ADDRESS=0x...

# agents/.env
FETCH_AI_AGENT_KEY=your_agent_key
ALMANAC_CONTRACT=0x...
AGENTVERSE_API_KEY=your_api_key

# backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/reputeflow
PYTH_HERMES_URL=https://hermes.pyth.network
LIGHTHOUSE_API_KEY=your_lighthouse_key
```

2. **Deploy Smart Contracts:**

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network base
```

3. **Start Backend Services:**

```bash
cd backend
npm run migrate
npm run dev
```

4. **Launch Agents:**

```bash
cd agents
python -m agents.freelancer.main &
python -m agents.client.main &
python -m agents.validator.main &
```

5. **Start Frontend:**

```bash
cd frontend
npm run dev
```

Access the application at `http://localhost:3000`

## 🔧 Development

### Running Tests

```bash
# Smart contract tests
cd contracts
npx hardhat test
npx hardhat coverage

# Agent tests
cd agents
pytest tests/

# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Local Development Network

```bash
# Terminal 1: Start local Hardhat node
cd contracts
npx hardhat node

# Terminal 2: Deploy contracts locally
npx hardhat run scripts/deploy.ts --network localhost

# Terminal 3: Start backend
cd backend
npm run dev

# Terminal 4: Start frontend
cd frontend
npm run dev
```

## 📚 Sponsor Integrations

### ASI Alliance (Fetch.ai) - \$10,000 Prize Track

**Implementation:**
- All agents registered in Almanac contract
- Discoverable on Agentverse marketplace
- MeTTa reasoning for reputation scoring
- ASI:One chat integration for natural language interactions
- Multi-agent swarm coordination

**Key Files:**
- `agents/freelancer/agent.py` - FreelancerAgent implementation
- `agents/protocols/negotiation.py` - Agent communication protocols
- `agents/metta/reputation_rules.metta` - MeTTa reasoning rules

### Yellow SDK - \$5,000 Prize Track

**Implementation:**
- Nitrolite state channels for gasless payments
- Streaming micropayments as work progresses
- Multi-party escrow for team projects
- Cross-chain deposits and withdrawals

**Key Files:**
- `contracts/integrations/YellowChannelManager.sol`
- `backend/services/payment-service.ts`

### Pyth Network - \$5,000 Prize Track

**Implementation:**
- Pull-based price feeds from Hermes API
- On-chain `updatePriceFeeds` calls for market rates
- Entropy for provably fair agent selection
- Quality validation against benchmarks

**Key Files:**
- `contracts/integrations/PythOracleAdapter.sol`
- `backend/services/oracle-service.ts`

### Avail Nexus SDK - \$10,000 Prize Track

**Implementation:**
- Unified balance management across 12+ chains
- Intent-based payment routing
- Cross-chain escrow and settlements
- Optimized transaction routing

**Key Files:**
- `contracts/integrations/AvailIntentRouter.sol`
- `backend/services/cross-chain-service.ts`

### Lighthouse Storage - \$1,000 Prize Track

**Implementation:**
- Encrypted deliverable storage
- Access-controlled file sharing
- DataCoin creation for reputation data
- Token-gated content access

**Key Files:**
- `contracts/core/DataCoinFactory.sol`
- `backend/services/storage-service.ts`

## 🎥 Demo

[Link to 2-5 minute demo video showcasing:]
- Agent registration and discovery on Agentverse
- Natural language job posting via ASI:One
- Automated negotiation between agents
- Gasless payment streaming via Yellow SDK
- Pyth oracle price feed integration
- Cross-chain payment via Avail Nexus
- Deliverable upload to Lighthouse
- Reputation NFT minting

## 🏆 Success Criteria

**Technical KPIs:**
- ✅ Agent response time < 2 seconds
- ✅ Payment settlement time < 1 second
- ✅ Zero gas fees for 99%+ operations
- ✅ Cross-chain success rate > 98%
- ✅ Smart contract test coverage > 80%

**Integration Requirements:**
- ✅ All agents registered in Almanac
- ✅ Pyth price feeds updated on-chain
- ✅ Yellow state channels operational
- ✅ Avail Nexus cross-chain routing functional
- ✅ Lighthouse storage with DataCoins

## 🔒 Security

- Multi-signature requirements for high-value operations
- Reentrancy guards on all payment functions
- Role-based access control
- Emergency pause mechanism
- Comprehensive audit trail
- Encrypted data storage

## 📖 Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Smart Contract Documentation](docs/contracts/README.md)
- [Agent Development Guide](docs/agents/README.md)
- [API Reference](docs/api/README.md)
- [Integration Guides](docs/integrations/README.md)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- **Website:** https://reputeflow.io
- **Documentation:** https://docs.reputeflow.io
- **Twitter:** @ReputeFlow
- **Discord:** https://discord.gg/reputeflow

## 👥 Team

Built by a team of blockchain and AI engineers passionate about revolutionizing the future of work.

---

**ReputeFlow** - Autonomous Work Economy for the Decentralized Future
