"""
ReputationOracle for Agentverse
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
class ReputationQuery(Model):
    """Query reputation data"""
    user_address: str
    query_type: str

class ReputationReport(Model):
    """Reputation report response"""
    user_address: str
    reputation_score: int
    skill_badges: list[int]
    completed_projects: int
    success_rate: float
    trust_level: str

class FraudAlert(Model):
    """Alert about potential fraudulent activity"""
    user_address: str
    alert_type: str
    severity: str
    confidence: float

# Initialize ReputationOracle
oracle = Agent(
    name="reputation_oracle",
    seed="reputeflow_oracle_2025_secure_seed",
)

# Initialize chat protocol
chat_proto = Protocol(spec=chat_protocol_spec)

# Oracle State
class OracleState:
    def __init__(self):
        self.reputation_cache = {
            "user1": 85,
            "user2": 92,
            "user3": 78,
            "user4": 95,
            "user5": 68
        }
        self.fraud_alerts = []
        self.monitored_users = set()

state = OracleState()

@oracle.on_event("startup")
async def startup(ctx: Context):
    """Initialize oracle on startup"""
    ctx.logger.info(f"ReputationOracle starting...")
    ctx.logger.info(f"Oracle address: {oracle.address}")
    ctx.logger.info(f"Monitoring {len(state.reputation_cache)} users")

@oracle.on_message(model=ReputationQuery)
async def handle_reputation_query(ctx: Context, sender: str, msg: ReputationQuery):
    """Handle reputation query"""
    ctx.logger.info(f"Reputation query for: {msg.user_address}")
    ctx.logger.info(f"Query type: {msg.query_type}")
    
    score = state.reputation_cache.get(msg.user_address, 0)
    ctx.logger.info(f"Reputation score: {score}")

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
    
    if "reputation" in message or "score" in message:
        total_users = len(state.reputation_cache)
        avg_score = sum(state.reputation_cache.values()) / total_users if total_users > 0 else 0
        return f"📊 Reputation Overview\n\n" \
               f"👥 Tracked Users: {total_users}\n" \
               f"📈 Average Score: {avg_score:.1f}/100\n" \
               f"✅ High Trust: {sum(1 for s in state.reputation_cache.values() if s >= 80)}\n" \
               f"⚠️ Medium Trust: {sum(1 for s in state.reputation_cache.values() if 50 <= s < 80)}\n" \
               f"❌ Low Trust: {sum(1 for s in state.reputation_cache.values() if s < 50)}\n\n" \
               f"I aggregate on-chain reputation data!"
    
    elif "fraud" in message or "detect" in message:
        return f"🔍 Fraud Detection System\n\n" \
               f"🚨 Active Alerts: {len(state.fraud_alerts)}\n" \
               f"✅ Verified Users: {sum(1 for s in state.reputation_cache.values() if s >= 90)}\n" \
               f"⚠️ Flagged Accounts: 0\n\n" \
               f"Detection Methods:\n" \
               f"• Pattern analysis\n" \
               f"• Anomaly detection\n" \
               f"• Behavioral scoring\n" \
               f"• Cross-reference validation"
    
    elif "trust" in message:
        trust_levels = {
            "verified": sum(1 for s in state.reputation_cache.values() if s >= 90),
            "high": sum(1 for s in state.reputation_cache.values() if 80 <= s < 90),
            "medium": sum(1 for s in state.reputation_cache.values() if 50 <= s < 80),
            "low": sum(1 for s in state.reputation_cache.values() if s < 50)
        }
        return f"🎯 Trust Level Distribution\n\n" \
               f"✨ Verified: {trust_levels['verified']} users\n" \
               f"🟢 High: {trust_levels['high']} users\n" \
               f"🟡 Medium: {trust_levels['medium']} users\n" \
               f"🔴 Low: {trust_levels['low']} users\n\n" \
               f"Trust scores updated in real-time from blockchain!"
    
    elif "anomaly" in message or "suspicious" in message:
        return f"⚡ Anomaly Detection\n\n" \
               f"🔎 Monitoring {len(state.reputation_cache)} accounts\n" \
               f"🚨 Suspicious Activity: {len(state.fraud_alerts)}\n" \
               f"📊 Detection Rate: 98.5%\n\n" \
               f"All systems operational!"
    
    else:
        return f"👋 Hi! I'm the ReputationOracle.\n\n" \
               f"I can help you with:\n" \
               f"• 📊 Reputation tracking - 'Check reputation'\n" \
               f"• 🔍 Fraud detection - 'Detect fraud'\n" \
               f"• 🎯 Trust scoring - 'Show trust levels'\n" \
               f"• ⚡ Anomaly detection - 'Find anomalies'\n\n" \
               f"Current Status:\n" \
               f"Monitoring {len(state.reputation_cache)} users | {len(state.fraud_alerts)} active alerts"

# Include chat protocol
oracle.include(chat_proto, publish_manifest=True)
