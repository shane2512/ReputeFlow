"""
Client Agent with Chat Protocol - Posts jobs on-chain via conversational interface
Handles wallet integration and blockchain transactions
Compatible with ASI:One
"""

import os
import time
import json
import re
from uagents import Agent, Context, Protocol, Model
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)
from web3 import Web3
from eth_account import Account
from datetime import datetime
from uuid import uuid4
from typing import List, Dict
import sys
from dotenv import load_dotenv

# Try to import reputation updater
try:
    # Try direct import first (for Agentverse - files in same directory)
    from reputation_updater import approve_deliverable_and_update_reputation
    REPUTATION_UPDATER_AVAILABLE = True
    print(f"✅ Reputation updater loaded (same directory)")
except ImportError:
    try:
        # Try from parent directories (for local development)
        agents_folder = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        sys.path.insert(0, agents_folder)
        from reputation_updater import approve_deliverable_and_update_reputation
        REPUTATION_UPDATER_AVAILABLE = True
        print(f"✅ Reputation updater loaded from: {agents_folder}")
    except Exception as e:
        print(f"⚠️ Reputation updater not available: {e}")
        REPUTATION_UPDATER_AVAILABLE = False

# Try to import NLP service (optional - will fallback if not available)
try:
    # Add parent directory to path for nlp_service import
    if '__file__' in globals():
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from nlp_service import convert_to_command_client
    NLP_AVAILABLE = True
except Exception as e:
    print(f"NLP service not available: {e}")
    NLP_AVAILABLE = False
    def convert_to_command_client(text):
        return text  # Fallback: return original text

load_dotenv()

# Message Models - Embedded for Agentverse compatibility
class JobPostRequest(Model):
    client_address: str
    title: str
    description: str
    budget: float
    required_skills: List[str]
    milestones: List[Dict]

class JobPosted(Model):
    client_address: str
    job_id: int
    tx_hash: str
    success: bool
    message: str
    timestamp: int

class JobPostConfirmation(Model):
    client_address: str
    job_id: int
    tx_hash: str
    ai_message: str
    next_steps: List[str]
    timestamp: int

# Proposal Models
class GetProposalsRequest(Model):
    job_id: int
    requester: str

class ProposalData(Model):
    freelancer_address: str
    proposal_text: str
    estimated_hours: int
    timestamp: int

class ProposalsResponse(Model):
    job_id: int
    proposals: List[ProposalData]
    total_count: int

# Blockchain Configuration
WEB3_PROVIDER_URL = os.getenv("WEB3_PROVIDER_URL", "https://sepolia.base.org")
WORK_ESCROW_ADDRESS = os.getenv("WORK_ESCROW")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
AI_MODEL_AGENT_ADDRESS = os.getenv("AI_MODEL_AGENT_ADDRESS")
STORAGE_AGENT_ADDRESS = os.getenv("STORAGE_AGENT_ADDRESS")

# PYUSD Configuration - Using Ethereum Sepolia for payments
ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY", "dkw5deNwC4xOmi8m-G_Ng")
PYUSD_NETWORK_URL = f"https://eth-sepolia.g.alchemy.com/v2/{ALCHEMY_API_KEY}"  # Ethereum Sepolia for PYUSD
PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"  # Ethereum Sepolia PYUSD
YELLOW_CHANNEL_MANAGER = os.getenv("YELLOW_CHANNEL_MANAGER", "0xC5611b4A46AA158215FB198aB99FcCdB87af62A7")  # Yellow SDK escrow (fixed)
ESCROW_PRIVATE_KEY = os.getenv("ESCROW_PRIVATE_KEY")  # For releasing payments from escrow

# ERC20 ABI for PYUSD
ERC20_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "spender", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# Initialize Web3 instances
w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL))  # Base Sepolia for contracts
w3_pyusd = Web3(Web3.HTTPProvider(PYUSD_NETWORK_URL))  # Ethereum Sepolia for PYUSD

