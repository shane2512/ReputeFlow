"""
MarketAnalyzer for Agentverse
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
class MarketQuery(Model):
    """Query market data"""
    query_type: str
    parameters: dict

class PriceRecommendation(Model):
    """Pricing recommendation"""
    skill: str
    recommended_rate: float
    market_average: float
    demand_level: str

# Initialize MarketAnalyzer
analyzer = Agent(
    name="market_analyzer",
    seed="reputeflow_analyzer_2025_secure_seed",
)

# Initialize chat protocol
chat_proto = Protocol(spec=chat_protocol_spec)

# Market State
class MarketState:
    def __init__(self):
        self.skill_demand = {
            "Solidity": 85,
            "React": 78,
            "Python": 72,
            "Rust": 68,
            "TypeScript": 75,
            "Node.js": 70,
            "Web3": 82,
            "Smart Contracts": 88
        }
        self.pricing_data = {
            "Solidity": 95,
            "React": 65,
            "Python": 60,
            "Rust": 85,
            "TypeScript": 70,
            "Node.js": 65,
            "Web3": 90,
            "Smart Contracts": 100
        }
        self.market_trends = {
            "Solidity": "increasing",
            "React": "stable",
            "Python": "increasing",
            "Rust": "increasing"
        }

state = MarketState()

@analyzer.on_event("startup")
async def startup(ctx: Context):
    """Initialize analyzer on startup"""
    ctx.logger.info(f"MarketAnalyzer starting...")
    ctx.logger.info(f"Analyzer address: {analyzer.address}")
    ctx.logger.info(f"Tracking {len(state.skill_demand)} skills")

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
    
    if "analyze" in message or "market" in message:
        top_skills = sorted(state.skill_demand.items(), key=lambda x: x[1], reverse=True)[:3]
        return f"📊 Market Analysis\n\n" \
               f"🔥 Top Skills in Demand:\n" + \
               "\n".join([f"• {skill}: {demand}% demand" for skill, demand in top_skills]) + \
               f"\n\n📈 Market Trends:\n" \
               f"• Total Active Jobs: {sum(state.skill_demand.values())}\n" \
               f"• Market Growth: +15% this month"
    
    elif "price" in message or "rate" in message:
        # Check for specific skill
        for skill in ["Solidity", "React", "Python", "Rust"]:
            if skill.lower() in message:
                rate = state.pricing_data.get(skill, 0)
                return f"💰 Pricing for {skill}:\n\n" \
                       f"Market Rate: ${rate}/hr\n" \
                       f"Demand: {state.skill_demand.get(skill, 0)}%\n" \
                       f"Trend: {state.market_trends.get(skill, 'stable')}\n\n" \
                       f"Recommendation: ${int(rate * 0.9)}-${int(rate * 1.1)}/hr"
        
        # General pricing
        avg_rate = sum(state.pricing_data.values()) / len(state.pricing_data)
        return f"💵 Market Pricing Overview:\n\n" + \
               "\n".join([f"• {skill}: ${rate}/hr" for skill, rate in list(state.pricing_data.items())[:5]]) + \
               f"\n\nAverage Rate: ${avg_rate:.2f}/hr"
    
    elif "demand" in message or "skill" in message:
        top_skills = sorted(state.skill_demand.items(), key=lambda x: x[1], reverse=True)[:5]
        return f"🎯 Skill Demand Analysis:\n\n" + \
               "\n".join([f"• {skill}: {demand}% demand" for skill, demand in top_skills]) + \
               f"\n\nHighest demand skills are in blockchain & AI!"
    
    elif "trend" in message:
        return f"📈 Market Trends:\n\n" \
               f"🔥 Hot Skills:\n" \
               f"• Solidity: ↗️ +25%\n" \
               f"• Rust: ↗️ +18%\n" \
               f"• React: → Stable\n" \
               f"• Python: ↗️ +12%\n\n" \
               f"💡 Insight: Blockchain skills showing strong growth!"
    
    else:
        return f"👋 Hi! I'm the MarketAnalyzer.\n\n" \
               f"I can help you with:\n" \
               f"• 📊 Market analysis - 'Analyze market'\n" \
               f"• 💰 Pricing insights - 'What's the rate for Solidity?'\n" \
               f"• 🎯 Skill demand - 'Show skill demand'\n" \
               f"• 📈 Trends - 'Show market trends'\n\n" \
               f"I track {len(state.skill_demand)} skills across the marketplace!"

# Include chat protocol
analyzer.include(chat_proto, publish_manifest=True)
