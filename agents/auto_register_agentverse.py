"""
Automatic Agentverse Registration
Registers all agents automatically using Agentverse API
"""

import requests
import json
from config import AgentConfig

# Import all agents to get their addresses
from freelancer_agent import freelancer
from client_agent import client
from validator_agent import validator
from swarm_coordinator import coordinator
from market_analyzer import analyzer
from reputation_oracle import oracle

def register_agent_in_agentverse(agent, name, description, capabilities):
    """
    Register a single agent in Agentverse using API
    
    Args:
        agent: The uAgent instance
        name: Display name for the agent
        description: Agent description
        capabilities: List of capabilities
    
    Returns:
        bool: True if successful
    """
    
    # Agentverse API endpoint
    api_url = "https://agentverse.ai/v1/hosting/agents"
    
    headers = {
        "Authorization": f"Bearer {AgentConfig.AGENTVERSE_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Prepare agent data
    agent_data = {
        "address": agent.address,
        "name": name,
        "description": description,
        "readme": f"# {name}\n\n{description}\n\n## Capabilities\n" + "\n".join([f"- {cap}" for cap in capabilities]),
        "protocol_digest": "",  # Optional
        "code": "",  # Optional for hosted agents
    }
    
    try:
        print(f"📤 Registering {name}...")
        print(f"   Address: {agent.address}")
        
        # Try to register
        response = requests.post(api_url, headers=headers, json=agent_data)
        
        if response.status_code in [200, 201]:
            print(f"✅ {name} registered successfully!")
            return True
        elif response.status_code == 409:
            print(f"ℹ️  {name} already registered")
            return True
        else:
            print(f"❌ Failed to register {name}")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error registering {name}: {e}")
        return False


def register_all_agents():
    """Register all ReputeFlow agents in Agentverse"""
    
    print("=" * 70)
    print("🤖 Automatic Agentverse Registration")
    print("=" * 70)
    print()
    
    # Check if API key is configured
    if not AgentConfig.AGENTVERSE_API_KEY or AgentConfig.AGENTVERSE_API_KEY == "your_agentverse_api_key_here":
        print("❌ Error: AGENTVERSE_API_KEY not configured in .env")
        print("   Please add your API key to agents/.env")
        return False
    
    print(f"✅ Using API Key: {AgentConfig.AGENTVERSE_API_KEY[:20]}...")
    print()
    
    # Define all agents with their metadata
    agents_to_register = [
        {
            "agent": freelancer,
            "name": "ReputeFlow FreelancerAgent",
            "description": "Autonomous freelancer agent for job discovery, competitive bidding, and project execution. Uses MeTTa reasoning for intelligent job matching.",
            "capabilities": [
                "Job Discovery & Matching",
                "Autonomous Bidding",
                "Project Execution",
                "MeTTa-based Decision Making",
                "Blockchain Integration"
            ]
        },
        {
            "agent": client,
            "name": "ReputeFlow ClientAgent",
            "description": "Client agent for job posting, bid evaluation, and freelancer selection. Manages project lifecycle and payments.",
            "capabilities": [
                "Job Posting",
                "Bid Evaluation",
                "Freelancer Selection",
                "Project Management",
                "Milestone Approval"
            ]
        },
        {
            "agent": validator,
            "name": "ReputeFlow ValidatorAgent",
            "description": "Validator agent for work quality assessment and dispute resolution. Ensures quality standards and fair outcomes.",
            "capabilities": [
                "Work Validation",
                "Quality Scoring",
                "Dispute Resolution",
                "Multi-validator Consensus",
                "Evidence Analysis"
            ]
        },
        {
            "agent": coordinator,
            "name": "ReputeFlow SwarmCoordinator",
            "description": "Swarm coordinator for multi-agent orchestration. Manages task distribution, health monitoring, and agent coordination.",
            "capabilities": [
                "Task Assignment",
                "Agent Health Monitoring",
                "Multi-agent Coordination",
                "Performance Tracking",
                "Load Balancing"
            ]
        },
        {
            "agent": analyzer,
            "name": "ReputeFlow MarketAnalyzer",
            "description": "Market analyzer for trends, pricing insights, and demand forecasting. Provides data-driven recommendations.",
            "capabilities": [
                "Market Trend Analysis",
                "Pricing Optimization",
                "Demand Forecasting",
                "Skill Analytics",
                "Rate Recommendations"
            ]
        },
        {
            "agent": oracle,
            "name": "ReputeFlow ReputationOracle",
            "description": "Reputation oracle for trust scoring and fraud detection. Aggregates on-chain reputation data and detects anomalies.",
            "capabilities": [
                "Reputation Tracking",
                "Fraud Detection",
                "Trust Scoring",
                "On-chain Data Aggregation",
                "Anomaly Detection"
            ]
        },
    ]
    
    # Register each agent
    success_count = 0
    for agent_info in agents_to_register:
        success = register_agent_in_agentverse(
            agent_info["agent"],
            agent_info["name"],
            agent_info["description"],
            agent_info["capabilities"]
        )
        if success:
            success_count += 1
        print()
    
    # Summary
    print("=" * 70)
    print(f"📊 Registration Summary: {success_count}/{len(agents_to_register)} agents")
    print("=" * 70)
    print()
    
    if success_count == len(agents_to_register):
        print("🎉 All agents registered successfully!")
        print()
        print("✅ Next Steps:")
        print("   1. Visit https://agentverse.ai/agents")
        print("   2. View your registered agents")
        print("   3. Run agents: python run_agents.py")
        print()
    else:
        print("⚠️  Some agents failed to register")
        print("   Check the errors above and try again")
        print()
        print("💡 Manual Registration:")
        print("   Visit https://agentverse.ai and register manually")
        print("   See AGENTVERSE_GUIDE.md for instructions")
        print()
    
    return success_count == len(agents_to_register)


if __name__ == "__main__":
    import sys
    
    print()
    print("🚀 ReputeFlow Automatic Agent Registration")
    print()
    
    try:
        success = register_all_agents()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Registration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