# Updated WorkEscrow ABI with skills support
WORK_ESCROW_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "client", "type": "address"},
            {"internalType": "address", "name": "freelancer", "type": "address"},
            {"internalType": "uint256", "name": "totalBudget", "type": "uint256"},
            {"internalType": "string[]", "name": "milestoneDescriptions", "type": "string[]"},
            {"internalType": "uint256[]", "name": "milestoneAmounts", "type": "uint256[]"},
            {"internalType": "uint256[]", "name": "milestoneDeadlines", "type": "uint256[]"},
            {"internalType": "string[]", "name": "requiredSkills", "type": "string[]"}
        ],
        "name": "createProject",
        "outputs": [{"internalType": "uint256", "name": "projectId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "projectId", "type": "uint256"},
            {"internalType": "address", "name": "newFreelancer", "type": "address"}
        ],
        "name": "updateFreelancer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "nextProjectId",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "projectId", "type": "uint256"}],
        "name": "getProjectSkills",
        "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# Initialize Agent
agent = Agent(
    name="client_agent_chat",
    seed=os.getenv("CLIENT_AGENT_SEED", "client_agent_seed_2025"),
    port=8005,
    endpoint=["http://localhost:8005/submit"]
)

# Chat protocol for ASI:One compatibility
chat_protocol = Protocol(name="ClientChatProtocol", spec=chat_protocol_spec)

def parse_natural_job_post(text: str):
    """
    Parse natural language job posting without API
    Handles formats like: "post a job for Smart Contract Dev budget:20$ description:needed a smart contract skills:solidity,rust"
    Returns: (title, description, budget, skills) or None if can't parse
    """
    text_lower = text.lower()
    
    # Try to extract components using regex
    title = None
    description = None
    budget = None
    skills = []
    
    # Extract title (text between "job for" and first keyword)
    title_match = re.search(r'job\s+for\s+([^:]+?)(?:\s+budget|\s+description|\s+skills|$)', text, re.IGNORECASE)
    if title_match:
        title = title_match.group(1).strip()
    
    # Extract budget (look for budget: followed by number)
    budget_match = re.search(r'budget\s*:\s*\$?(\d+(?:\.\d+)?)', text, re.IGNORECASE)
    if budget_match:
        budget = float(budget_match.group(1))
    
    # Extract description (look for description: or decription:)
    desc_match = re.search(r'de[sc]ription\s*:\s*([^:]+?)(?:\s+skills|\s+budget|$)', text, re.IGNORECASE)
    if desc_match:
        description = desc_match.group(1).strip()
    
    # Extract skills (look for skills: followed by comma-separated list)
    skills_match = re.search(r'skills?\s*:\s*([a-zA-Z,\s]+?)(?:\s+budget|\s+description|$)', text, re.IGNORECASE)
    if skills_match:
        skills_text = skills_match.group(1).strip()
        skills = [s.strip() for s in re.split(r'[,\s]+', skills_text) if s.strip()]
    
    # Check if we got minimum required fields
    if title and budget and (description or skills):
        # Use title as description if description is missing
        if not description:
            description = f"Project requiring {', '.join(skills)}"
        # Use generic skill if skills missing
        if not skills:
            skills = ["General"]
        
        return title, description, budget, skills
    
    return None

def get_wallet_address():
    """Get wallet address from private key"""
    if not PRIVATE_KEY:
        return None
    account = Account.from_key(PRIVATE_KEY)
    return account.address

def get_contract():
    """Get WorkEscrow contract instance"""
    if not WORK_ESCROW_ADDRESS or not WORK_ESCROW_ADDRESS.strip():
        return None
    return w3.eth.contract(
        address=Web3.to_checksum_address(WORK_ESCROW_ADDRESS),
        abi=WORK_ESCROW_ABI
    )

def post_job_on_chain(ctx: Context, job_data: dict):
    """
    Post a job on-chain using WorkEscrow contract
    Returns: (success, job_id, tx_hash, message)
    """
    try:
        # Validate wallet
        if not PRIVATE_KEY:
            return False, 0, "", "Private key not configured"
        
        account = Account.from_key(PRIVATE_KEY)
        wallet_address = account.address
        
        ctx.logger.info(f"💼 Posting job from wallet: {wallet_address}")
        
        # Get contract
        contract = get_contract()
        if not contract:
            return False, 0, "", "WorkEscrow contract not configured"
        
        # Check balance
        balance = w3.eth.get_balance(wallet_address)
        ctx.logger.info(f"💰 Wallet balance: {w3.from_wei(balance, 'ether')} ETH")
        
        if balance == 0:
            return False, 0, "", "Insufficient balance. Get testnet ETH from https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
        
        # Prepare milestone data in the correct format
        milestone_descriptions = []
        milestone_amounts = []
        milestone_deadlines = []
        total_budget_wei = 0
        
        for m in job_data.get("milestones", []):
            amount_eth = m.get("amount", 0)
            amount_wei = int(amount_eth * 10**18)  # Convert to wei
            
            # Ensure minimum amount (at least 0.000001 ETH = 1000000000000 wei)
            if amount_wei < 1000000000000:
                ctx.logger.warning(f"⚠️  Milestone amount too small: {amount_eth} ETH, setting to minimum 0.000001 ETH")
                amount_wei = 1000000000000
            
            milestone_descriptions.append(m.get("description", "Milestone"))
            milestone_amounts.append(amount_wei)
            milestone_deadlines.append(int(time.time()) + (30 * 24 * 60 * 60))  # 30 days from now
            total_budget_wei += amount_wei
        
        # Verify contract is accessible
        try:
            next_project_id = contract.functions.nextProjectId().call()
            ctx.logger.info(f"📝 Next project ID will be: {next_project_id}")
        except Exception as contract_error:
            ctx.logger.error(f"❌ Cannot read from contract: {contract_error}")
            return False, 0, "", f"Contract not accessible: {str(contract_error)}"
        
        # Log milestone details for debugging
        ctx.logger.info(f"📋 Milestones to create: {len(milestone_descriptions)}")
        for i in range(len(milestone_descriptions)):
            ctx.logger.info(f"   Milestone {i+1}:")
            ctx.logger.info(f"      Description: {milestone_descriptions[i]}")
            ctx.logger.info(f"      Amount: {w3.from_wei(milestone_amounts[i], 'ether')} ETH ({milestone_amounts[i]} wei)")
            ctx.logger.info(f"      Deadline: {milestone_deadlines[i]}")
        
        ctx.logger.info(f"📊 Total budget: {w3.from_wei(total_budget_wei, 'ether')} ETH")
        ctx.logger.info(f"📝 Job title: '{job_data.get('title', '')}'")
        ctx.logger.info(f"📝 Job description: '{job_data.get('description', '')[:50]}...'")
        
        # Verify milestones are not empty
        if not milestone_descriptions:
            return False, 0, "", "No milestones provided. At least one milestone is required."
        
        # Use client address as temporary freelancer (contract doesn't allow 0x0)
        # In production, this would be updated when a freelancer is assigned
        freelancer_address = wallet_address
        ctx.logger.info(f"👤 Client: {wallet_address}")
        ctx.logger.info(f"👤 Freelancer: {freelancer_address} (temporary - same as client, will be reassigned)")
        
        # Get required skills from job data
        required_skills = job_data.get("skills", [])
        if not isinstance(required_skills, list):
            ctx.logger.error(f"❌ Skills is not a list: {type(required_skills)}")
            required_skills = []
        ctx.logger.info(f"🎯 Required skills: {required_skills}")
        ctx.logger.info(f"🎯 Skills type: {type(required_skills)}")
        
        # Debug: Log all parameters
        ctx.logger.info("📋 Transaction Parameters:")
        ctx.logger.info(f"   Client: {wallet_address}")
        ctx.logger.info(f"   Freelancer: {freelancer_address}")
        ctx.logger.info(f"   Total Budget (wei): {total_budget_wei}")
        ctx.logger.info(f"   Milestone Count: {len(milestone_descriptions)}")
        ctx.logger.info(f"   Milestone Amounts Sum: {sum(milestone_amounts)}")
        ctx.logger.info(f"   Skills: {required_skills}")
        ctx.logger.info(f"   Match: {sum(milestone_amounts) == total_budget_wei}")
        
        # Estimate gas first to catch any revert reasons early
        ctx.logger.info("⛽ Estimating gas for createProject()...")
        try:
            estimated_gas = contract.functions.createProject(
                Web3.to_checksum_address(wallet_address),  # client
                Web3.to_checksum_address(freelancer_address),  # freelancer
                total_budget_wei,  # totalBudget
                milestone_descriptions,  # milestoneDescriptions
                milestone_amounts,  # milestoneAmounts
                milestone_deadlines,  # milestoneDeadlines
                required_skills  # requiredSkills
            ).estimate_gas({'from': wallet_address})
            ctx.logger.info(f"✅ Estimated gas: {estimated_gas}")
            # Add 20% safety buffer
            gas_limit = int(estimated_gas * 1.2)
            ctx.logger.info(f"   Gas limit (with 20% buffer): {gas_limit}")
        except Exception as gas_error:
            ctx.logger.error(f"❌ Gas estimation failed: {gas_error}")
            ctx.logger.error("   This usually means the transaction would revert!")
            return False, 0, "", f"Gas estimation failed (transaction would revert): {str(gas_error)}"
        
        # Build transaction
        try:
            # Use 'pending' to get the latest nonce
            nonce = w3.eth.get_transaction_count(wallet_address, 'pending')
            ctx.logger.info(f"📝 Using nonce: {nonce}")
            
            tx = contract.functions.createProject(
                Web3.to_checksum_address(wallet_address),  # client
                Web3.to_checksum_address(freelancer_address),  # freelancer
                total_budget_wei,  # totalBudget
                milestone_descriptions,  # milestoneDescriptions
                milestone_amounts,  # milestoneAmounts
                milestone_deadlines,  # milestoneDeadlines
                required_skills  # requiredSkills
            ).build_transaction({
                'from': wallet_address,
                'nonce': nonce,
                'gas': gas_limit,
                'gasPrice': w3.eth.gas_price
                # Note: Not including 'value' since createProject is not payable
                # The escrow is funded separately after project creation
            })
            ctx.logger.info("✅ Transaction built successfully")
        except Exception as build_error:
            ctx.logger.error(f"❌ Failed to build transaction: {build_error}")
            return False, 0, "", f"Failed to build transaction: {str(build_error)}"
        
        # Sign transaction
        try:
            signed_tx = account.sign_transaction(tx)
            ctx.logger.info("✅ Transaction signed")
        except Exception as sign_error:
            ctx.logger.error(f"❌ Failed to sign transaction: {sign_error}")
            return False, 0, "", f"Failed to sign transaction: {str(sign_error)}"
        
        # Send transaction
        ctx.logger.info("📤 Sending transaction...")
        try:
            # Handle both old and new Web3.py versions
            raw_tx = signed_tx.rawTransaction if hasattr(signed_tx, 'rawTransaction') else signed_tx.raw_transaction
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            ctx.logger.info(f"✅ Transaction sent: {tx_hash.hex()}")
        except Exception as send_error:
            ctx.logger.error(f"❌ Failed to send transaction: {send_error}")
            return False, 0, "", f"Failed to send transaction: {str(send_error)}"
        
        # Wait for receipt
        ctx.logger.info("⏳ Waiting for confirmation...")
        try:
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            ctx.logger.info(f"📬 Receipt received. Status: {receipt['status']}")
            ctx.logger.info(f"   Gas used: {receipt['gasUsed']}")
            
            if receipt['status'] == 1:
                ctx.logger.info(f"✅ Job posted successfully!")
                ctx.logger.info(f"   Job ID: {next_project_id}")
                ctx.logger.info(f"   TX Hash: {tx_hash.hex()}")
                return True, next_project_id, tx_hash.hex(), "Job posted successfully on-chain"
            else:
                # Transaction reverted
                ctx.logger.error(f"❌ Transaction reverted!")
                ctx.logger.error(f"   TX Hash: {tx_hash.hex()}")
                ctx.logger.error(f"   Block: {receipt.get('blockNumber', 'unknown')}")
                ctx.logger.error(f"   Gas used: {receipt.get('gasUsed', 'unknown')}")
                ctx.logger.error(f"   View on BaseScan: https://sepolia.basescan.org/tx/{tx_hash.hex()}")
                
                # Common reasons for revert in WorkEscrow:
                error_msg = (
                    "Transaction reverted. Possible reasons:\n"
                    "1. Milestone amounts must be > 0\n"
                    "2. Title and description cannot be empty\n"
                    "3. At least one milestone required\n"
                    "4. Contract may have access restrictions\n"
                    f"Check transaction on BaseScan: https://sepolia.basescan.org/tx/{tx_hash.hex()}"
                )
                
                return False, 0, tx_hash.hex(), error_msg
        except Exception as receipt_error:
            ctx.logger.error(f"❌ Error waiting for receipt: {receipt_error}")
            return False, 0, "", f"Error waiting for receipt: {str(receipt_error)}"
            
    except Exception as e:
        ctx.logger.error(f"❌ Error posting job: {e}")
        return False, 0, "", str(e)


@agent.on_event("startup")
async def startup(ctx: Context):
    """Initialize client agent"""
    ctx.logger.info("="*60)
    ctx.logger.info("🏢 CLIENT AGENT WITH CHAT PROTOCOL STARTING")
    ctx.logger.info("="*60)
    ctx.logger.info(f"Agent Address: {agent.address}")
    
    # Check wallet connection
    wallet_address = get_wallet_address()
    if wallet_address:
        ctx.logger.info(f"💼 Wallet Connected: {wallet_address}")
        balance = w3.eth.get_balance(wallet_address)
        ctx.logger.info(f"💰 Balance: {w3.from_wei(balance, 'ether')} ETH")
        
        if balance == 0:
            ctx.logger.warning("⚠️  Zero balance! Get testnet ETH from:")
            ctx.logger.warning("   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet")
    else:
        ctx.logger.error("❌ Wallet not configured! Set PRIVATE_KEY in .env")
    
    ctx.logger.info(f"📜 WorkEscrow Contract: {WORK_ESCROW_ADDRESS}")
    ctx.logger.info(f"🌐 Network: {WEB3_PROVIDER_URL}")
    ctx.logger.info(f"🤖 AI Model Agent: {AI_MODEL_AGENT_ADDRESS}")
    ctx.logger.info("="*60)
    ctx.logger.info("ASI:One Chat Protocol Enabled")
    ctx.logger.info("Available Commands:")
    ctx.logger.info("1. 'post job: [title] | [description] | [budget] | [skills]'")
    ctx.logger.info("2. 'check balance' - Check wallet balance")
    ctx.logger.info("3. 'my jobs' - List your posted jobs")
    ctx.logger.info("4. 'help' - Show available commands")
    ctx.logger.info("="*60)


# ========== ASI:One Chat Protocol Handler ==========
@chat_protocol.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    """
    Handle incoming chat messages from ASI:One
    Supports conversational job posting
    """
    # Send acknowledgement
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id),
    )
    
    # Collect text from message
    text = ''
    for item in msg.content:
        if isinstance(item, TextContent):
            text += item.text
    
    # Extract wallet address if embedded in message
    wallet_address = None
    if text.startswith('[WALLET:'):
        # Extract wallet address from [WALLET:0x...] prefix
        end_bracket = text.find(']')
        if end_bracket > 0:
            wallet_address = text[8:end_bracket]  # Skip '[WALLET:'
            text = text[end_bracket + 1:].strip()  # Remove prefix from text
            ctx.logger.info(f"👛 Extracted wallet address: {wallet_address}")
            ctx.storage.set("current_wallet_address", wallet_address)
    
    ctx.logger.info(f"💬 Received chat message from {sender}: {text}")
    
    # Convert natural language to command using NLP
    original_text = text
    text = convert_to_command_client(text)
    
    if text != original_text:
        ctx.logger.info(f"🤖 NLP converted: '{original_text}' → '{text}'")
    
    response_text = ""
    
    # Parse commands
    text_lower = text.lower().strip()
    
    if "post job" in text_lower or "create job" in text_lower or "post a job" in text_lower:
        # Try natural language parsing first
        parsed = parse_natural_job_post(text)
        
        if parsed:
            # Natural language format parsed successfully
            title, description, budget, skills = parsed
            ctx.logger.info(f"✅ Parsed natural language job post: {title}, ${budget}, {skills}")
            
            # Process the parsed job data
            budget_eth = budget * 0.001
            budget_wei = int(budget_eth * 10**18)
            
            # Split into milestones
            milestone1_wei = int(budget_wei * 0.3)
            milestone2_wei = int(budget_wei * 0.4)
            milestone3_wei = budget_wei - milestone1_wei - milestone2_wei
            
            job_data = {
                "title": title,
                "description": description,
                "budget": budget,
                "budget_eth": budget_eth,
                "skills": skills,
                "milestones": [
                    {"description": "Initial milestone", "amount": milestone1_wei / 10**18},
                    {"description": "Development milestone", "amount": milestone2_wei / 10**18},
                    {"description": "Final delivery", "amount": milestone3_wei / 10**18}
                ],
                "client": sender
            }
            
            ctx.storage.set(f"pending_job_{sender}", json.dumps(job_data))
            
            response_text = f"""
📝 Job Details Received:
   • Title: {title}
   • Budget: ${budget:.2f}
   • Skills: {', '.join(skills)}

⏳ Posting job on-chain...
This may take 30-60 seconds. I'll notify you when it's complete!
"""
            
            # Post job on-chain
            success, job_id, tx_hash, message = post_job_on_chain(ctx, job_data)
            
            if success:
                ctx.storage.set(f"job_{job_id}", json.dumps({
                    "job_id": job_id,
                    "tx_hash": tx_hash,
                    "client": sender,
                    "title": title,
                    "budget": budget
                }))
                
                if AI_MODEL_AGENT_ADDRESS:
                    await ctx.send(AI_MODEL_AGENT_ADDRESS, JobPosted(
                        client_address=sender,
                        job_id=job_id,
                        tx_hash=tx_hash,
                        success=True,
                        message=message,
                        timestamp=int(time.time())
                    ))
                
                response_text += f"""

✅ Job Posted Successfully!

📊 Details:
   • Job ID: #{job_id}
   • Transaction: {tx_hash[:10]}...{tx_hash[-8:]}
   • Network: Base Sepolia

🔗 View on BaseScan:
https://sepolia.basescan.org/tx/{tx_hash}

Your job is now live! Freelancers will start seeing it shortly.
"""
            else:
                response_text += f"""

❌ Job Posting Failed

Error: {message}

Please check:
• Your wallet has sufficient Base Sepolia ETH
• The contract is correctly configured
• Try again or contact support
"""
        elif "|" in text:
            # Format: "post job: Build DeFi Dashboard | Looking for blockchain dev | 5000 | solidity,react,web3"
            try:
                parts = text.split(":", 1)[1].split("|")
                if len(parts) >= 4:
                    title = parts[0].strip()
                    description = parts[1].strip()
                    budget = float(parts[2].strip())
                    skills = [s.strip() for s in parts[3].split(",")]
                    
                    # Store job data for processing
                    # Convert budget to ETH (treat input as USD, convert to small ETH amount)
                    # For testing: $20 USD = 0.02 ETH (1 USD = 0.001 ETH)
                    budget_eth = budget * 0.001
                    budget_wei = int(budget_eth * 10**18)
                    
                    # Split into milestones ensuring they sum exactly to total
                    milestone1_wei = int(budget_wei * 0.3)
                    milestone2_wei = int(budget_wei * 0.4)
                    milestone3_wei = budget_wei - milestone1_wei - milestone2_wei  # Remainder to ensure exact sum
                    
                    job_data = {
                        "title": title,
                        "description": description,
                        "budget": budget,  # Original USD budget for display
                        "budget_eth": budget_eth,  # ETH amount for contract
                        "skills": skills,
                        "milestones": [
                            {"description": "Initial milestone", "amount": milestone1_wei / 10**18},
                            {"description": "Development milestone", "amount": milestone2_wei / 10**18},
                            {"description": "Final delivery", "amount": milestone3_wei / 10**18}
                        ],
                        "client": sender
                    }
                    
                    ctx.storage.set(f"pending_job_{sender}", json.dumps(job_data))
                    
                    response_text = f"""
📝 Job Details Received:
   • Title: {title}
   • Budget: ${budget:.2f}
   • Skills: {', '.join(skills)}

⏳ Posting job on-chain...
This may take 30-60 seconds. I'll notify you when it's complete!
"""
                    
                    # Post job on-chain
                    success, job_id, tx_hash, message = post_job_on_chain(ctx, job_data)
                    
                    if success:
                        # Store job info
                        ctx.storage.set(f"job_{job_id}", json.dumps({
                            "job_id": job_id,
                            "tx_hash": tx_hash,
                            "client": sender,
                            "title": title,
                            "budget": budget
                        }))
                        
                        # Send to AI Model for enhanced confirmation
                        if AI_MODEL_AGENT_ADDRESS:
                            await ctx.send(AI_MODEL_AGENT_ADDRESS, JobPosted(
                                client_address=sender,
                                job_id=job_id,
                                tx_hash=tx_hash,
                                success=True,
                                message=message,
                                timestamp=int(time.time())
                            ))
                        
                        response_text += f"""

✅ Job Posted Successfully!

📊 Details:
   • Job ID: #{job_id}
   • Transaction: {tx_hash[:10]}...{tx_hash[-8:]}
   • Network: Base Sepolia

🔗 View on BaseScan:
https://sepolia.basescan.org/tx/{tx_hash}

Your job is now live! Freelancers will start seeing it shortly.
"""
                    else:
                        response_text += f"""

❌ Job Posting Failed

Error: {message}

Please check:
• Your wallet has sufficient Base Sepolia ETH
• The contract is correctly configured
• Try again or contact support
"""
                else:
                    response_text = "❌ Invalid format. Use: 'post job: [title] | [description] | [budget] | [skills]'"
            except Exception as e:
                response_text = f"❌ Error parsing job details: {str(e)}\n\nUse format: 'post job: [title] | [description] | [budget] | [skills]'"
        else:
            response_text = """
📝 To post a job, use this format:

post job: [title] | [description] | [budget] | [skills]

Example:
post job: Build DeFi Dashboard | Looking for blockchain developer | 5000 | solidity,react,web3

I'll handle the rest! 🚀
"""
    
    elif "check balance" in text_lower or "wallet balance" in text_lower:
        wallet = get_wallet_address()
        if wallet:
            # Base Sepolia ETH balance
            balance_base = w3.eth.get_balance(wallet)
            balance_base_eth = w3.from_wei(balance_base, 'ether')
            
            # Ethereum Sepolia ETH balance
            balance_eth_sepolia = w3_pyusd.eth.get_balance(wallet)
            balance_eth_sepolia_eth = w3_pyusd.from_wei(balance_eth_sepolia, 'ether')
            
            # Check PYUSD balance on Ethereum Sepolia
            pyusd_contract = w3_pyusd.eth.contract(
                address=Web3.to_checksum_address(PYUSD_ADDRESS),
                abi=ERC20_ABI
            )
            pyusd_balance = pyusd_contract.functions.balanceOf(wallet).call()
            pyusd_amount = pyusd_balance / 10**6  # PYUSD has 6 decimals
            
            response_text = f"""
💼 Wallet Information

Address: {wallet}

💰 Base Sepolia (Contracts):
• ETH: {balance_base_eth:.4f} ETH

💰 Ethereum Sepolia (PYUSD):
• ETH: {balance_eth_sepolia_eth:.4f} ETH
• PYUSD: {pyusd_amount:.2f} PYUSD

PYUSD Contract: {PYUSD_ADDRESS}

{f"⚠️ Low Base ETH! Get from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet" if balance_base_eth < 0.01 else "✅ Sufficient Base ETH"}
{f"⚠️ Low Ethereum Sepolia ETH for PYUSD gas!" if balance_eth_sepolia_eth < 0.01 else "✅ Sufficient ETH Sepolia ETH"}
{f"⚠️ No PYUSD! You need PYUSD to fund jobs." if pyusd_amount == 0 else f"✅ PYUSD balance: ${pyusd_amount:.2f}"}
"""
        else:
            response_text = "❌ Wallet not configured. Please set PRIVATE_KEY in .env"
    
    elif "my jobs" in text_lower or "list jobs" in text_lower:
        # Get all jobs for this client
        jobs = []
        storage_keys = ctx.storage._data.keys() if hasattr(ctx.storage, '_data') else []
        
        for key in storage_keys:
            if key.startswith("job_"):
                job_data = json.loads(ctx.storage.get(key))
                if job_data.get("client") == sender:
                    jobs.append(job_data)
        
        if jobs:
            response_text = f"📋 Your Posted Jobs ({len(jobs)}):\n\n"
            for job in jobs:
                response_text += f"""
Job #{job['job_id']}
   • Title: {job['title']}
   • Budget: ${job['budget']:.2f}
   • TX: {job['tx_hash'][:10]}...{job['tx_hash'][-8:]}
   • View: https://sepolia.basescan.org/tx/{job['tx_hash']}

"""
        else:
            response_text = "📋 You haven't posted any jobs yet.\n\nUse 'post job' to create your first job!"
    
    elif "show proposals" in text_lower or "view proposals" in text_lower:
        # Format: "show proposals: 1" or "view proposals for job 1"
        try:
            import re
            # Extract job ID
            if ":" in text:
                job_id = int(text.split(":", 1)[1].strip())
            else:
                # Try to find number in text
                numbers = re.findall(r'\d+', text)
                job_id = int(numbers[0]) if numbers else None
            
            if job_id:
                ctx.storage.set("viewing_proposals_job", job_id)
                ctx.storage.set("proposals_requester", sender)
                
                # Request proposals from storage agent
                if STORAGE_AGENT_ADDRESS:
                    await ctx.send(STORAGE_AGENT_ADDRESS, GetProposalsRequest(
                        job_id=job_id,
                        requester=str(agent.address)
                    ))
                    # Don't send response now - wait for proposals from storage agent
                    response_text = None
                else:
                    response_text = "❌ Storage agent not configured"
            else:
                response_text = "❌ Please provide job ID.\n\nFormat: 'show proposals: 1'"
        except Exception as e:
            ctx.logger.error(f"Error parsing show proposals: {e}")
            response_text = "❌ Invalid format. Use: 'show proposals: 1'"
    
    elif "accept proposal" in text_lower:
        # Format: "accept proposal: 1 0x123..."
        try:
            parts = text.split(":", 1)[1].strip().split()
            if len(parts) >= 2:
                job_id = int(parts[0])
                freelancer_address_raw = parts[1]
                
                # Convert to checksum address
                try:
                    freelancer_address = Web3.to_checksum_address(freelancer_address_raw)
                except Exception as addr_error:
                    response_text = f"❌ Invalid freelancer address format: {freelancer_address_raw}"
                    ctx.logger.error(f"Address conversion error: {addr_error}")
                else:
                    # Get job budget
                    job_key = f"job_{job_id}"
                    job_data_json = ctx.storage.get(job_key)
                    
                    if not job_data_json:
                        response_text = f"❌ Job #{job_id} not found. Please check the job ID."
                    else:
                        job_data = json.loads(job_data_json)
                        budget = job_data.get("budget", 0)
                        
                        ctx.storage.set("accepting_job_id", job_id)
                        ctx.storage.set("accepting_freelancer", freelancer_address)  # Now in checksum format
                        ctx.storage.set("accepting_client", sender)
                        ctx.storage.set("accepting_budget", budget)
                        
                        # Update contract with freelancer address
                        success, tx_hash = update_freelancer_in_contract(ctx, job_id, freelancer_address)
                        
                        if success:
                            response_text = f"""✅ Proposal Accepted!

Job #{job_id} assigned to freelancer: {freelancer_address[:10]}...{freelancer_address[-8:]}

Transaction: {tx_hash[:10]}...{tx_hash[-8:]}
View: https://sepolia.basescan.org/tx/{tx_hash}

⚠️ **Next Step: Deposit ${budget:.2f} in PYUSD**

Use command: deposit funds: {job_id}

This will:
1. Approve PYUSD spending
2. Deposit funds to escrow contract
3. Activate the project for the freelancer
"""
                        else:
                            response_text = f"❌ Failed to accept proposal. Please try again or check the transaction logs."
            else:
                response_text = "❌ Invalid format.\n\nUse: 'accept proposal: <job_id> <freelancer_address>'"
        except Exception as e:
            ctx.logger.error(f"Error accepting proposal: {e}")
            response_text = f"❌ Error: {str(e)}\n\nFormat: 'accept proposal: 1 0x123...'"
    
    elif "approve deliverable" in text_lower or "approve delivery" in text_lower:
        # Format: "approve deliverable: 1 95" or "approve deliverable: 1"
        try:
            parts = text.split(":", 1)[1].strip().split()
            if len(parts) >= 1:
                project_id = int(parts[0])
                quality_score = int(parts[1]) if len(parts) > 1 else 90  # Default 90/100
                
                # Validate quality score
                if quality_score < 0 or quality_score > 100:
                    response_text = "❌ Quality score must be between 0 and 100"
                else:
                    ctx.logger.info(f"Approving deliverable for project {project_id}")
                    ctx.logger.info(f"Quality Score: {quality_score}/100")
                    
                    # Update reputation on-chain (fetches data from contract automatically)
                    if REPUTATION_UPDATER_AVAILABLE:
                        try:
                            # Simplified call - only needs project_id and quality_score
                            # All other data is fetched from WorkEscrow contract
                            result = approve_deliverable_and_update_reputation(
                                project_id=project_id,
                                quality_score=quality_score
                            )
                            
                            if result.get("success"):
                                reputation_tx = result.get("tx_hash", "")
                                
                                response_text = f"""✅ Deliverable Approved!

Project #{project_id} completed successfully!

⭐ Quality Score: {quality_score}/100

📊 Reputation Updated On-Chain! ✅
- Project data fetched from WorkEscrow contract
- Completed projects incremented
- Total earnings updated
- Average rating recalculated
- Skill badges updated

🔗 Reputation TX (Base Sepolia): {reputation_tx[:10]}...{reputation_tx[-8:]}
View: https://sepolia.basescan.org/tx/{reputation_tx}
"""
                                
                                # Check for PYUSD escrow and release it
                                pyusd_released = False
                                pyusd_tx = ""
                                pyusd_error = ""
                                channel_key = f"channel_{project_id}"
                                channel_data_json = ctx.storage.get(channel_key)
                                
                                if channel_data_json:
                                    try:
                                        channel_data = json.loads(channel_data_json)
                                        if channel_data.get("status") != "released":
                                            ctx.logger.info(f"💰 Releasing PYUSD escrow for project {project_id}...")
                                            success, tx, message = release_escrow_funds(ctx, project_id, channel_data)
                                            if success:
                                                pyusd_released = True
                                                pyusd_tx = tx
                                                # Update channel status
                                                channel_data["status"] = "released"
                                                channel_data["release_tx"] = tx
                                                ctx.storage.set(channel_key, json.dumps(channel_data))
                                                ctx.logger.info(f"✅ PYUSD released: {tx}")
                                            else:
                                                pyusd_error = message
                                                ctx.logger.error(f"❌ PYUSD release failed: {message}")
                                        else:
                                            ctx.logger.info(f"ℹ️ PYUSD already released for project {project_id}")
                                    except Exception as e:
                                        pyusd_error = str(e)
                                        ctx.logger.error(f"Error releasing PYUSD: {e}")
                                else:
                                    ctx.logger.info(f"ℹ️ No PYUSD escrow found for project {project_id}")
                                
                                # Show PYUSD payment release results
                                if pyusd_released and pyusd_tx:
                                    response_text += f"""
💵 PYUSD Payment Released! ✅
- PYUSD transferred from Yellow SDK escrow to freelancer
- Released on Ethereum Sepolia network

🔗 PYUSD TX (Ethereum Sepolia): {pyusd_tx[:10]}...{pyusd_tx[-8:]}
View: https://sepolia.etherscan.io/tx/{pyusd_tx}

🎉 Complete! Reputation updated AND PYUSD payment released!
"""
                                elif pyusd_error:
                                    response_text += f"""
⚠️ PYUSD Payment Release Failed
- Reputation was updated successfully
- PYUSD release error: {pyusd_error}

Please check:
- PYUSD escrow has sufficient balance
- Yellow SDK channel is properly configured
- Client wallet has gas for Ethereum Sepolia
"""
                                else:
                                    response_text += "\n✅ Reputation updated! (No PYUSD escrow found for this project)"
                            else:
                                error_msg = result.get("error", "Unknown error")
                                response_text = f"""⚠️ Reputation Update Failed

Project #{project_id} - Failed to update reputation:
{error_msg}

Possible issues:
- Project not found in WorkEscrow contract
- No freelancer assigned to project
- Validator wallet needs Base Sepolia ETH
- Contract address mismatch
"""
                        except Exception as e:
                            ctx.logger.error(f"Error updating reputation: {e}")
                            response_text = f"""⚠️ Reputation Update Error

Project #{project_id} - Error occurred:
{str(e)}

Check agent logs for details.
"""
                    else:
                        response_text = f"""⚠️ Reputation Updater Not Available

Project #{project_id} cannot be processed.

Reputation updater module not found. Please check:
- reputation_updater.py exists in agents folder
- All dependencies installed
"""
            else:
                response_text = """❌ Invalid format.

Usage: approve deliverable: <project_id> [quality_score]

Examples:
- approve deliverable: 1 95
- approve deliverable: 2 (defaults to 90/100)
"""
        except Exception as e:
            ctx.logger.error(f"Error approving deliverable: {e}")
            response_text = f"❌ Error: {str(e)}\n\nFormat: 'approve deliverable: 1 95'"
    
    elif "deposit funds" in text_lower or "fund project" in text_lower:
        # Format: "deposit funds: 1"
        try:
            import re
            if ":" in text:
                job_id = int(text.split(":", 1)[1].strip())
            else:
                numbers = re.findall(r'\d+', text)
                job_id = int(numbers[0]) if numbers else None
            
            if job_id:
                # Get job details
                job_key = f"job_{job_id}"
                job_data_json = ctx.storage.get(job_key)
                
                if not job_data_json:
                    response_text = f"❌ Job #{job_id} not found."
                else:
                    job_data = json.loads(job_data_json)
                    budget_usd = job_data.get("budget", 0)
                    
                    response_text = f"💰 Depositing ${budget_usd:.2f} PYUSD for Job #{job_id}...\n\nThis may take 30-60 seconds."
                    
                    # Deposit PYUSD
                    success, approve_tx, deposit_tx, message = deposit_pyusd_to_escrow(ctx, job_id, budget_usd)
                    
                    if success:
                        response_text += f"""

✅ Funds Deposited Successfully!

Approval TX (Ethereum Sepolia): {approve_tx[:10]}...{approve_tx[-8:]}
Deposit TX (Base Sepolia): {deposit_tx[:10]}...{deposit_tx[-8:]}

View Transactions:
• Approval: https://sepolia.etherscan.io/tx/{approve_tx}
• Deposit: https://sepolia.basescan.org/tx/{deposit_tx}

🚀 Project is now ACTIVE!
The freelancer can start working on Job #{job_id}.
"""
                    else:
                        response_text += f"\n\n❌ Deposit failed: {message}\n\nPlease check:\n• PYUSD balance\n• Gas balance\n• Contract permissions"
            else:
                response_text = "❌ Please provide job ID.\n\nFormat: 'deposit funds: 1'"
        except Exception as e:
            ctx.logger.error(f"Error depositing funds: {e}")
            response_text = f"❌ Error: {str(e)}\n\nFormat: 'deposit funds: 1'"
    
    # REMOVED: Duplicate "approve deliverable" handler
    # The correct handler is at line 755 which updates reputation on-chain
    
    elif "help" in text_lower:
        wallet = get_wallet_address()
        balance = w3.eth.get_balance(wallet) if wallet else 0
        
        response_text = f"""
👋 Welcome to ReputeFlow Client Agent!

💼 Wallet Status:
   • Address: {wallet[:10]}...{wallet[-8:] if wallet else 'Not configured'}
   • Balance: {w3.from_wei(balance, 'ether')} ETH

📝 Available Commands:

1️⃣ Post a Job:
   post job: [title] | [description] | [budget] | [skills]
   
   Example:
   post job: Build DeFi Dashboard | Looking for blockchain developer | 5000 | solidity,react,web3

2️⃣ Check Balance:
   check balance

3️⃣ List Your Jobs:
   my jobs

4️⃣ View Proposals:
   show proposals: [job_id]
   
   Example:
   show proposals: 1

5️⃣ Accept Proposal:
   accept proposal: [job_id] [freelancer_address]
   
   Example:
   accept proposal: 1 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

6️⃣ Approve Deliverable (Updates Reputation):
   approve deliverable: [project_id] [quality_score]
   
   Examples:
   approve deliverable: 1 95
   approve deliverable: 2 (defaults to 90/100)
   
   This automatically updates the freelancer's reputation on-chain! ✅

7️⃣ Deposit Funds (PYUSD):
   deposit funds: [job_id]
   
   Example:
   deposit funds: 1

7️⃣ Help:
   help

I help you post Web3 freelance jobs on-chain with automatic escrow! 🚀
"""
    
    else:
        response_text = """
🤔 I didn't understand that command.

Try:
• 'post job: [title] | [description] | [budget] | [skills]' - to post a job
• 'check balance' - to check your wallet balance
• 'my jobs' - to list your posted jobs
• 'help' - for more information
"""
    
    # Send response back (only if we have a response)
    if response_text is not None:
        await ctx.send(sender, ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text=response_text),
            ]
        ))


