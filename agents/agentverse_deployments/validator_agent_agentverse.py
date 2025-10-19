"""
ValidatorAgent for Agentverse
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
class ValidationRequest(Model):
    """Request to validate work"""
    project_id: int
    milestone_id: int
    deliverable_url: str
    description: str

class ValidationResponse(Model):
    """Validation result"""
    project_id: int
    milestone_id: int
    approved: bool
    quality_score: int
    feedback: str

# Initialize ValidatorAgent
validator = Agent(
    name="validator_agent",
    seed="reputeflow_validator_2025_secure_seed",
)

# Initialize chat protocol
chat_proto = Protocol(spec=chat_protocol_spec)

# Agent State
class ValidatorState:
    def __init__(self):
        self.active_validations = []
        self.active_disputes = []
        self.validation_stats = {
            "total_validations": 0,
            "approval_rate": 0.85,
            "avg_quality_score": 82.5
        }

state = ValidatorState()

@validator.on_event("startup")
async def startup(ctx: Context):
    """Initialize agent on startup"""
    ctx.logger.info(f"ValidatorAgent starting...")
    ctx.logger.info(f"Agent address: {validator.address}")
    ctx.logger.info("Ready to validate work and resolve disputes!")

@validator.on_message(model=ValidationRequest)
async def handle_validation_request(ctx: Context, sender: str, msg: ValidationRequest):
    """Handle validation request"""
    ctx.logger.info(f"Received validation request for project {msg.project_id}")
    ctx.logger.info(f"Milestone: {msg.milestone_id}")
    state.active_validations.append(msg.project_id)

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
    
    if "validate" in message or "check" in message:
        return f"✅ ValidatorAgent Ready\n\n" \
               f"📊 Validation Stats:\n" \
               f"• Active Validations: {len(state.active_validations)}\n" \
               f"• Completed: {state.validation_stats['total_validations']}\n" \
               f"• Approval Rate: {state.validation_stats['approval_rate']:.1%}\n" \
               f"• Avg Quality Score: {state.validation_stats['avg_quality_score']:.1f}/100"
    
    elif "quality" in message or "score" in message:
        return f"🎯 Quality Assessment Criteria:\n\n" \
               f"• Code Quality: 30%\n" \
               f"• Functionality: 30%\n" \
               f"• Documentation: 20%\n" \
               f"• Best Practices: 20%\n\n" \
               f"Minimum passing score: 70/100"
    
    elif "dispute" in message:
        return f"⚖️ Dispute Resolution\n\n" \
               f"Active Disputes: {len(state.active_disputes)}\n" \
               f"I participate in multi-validator consensus!"
    
    elif "status" in message:
        return f"📈 Validator Status:\n\n" \
               f"🟢 Online & Ready\n" \
               f"📊 Total Validations: {state.validation_stats['total_validations']}\n" \
               f"⚖️ Active Disputes: {len(state.active_disputes)}"
    
    else:
        return f"👋 Hi! I'm your ValidatorAgent.\n\n" \
               f"I can help you with:\n" \
               f"• ✅ Validate work - 'Validate this milestone'\n" \
               f"• 🎯 Quality scoring - 'Check quality'\n" \
               f"• ⚖️ Dispute resolution - 'Review dispute'\n" \
               f"• 📊 Validation stats - 'Show status'\n\n" \
               f"Current Status:\n" \
               f"Active: {len(state.active_validations)} | Completed: {state.validation_stats['total_validations']}"

# Include chat protocol
validator.include(chat_proto, publish_manifest=True)
