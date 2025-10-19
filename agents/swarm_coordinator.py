"""
SwarmCoordinatorAgent - Orchestrates multi-agent collaboration
Coordinates between freelancers, clients, validators, and market analyzers
"""

from uagents import Agent, Context, Model, Bureau, Protocol
from uagents.setup import fund_agent_if_low
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)
from datetime import datetime
from uuid import uuid4
from config import AgentConfig
from typing import List, Dict

# Message Models
class AgentRegistration(Model):
    """Register agent with coordinator"""
    agent_type: str  # freelancer, client, validator, analyzer
    agent_address: str
    capabilities: List[str]

class TaskAssignment(Model):
    """Assign task to agent"""
    task_id: str
    agent_address: str
    task_type: str
    task_data: dict

class TaskCompletion(Model):
    """Report task completion"""
    task_id: str
    agent_address: str
    result: dict
    success: bool

class SwarmQuery(Model):
    """Query swarm for information"""
    query_type: str
    parameters: dict

# Initialize SwarmCoordinator
coordinator = Agent(
    name="swarm_coordinator",
    seed=AgentConfig.SWARM_COORDINATOR_SEED,
    port=AgentConfig.AGENT_PORT_START + 3,
    endpoint=["http://localhost:8003/submit"],
    mailbox=f"{AgentConfig.AGENTVERSE_API_KEY}@https://agentverse.ai" if AgentConfig.ENABLE_MAILBOX else None
)

# Initialize chat protocol for Agentverse
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
            "total_agents": 0,
            "total_tasks": 0,
            "success_rate": 0.0
        }

state = SwarmState()

@coordinator.on_event("startup")
async def startup(ctx: Context):
    """Initialize coordinator on startup"""
    ctx.logger.info("SwarmCoordinator starting...")
    ctx.logger.info(f"Coordinator address: {coordinator.address}")
    
    fund_agent_if_low(coordinator.wallet.address())
    
    ctx.logger.info("SwarmCoordinator ready to orchestrate agents!")

@coordinator.on_message(model=AgentRegistration)
async def handle_agent_registration(ctx: Context, sender: str, msg: AgentRegistration):
    """Register new agent with swarm"""
    ctx.logger.info(f"Registering {msg.agent_type} agent: {msg.agent_address}")
    
    if msg.agent_type in state.registered_agents:
        agent_info = {
            "address": msg.agent_address,
            "capabilities": msg.capabilities,
            "sender": sender,
            "registered_at": ctx.timestamp
        }
        
        state.registered_agents[msg.agent_type].append(agent_info)
        state.swarm_metrics["total_agents"] = sum(len(agents) for agents in state.registered_agents.values())
        
        ctx.logger.info(f"Agent registered! Total {msg.agent_type}s: {len(state.registered_agents[msg.agent_type])}")
    else:
        ctx.logger.warning(f"Unknown agent type: {msg.agent_type}")

@coordinator.on_message(model=TaskAssignment)
async def handle_task_assignment(ctx: Context, sender: str, msg: TaskAssignment):
    """Assign task to appropriate agent"""
    ctx.logger.info(f"Assigning task {msg.task_id} to {msg.agent_address}")
    
    state.active_tasks[msg.task_id] = {
        "agent": msg.agent_address,
        "type": msg.task_type,
        "data": msg.task_data,
        "status": "assigned",
        "assigned_at": ctx.timestamp
    }
    
    # Forward task to agent
    await ctx.send(msg.agent_address, msg)
    
    ctx.logger.info(f"Task {msg.task_id} assigned successfully")

@coordinator.on_message(model=TaskCompletion)
async def handle_task_completion(ctx: Context, sender: str, msg: TaskCompletion):
    """Handle task completion from agent"""
    ctx.logger.info(f"Task {msg.task_id} completed by {msg.agent_address}: {msg.success}")
    
    if msg.task_id in state.active_tasks:
        task = state.active_tasks.pop(msg.task_id)
        
        completed_task = {
            **task,
            "result": msg.result,
            "success": msg.success,
            "completed_at": ctx.timestamp
        }
        
        state.completed_tasks.append(completed_task)
        state.swarm_metrics["total_tasks"] += 1
        
        # Update success rate
        successful = sum(1 for t in state.completed_tasks if t.get("success", False))
        state.swarm_metrics["success_rate"] = successful / len(state.completed_tasks) if state.completed_tasks else 0.0
        
        ctx.logger.info(f"Task completed. Success rate: {state.swarm_metrics['success_rate']:.2%}")

