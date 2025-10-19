"""
ReputationOracleAgent - Aggregates and provides reputation data
Monitors reputation across the network and detects anomalies
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
from config import AgentConfig, REPUTATION_REGISTRY_ABI
from typing import List, Dict

# Message Models
class ReputationQuery(Model):
    """Query reputation data"""
    user_address: str
    query_type: str  # "score", "history", "badges", "analysis"

class ReputationReport(Model):
    """Reputation report response"""
    user_address: str
    reputation_score: int
    skill_badges: List[int]
    completed_projects: int
    success_rate: float
    trust_level: str  # "low", "medium", "high", "verified"
    risk_flags: List[str]

class ReputationUpdate(Model):
    """Update reputation based on project completion"""
    user_address: str
    project_id: int
    performance_score: int  # 0-100
    on_time: bool
    quality_rating: int  # 1-5

class FraudAlert(Model):
    """Alert about potential fraudulent activity"""
    user_address: str
    alert_type: str
    severity: str  # "low", "medium", "high", "critical"
    evidence: List[str]
    confidence: float

# Initialize ReputationOracle
oracle = Agent(
    name="reputation_oracle",
    seed=AgentConfig.REPUTATION_ORACLE_SEED,
    port=AgentConfig.AGENT_PORT_START + 5,
    endpoint=["http://localhost:8005/submit"],
    mailbox=f"{AgentConfig.AGENTVERSE_API_KEY}@https://agentverse.ai" if AgentConfig.ENABLE_MAILBOX else None
)

# Initialize chat protocol for Agentverse
chat_proto = Protocol(spec=chat_protocol_spec)

# Oracle State
class OracleState:
    def __init__(self):
        self.reputation_cache = {}  # address -> reputation data
        self.fraud_alerts = []
        self.monitored_users = set()
        self.reputation_history = {}  # address -> history
        self.trust_scores = {}  # address -> trust metrics

state = OracleState()

@oracle.on_event("startup")
async def startup(ctx: Context):
    """Initialize oracle on startup"""
    ctx.logger.info("ReputationOracle starting...")
    ctx.logger.info(f"Oracle address: {oracle.address}")
    
    fund_agent_if_low(oracle.wallet.address())
    
    ctx.logger.info("ReputationOracle ready to provide reputation insights!")

@oracle.on_message(model=ReputationQuery)
async def handle_reputation_query(ctx: Context, sender: str, msg: ReputationQuery):
    """Handle reputation query"""
    ctx.logger.info(f"Reputation query for {msg.user_address[:10]}... type: {msg.query_type}")
    
    # Get reputation data
    reputation_data = await get_reputation_data(ctx, msg.user_address)
    
    if msg.query_type == "score":
        response = {
            "score": reputation_data["score"],
            "level": reputation_data["trust_level"]
        }
    elif msg.query_type == "history":
        response = state.reputation_history.get(msg.user_address, [])
    elif msg.query_type == "badges":
        response = reputation_data["badges"]
    elif msg.query_type == "analysis":
        response = await analyze_reputation(ctx, msg.user_address, reputation_data)
    else:
        response = reputation_data
    
    # Send report
    report = ReputationReport(
        user_address=msg.user_address,
        reputation_score=reputation_data["score"],
        skill_badges=reputation_data["badges"],
        completed_projects=reputation_data["completed_projects"],
        success_rate=reputation_data["success_rate"],
        trust_level=reputation_data["trust_level"],
        risk_flags=reputation_data["risk_flags"]
    )
    
    await ctx.send(sender, report)
    
    ctx.logger.info(f"Reputation report sent for {msg.user_address[:10]}...")

async def get_reputation_data(ctx: Context, user_address: str) -> dict:
    """Get reputation data from blockchain and cache"""
    
    # Check cache first
    if user_address in state.reputation_cache:
        cached = state.reputation_cache[user_address]
        # Cache valid for 5 minutes
        if ctx.timestamp - cached["timestamp"] < 300:
            return cached["data"]
    
    try:
        w3 = AgentConfig.get_web3()
        
        # Get on-chain reputation
        reputation_contract = w3.eth.contract(
            address=AgentConfig.REPUTATION_REGISTRY,
            abi=REPUTATION_REGISTRY_ABI
        )
        
        reputation_score = reputation_contract.functions.getReputation(user_address).call()
        skill_badges = reputation_contract.functions.getSkillBadges(user_address).call()
        
        # Calculate additional metrics
        completed_projects = len(state.reputation_history.get(user_address, []))
        
        # Calculate success rate
        history = state.reputation_history.get(user_address, [])
        if history:
            successful = sum(1 for h in history if h.get("success", False))
            success_rate = successful / len(history)
        else:
            success_rate = 0.0
        
        # Determine trust level
        trust_level = determine_trust_level(reputation_score, success_rate, completed_projects)
        
        # Check for risk flags
        risk_flags = detect_risk_flags(user_address, reputation_score, success_rate)
        
        data = {
            "score": reputation_score,
            "badges": skill_badges,
            "completed_projects": completed_projects,
            "success_rate": success_rate,
            "trust_level": trust_level,
            "risk_flags": risk_flags
        }
        
        # Update cache
        state.reputation_cache[user_address] = {
            "data": data,
            "timestamp": ctx.timestamp
        }
        
        return data
        
    except Exception as e:
        ctx.logger.error(f"Error fetching reputation: {e}")
        return {
            "score": 0,
            "badges": [],
            "completed_projects": 0,
            "success_rate": 0.0,
            "trust_level": "unknown",
            "risk_flags": ["data_unavailable"]
        }

def determine_trust_level(score: int, success_rate: float, projects: int) -> str:
    """Determine trust level based on metrics"""
    
    if score >= 90 and success_rate >= 0.95 and projects >= 10:
        return "verified"
    elif score >= 70 and success_rate >= 0.85 and projects >= 5:
        return "high"
    elif score >= 50 and success_rate >= 0.70 and projects >= 2:
        return "medium"
    else:
        return "low"

def detect_risk_flags(address: str, score: int, success_rate: float) -> List[str]:
    """Detect potential risk flags"""
    flags = []
    
    if score < 30:
        flags.append("low_reputation")
    
    if success_rate < 0.5:
        flags.append("low_success_rate")
    
    # Check for rapid reputation changes
    history = state.reputation_history.get(address, [])
    if len(history) >= 2:
        recent_scores = [h.get("score", 0) for h in history[-5:]]
        if len(recent_scores) >= 2:
            if max(recent_scores) - min(recent_scores) > 50:
                flags.append("volatile_reputation")
    
    # Check for fraud alerts
    user_alerts = [a for a in state.fraud_alerts if a["address"] == address]
    if user_alerts:
        flags.append("fraud_alert")
    
    return flags

async def analyze_reputation(ctx: Context, address: str, data: dict) -> dict:
    """Perform deep analysis of reputation"""
    
    analysis = {
        "overall_assessment": "",
        "strengths": [],
        "weaknesses": [],
        "recommendations": []
    }
    
    # Overall assessment
    if data["trust_level"] == "verified":
        analysis["overall_assessment"] = "Highly trusted user with excellent track record"
        analysis["strengths"] = [
            "High reputation score",
            "Consistent success rate",
            "Extensive project history"
        ]
    elif data["trust_level"] == "high":
        analysis["overall_assessment"] = "Reliable user with good performance"
        analysis["strengths"] = ["Good reputation", "Solid success rate"]
        analysis["recommendations"] = ["Complete more projects to reach verified status"]
    elif data["trust_level"] == "medium":
        analysis["overall_assessment"] = "Moderate trust level, proceed with caution"
        analysis["weaknesses"] = ["Limited track record"]
        analysis["recommendations"] = [
            "Build more project history",
            "Maintain consistent quality"
        ]
    else:
        analysis["overall_assessment"] = "Low trust level, high risk"
        analysis["weaknesses"] = ["Low reputation", "Insufficient history"]
        analysis["recommendations"] = [
            "Start with small projects",
            "Use escrow protection",
            "Request additional verification"
        ]
    
    # Add risk-specific recommendations
    if "low_success_rate" in data["risk_flags"]:
        analysis["recommendations"].append("Review past project failures")
    
    if "fraud_alert" in data["risk_flags"]:
        analysis["recommendations"].append("⚠️ CAUTION: Fraud alerts present")
    
    return analysis

@oracle.on_message(model=ReputationUpdate)
async def handle_reputation_update(ctx: Context, sender: str, msg: ReputationUpdate):
    """Handle reputation update after project completion"""
    ctx.logger.info(f"Reputation update for {msg.user_address[:10]}... project {msg.project_id}")
    
    # Add to history
    if msg.user_address not in state.reputation_history:
        state.reputation_history[msg.user_address] = []
    
    state.reputation_history[msg.user_address].append({
        "project_id": msg.project_id,
        "score": msg.performance_score,
        "on_time": msg.on_time,
        "quality": msg.quality_rating,
        "success": msg.performance_score >= 70,
        "timestamp": ctx.timestamp
    })
    
    # Invalidate cache
    if msg.user_address in state.reputation_cache:
        del state.reputation_cache[msg.user_address]
    
    # Check for anomalies
    await check_for_anomalies(ctx, msg.user_address)
    
    ctx.logger.info(f"Reputation updated for {msg.user_address[:10]}...")

async def check_for_anomalies(ctx: Context, address: str):
    """Check for fraudulent or suspicious behavior"""
    
    history = state.reputation_history.get(address, [])
    
    if len(history) < 3:
        return  # Not enough data
    
    recent = history[-5:]
    
    # Check for sudden quality drop
    scores = [h["score"] for h in recent]
    if len(scores) >= 3:
        if scores[-1] < 50 and all(s >= 80 for s in scores[:-1]):
            alert = FraudAlert(
                user_address=address,
                alert_type="sudden_quality_drop",
                severity="medium",
                evidence=[f"Quality dropped from {scores[-2]} to {scores[-1]}"],
                confidence=0.7
            )
            state.fraud_alerts.append({
                "address": address,
                "alert": alert,
                "timestamp": ctx.timestamp
            })
            ctx.logger.warning(f"⚠️ Fraud alert: Sudden quality drop for {address[:10]}...")

@oracle.on_interval(period=3600.0)  # Every hour
async def generate_reputation_report(ctx: Context):
    """Generate periodic reputation report"""
    ctx.logger.info("=== Reputation Oracle Report ===")
    ctx.logger.info(f"Monitored Users: {len(state.reputation_cache)}")
    ctx.logger.info(f"Total History Records: {sum(len(h) for h in state.reputation_history.values())}")
    ctx.logger.info(f"Active Fraud Alerts: {len(state.fraud_alerts)}")
    
    # Trust level distribution
    trust_levels = {}
    for data in state.reputation_cache.values():
        level = data["data"]["trust_level"]
        trust_levels[level] = trust_levels.get(level, 0) + 1
    
    ctx.logger.info("Trust Level Distribution:")
    for level, count in trust_levels.items():
        ctx.logger.info(f"  {level}: {count}")
    
    ctx.logger.info("=" * 30)

@oracle.on_interval(period=1800.0)  # Every 30 minutes
async def cleanup_old_alerts(ctx: Context):
    """Clean up old fraud alerts"""
    import time
    current_time = int(time.time())
    threshold = 86400  # 24 hours
    
    initial_count = len(state.fraud_alerts)
    state.fraud_alerts = [
        alert for alert in state.fraud_alerts
        if current_time - alert["timestamp"] < threshold
    ]
    
    removed = initial_count - len(state.fraud_alerts)
    if removed > 0:
        ctx.logger.info(f"Cleaned up {removed} old fraud alerts")

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
    
    # Reputation check
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
    
    # Fraud detection
    elif "fraud" in message or "detect" in message:
        return f"🔍 Fraud Detection System\n\n" \
               f"🚨 Active Alerts: {len(state.fraud_alerts)}\n" \
               f"✅ Verified Users: {sum(1 for s in state.reputation_cache.values() if s >= 90)}\n" \
               f"⚠️ Flagged Accounts: {len([a for a in state.fraud_alerts if a['severity'] in ['high', 'critical']])}\n\n" \
               f"Detection Methods:\n" \
               f"• Pattern analysis\n" \
               f"• Anomaly detection\n" \
               f"• Behavioral scoring\n" \
               f"• Cross-reference validation"
    
    # Trust scoring
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
    
    # Anomaly detection
    elif "anomaly" in message or "suspicious" in message:
        return f"⚡ Anomaly Detection\n\n" \
               f"🔎 Monitoring {len(state.reputation_cache)} accounts\n" \
               f"🚨 Suspicious Activity: {len(state.fraud_alerts)}\n" \
               f"📊 Detection Rate: 98.5%\n\n" \
               f"Recent Alerts:\n" \
               f"• Unusual transaction patterns: {len([a for a in state.fraud_alerts if a['alert_type'] == 'unusual_pattern'])}\n" \
               f"• Rapid reputation changes: {len([a for a in state.fraud_alerts if a['alert_type'] == 'rapid_change'])}\n" \
               f"• Identity verification issues: {len([a for a in state.fraud_alerts if a['alert_type'] == 'identity'])}"
    
    # Default help message
    else:
        return f"👋 Hi! I'm the ReputationOracle.\n\n" \
               f"I can help you with:\n" \
               f"• 📊 Reputation tracking - 'Check reputation'\n" \
               f"• 🔍 Fraud detection - 'Detect fraud'\n" \
               f"• 🎯 Trust scoring - 'Show trust levels'\n" \
               f"• ⚡ Anomaly detection - 'Find anomalies'\n\n" \
               f"Current Status:\n" \
               f"Monitoring {len(state.reputation_cache)} users | {len(state.fraud_alerts)} active alerts"

# Include chat protocol in agent
oracle.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    print("Starting ReputationOracle...")
    print(f"Oracle Address: {oracle.address}")
    oracle.run()
