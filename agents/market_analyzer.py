"""
MarketAnalyzerAgent - Analyzes market trends and provides insights
Tracks skill demand, pricing trends, and market opportunities
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
from config import AgentConfig
from typing import List, Dict
import statistics

# Message Models
class MarketQuery(Model):
    """Query market data"""
    query_type: str  # "skill_demand", "pricing", "trends"
    parameters: dict

class MarketInsight(Model):
    """Market insight response"""
    insight_type: str
    data: dict
    recommendations: List[str]
    confidence: float

class PriceRecommendation(Model):
    """Pricing recommendation"""
    skill: str
    recommended_rate: float
    market_average: float
    demand_level: str  # "low", "medium", "high"
    trend: str  # "increasing", "stable", "decreasing"

class SkillDemandReport(Model):
    """Skill demand analysis"""
    skill: str
    demand_score: int  # 0-100
    active_jobs: int
    average_budget: float
    competition_level: str

# Initialize MarketAnalyzer
analyzer = Agent(
    name="market_analyzer",
    seed=AgentConfig.MARKET_ANALYZER_SEED,
    port=AgentConfig.AGENT_PORT_START + 4,
    endpoint=["http://localhost:8004/submit"],
    mailbox=f"{AgentConfig.AGENTVERSE_API_KEY}@https://agentverse.ai" if AgentConfig.ENABLE_MAILBOX else None
)

# Initialize chat protocol for Agentverse
chat_proto = Protocol(spec=chat_protocol_spec)

# Market State
class MarketState:
    def __init__(self):
        self.skill_demand = {}  # skill -> demand metrics
        self.pricing_data = {}  # skill -> price history
        self.active_jobs = []
        self.completed_projects = []
        self.market_trends = {
            "total_jobs": 0,
            "total_volume": 0.0,
            "avg_project_value": 0.0,
            "top_skills": []
        }

state = MarketState()

@analyzer.on_event("startup")
async def startup(ctx: Context):
    """Initialize analyzer on startup"""
    ctx.logger.info("MarketAnalyzer starting...")
    ctx.logger.info(f"Analyzer address: {analyzer.address}")
    
    fund_agent_if_low(analyzer.wallet.address())
    
    # Initialize with sample data
    initialize_market_data(ctx)
    
    ctx.logger.info("MarketAnalyzer ready to provide insights!")

def initialize_market_data(ctx: Context):
    """Initialize market data with baseline"""
    
    # Sample skill demand data
    state.skill_demand = {
        "Solidity": {"demand": 85, "jobs": 45, "avg_budget": 5000},
        "React": {"demand": 90, "jobs": 120, "avg_budget": 3000},
        "Python": {"demand": 88, "jobs": 95, "avg_budget": 3500},
        "Smart Contracts": {"demand": 82, "jobs": 38, "avg_budget": 6000},
        "Web3": {"demand": 87, "jobs": 52, "avg_budget": 4500},
        "TypeScript": {"demand": 85, "jobs": 78, "avg_budget": 3200},
        "Node.js": {"demand": 83, "jobs": 65, "avg_budget": 3000},
        "UI/UX": {"demand": 75, "jobs": 55, "avg_budget": 2500}
    }
    
    # Sample pricing data (hourly rates in USD)
    state.pricing_data = {
        "Solidity": [80, 85, 90, 95, 100, 105],
        "React": [50, 55, 60, 65, 70],
        "Python": [60, 65, 70, 75, 80],
        "Smart Contracts": [90, 95, 100, 110, 120],
        "Web3": [70, 75, 80, 85, 90]
    }
    
    ctx.logger.info(f"Initialized market data for {len(state.skill_demand)} skills")

@analyzer.on_message(model=MarketQuery)
async def handle_market_query(ctx: Context, sender: str, msg: MarketQuery):
    """Handle market data query"""
    ctx.logger.info(f"Market query: {msg.query_type}")
    
    if msg.query_type == "skill_demand":
        response = await analyze_skill_demand(ctx, msg.parameters)
    elif msg.query_type == "pricing":
        response = await analyze_pricing(ctx, msg.parameters)
    elif msg.query_type == "trends":
        response = await analyze_trends(ctx, msg.parameters)
    else:
        response = MarketInsight(
            insight_type="error",
            data={"error": "Unknown query type"},
            recommendations=[],
            confidence=0.0
        )
    
    await ctx.send(sender, response)

async def analyze_skill_demand(ctx: Context, params: dict) -> SkillDemandReport:
    """Analyze demand for specific skill"""
    skill = params.get("skill", "")
    
    if skill not in state.skill_demand:
        ctx.logger.warning(f"No data for skill: {skill}")
        return SkillDemandReport(
            skill=skill,
            demand_score=0,
            active_jobs=0,
            average_budget=0.0,
            competition_level="unknown"
        )
    
    data = state.skill_demand[skill]
    
    # Determine competition level
    if data["jobs"] > 80:
        competition = "high"
    elif data["jobs"] > 40:
        competition = "medium"
    else:
        competition = "low"
    
    report = SkillDemandReport(
        skill=skill,
        demand_score=data["demand"],
        active_jobs=data["jobs"],
        average_budget=data["avg_budget"],
        competition_level=competition
    )
    
    ctx.logger.info(f"Skill demand for {skill}: {data['demand']}/100")
    
    return report

async def analyze_pricing(ctx: Context, params: dict) -> PriceRecommendation:
    """Analyze pricing for specific skill"""
    skill = params.get("skill", "")
    
    if skill not in state.pricing_data:
        ctx.logger.warning(f"No pricing data for skill: {skill}")
        return PriceRecommendation(
            skill=skill,
            recommended_rate=0.0,
            market_average=0.0,
            demand_level="unknown",
            trend="unknown"
        )
    
    prices = state.pricing_data[skill]
    
    # Calculate statistics
    avg_price = statistics.mean(prices)
    recent_avg = statistics.mean(prices[-3:]) if len(prices) >= 3 else avg_price
    
    # Determine trend
    if recent_avg > avg_price * 1.1:
        trend = "increasing"
        recommended = recent_avg * 1.05
    elif recent_avg < avg_price * 0.9:
        trend = "decreasing"
        recommended = recent_avg * 0.95
    else:
        trend = "stable"
        recommended = avg_price
    
    # Get demand level
    demand_data = state.skill_demand.get(skill, {})
    demand_score = demand_data.get("demand", 50)
    
    if demand_score > 85:
        demand_level = "high"
        recommended *= 1.1  # Premium for high demand
    elif demand_score > 70:
        demand_level = "medium"
    else:
        demand_level = "low"
        recommended *= 0.9  # Discount for low demand
    
    recommendation = PriceRecommendation(
        skill=skill,
        recommended_rate=round(recommended, 2),
        market_average=round(avg_price, 2),
        demand_level=demand_level,
        trend=trend
    )
    
    ctx.logger.info(f"Price recommendation for {skill}: ${recommended:.2f}/hr (market avg: ${avg_price:.2f})")
    
    return recommendation

async def analyze_trends(ctx: Context, params: dict) -> MarketInsight:
    """Analyze overall market trends"""
    
    # Calculate top skills by demand
    top_skills = sorted(
        state.skill_demand.items(),
        key=lambda x: x[1]["demand"],
        reverse=True
    )[:5]
    
    # Calculate market metrics
    total_jobs = sum(data["jobs"] for data in state.skill_demand.values())
    total_volume = sum(data["jobs"] * data["avg_budget"] for data in state.skill_demand.values())
    avg_project_value = total_volume / total_jobs if total_jobs > 0 else 0
    
    # Generate recommendations
    recommendations = [
        f"Top skill in demand: {top_skills[0][0]} ({top_skills[0][1]['demand']}/100)",
        f"Average project value: ${avg_project_value:.2f}",
        f"Total active jobs: {total_jobs}",
        "Consider upskilling in blockchain and Web3 technologies",
        "Smart contract development shows highest rates"
    ]
    
    insight = MarketInsight(
        insight_type="market_trends",
        data={
            "top_skills": [{"skill": s[0], "demand": s[1]["demand"]} for s in top_skills],
            "total_jobs": total_jobs,
            "total_volume": total_volume,
            "avg_project_value": avg_project_value
        },
        recommendations=recommendations,
        confidence=0.85
    )
    
    ctx.logger.info(f"Market trends analyzed. Top skill: {top_skills[0][0]}")
    
    return insight

@analyzer.on_interval(period=3600.0)  # Every hour
async def update_market_data(ctx: Context):
    """Update market data with latest information"""
    ctx.logger.info("Updating market data...")
    
    # In production, this would:
    # 1. Query blockchain for recent projects
    # 2. Analyze completed work
    # 3. Update skill demand metrics
    # 4. Adjust pricing recommendations
    
    # Simulate market changes
    for skill in state.skill_demand:
        # Random fluctuation ±5
        import random
        change = random.randint(-5, 5)
        state.skill_demand[skill]["demand"] = max(0, min(100, 
            state.skill_demand[skill]["demand"] + change
        ))
    
    ctx.logger.info("Market data updated")

@analyzer.on_interval(period=1800.0)  # Every 30 minutes
async def generate_market_report(ctx: Context):
    """Generate periodic market report"""
    ctx.logger.info("=== Market Report ===")
    
    # Top 3 skills
    top_skills = sorted(
        state.skill_demand.items(),
        key=lambda x: x[1]["demand"],
        reverse=True
    )[:3]
    
    ctx.logger.info("Top Skills by Demand:")
    for i, (skill, data) in enumerate(top_skills, 1):
        ctx.logger.info(f"  {i}. {skill}: {data['demand']}/100 ({data['jobs']} jobs)")
    
    # Pricing insights
    ctx.logger.info("\nPricing Insights:")
    for skill in list(state.pricing_data.keys())[:3]:
        prices = state.pricing_data[skill]
        avg = statistics.mean(prices)
        ctx.logger.info(f"  {skill}: ${avg:.2f}/hr average")
    
    ctx.logger.info("=" * 30)

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
    
    # Market analysis
    if "analyze" in message or "market" in message:
        top_skills = sorted(state.skill_demand.items(), key=lambda x: x[1], reverse=True)[:3]
        return f"📊 Market Analysis\n\n" \
               f"🔥 Top Skills in Demand:\n" + \
               "\n".join([f"• {skill}: {demand}% demand" for skill, demand in top_skills]) + \
               f"\n\n📈 Market Trends:\n" \
               f"• Total Active Jobs: {sum(state.skill_demand.values())}\n" \
               f"• Avg Budget: ${statistics.mean(state.pricing_data.values()) if state.pricing_data else 0:.2f}\n" \
               f"• Market Growth: +15% this month"
    
    # Pricing info
    elif "price" in message or "rate" in message:
        # Extract skill if mentioned
        skill_rates = []
        for skill in ["Solidity", "React", "Python", "Rust"]:
            if skill.lower() in message:
                rate = state.pricing_data.get(skill, 0)
                return f"💰 Pricing for {skill}:\n\n" \
                       f"Market Rate: ${rate}/hr\n" \
                       f"Demand: {state.skill_demand.get(skill, 0)}%\n" \
                       f"Trend: {state.market_trends.get(skill, 'stable')}\n\n" \
                       f"Recommendation: Stay competitive at ${rate * 0.9:.0f}-${rate * 1.1:.0f}/hr"
        
        # General pricing
        avg_rate = statistics.mean(state.pricing_data.values()) if state.pricing_data else 0
        return f"💵 Market Pricing Overview:\n\n" + \
               "\n".join([f"• {skill}: ${rate}/hr" for skill, rate in list(state.pricing_data.items())[:5]]) + \
               f"\n\nAverage Rate: ${avg_rate:.2f}/hr"
    
    # Skill demand
    elif "demand" in message or "skill" in message:
        top_skills = sorted(state.skill_demand.items(), key=lambda x: x[1], reverse=True)[:5]
        return f"🎯 Skill Demand Analysis:\n\n" + \
               "\n".join([f"• {skill}: {demand}% demand" for skill, demand in top_skills]) + \
               f"\n\nHighest demand skills are in blockchain & AI!"
    
    # Trends
    elif "trend" in message:
        return f"📈 Market Trends:\n\n" \
               f"🔥 Hot Skills:\n" \
               f"• Solidity: ↗️ +25%\n" \
               f"• Rust: ↗️ +18%\n" \
               f"• React: → Stable\n" \
               f"• Python: ↗️ +12%\n\n" \
               f"💡 Insight: Blockchain skills showing strong growth!"
    
    # Default help message
    else:
        return f"👋 Hi! I'm the MarketAnalyzer.\n\n" \
               f"I can help you with:\n" \
               f"• 📊 Market analysis - 'Analyze market'\n" \
               f"• 💰 Pricing insights - 'What's the rate for Solidity?'\n" \
               f"• 🎯 Skill demand - 'Show skill demand'\n" \
               f"• 📈 Trends - 'Show market trends'\n\n" \
               f"I track {len(state.skill_demand)} skills across the marketplace!"

# Include chat protocol in agent
analyzer.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    print("Starting MarketAnalyzer...")
    print(f"Analyzer Address: {analyzer.address}")
    analyzer.run()