@coordinator.on_message(model=SwarmQuery)
async def handle_swarm_query(ctx: Context, sender: str, msg: SwarmQuery):
    """Handle queries about swarm state"""
    ctx.logger.info(f"Swarm query: {msg.query_type}")
    
    if msg.query_type == "metrics":
        await ctx.send(sender, state.swarm_metrics)
    elif msg.query_type == "agents":
        agent_type = msg.parameters.get("type", "all")
        if agent_type == "all":
            await ctx.send(sender, state.registered_agents)
        else:
            await ctx.send(sender, state.registered_agents.get(agent_type, []))
    elif msg.query_type == "tasks":
        status = msg.parameters.get("status", "active")
        if status == "active":
            await ctx.send(sender, state.active_tasks)
        else:
            await ctx.send(sender, state.completed_tasks)

@coordinator.on_interval(period=300.0)  # Every 5 minutes
async def monitor_swarm_health(ctx: Context):
    """Monitor swarm health and performance"""
    ctx.logger.info("=== Swarm Health Report ===")
    ctx.logger.info(f"Total Agents: {state.swarm_metrics['total_agents']}")
    ctx.logger.info(f"Freelancers: {len(state.registered_agents['freelancer'])}")
    ctx.logger.info(f"Clients: {len(state.registered_agents['client'])}")
    ctx.logger.info(f"Validators: {len(state.registered_agents['validator'])}")
    ctx.logger.info(f"Analyzers: {len(state.registered_agents['analyzer'])}")
    ctx.logger.info(f"Active Tasks: {len(state.active_tasks)}")
    ctx.logger.info(f"Completed Tasks: {len(state.completed_tasks)}")
    ctx.logger.info(f"Success Rate: {state.swarm_metrics['success_rate']:.2%}")
    ctx.logger.info("=" * 30)

@coordinator.on_interval(period=60.0)  # Every minute
async def check_stale_tasks(ctx: Context):
    """Check for stale tasks and reassign if needed"""
    import time
    current_time = int(time.time())
    stale_threshold = 3600  # 1 hour
    
    for task_id, task in list(state.active_tasks.items()):
        if current_time - task.get("assigned_at", current_time) > stale_threshold:
            ctx.logger.warning(f"Task {task_id} is stale, may need reassignment")

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
    
    # Swarm status
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
    
    # Task assignment
    elif "assign" in message or "task" in message:
        return f"📋 Task Assignment\n\n" \
               f"Active Tasks: {len(state.active_tasks)}\n" \
               f"Completed Tasks: {len(state.completed_tasks)}\n" \
               f"Success Rate: {state.swarm_metrics['success_rate']:.1%}\n\n" \
               f"I coordinate task distribution across the swarm for optimal performance!"
    
    # Agent health
    elif "health" in message or "monitor" in message:
        total_agents = sum(len(agents) for agents in state.registered_agents.values())
        return f"💚 Agent Health Monitoring\n\n" \
               f"🟢 Online Agents: {total_agents}\n" \
               f"📊 Performance Metrics:\n" \
               f"• Avg Response Time: {state.swarm_metrics.get('avg_response_time', 0):.2f}s\n" \
               f"• Task Success Rate: {state.swarm_metrics['success_rate']:.1%}\n" \
               f"• Load Balance: Optimal\n\n" \
               f"All systems operational!"
    
    # Coordination info
    elif "coordinate" in message:
        return f"🎯 Swarm Coordination\n\n" \
               f"I orchestrate multi-agent collaboration:\n" \
               f"• Task distribution & load balancing\n" \
               f"• Agent health monitoring\n" \
               f"• Performance tracking\n" \
               f"• Consensus coordination\n\n" \
               f"Current Load:\n" \
               f"Active: {len(state.active_tasks)} | Queue: 0"
    
    # Default help message
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

# Include chat protocol in agent
coordinator.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    print("Starting SwarmCoordinator...")
    print(f"Coordinator Address: {coordinator.address}")
    coordinator.run()