@chat_protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    """Handle chat acknowledgements"""
    pass


# ========== Internal Agent Message Handlers (not part of chat protocol) ==========
@agent.on_message(model=JobPostRequest)
async def handle_job_post_request(ctx: Context, sender: str, msg: JobPostRequest):
    """
    Handle job posting request from other agents (non-chat)
    """
    ctx.logger.info("="*60)
    ctx.logger.info("📝 JOB POST REQUEST RECEIVED (Internal)")
    ctx.logger.info("="*60)
    ctx.logger.info(f"From: {sender}")
    ctx.logger.info(f"Client: {msg.client_address}")
    ctx.logger.info(f"Title: {msg.title}")
    ctx.logger.info(f"Budget: ${msg.budget:.2f}")
    
    # Prepare job data
    job_data = {
        "title": msg.title,
        "description": msg.description,
        "budget": msg.budget,
        "skills": msg.required_skills,
        "milestones": msg.milestones
    }
    
    # Post job on-chain
    success, job_id, tx_hash, message = post_job_on_chain(ctx, job_data)
    
    # Create confirmation message
    job_posted = JobPosted(
        client_address=msg.client_address,
        job_id=job_id,
        tx_hash=tx_hash,
        success=success,
        message=message,
        timestamp=int(time.time())
    )
    
    if success:
        ctx.logger.info("✅ JOB POSTED SUCCESSFULLY")
        
        # Send to AI Model Agent
        if AI_MODEL_AGENT_ADDRESS:
            await ctx.send(AI_MODEL_AGENT_ADDRESS, job_posted)
        
        # Send back to sender
        await ctx.send(sender, job_posted)
    else:
        ctx.logger.error(f"❌ JOB POSTING FAILED: {message}")
        await ctx.send(sender, job_posted)


