"""
ClientAgent - Autonomous agent for clients
Handles job posting, freelancer selection, and project management
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
from config import AgentConfig, AGENT_MATCHER_ABI, WORK_ESCROW_ABI
from freelancer_agent import JobOpportunity, BidSubmission

# Message Models
class JobPosting(Model):
    """Post a new job"""
    title: str
    description: str
    required_skills: list[str]
    budget: float
    deadline: int
    milestones: list[dict]

class FreelancerSelection(Model):
    """Select freelancer for job"""
    job_id: str
    freelancer_address: str
    agreed_rate: float

class MilestoneApproval(Model):
    """Approve milestone completion"""
    project_id: int
    milestone_id: int
    approved: bool
    feedback: str

# Initialize ClientAgent
client = Agent(
    name="client_agent",
    seed=AgentConfig.CLIENT_AGENT_SEED,
    port=AgentConfig.AGENT_PORT_START + 1,
    endpoint=["http://localhost:8001/submit"],
    mailbox=f"{AgentConfig.AGENTVERSE_API_KEY}@https://agentverse.ai" if AgentConfig.ENABLE_MAILBOX else None
)

# Initialize chat protocol for Agentverse
chat_proto = Protocol(spec=chat_protocol_spec)

# Agent State
class ClientState:
    def __init__(self):
        self.address = None
        self.active_jobs = {}
        self.received_bids = {}
        self.active_projects = []

state = ClientState()

@client.on_event("startup")
async def startup(ctx: Context):
    """Initialize agent on startup"""
    ctx.logger.info(f"ClientAgent starting...")
    ctx.logger.info(f"Agent address: {client.address}")
    
    # Fund agent if needed
    fund_agent_if_low(client.wallet.address())
    
    # Load client profile
    account = AgentConfig.get_account()
    state.address = account.address
    
    ctx.logger.info(f"ClientAgent ready!")

@client.on_message(model=JobPosting)
async def handle_job_posting(ctx: Context, sender: str, msg: JobPosting):
    """Handle new job posting"""
    ctx.logger.info(f"Posting new job: {msg.title}")
    
    # Generate job ID
    job_id = f"job_{len(state.active_jobs) + 1}"
    
    # Store job
    state.active_jobs[job_id] = {
        "title": msg.title,
        "description": msg.description,
        "skills": msg.required_skills,
        "budget": msg.budget,
        "deadline": msg.deadline,
        "milestones": msg.milestones,
        "status": "open"
    }
    
    # Initialize bid tracking
    state.received_bids[job_id] = []
    
    # Find matching freelancers using AgentMatcher
    await find_freelancers(ctx, job_id, msg)
    
    ctx.logger.info(f"Job {job_id} posted successfully")

async def find_freelancers(ctx: Context, job_id: str, job: JobPosting):
    """Find and notify matching freelancers"""
    try:
        w3 = AgentConfig.get_web3()
        account = AgentConfig.get_account()
        
        # Query AgentMatcher for best freelancer
        matcher_contract = w3.eth.contract(
            address=AgentConfig.AGENT_MATCHER,
            abi=AGENT_MATCHER_ABI
        )
        
        budget_wei = w3.to_wei(job.budget, 'ether')
        min_reputation = 50  # Minimum reputation score
        
        best_agent = matcher_contract.functions.findBestAgent(
            job.required_skills,
            min_reputation,
            budget_wei
        ).call()
        
        if best_agent != "0x0000000000000000000000000000000000000000":
            ctx.logger.info(f"Found matching freelancer: {best_agent}")
            
            # Create job opportunity message
            opportunity = JobOpportunity(
                job_id=job_id,
                title=job.title,
                description=job.description,
                required_skills=job.required_skills,
                budget=job.budget,
                deadline=job.deadline,
                client_address=state.address
            )
            
            # In production, send to freelancer's agent address
            # For now, broadcast to network
            ctx.logger.info(f"Broadcasting job opportunity for {job_id}")
            
    except Exception as e:
        ctx.logger.error(f"Error finding freelancers: {e}")

@client.on_message(model=BidSubmission)
async def handle_bid(ctx: Context, sender: str, msg: BidSubmission):
    """Handle incoming bids"""
    ctx.logger.info(f"Received bid for job {msg.job_id} from {msg.freelancer_address}")
    
    if msg.job_id not in state.received_bids:
        ctx.logger.warning(f"Unknown job ID: {msg.job_id}")
        return
    
    # Store bid
    state.received_bids[msg.job_id].append({
        "freelancer": msg.freelancer_address,
        "rate": msg.proposed_rate,
        "hours": msg.estimated_hours,
        "cover_letter": msg.cover_letter,
        "total_cost": msg.proposed_rate * msg.estimated_hours
    })
    
    ctx.logger.info(f"Bid stored. Total bids for {msg.job_id}: {len(state.received_bids[msg.job_id])}")

@client.on_message(model=FreelancerSelection)
async def handle_freelancer_selection(ctx: Context, sender: str, msg: FreelancerSelection):
    """Select freelancer and create project on-chain"""
    ctx.logger.info(f"Selecting freelancer {msg.freelancer_address} for job {msg.job_id}")
    
    if msg.job_id not in state.active_jobs:
        ctx.logger.error(f"Job {msg.job_id} not found")
        return
    
    try:
        w3 = AgentConfig.get_web3()
        account = AgentConfig.get_account()
        
        job = state.active_jobs[msg.job_id]
        
        # Prepare milestone data
        milestone_descriptions = [m["description"] for m in job["milestones"]]
        milestone_amounts = [w3.to_wei(m["amount"], 'ether') for m in job["milestones"]]
        milestone_deadlines = [m["deadline"] for m in job["milestones"]]
        
        total_budget = sum(milestone_amounts)
        
        # Create project on WorkEscrow
        escrow_contract = w3.eth.contract(
            address=AgentConfig.WORK_ESCROW,
            abi=WORK_ESCROW_ABI
        )
        
        tx = escrow_contract.functions.createProject(
            account.address,  # client
            msg.freelancer_address,  # freelancer
            total_budget,
            milestone_descriptions,
            milestone_amounts,
            milestone_deadlines
        ).build_transaction({
            'from': account.address,
            'value': total_budget,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 1000000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign and send
        signed_tx = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Extract project ID from events
        project_id = receipt['logs'][0]['topics'][1].hex() if receipt['logs'] else None
        
        ctx.logger.info(f"Project created! ID: {project_id}, Tx: {tx_hash.hex()}")
        
        # Update state
        state.active_jobs[msg.job_id]["status"] = "in_progress"
        state.active_projects.append({
            "project_id": project_id,
            "job_id": msg.job_id,
            "freelancer": msg.freelancer_address
        })
        
    except Exception as e:
        ctx.logger.error(f"Error creating project: {e}")

@client.on_message(model=MilestoneApproval)
async def handle_milestone_approval(ctx: Context, sender: str, msg: MilestoneApproval):
    """Approve or reject milestone completion"""
    ctx.logger.info(f"Milestone approval for project {msg.project_id}, milestone {msg.milestone_id}: {msg.approved}")
    
    # In production, this would call WorkEscrow.approveMilestone()
    # and release funds to freelancer
    
    ctx.logger.info(f"Feedback: {msg.feedback}")

@client.on_interval(period=600.0)  # Every 10 minutes
async def check_project_status(ctx: Context):
    """Check status of active projects"""
    ctx.logger.info(f"Active jobs: {len(state.active_jobs)}, Active projects: {len(state.active_projects)}")

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
    
    # Job posting requests
    if "post" in message and "job" in message:
        return f"📝 Ready to post a new job!\n\n" \
               f"Active Jobs: {len(state.active_jobs)}\n" \
               f"Active Projects: {len(state.active_projects)}\n\n" \
               f"Use the dashboard to create a detailed job posting with:\n" \
               f"• Project description\n" \
               f"• Required skills\n" \
               f"• Budget & milestones\n" \
               f"• Timeline"
    
    # Find freelancers
    elif "find" in message and "freelancer" in message:
        total_bids = sum(len(bids) for bids in state.received_bids.values())
        return f"🔍 Finding freelancers for your projects...\n\n" \
               f"📊 Current Status:\n" \
               f"• Active Jobs: {len(state.active_jobs)}\n" \
               f"• Received Bids: {total_bids}\n" \
               f"• Active Projects: {len(state.active_projects)}\n\n" \
               f"I'll notify you when freelancers submit proposals!"
    
    # Project status
    elif "project" in message or "status" in message:
        return f"📁 Project Overview:\n\n" \
               f"🟢 Active Projects: {len(state.active_projects)}\n" \
               f"📋 Posted Jobs: {len(state.active_jobs)}\n" \
               f"💼 Pending Reviews: 0\n\n" \
               f"View detailed status in your dashboard."
    
    # Check bids
    elif "bid" in message:
        total_bids = sum(len(bids) for bids in state.received_bids.values())
        return f"💰 Bid Summary:\n\n" \
               f"📨 Total Bids Received: {total_bids}\n" \
               f"📝 Jobs with Bids: {len(state.received_bids)}\n\n" \
               f"Review and select the best freelancers in your dashboard."
    
    # Approve milestone
    elif "approve" in message or "milestone" in message:
        return f"✅ Milestone Approval\n\n" \
               f"Active Projects: {len(state.active_projects)}\n\n" \
               f"Review deliverables and approve milestones to release payments.\n" \
               f"Payments are handled automatically via smart contracts!"
    
    # Default help message
    else:
        return f"👋 Hi! I'm your ClientAgent.\n\n" \
               f"I can help you with:\n" \
               f"• 📝 Post jobs - 'Post a job'\n" \
               f"• 🔍 Find freelancers - 'Find freelancers'\n" \
               f"• 💰 Review bids - 'Check bids'\n" \
               f"• 📁 Project status - 'Show projects'\n" \
               f"• ✅ Approve work - 'Approve milestone'\n\n" \
               f"Current Status:\n" \
               f"Jobs: {len(state.active_jobs)} | Projects: {len(state.active_projects)}"

# Include chat protocol in agent
client.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    print("Starting ClientAgent...")
    print(f"Agent Address: {client.address}")
    client.run()
