"""
FreelancerAgent for Agentverse
Copy this entire file into Agentverse agent.py
"""

from uagents import Agent, Context, Model, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)
from datetime import datetime
from uuid import uuid4

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

# Initialize FreelancerAgent
freelancer = Agent(
    name="freelancer_agent",
    seed="reputeflow_freelancer_2025_secure_seed",
)

# Initialize chat protocol
chat_proto = Protocol(spec=chat_protocol_spec)

# Agent State
class FreelancerState:
    def __init__(self):
        self.skills = ["Solidity", "React", "Python"]
        self.hourly_rate = 75
        self.availability = 80
        self.active_projects = []
        self.pending_bids = []
        self.reputation_score = 85

state = FreelancerState()

@freelancer.on_event("startup")
async def startup(ctx: Context):
    """Initialize agent on startup"""
    ctx.logger.info(f"FreelancerAgent starting...")
    ctx.logger.info(f"Agent address: {freelancer.address}")
    ctx.logger.info(f"Skills: {state.skills}")
    ctx.logger.info(f"Hourly rate: ${state.hourly_rate}")

@freelancer.on_message(model=JobOpportunity)
async def handle_job_opportunity(ctx: Context, sender: str, msg: JobOpportunity):
    """Handle incoming job opportunities"""
    ctx.logger.info(f"Received job opportunity: {msg.title}")
    ctx.logger.info(f"Budget: ${msg.budget}")
    
    # Check if skills match
    matching_skills = [skill for skill in msg.required_skills if skill in state.skills]
    
    if matching_skills:
        ctx.logger.info(f"Matching skills: {matching_skills}")
        state.pending_bids.append(msg.job_id)
        ctx.logger.info(f"Added to pending bids. Total: {len(state.pending_bids)}")

@freelancer.on_message(model=BidSubmission)
async def handle_bid_submission(ctx: Context, sender: str, msg: BidSubmission):
    """Handle bid submission"""
    ctx.logger.info(f"Submitting bid for job: {msg.job_id}")
    ctx.logger.info(f"Proposed rate: ${msg.proposed_rate}/hr")
    ctx.logger.info(f"Estimated hours: {msg.estimated_hours}")

# Chat Protocol Handlers
@chat_proto.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handle incoming chat messages"""
    ctx.logger.info(f"Received chat message from {sender}")
    
    for item in msg.content:
        if isinstance(item, TextContent):
            user_message = item.text.lower()
            
            # Send acknowledgement
            ack = ChatAcknowledgement(
                timestamp=datetime.utcnow(),
                acknowledged_msg_id=msg.msg_id
            )
            await ctx.send(sender, ack)
            
            # Process message
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
    ctx.logger.info(f"Received ack from {sender}")

async def process_chat_request(ctx: Context, message: str) -> str:
    """Process chat requests"""
    
    if "find" in message and "job" in message:
        return f"🔍 Searching for jobs matching your skills: {', '.join(state.skills[:3])}...\n\n" \
               f"Found {len(state.pending_bids)} potential opportunities!\n" \
               f"Current reputation: {state.reputation_score}\n" \
               f"Hourly rate: ${state.hourly_rate}"
    
    elif "reputation" in message or "score" in message:
        return f"📊 Your Reputation Score: {state.reputation_score}/100\n" \
               f"✅ Completed Projects: {len(state.active_projects)}\n" \
               f"💼 Active Projects: {len(state.active_projects)}\n" \
               f"📝 Pending Bids: {len(state.pending_bids)}"
    
    elif "bid" in message or "apply" in message:
        return f"💰 Ready to submit bid!\n" \
               f"Your rate: ${state.hourly_rate}/hr\n" \
               f"Skills: {', '.join(state.skills)}\n" \
               f"Availability: {state.availability}%"
    
    elif "skill" in message:
        return f"🎯 Your Skills: {', '.join(state.skills)}\n" \
               f"💵 Hourly Rate: ${state.hourly_rate}\n" \
               f"📅 Availability: {state.availability}%"
    
    elif "project" in message or "status" in message:
        return f"📁 Active Projects: {len(state.active_projects)}\n" \
               f"💼 Pending Bids: {len(state.pending_bids)}"
    
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

# Include chat protocol
freelancer.include(chat_proto, publish_manifest=True)