@agent.on_message(model=JobPostConfirmation)
async def handle_ai_confirmation(ctx: Context, sender: str, msg: JobPostConfirmation):
    """
    Receive AI-enhanced confirmation from AI Model Agent
    """
    ctx.logger.info("="*60)
    ctx.logger.info("🤖 AI CONFIRMATION RECEIVED")
    ctx.logger.info("="*60)
    ctx.logger.info(f"Job ID: {msg.job_id}")
    ctx.logger.info(f"TX Hash: {msg.tx_hash}")
    ctx.logger.info(f"\n{msg.ai_message}")
    
    if msg.next_steps:
        ctx.logger.info("\n📋 Next Steps:")
        for i, step in enumerate(msg.next_steps, 1):
            ctx.logger.info(f"  {i}. {step}")
    
    ctx.logger.info("="*60)


# Include chat protocol
agent.include(chat_protocol)


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🏢 ReputeFlow Client Agent with Chat Protocol")
    print("="*60)
    print("\nWallet Integration:")
    print(f"  Network: Base Sepolia")
    print(f"  RPC: {WEB3_PROVIDER_URL}")
    print(f"  Contract: {WORK_ESCROW_ADDRESS}")
    
    wallet = get_wallet_address()
    if wallet:
        print(f"  Wallet: {wallet}")
        balance = w3.eth.get_balance(wallet)
        print(f"  Balance: {w3.from_wei(balance, 'ether')} ETH")
        
        if balance == 0:
            print("\n⚠️  WARNING: Zero balance!")
            print("Get testnet ETH from:")
            print("https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet")
    else:
        print("\n❌ ERROR: Wallet not configured!")
        print("Set PRIVATE_KEY in .env file")
    
    print("\n💬 Chat Commands:")
    print("  • post job: [title] | [description] | [budget] | [skills]")
    print("  • check balance")
    print("  • my jobs")
    print("  • show proposals: [job_id]")
    print("  • accept proposal: [job_id] [freelancer_address]")
    print("  • help")
    print("="*60 + "\n")
    
    agent.run()

