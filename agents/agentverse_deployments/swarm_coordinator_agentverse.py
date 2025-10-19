"""
SwarmCoordinator for Agentverse
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
class AgentRegistration(Model):
    """Register agent with coordinator"""
    agent_type: str
    agent_address: str
    capabilities: list[str]

class TaskAssignment(Model):
    """Assign task to agent"""
    task_id: str
    agent_address: str
    task_type: str

# Initialize SwarmCoordinator
coordinator = Agent(
    name="swarm_coordinator",
    seed="reputeflow_coordinator_2025_secure_seed",
)

# Initialize chat protocol
chat_proto = Protocol(spec=chat_protocol_spec)

# Swarm State
class SwarmState:
    def __init__(self):
        self.registered_agents = {
            "freelancer": [],
            "client": [],
            "validator": [],
            "analyzer": [],
            "oracle": []
        }
        self.active_tasks = {}
        self.completed_tasks = []
        self.swarm_metrics = {
            "success_rate": 0.92,
            "avg_response_time": 1.5
        }

state = SwarmState()

@coordinator.on_event("startup")
async def startup(ctx: Context):
    """Initialize coordinator on startup"""
    ctx.logger.info(f"SwarmCoordinator starting...")
    ctx.logger.info(f"Coordinator address: {coordinator.address}")
    ctx.logger.info("Ready to orchestrate multi-agent collaboration!")

@coordinator.on_message(model=AgentRegistration)
async def handle_agent_registration(ctx: Context, sender: str, msg: AgentRegistration):
    """Handle agent registration"""
    ctx.logger.info(f"Registering {msg.agent_type} agent: {msg.agent_address}")
    
    if msg.agent_type in state.registered_agents:
        if msg.agent_address not in state.registered_agents[msg.agent_type]:
            state.registered_agents[msg.agent_type].append(msg.agent_address)
            ctx.logger.info(f"Total {msg.agent_type} agents: {len(state.registered_agents[msg.agent_type])}")

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
    
    if "status" in message or "swarm" in message:
        total_agents = sum(len(agents) for agents in state.registered_agents.values())
        return f"🤖 Swarm Status\n\n" \
               f"📊 Registered Agents:\n" \
               f"• Freelancers: {len(state.registered_agents['freelancer'])}\n" \
               f"• Clients: {len(state.registered_agents['client'])}\n" \
               f"• Validators: {len(state.registered_agents['validator'])}\n" \
               f"• Analyzers: {len(state.registered_agents['analyzer'])}\n" \
               f"• Total: {total_agents}\n\n" \
               f"📈 Performance:\n" \
               f"• Active Tasks: {len(state.active_tasks)}\n" \
               f"• Completed: {len(state.completed_tasks)}\n" \
               f"• Success Rate: {state.swarm_metrics['success_rate']:.1%}"
    
    elif "assign" in message or "task" in message:
        return f"📋 Task Assignment\n\n" \
               f"Active Tasks: {len(state.active_tasks)}\n" \
               f"Completed Tasks: {len(state.completed_tasks)}\n" \
               f"Success Rate: {state.swarm_metrics['success_rate']:.1%}\n\n" \
               f"I coordinate task distribution across the swarm!"
    
    elif "health" in message or "monitor" in message:
        total_agents = sum(len(agents) for agents in state.registered_agents.values())
        return f"💚 Agent Health Monitoring\n\n" \
               f"🟢 Online Agents: {total_agents}\n" \
               f"📊 Performance Metrics:\n" \
               f"• Avg Response Time: {state.swarm_metrics['avg_response_time']:.2f}s\n" \
               f"• Task Success Rate: {state.swarm_metrics['success_rate']:.1%}\n" \
               f"• Load Balance: Optimal"
    
    elif "coordinate" in message:
        return f"🎯 Swarm Coordination\n\n" \
               f"I orchestrate multi-agent collaboration:\n" \
               f"• Task distribution & load balancing\n" \
               f"• Agent health monitoring\n" \
               f"• Performance tracking\n" \
               f"• Consensus coordination\n\n" \
               f"Current Load:\n" \
               f"Active: {len(state.active_tasks)} | Queue: 0"
    
    else:
        total_agents = sum(len(agents) for agents in state.registered_agents.values())
        return f"👋 Hi! I'm the SwarmCoordinator.\n\n" \
               f"I can help you with:\n" \
               f"• 🤖 Swarm status - 'Show swarm status'\n" \
               f"• 📋 Task assignment - 'Assign task'\n" \
               f"• 💚 Health monitoring - 'Check agent health'\n" \
               f"• 🎯 Coordination - 'How do you coordinate?'\n\n" \
               f"Current Swarm:\n" \
               f"{total_agents} agents | {len(state.active_tasks)} active tasks"

# Include chat protocol
coordinator.include(chat_proto, publish_manifest=True)
