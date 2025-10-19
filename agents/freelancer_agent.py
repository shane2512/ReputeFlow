"""
FreelancerAgent - Autonomous agent for freelancers
Handles job discovery, bidding, and project execution
"""

from uagents import Agent, Context, Model, Protocol
from uagents.setup import fund_agent_if_low
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)
from datetime import datetime
from uuid import uuid4
from config import AgentConfig, AGENT_MATCHER_ABI, WORK_ESCROW_ABI, REPUTATION_REGISTRY_ABI
from metta_reasoning import metta_reasoner
import asyncio

# Message Models
class JobOpportunity(Model):
    """Job opportunity from market"""
    job_id: str
    title: str
    description: str
    required_skills: list[str]
    budget: float
    deadline: int
    client_address: str

class BidSubmission(Model):
    """Bid submission for a job"""
    job_id: str
    freelancer_address: str
    proposed_rate: float
    estimated_hours: int
    cover_letter: str

class ProjectUpdate(Model):
    """Project progress update"""
    project_id: int
    milestone_id: int
    status: str
    deliverables: str

class SkillUpdate(Model):
    """Update freelancer skills"""
    skills: list[str]
    hourly_rate: float
    availability: int

# Initialize FreelancerAgent
freelancer = Agent(
    name="freelancer_agent",
    seed=AgentConfig.FREELANCER_AGENT_SEED,
    port=AgentConfig.AGENT_PORT_START,
    endpoint=["http://localhost:8000/submit"],
    mailbox=f"{AgentConfig.AGENTVERSE_API_KEY}@https://agentverse.ai" if AgentConfig.ENABLE_MAILBOX else None
)

# Initialize chat protocol for Agentverse
chat_proto = Protocol(spec=chat_protocol_spec)

# Agent State
class FreelancerState:
    def __init__(self):
        self.address = None
        self.skills = []
        self.hourly_rate = 0
        self.availability = 0
        self.active_projects = []
        self.pending_bids = []
        self.reputation_score = 0

state = FreelancerState()

@freelancer.on_event("startup")
async def startup(ctx: Context):
    """Initialize agent on startup"""
    ctx.logger.info(f"FreelancerAgent starting...")
    ctx.logger.info(f"Agent address: {freelancer.address}")
    
    # Fund agent if needed
    fund_agent_if_low(freelancer.wallet.address())
    
    # Load freelancer profile from blockchain
    await load_profile(ctx)
    
    ctx.logger.info(f"FreelancerAgent ready! Skills: {state.skills}")

async def load_profile(ctx: Context):
    """Load freelancer profile from blockchain"""
    try:
        w3 = AgentConfig.get_web3()
        account = AgentConfig.get_account()
        state.address = account.address
        
        # Get reputation score
        reputation_contract = w3.eth.contract(
            address=AgentConfig.REPUTATION_REGISTRY,
            abi=REPUTATION_REGISTRY_ABI
        )
        state.reputation_score = reputation_contract.functions.getReputation(account.address).call()
        
        ctx.logger.info(f"Loaded profile - Reputation: {state.reputation_score}")
    except Exception as e:
        ctx.logger.error(f"Error loading profile: {e}")

@freelancer.on_message(model=JobOpportunity)
async def handle_job_opportunity(ctx: Context, sender: str, msg: JobOpportunity):
    """Handle incoming job opportunities"""
    ctx.logger.info(f"Received job opportunity: {msg.title}")
    
    # Use MeTTa reasoning for intelligent job matching
    agent_profile = {
        "skills": state.skills,
        "reputation": state.reputation_score,
        "hourly_rate": state.hourly_rate,
        "availability": state.availability
    }
    
    job_requirements = {
        "required_skills": msg.required_skills,
        "budget": msg.budget,
        "estimated_hours": 40,
        "urgency": 5
    }
    
    # Get MeTTa reasoning result
    match_result = metta_reasoner.reason_about_job_match(agent_profile, job_requirements)
    
    ctx.logger.info(f"MeTTa Match Analysis: {match_result['recommendation']} ({match_result['match_score']}/100)")
    ctx.logger.info(f"Reasoning: {' -> '.join(match_result['reasoning'])}")
    
    # Only bid if match score is good enough
    if match_result['match_score'] < 50:
        ctx.logger.info(f"Match score too low, skipping job {msg.job_id}")
        return
    
    # Prepare bid
    bid = BidSubmission(
        job_id=msg.job_id,
        freelancer_address=state.address,
        proposed_rate=state.hourly_rate,
        estimated_hours=estimated_hours,
        cover_letter=f"I have {state.reputation_score} reputation points and expertise in {', '.join(msg.required_skills[:3])}"
    )
    
    # Send bid to client or coordinator
    await ctx.send(sender, bid)
    state.pending_bids.append(msg.job_id)
    
    ctx.logger.info(f"Submitted bid for job {msg.job_id}")