# ========== Proposal Handlers ==========
@agent.on_message(model=ProposalsResponse)
async def handle_proposals_response(ctx: Context, sender: str, msg: ProposalsResponse):
    """Display proposals to client"""
    requester = ctx.storage.get("proposals_requester")
    
    if not requester:
        ctx.logger.warning("No proposals requester found")
        return
    
    if msg.total_count == 0:
        response_text = f"📭 No proposals yet for Job #{msg.job_id}\n\nFreelancers haven't submitted proposals yet. Check back later!"
    else:
        response_text = f"📋 **Proposals for Job #{msg.job_id}** ({msg.total_count} total)\n\n"
        
        for i, proposal in enumerate(msg.proposals, 1):
            # Format timestamp
            from datetime import datetime as dt
            proposal_time = dt.fromtimestamp(proposal.timestamp).strftime("%Y-%m-%d %H:%M")
            
            response_text += f"""**Proposal {i}:**
Freelancer: {proposal.freelancer_address[:10]}...{proposal.freelancer_address[-8:]}
Estimated Hours: {proposal.estimated_hours}
Submitted: {proposal_time}

{proposal.proposal_text}

{'='*50}

"""
        
        response_text += f"\n💡 To accept a proposal, use:\naccept proposal: {msg.job_id} <freelancer_address>"
    
    await ctx.send(requester, ChatMessage(
        timestamp=datetime.utcnow(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=response_text)]
    ))
    
    ctx.storage.remove("viewing_proposals_job")
    ctx.storage.remove("proposals_requester")

