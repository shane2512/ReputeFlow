"""
Agent Configuration Module
Centralized configuration for all ReputeFlow agents
"""

import os
from dotenv import load_dotenv
from web3 import Web3

# Load environment variables
load_dotenv()

class AgentConfig:
    """Base configuration for all agents"""
    
    # ASI Alliance
    AGENTVERSE_API_KEY = os.getenv("AGENTVERSE_API_KEY", "")
    ALMANAC_API_KEY = os.getenv("ALMANAC_API_KEY", "")
    AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "https://agentverse.ai")
    
    # Agent Seeds
    FREELANCER_AGENT_SEED = os.getenv("FREELANCER_AGENT_SEED", "freelancer_seed")
    CLIENT_AGENT_SEED = os.getenv("CLIENT_AGENT_SEED", "client_seed")
    VALIDATOR_AGENT_SEED = os.getenv("VALIDATOR_AGENT_SEED", "validator_seed")
    SWARM_COORDINATOR_SEED = os.getenv("SWARM_COORDINATOR_SEED", "coordinator_seed")
    MARKET_ANALYZER_SEED = os.getenv("MARKET_ANALYZER_SEED", "analyzer_seed")
    REPUTATION_ORACLE_SEED = os.getenv("REPUTATION_ORACLE_SEED", "oracle_seed")
    
    # Blockchain
    WEB3_PROVIDER_URL = os.getenv("WEB3_PROVIDER_URL", "https://sepolia.base.org")
    PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
    
    # Contract Addresses
    REPUTATION_REGISTRY = os.getenv("REPUTATION_REGISTRY", "")
    WORK_ESCROW = os.getenv("WORK_ESCROW", "")
    AGENT_MATCHER = os.getenv("AGENT_MATCHER", "")
    DISPUTE_RESOLVER = os.getenv("DISPUTE_RESOLVER", "")
    
    # Agent Settings
    AGENT_PORT_START = int(os.getenv("AGENT_PORT_START", "8000"))
    ENABLE_MAILBOX = os.getenv("ENABLE_MAILBOX", "true").lower() == "true"
    ENABLE_METTA_REASONING = os.getenv("ENABLE_METTA_REASONING", "true").lower() == "true"
    
    @classmethod
    def get_web3(cls):
        """Get Web3 instance"""
        return Web3(Web3.HTTPProvider(cls.WEB3_PROVIDER_URL))
    
    @classmethod
    def get_account(cls):
        """Get account from private key"""
        w3 = cls.get_web3()
        return w3.eth.account.from_key(cls.PRIVATE_KEY)

# Contract ABIs (simplified - add full ABIs as needed)
REPUTATION_REGISTRY_ABI = [
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "getReputation",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "getSkillBadges",
        "outputs": [{"name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    }
]

AGENT_MATCHER_ABI = [
    {
        "inputs": [
            {"name": "agent", "type": "address"},
            {"name": "skills", "type": "string[]"},
            {"name": "hourlyRate", "type": "uint256"},
            {"name": "availability", "type": "uint8"},
            {"name": "reputationScore", "type": "uint256"}
        ],
        "name": "registerAgent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "requiredSkills", "type": "string[]"},
            {"name": "minReputation", "type": "uint256"},
            {"name": "maxBudget", "type": "uint256"}
        ],
        "name": "findBestAgent",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
]

WORK_ESCROW_ABI = [
    {
        "inputs": [
            {"name": "client", "type": "address"},
            {"name": "freelancer", "type": "address"},
            {"name": "totalBudget", "type": "uint256"},
            {"name": "milestoneDescriptions", "type": "string[]"},
            {"name": "milestoneAmounts", "type": "uint256[]"},
            {"name": "milestoneDeadlines", "type": "uint256[]"}
        ],
        "name": "createProject",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function"
    }
]

DISPUTE_RESOLVER_ABI = [
    {
        "inputs": [
            {"name": "projectId", "type": "uint256"},
            {"name": "description", "type": "string"}
        ],
        "name": "raiseDispute",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]
