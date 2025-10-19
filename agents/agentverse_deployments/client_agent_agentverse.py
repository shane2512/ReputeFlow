"""
ClientAgent for Agentverse
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
class JobPosting(Model):
    """Post a new job"""
    title: str
    description: str
    required_skills: list[str]
    budget: float
    deadline: int

class FreelancerSelection(Model):
    """Select freelancer for job"""
    job_id: str
    freelancer_address: str
    agreed_rate: float

# Initialize ClientAgent
client = Agent(
    name="client_agent",
    seed="reputeflow_client_2025_secure_seed",
)

# Initialize chat protocol
chat_proto = Protocol(spec=chat_protocol_spec)

# Agent State
class ClientState:
    def __init__(self):
        self.active_jobs = {}
        self.received_bids = {}
        self.active_projects = []

state = ClientState()

@client.on_event("startup")
async def startup(ctx: Context):
    """Initialize agent on startup"""
    ctx.logger.info(f"ClientAgent starting...")
    ctx.logger.info(f"Agent address: {client.address}")
    ctx.logger.info("Ready to post jobs and manage projects!")

@client.on_message(model=JobPosting)
async def handle_job_posting(ctx: Context, sender: str, msg: JobPosting):
    """Handle new job posting"""
    ctx.logger.info(f"Posting new job: {msg.title}")
    ctx.logger.info(f"Budget: ${msg.budget}")
    ctx.logger.info(f"Required skills: {msg.required_skills}")
    
    job_id = f"job_{len(state.active_jobs) + 1}"
    state.active_jobs[job_id] = {
        "title": msg.title,
        "budget": msg.budget,
        "skills": msg.required_skills
    }
    state.received_bids[job_id] = []

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
    
    if "post" in message and "job" in message:
        return f"📝 Ready to post a new job!\n\n" \
               f"Active Jobs: {len(state.active_jobs)}\n" \
               f"Active Projects: {len(state.active_projects)}\n\n" \
               f"Use the dashboard to create a detailed job posting!"
    
    elif "find" in message and "freelancer" in message:
        total_bids = sum(len(bids) for bids in state.received_bids.values())
        return f"🔍 Finding freelancers for your projects...\n\n" \
               f"📊 Current Status:\n" \
               f"• Active Jobs: {len(state.active_jobs)}\n" \
               f"• Received Bids: {total_bids}\n" \
               f"• Active Projects: {len(state.active_projects)}"
    
    elif "project" in message or "status" in message:
        return f"📁 Project Overview:\n\n" \
               f"🟢 Active Projects: {len(state.active_projects)}\n" \
               f"📋 Posted Jobs: {len(state.active_jobs)}\n" \
               f"💼 Pending Reviews: 0"
    
    elif "bid" in message:
        total_bids = sum(len(bids) for bids in state.received_bids.values())
        return f"💰 Bid Summary:\n\n" \
               f"📨 Total Bids Received: {total_bids}\n" \
               f"📝 Jobs with Bids: {len(state.received_bids)}"
    
    elif "approve" in message or "milestone" in message:
        return f"✅ Milestone Approval\n\n" \
               f"Active Projects: {len(state.active_projects)}\n\n" \
               f"Review deliverables and approve milestones!"
    
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

# Include chat protocol
client.include(chat_proto, publish_manifest=True)