# ========== Contract Update Function ==========
def update_freelancer_in_contract(ctx: Context, job_id: int, freelancer_address: str):
    """Update freelancer address in WorkEscrow contract"""
    try:
        wallet = get_wallet_address()
        if not wallet:
            ctx.logger.error("No wallet configured")
            return False, ""
        
        account = Account.from_key(PRIVATE_KEY)
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(WORK_ESCROW_ADDRESS),
            abi=WORK_ESCROW_ABI
        )
        
        ctx.logger.info(f"🔄 Updating freelancer on-chain for Job #{job_id}")
        ctx.logger.info(f"   Client: {account.address}")
        ctx.logger.info(f"   Freelancer: {freelancer_address}")
        
        # Build transaction to update freelancer address on-chain
        tx = contract.functions.updateFreelancer(
            job_id,
            Web3.to_checksum_address(freelancer_address)
        ).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address, 'pending'),
            'gas': 200000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign and send transaction
        signed_tx = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        ctx.logger.info(f"📤 Transaction sent: {tx_hash.hex()}")
        
        # Wait for confirmation
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] == 1:
            ctx.logger.info(f"✅ Freelancer updated on-chain! Block: {receipt['blockNumber']}")
            return True, tx_hash.hex()
        else:
            ctx.logger.error(f"❌ Transaction failed: {tx_hash.hex()}")
            return False, tx_hash.hex()
        
    except Exception as e:
        ctx.logger.error(f"❌ Failed to update freelancer: {e}")
        import traceback
        traceback.print_exc()
        return False, ""

