"""
Simple Agent Registration for Agentverse
Registers all ReputeFlow agents
"""

from uagents import Agent, Context, Bureau
from uagents.setup import fund_agent_if_low
from config import AgentConfig
import asyncio

# Import all agents
from freelancer_agent import freelancer
from client_agent import client
from validator_agent import validator
from swarm_coordinator import coordinator
from market_analyzer import analyzer
from reputation_oracle import oracle

def print_agent_info():
    """Print information about all agents"""
    print("=" * 70)
    print("🤖 ReputeFlow Agent Registration")
    print("=" * 70)
    print()
    print("📋 Agent Information:")
    print()
    
    agents = [
        ("FreelancerAgent", freelancer),
        ("ClientAgent", client),
        ("ValidatorAgent", validator),
        ("SwarmCoordinator", coordinator),
        ("MarketAnalyzer", analyzer),
        ("ReputationOracle", oracle),
    ]
    
    for name, agent in agents:
        print(f"  {name}:")
        print(f"    Address: {agent.address}")
        print(f"    Name: {agent.name}")
        print()
    
    print("=" * 70)
    print()
    print("📝 To register these agents in Agentverse:")
    print()
    print("1. Visit: https://agentverse.ai")
    print("2. Sign in with your account")
    print("3. Go to 'My Agents' section")
    print("4. Click 'Add Agent' or 'Register Agent'")
    print("5. For each agent above, enter:")
    print("   - Agent Address (shown above)")
    print("   - Agent Name")
    print("   - Description")
    print("   - Capabilities")
    print()
    print("=" * 70)
    print()
    print("🔑 Agent Descriptions:")
    print()
    print("FreelancerAgent:")
    print("  Description: Autonomous freelancer for job discovery and bidding")
    print("  Capabilities: job_discovery, bidding, project_execution")
    print()
    print("ClientAgent:")
    print("  Description: Client agent for job posting and freelancer management")
    print("  Capabilities: job_posting, bid_evaluation, project_management")
    print()
    print("ValidatorAgent:")
    print("  Description: Validator for work quality assessment")
    print("  Capabilities: work_validation, quality_scoring, dispute_resolution")
    print()
    print("SwarmCoordinator:")
    print("  Description: Coordinator for multi-agent orchestration")
    print("  Capabilities: task_assignment, health_monitoring, coordination")
    print()
    print("MarketAnalyzer:")
    print("  Description: Market analyzer for trends and pricing")
    print("  Capabilities: market_analysis, pricing, demand_forecasting")
    print()
    print("ReputationOracle:")
    print("  Description: Reputation oracle for trust scoring")
    print("  Capabilities: reputation_tracking, fraud_detection, trust_scoring")
    print()
    print("=" * 70)
    print()
    print("✅ After registration, your agents will be discoverable in Agentverse!")
    print()

if __name__ == "__main__":
    print_agent_info()
    
    print("💡 TIP: You can also run the agents locally without Agentverse registration")
    print("   Just run: python run_agents.py")
    print()