@freelancer.on_message(model=SkillUpdate)
async def handle_skill_update(ctx: Context, sender: str, msg: SkillUpdate):
    """Update freelancer skills and register on-chain"""
    ctx.logger.info(f"Updating skills: {msg.skills}")
    
    try:
        w3 = AgentConfig.get_web3()
        account = AgentConfig.get_account()
        
        # Update local state
        state.skills = msg.skills
        state.hourly_rate = msg.proposed_rate
        state.availability = msg.availability
        
        # Register on AgentMatcher contract
        matcher_contract = w3.eth.contract(
            address=AgentConfig.AGENT_MATCHER,
            abi=AGENT_MATCHER_ABI
        )
        
        # Convert hourly rate to wei
        hourly_rate_wei = w3.to_wei(msg.hourly_rate, 'ether')
        
        # Build transaction
        tx = matcher_contract.functions.registerAgent(
            account.address,
            msg.skills,
            hourly_rate_wei,
            msg.availability,
            state.reputation_score
        ).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign and send
        signed_tx = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        ctx.logger.info(f"Skills updated on-chain! Tx: {tx_hash.hex()}")
        
    except Exception as e:
        ctx.logger.error(f"Error updating skills: {e}")

@freelancer.on_message(model=ProjectUpdate)
async def handle_project_update(ctx: Context, sender: str, msg: ProjectUpdate):
    """Submit project milestone update"""
    ctx.logger.info(f"Updating project {msg.project_id}, milestone {msg.milestone_id}")
    
    # In production, this would submit deliverables to IPFS/Lighthouse
    # and update the WorkEscrow contract
    
    ctx.logger.info(f"Milestone {msg.milestone_id} marked as {msg.status}")

@freelancer.on_interval(period=300.0)  # Every 5 minutes
async def check_for_jobs(ctx: Context):
    """Periodically check for new job opportunities"""
    ctx.logger.info("Checking for new job opportunities...")
    
    # In production, this would query the AgentMatcher or listen to events
    # For now, just log
    ctx.logger.info(f"Active projects: {len(state.active_projects)}, Pending bids: {len(state.pending_bids)}")

@freelancer.on_interval(period=3600.0)  # Every hour
async def update_reputation(ctx: Context):
    """Update reputation score from blockchain"""
    await load_profile(ctx)

# ============================================
# CHAT PROTOCOL HANDLERS (For Agentverse)
# ============================================

@chat_proto.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handle incoming chat messages from other agents or users"""
    ctx.logger.info(f"Received chat message from {sender}")
    
    for item in msg.content:
        if isinstance(item, TextContent):
            user_message = item.text.lower()
            ctx.logger.info(f"Message: {user_message}")
            
            # Send acknowledgement
            ack = ChatAcknowledgement(
                timestamp=datetime.utcnow(),
                acknowledged_msg_id=msg.msg_id
            )
            await ctx.send(sender, ack)
            
            # Process message and generate response
            response_text = await process_chat_request(ctx, user_message)
            
            # Send response
            response = ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid4(),
                content=[TextContent(type="text", text=response_text)]
            )
            await ctx.send(sender, response)

@chat_proto.on_message(ChatAcknowledgement)
async def handle_chat_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    """Handle chat acknowledgements"""
    ctx.logger.info(f"Received acknowledgement from {sender} for message: {msg.acknowledged_msg_id}")

async def process_chat_request(ctx: Context, message: str) -> str:
    """Process chat requests and return appropriate response"""
    
    # Job discovery requests
    if "find" in message and "job" in message:
        return f"🔍 Searching for jobs matching your skills: {', '.join(state.skills[:3])}...\n\n" \
               f"Found {len(state.pending_bids)} potential opportunities!\n" \
               f"Current reputation: {state.reputation_score}\n" \
               f"Hourly rate: ${state.hourly_rate}"
    
    # Reputation check
    elif "reputation" in message or "score" in message:
        return f"📊 Your Reputation Score: {state.reputation_score}/100\n" \
               f"✅ Completed Projects: {len(state.active_projects)}\n" \
               f"💼 Active Projects: {len(state.active_projects)}\n" \
               f"📝 Pending Bids: {len(state.pending_bids)}"
    
    # Bid submission
    elif "bid" in message or "apply" in message:
        return f"💰 Ready to submit bid!\n" \
               f"Your rate: ${state.hourly_rate}/hr\n" \
               f"Skills: {', '.join(state.skills)}\n" \
               f"Availability: {state.availability}%\n\n" \
               f"Use the dashboard to submit your proposal."
    
    # Skills update
    elif "skill" in message:
        return f"🎯 Your Skills: {', '.join(state.skills) if state.skills else 'No skills set'}\n" \
               f"💵 Hourly Rate: ${state.hourly_rate}\n" \
               f"📅 Availability: {state.availability}%\n\n" \
               f"Update your profile in the dashboard."
    
    # Project status
    elif "project" in message or "status" in message:
        return f"📁 Active Projects: {len(state.active_projects)}\n" \
               f"✅ Completed: {len(state.active_projects)}\n" \
               f"⏳ In Progress: {len(state.active_projects)}\n" \
               f"💼 Pending Bids: {len(state.pending_bids)}"
    
    # Default help message
    else:
        return f"👋 Hi! I'm your FreelancerAgent.\n\n" \
               f"I can help you with:\n" \
               f"• 🔍 Find jobs - 'Find me jobs'\n" \
               f"• 💰 Submit bids - 'Submit a bid'\n" \
               f"• 📊 Check reputation - 'What's my reputation?'\n" \
               f"• 🎯 Manage skills - 'Show my skills'\n" \
               f"• 📁 Project status - 'Show my projects'\n\n" \
               f"Current Status:\n" \
               f"Reputation: {state.reputation_score} | Rate: ${state.hourly_rate}/hr"

# Include chat protocol in agent
freelancer.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    print("Starting FreelancerAgent...")
    print(f"Agent Address: {freelancer.address}")
    freelancer.run()