# ========== PYUSD Deposit Function ==========
def deposit_pyusd_to_escrow(ctx: Context, job_id: int, amount_usd: float):
    """
    Deposit PYUSD tokens to fund the escrow contract
    Returns: (success, approve_tx_hash, deposit_tx_hash, message)
    """
    try:
        wallet = get_wallet_address()
        if not wallet:
            return False, "", "", "No wallet configured"
        
        account = Account.from_key(PRIVATE_KEY)
        
        # PYUSD has 6 decimals
        amount_pyusd = int(amount_usd * 10**6)
        
        ctx.logger.info(f"💰 Depositing {amount_usd} PYUSD ({amount_pyusd} units)")
        ctx.logger.info(f"💰 Using Ethereum Sepolia network for PYUSD")
        
        # Get freelancer address from storage
        freelancer_address = ctx.storage.get("accepting_freelancer")
        if not freelancer_address:
            return False, "", "", "Freelancer address not found. Accept a proposal first."
        
        # Ensure address is in checksum format
        try:
            freelancer_address = Web3.to_checksum_address(freelancer_address)
        except Exception as e:
            return False, "", "", f"Invalid freelancer address format: {freelancer_address}"
        
        ctx.logger.info(f"   Client: {account.address}")
        ctx.logger.info(f"   Freelancer: {freelancer_address}")
        
        # Initialize PYUSD contract on Ethereum Sepolia
        pyusd_contract = w3_pyusd.eth.contract(
            address=Web3.to_checksum_address(PYUSD_ADDRESS),
            abi=ERC20_ABI
        )
        
        # Escrow contract on Base Sepolia (for reference)
        escrow_contract = w3.eth.contract(
            address=Web3.to_checksum_address(WORK_ESCROW_ADDRESS),
            abi=WORK_ESCROW_ABI
        )
        
        # Check PYUSD balance on Ethereum Sepolia
        balance = pyusd_contract.functions.balanceOf(account.address).call()
        ctx.logger.info(f"💰 Checking wallet: {account.address}")
        ctx.logger.info(f"💰 PYUSD Balance (Ethereum Sepolia): {balance / 10**6} PYUSD")
        ctx.logger.info(f"💰 PYUSD Contract: {PYUSD_ADDRESS}")
        ctx.logger.info(f"💰 Required: {amount_usd} PYUSD ({amount_pyusd} units)")
        
        if balance < amount_pyusd:
            return False, "", "", f"Insufficient PYUSD balance. Wallet: {account.address[:10]}...{account.address[-8:]}, Have: {balance/10**6}, Need: {amount_usd}"
        
        # Use the deployed YellowChannelManager contract as escrow
        ESCROW_WALLET = YELLOW_CHANNEL_MANAGER if YELLOW_CHANNEL_MANAGER else "0x7f37417F66eA2b322CDF145DFd0b45ff1794bf36"
        
        # Step 1: Approve PYUSD for escrow
        ctx.logger.info("Step 1: Approving PYUSD for Yellow State Channel escrow...")
        approve_tx = pyusd_contract.functions.approve(
            Web3.to_checksum_address(ESCROW_WALLET),
            amount_pyusd
        ).build_transaction({
            'from': account.address,
            'nonce': w3_pyusd.eth.get_transaction_count(account.address, 'pending'),
            'gas': 100000,
            'gasPrice': w3_pyusd.eth.gas_price
        })
        
        signed_approve = account.sign_transaction(approve_tx)
        approve_tx_hash = w3_pyusd.eth.send_raw_transaction(signed_approve.rawTransaction)
        approve_receipt = w3_pyusd.eth.wait_for_transaction_receipt(approve_tx_hash)
        
        if approve_receipt['status'] != 1:
            return False, approve_tx_hash.hex(), "", "Approval failed"
        
        ctx.logger.info(f"✅ Approved: {approve_tx_hash.hex()}")
        
        # Step 2: Transfer PYUSD to escrow (Yellow state channel)
        ctx.logger.info("Step 2: Depositing PYUSD to Yellow State Channel escrow...")
        ctx.logger.info("   Funds will be held until client approves deliverable")
        
        transfer_tx = pyusd_contract.functions.transfer(
            Web3.to_checksum_address(ESCROW_WALLET),
            amount_pyusd
        ).build_transaction({
            'from': account.address,
            'nonce': w3_pyusd.eth.get_transaction_count(account.address, 'pending'),
            'gas': 100000,
            'gasPrice': w3_pyusd.eth.gas_price
        })
        
        signed_transfer = account.sign_transaction(transfer_tx)
        transfer_tx_hash = w3_pyusd.eth.send_raw_transaction(signed_transfer.rawTransaction)
        transfer_receipt = w3_pyusd.eth.wait_for_transaction_receipt(transfer_tx_hash)
        
        if transfer_receipt['status'] != 1:
            return False, approve_tx_hash.hex(), transfer_tx_hash.hex(), "Transfer to escrow failed"
        
        ctx.logger.info(f"✅ Deposited to escrow: {transfer_tx_hash.hex()}")
        ctx.logger.info(f"   Amount: {amount_usd} PYUSD")
        ctx.logger.info(f"   Escrow: {ESCROW_WALLET}")
        
        # Step 3: Record deposit in YellowChannelManager contract
        ctx.logger.info("Step 3: Recording deposit in contract...")
        
        # YellowChannelManager v2 ABI for recordDeposit
        YELLOW_RECORD_ABI = [{
            "inputs": [
                {"internalType": "uint256", "name": "jobId", "type": "uint256"},
                {"internalType": "address", "name": "client", "type": "address"},
                {"internalType": "address", "name": "freelancer", "type": "address"},
                {"internalType": "uint256", "name": "amount", "type": "uint256"}
            ],
            "name": "recordDeposit",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }]
        
        yellow_contract = w3_pyusd.eth.contract(
            address=Web3.to_checksum_address(ESCROW_WALLET),
            abi=YELLOW_RECORD_ABI
        )
        
        # Call recordDeposit
        record_tx = yellow_contract.functions.recordDeposit(
            job_id,
            Web3.to_checksum_address(account.address),
            Web3.to_checksum_address(freelancer_address),
            amount_pyusd
        ).build_transaction({
            'from': account.address,
            'nonce': w3_pyusd.eth.get_transaction_count(account.address, 'pending'),
            'gas': 150000,
            'gasPrice': w3_pyusd.eth.gas_price
        })
        
        signed_record = account.sign_transaction(record_tx)
        record_tx_hash = w3_pyusd.eth.send_raw_transaction(signed_record.rawTransaction)
        record_receipt = w3_pyusd.eth.wait_for_transaction_receipt(record_tx_hash)
        
        if record_receipt['status'] != 1:
            ctx.logger.warning(f"⚠️ Record deposit failed but funds are in escrow")
        else:
            ctx.logger.info(f"✅ Deposit recorded in contract: {record_tx_hash.hex()}")
        
        # Store channel info with status
        channel_data = {
            "job_id": job_id,
            "client": account.address,
            "freelancer": freelancer_address,
            "amount": amount_usd,
            "escrow_wallet": ESCROW_WALLET,
            "approve_tx": approve_tx_hash.hex(),
            "deposit_tx": transfer_tx_hash.hex(),
            "status": "escrowed",  # escrowed -> submitted -> approved -> released
            "timestamp": int(time.time())
        }
        ctx.storage.set(f"channel_{job_id}", json.dumps(channel_data))
        
        ctx.logger.info(f"💾 Channel data stored for job #{job_id}")
        
        return True, approve_tx_hash.hex(), transfer_tx_hash.hex(), "Success"
        
    except Exception as e:
        ctx.logger.error(f"❌ Deposit error: {e}")
        import traceback
        traceback.print_exc()
        return False, "", "", str(e)

