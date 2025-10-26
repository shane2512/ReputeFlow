# ReputeFlow

**Decentralized Freelance Work Automation Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-blue)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.x-orange)](https://hardhat.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

> A fully autonomous, AI-powered decentralized work economy integrating ASI Alliance, Yellow Network, Pyth Oracle, Avail, and Lighthouse for trustless freelance collaboration.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Smart Contracts](#smart-contracts)
- [Agent System](#agent-system)
- [Frontend Dashboard](#frontend-dashboard)
- [Sponsor Integrations](#sponsor-integrations)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

ReputeFlow revolutionizes the freelance economy by combining blockchain technology, AI agents, and decentralized infrastructure to create a fully automated, trustless platform for work collaboration.

### The Problem

Traditional freelance platforms suffer from:
- High fees (20-30%)
- Centralized control and censorship
- Payment delays and disputes
- Lack of portable reputation
- No automation or AI assistance

### Our Solution

ReputeFlow provides:
- **0% platform fees** - Direct peer-to-peer payments
- **Autonomous AI agents** - Automatic job matching and proposal generation
- **Instant payments** - PYUSD stablecoin with Yellow Network state channels
- **Portable reputation** - On-chain NFT skill badges
- **Decentralized storage** - Lighthouse for deliverables
- **Cross-chain support** - Avail Nexus for unified liquidity

---

## ✨ Key Features

### 🤖 Autonomous AI Agents

- **Client Agent**: Natural language job posting, automatic proposal evaluation
- **Freelancer Agent**: Skill-based job matching, AI-powered proposal generation
- **Job Matcher**: Intelligent matching using reputation scores
- **Storage Agent**: Decentralized profile and skill management

### 💰 Advanced Payment System

- **Multi-token support**: ETH, PYUSD, cross-chain assets
- **Gasless payments**: Yellow Network state channels
- **Instant settlement**: Sub-second payment finality
- **Escrow protection**: Smart contract-based milestone payments

### 📊 Dynamic Reputation System

- **On-chain reputation**: Immutable, portable across platforms
- **Skill-based NFTs**: Verifiable credentials as NFT badges
- **Quality scoring**: Project completion and rating tracking
- **Decay mechanism**: Time-weighted reputation scores

### 🔗 Decentralized Infrastructure

- **Yellow Network**: Gasless PYUSD payment channels (Live ✅)
- **Smart Contracts**: On-chain escrow and reputation (Live ✅)
- **Base Sepolia**: Primary deployment network (Live ✅)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Dashboard  │  │  Job Board   │  │  Reputation  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────┐
│              AI Agent Layer (uAgents)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Client  │  │Freelancer│  │  Matcher │  │ Storage  │  │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────┐
│              Smart Contract Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ WorkEscrow   │  │  Reputation  │  │ AgentMatcher │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────┐
│           Integration Layer                                 │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Yellow Network  │  │  Base Sepolia    │               │
│  │  (PYUSD Escrow)  │  │  (Blockchain)    │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Blockchain & Smart Contracts
- **Solidity 0.8.28** - Smart contract development
- **Hardhat** - Development environment and testing
- **Base Sepolia** - Primary deployment network
- **OpenZeppelin** - Secure contract libraries

### AI & Agents
- **uAgents (Fetch.ai)** - Autonomous agent framework
- **ASI:One Chat Protocol** - Natural language interface
- **Gemini AI** - Proposal generation and summaries
- **Regex NLP** - Command parsing

### Sponsor Integrations
- **Yellow Network** ✅ - PYUSD gasless payment channels (Live)
- **Pyth Network** 🔄 - Contracts deployed, integration pending
- **Avail Nexus** 🔄 - Contracts deployed, integration pending
- **Lighthouse** 🔄 - Contracts deployed, integration pending

### Frontend & Backend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling
- **shadcn/ui** - Modern UI components
- **Wagmi & Viem** - Web3 interactions

### Development Tools
- **Python 3.8+** - Agent development
- **Node.js 18+** - JavaScript runtime
- **Git** - Version control

---

## 🚀 Getting Started

### Prerequisites

```bash
# Required
- Node.js 18+ and npm
- Python 3.8+
- Git

# Recommended
- MetaMask or compatible Web3 wallet
- Base Sepolia testnet ETH
- PYUSD testnet tokens (Ethereum Sepolia)
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ReputeFlow.git
cd ReputeFlow
```

2. **Install dependencies**

```bash
# Install root dependencies
npm install

# Install contract dependencies
cd contracts
npm install

# Install agent dependencies
cd ../agents
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

3. **Configure environment variables**

```bash
# Copy example files
cp agents/agent_fin/.env.example agents/agent_fin/.env
cp contracts/.env.example contracts/.env
cp frontend/.env.example frontend/.env.local

# Edit .env files with your values
# See Configuration section below
```

4. **Deploy smart contracts**

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network baseSepolia
```

5. **Start the agents**

```bash
cd agents/agent_fin

# Terminal 1 - Storage Agent
python freelancer/strorage_agent.py

# Terminal 2 - Job Matcher
python freelancer/job_matcher_agent.py

# Terminal 3 - Freelancer Agent
python freelancer/freelancer_agent.py

# Terminal 4 - Client Agent
python client/client_agent_chat.py
```

6. **Start the frontend**

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to access the dashboard.

---

## 📁 Project Structure

```
ReputeFlow/
├── contracts/                    # Smart contracts
│   ├── core/                    # Core contracts
│   │   ├── WorkEscrow.sol      # Milestone-based escrow
│   │   ├── ReputationRegistry.sol  # On-chain reputation
│   │   ├── AgentMatcher.sol    # AI-powered matching
│   │   ├── DisputeResolver.sol # Dispute resolution
│   │   └── DataCoinFactory.sol # NFT skill badges
│   ├── integrations/           # Sponsor integrations
│   │   ├── PythOracleAdapter.sol
│   │   ├── YellowChannelManager_v2.sol
│   │   ├── AvailIntentRouter.sol
│   │   └── LighthouseStorageAdapter.sol
│   ├── scripts/                # Deployment scripts
│   ├── test/                   # Contract tests
│   └── hardhat.config.js       # Hardhat configuration
│
├── agents/                      # AI Agent system
│   └── agent_fin/
│       ├── client/             # Client agent
│       │   └── client_agent_chat.py
│       ├── freelancer/         # Freelancer agents
│       │   ├── freelancer_agent.py
│       │   ├── job_matcher_agent.py
│       │   ├── strorage_agent.py
│       │   └── ai_model_agent.py
│       ├── nlp_service.py      # Natural language processing
│       └── shared_models.py    # Agent communication models
│
├── frontend/                    # Next.js dashboard
│   ├── app/                    # App router pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── jobs/               # Job board
│   │   ├── reputation/         # Reputation view
│   │   └── profile/            # User profile
│   ├── components/             # React components
│   ├── lib/                    # Utilities
│   └── public/                 # Static assets
│
├── docs/                        # Documentation
├── .gitignore                  # Git ignore rules
├── package.json                # Root package config
└── README.md                   # This file
```

---

## 📜 Smart Contracts

### Core Contracts (Base Sepolia)

| Contract | Address | Description |
|----------|---------|-------------|
| **WorkEscrow** | `0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B` | Milestone-based escrow with skill requirements |
| **ReputationRegistry** | `0xFA07a0C1A3Cbc2aB9CB5e8b81A8c62c077925026` | On-chain reputation and skill tracking |
| **AgentMatcher** | `0x79fFF158FBe10377E127516851f2b7bC4571f4F1` | AI-powered job matching |
| **DisputeResolver** | `0x76d6F10e6051E3eeE334c506380c95fd3a67264F` | Decentralized dispute resolution |
| **DataCoinFactory** | `0x4e4dfDC8F44308e2477751F20F1b9916006979dF` | NFT skill badge minting |

### Integration Contracts

| Contract | Network | Address | Description |
|----------|---------|---------|-------------|
| **PythOracleAdapter** | Base Sepolia | `0x974c6286983395aF4135F25b42f040FC62FFA6fa` | Price feeds integration |
| **YellowChannelManager** | Ethereum Sepolia | `0xC5611b4A46AA158215FB198aB99FcCdB87af62A7` | Gasless payment channels |
| **AvailIntentRouter** | Base Sepolia | `0x2C75FaD3c3dA15Fb0bC3A678c154466E6c94bB95` | Cross-chain routing |
| **LighthouseStorageAdapter** | Base Sepolia | `0x35b8E2b20b0b06eF6EF1eEC9CE0183757C61ceF4` | Decentralized storage |

### Key Features

#### WorkEscrow
- Milestone-based payments with skill requirements
- Multi-token support (ETH, PYUSD)
- Automatic freelancer assignment via proposals
- Deliverable submission and approval workflow

#### ReputationRegistry
- Dynamic reputation scoring with decay
- Skill-based NFT badges
- Pyth Oracle integration for USD conversion
- Quality and completion tracking

#### AgentMatcher
- Pyth Entropy for randomized matching
- Skill-based filtering
- Reputation-weighted selection
- On-chain match verification

---

## 🤖 Agent System

### Agent Architecture

ReputeFlow uses the **uAgents framework** from Fetch.ai for autonomous agent communication.

### Available Agents

#### 1. Client Agent (`client_agent_chat.py`)
**Port:** 8005

**Capabilities:**
- Natural language job posting
- Automatic proposal evaluation
- On-chain job creation
- PYUSD payment processing
- Deliverable approval

**Example Usage:**
```
User: "post a job for Smart Contract Dev budget:20$ description:needed a smart contract skills:solidity,rust"
Agent: ✅ Job Posted Successfully! Job ID: #23
```

#### 2. Freelancer Agent (`freelancer_agent.py`)
**Port:** 8000

**Capabilities:**
- Skill registration
- Job discovery and matching
- AI-powered proposal generation
- Deliverable submission

**Example Usage:**
```
User: "register my skills python solidity rust"
Agent: ✅ Skills registered successfully!

User: "find jobs"
Agent: 📋 Found 3 matching jobs...
```

#### 3. Job Matcher Agent (`job_matcher_agent.py`)
**Port:** 8001

**Capabilities:**
- Skill-based job matching
- Reputation scoring
- AI-enhanced match summaries

#### 4. Storage Agent (`strorage_agent.py`)
**Port:** 8002

**Capabilities:**
- Freelancer profile storage
- Skill database management
- Proposal storage

### Agent Communication

Agents communicate using the **ASI Alliance protocol**:

```python
# Example: Client sends job to matcher
await ctx.send(MATCHER_ADDRESS, FindJobsRequest(
    freelancer_address=freelancer,
    skills=["solidity", "rust"],
    min_budget=100
))
```

### Natural Language Processing

The system includes an **NLP service** powered by OpenRouter API for natural language understanding:

```python
# Input
"post a job for Smart Contract Dev budget:20$ skills:solidity"

# Parsed Output
{
    "title": "Smart Contract Dev",
    "budget": 20.0,
    "skills": ["solidity"]
}
```

---

## 💻 Frontend Dashboard

### Features

- **Job Board**: Browse and post jobs
- **Reputation Dashboard**: View on-chain reputation scores
- **Profile Management**: Manage skills and credentials
- **Payment Tracking**: Monitor escrow and payments
- **Real-time Updates**: Live agent communication

### Tech Stack

- **Next.js 14** with App Router
- **TailwindCSS** for styling
- **shadcn/ui** components
- **Wagmi** for Web3 integration
- **Recharts** for data visualization

### Key Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/dashboard` | Main dashboard |
| `/jobs` | Job board |
| `/reputation` | Reputation scores |
| `/profile` | User profile |

---

## 🔌 Sponsor Integrations

### Yellow Network ✅ IMPLEMENTED

**Integration:** Gasless state channel payments for PYUSD

**Features:**
- Off-chain PYUSD transfers
- Zero gas fees for payments
- Instant settlement
- Escrow management with role-based access

**Implementation:**
```javascript
// Deposit PYUSD to escrow
await yellowManager.recordDeposit(jobId, client, freelancer, amount);

// Release payment to freelancer
await yellowManager.releasePayment(jobId);
```

**Contract:** `YellowChannelManager_v2.sol` (Ethereum Sepolia)  
**Address:** `0xC5611b4A46AA158215FB198aB99FcCdB87af62A7`

**Status:** ✅ Live on Ethereum Sepolia with PYUSD support

---

### Planned Integrations 🔄

The following sponsor technologies are integrated at the contract level and ready for activation:

#### Pyth Network
- **Contract:** `PythOracleAdapter.sol` (Base Sepolia)
- **Planned Use:** Real-time ETH/USD price feeds for reputation scoring
- **Status:** Contract deployed, integration pending

#### Avail Nexus
- **Contract:** `AvailIntentRouter.sol` (Base Sepolia)
- **Planned Use:** Cross-chain payment routing
- **Status:** Contract deployed, SDK integration pending

#### Lighthouse Storage
- **Contract:** `LighthouseStorageAdapter.sol` (Base Sepolia)
- **Planned Use:** Decentralized deliverable storage
- **Status:** Contract deployed, file upload integration pending

---

## 🚢 Deployment

### Smart Contracts

1. **Configure environment**
```bash
cd contracts
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

2. **Deploy to Base Sepolia**
```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

3. **Verify contracts**
```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

### Agents

1. **Configure agent addresses**
```bash
cd agents/agent_fin
cp .env.example .env
# Add agent addresses and contract addresses
```

2. **Start agents**
```bash
# Run each agent in a separate terminal
python freelancer/strorage_agent.py
python freelancer/job_matcher_agent.py
python freelancer/freelancer_agent.py
python client/client_agent_chat.py
```

### Frontend

1. **Configure Web3**
```bash
cd frontend
cp .env.example .env.local
# Add contract addresses and RPC URLs
```

2. **Build and deploy**
```bash
npm run build
npm start
# Or deploy to Vercel
vercel deploy
```

---

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts
npx hardhat test
npx hardhat coverage
```

### Agent Tests

```bash
cd agents
pytest agent_fin/freelancer/tests/
```

### Integration Tests

```bash
# Test full workflow
cd contracts
npx hardhat run scripts/test-integration.ts --network baseSepolia
```

---

## 🔒 Security

### Smart Contract Security

- ✅ **OpenZeppelin** libraries for standard implementations
- ✅ **ReentrancyGuard** on all state-changing functions
- ✅ **Access control** with role-based permissions
- ✅ **Checks-Effects-Interactions** pattern
- ✅ **SafeERC20** for token transfers

### Key Security Features

1. **Escrow Protection**: Funds locked until milestone approval
2. **Role-based Access**: Admin, operator, and user roles
3. **Time-locks**: Dispute resolution cooldown periods
4. **Reputation Decay**: Prevents stale reputation scores
5. **Emergency Withdrawals**: Admin-only for stuck funds

### Environment Security

⚠️ **NEVER commit `.env` files to git**

The `.gitignore` is configured to exclude:
- All `.env` files
- Private keys
- Wallet files
- Agent storage databases

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Keep commits atomic and descriptive

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Sponsor Technologies

- **ASI Alliance** - Autonomous agent framework
- **Pyth Network** - Oracle infrastructure
- **Yellow Network** - State channel technology
- **Avail** - Cross-chain infrastructure
- **Lighthouse** - Decentralized storage

### Built With

- [Fetch.ai uAgents](https://fetch.ai/)
- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Hardhat](https://hardhat.org/)
- [Next.js](https://nextjs.org/)
- [TailwindCSS](https://tailwindcss.com/)

---

## 📞 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/ReputeFlow/issues)
- **Documentation**: [Full documentation]((https://repute-flow.vercel.app/docs))


---

## 🗺️ Roadmap

### Phase 1 (Current) ✅
- [x] Core smart contracts (WorkEscrow, Reputation)
- [x] AI agent system (5 autonomous agents)
- [x] ASI:One chat protocol integration
- [x] Yellow Network PYUSD payments
- [x] Natural language processing
- [x] Frontend dashboard
- [x] Agentverse registration and discovery

### Phase 2 (Q2 2025)
- [ ] Agentverse registration and discovery
- [ ] MeTTa knowledge graph integration
- [ ] Pyth Oracle price feeds activation
- [ ] Avail cross-chain routing
- [ ] Lighthouse decentralized storage
- [ ] Mobile app (React Native)

### Phase 3 (Q3 2025)
- [ ] DAO governance
- [ ] Staking and rewards
- [ ] Enterprise features
- [ ] API marketplace

---

<div align="center">

**Built with ❤️ by the Shane**

 • [Docs](https://repute-flow.vercel.app/docs) • [Demo](https://repute-flow.vercel.app/)

</div>