# ========== Release Escrow Funds Function ==========
def release_escrow_funds(ctx: Context, job_id: int, channel_data: dict):
    """
    Release PYUSD from escrow to freelancer after deliverable approval
    Returns: (success, tx_hash, message)
    """
    try:
        if not PRIVATE_KEY:
            return False, "", "No wallet configured"
        
        account = Account.from_key(PRIVATE_KEY)
        
        freelancer_address = channel_data.get("freelancer")
        amount_usd = channel_data.get("amount", 0)
        escrow_wallet = channel_data.get("escrow_wallet")
        
        # PYUSD has 6 decimals
        amount_pyusd = int(amount_usd * 10**6)
        
        ctx.logger.info(f"🔓 Releasing {amount_usd} PYUSD from escrow...")
        ctx.logger.info(f"   From Escrow: {escrow_wallet}")
        ctx.logger.info(f"   To Freelancer: {freelancer_address}")
        
        # Initialize PYUSD contract on Ethereum Sepolia
        pyusd_contract = w3_pyusd.eth.contract(
            address=Web3.to_checksum_address(PYUSD_ADDRESS),
            abi=ERC20_ABI
        )
        
        # Check escrow balance
        escrow_balance = pyusd_contract.functions.balanceOf(
            Web3.to_checksum_address(escrow_wallet)
        ).call()
        
        ctx.logger.info(f"💰 Escrow Balance: {escrow_balance / 10**6} PYUSD")
        
        if escrow_balance < amount_pyusd:
            return False, "", f"Insufficient escrow balance. Have: {escrow_balance/10**6}, Need: {amount_usd}"
        
        # Call YellowChannelManager v2 contract to release payment
        ctx.logger.info("💸 Calling YellowChannelManager.releasePayment()...")
        
        if not PRIVATE_KEY:
            return False, "", "Client wallet key not configured"
        
        client_account = Account.from_key(PRIVATE_KEY)
        
        # YellowChannelManager v2 ABI (simplified - only releasePayment function)
        YELLOW_ABI = [{
            "inputs": [{"internalType": "uint256", "name": "jobId", "type": "uint256"}],
            "name": "releasePayment",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }]
        
        # Get YellowChannelManager contract
        yellow_contract = w3_pyusd.eth.contract(
            address=Web3.to_checksum_address(escrow_wallet),
            abi=YELLOW_ABI
        )
        
        ctx.logger.info(f"   Contract: {escrow_wallet}")
        ctx.logger.info(f"   Job ID: {job_id}")
        ctx.logger.info(f"   Freelancer: {freelancer_address}")
        ctx.logger.info(f"   Amount: {amount_usd} PYUSD")
        
        # Check escrow status first
        try:
            GET_ESCROW_ABI = [{
                "inputs": [{"internalType": "uint256", "name": "jobId", "type": "uint256"}],
                "name": "getEscrow",
                "outputs": [{
                    "components": [
                        {"internalType": "uint256", "name": "jobId", "type": "uint256"},
                        {"internalType": "address", "name": "client", "type": "address"},
                        {"internalType": "address", "name": "freelancer", "type": "address"},
                        {"internalType": "uint256", "name": "amount", "type": "uint256"},
                        {"internalType": "bool", "name": "isReleased", "type": "bool"},
                        {"internalType": "uint256", "name": "depositedAt", "type": "uint256"},
                        {"internalType": "uint256", "name": "releasedAt", "type": "uint256"}
                    ],
                    "internalType": "struct YellowChannelManager.JobEscrow",
                    "name": "",
                    "type": "tuple"
                }],
                "stateMutability": "view",
                "type": "function"
            }]
            
            check_contract = w3_pyusd.eth.contract(
                address=Web3.to_checksum_address(escrow_wallet),
                abi=GET_ESCROW_ABI
            )
            
            escrow_info = check_contract.functions.getEscrow(job_id).call()
            ctx.logger.info(f"📊 Escrow Status:")
            ctx.logger.info(f"   Job ID: {escrow_info[0]}")
            ctx.logger.info(f"   Client: {escrow_info[1]}")
            ctx.logger.info(f"   Freelancer: {escrow_info[2]}")
            ctx.logger.info(f"   Amount: {escrow_info[3] / 10**6} PYUSD")
            ctx.logger.info(f"   Is Released: {escrow_info[4]}")
            
            if escrow_info[3] == 0:
                return False, "", f"Job {job_id} not found in escrow. Did you call recordDeposit()?"
            
            if escrow_info[4]:
                return False, "", f"Payment for job {job_id} was already released"
                
        except Exception as check_error:
            ctx.logger.warning(f"⚠️ Could not check escrow status: {check_error}")
        
        # Build release transaction
        release_tx = yellow_contract.functions.releasePayment(job_id).build_transaction({
            'from': client_account.address,
            'nonce': w3_pyusd.eth.get_transaction_count(client_account.address, 'pending'),
            'gas': 150000,
            'gasPrice': w3_pyusd.eth.gas_price
        })
        
        # Sign and send transaction
        signed_release = client_account.sign_transaction(release_tx)
        release_tx_hash = w3_pyusd.eth.send_raw_transaction(signed_release.rawTransaction)
        
        ctx.logger.info(f"⏳ Waiting for transaction confirmation...")
        release_receipt = w3_pyusd.eth.wait_for_transaction_receipt(release_tx_hash)
        
        if release_receipt['status'] != 1:
            return False, release_tx_hash.hex(), "Release transaction failed"
        
        ctx.logger.info(f"✅ Payment released successfully: {release_tx_hash.hex()}")
        ctx.logger.info(f"   Amount: {amount_usd} PYUSD")
        ctx.logger.info(f"   From Escrow: {escrow_wallet}")
        ctx.logger.info(f"   To Freelancer: {freelancer_address}")
        ctx.logger.info(f"   Gas Used: {release_receipt['gasUsed']}")
        
        return True, release_tx_hash.hex(), "Success"
        
    except Exception as e:
        ctx.logger.error(f"❌ Release error: {e}")
        import traceback
        traceback.print_exc()
        return False, "", str(e)
