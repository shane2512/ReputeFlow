"""
Deploy agents to Agentverse WITH code
Creates new hosted agents with full code in Agentverse cloud
"""

import requests
import json
from config import AgentConfig

def read_agent_file(filename):
    """Read agent Python file"""
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def create_hosted_agent(agent_name, code, description):
    """
    Create a new hosted agent in Agentverse with code
    
    Args:
        agent_name: Display name for the agent
        code: Python code as string
        description: Agent description
    
    Returns:
        dict: Response with agent details including address
    """
    
    # Agentverse API endpoint for creating hosted agents
    api_url = "https://agentverse.ai/v1/hosting/agents"
    
    headers = {
        "Authorization": f"Bearer {AgentConfig.AGENTVERSE_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Prepare agent data with code
    agent_data = {
        "name": agent_name,
        "description": description,
        "code": code,
        "readme": f"# {agent_name}\n\n{description}",
    }
    
    try:
        print(f"📤 Creating hosted agent: {agent_name}...")
        print(f"   Code size: {len(code)} bytes")
        
        # Create agent
        response = requests.post(api_url, headers=headers, json=agent_data)
        
        if response.status_code in [200, 201]:
            result = response.json()
            agent_address = result.get('address', 'unknown')
            print(f"✅ {agent_name} created successfully!")
            print(f"   Address: {agent_address}")
            return result
        else:
            print(f"❌ Failed to create {agent_name}")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error creating {agent_name}: {e}")
        return None

def prepare_agent_code(filename, seed_var):
    """
    Prepare agent code for Agentverse deployment
    Removes local-only imports and adjusts for cloud environment
    """
    code = read_agent_file(filename)
    
    # Replace config imports with inline config
    agentverse_code = f'''
# Agentverse Hosted Agent
from uagents import Agent, Context, Model, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)
from datetime import datetime
from uuid import uuid4

# Agent seed (unique identifier)
AGENT_SEED = "{seed_var}"

{code.split("# Message Models")[1] if "# Message Models" in code else code}
'''
    
    # Remove local imports
    agentverse_code = agentverse_code.replace("from config import AgentConfig, ", "# ")
    agentverse_code = agentverse_code.replace("from config import AgentConfig", "# ")
    agentverse_code = agentverse_code.replace("from metta_reasoning import metta_reasoner", "# ")
    agentverse_code = agentverse_code.replace("from freelancer_agent import", "# from freelancer_agent import")
    
    # Replace config references
    agentverse_code = agentverse_code.replace("AgentConfig.FREELANCER_AGENT_SEED", "AGENT_SEED")
    agentverse_code = agentverse_code.replace("AgentConfig.CLIENT_AGENT_SEED", "AGENT_SEED")
    agentverse_code = agentverse_code.replace("AgentConfig.VALIDATOR_AGENT_SEED", "AGENT_SEED")
    agentverse_code = agentverse_code.replace("AgentConfig.SWARM_COORDINATOR_SEED", "AGENT_SEED")
    agentverse_code = agentverse_code.replace("AgentConfig.MARKET_ANALYZER_SEED", "AGENT_SEED")
    agentverse_code = agentverse_code.replace("AgentConfig.REPUTATION_ORACLE_SEED", "AGENT_SEED")
    agentverse_code = agentverse_code.replace("AgentConfig.AGENT_PORT_START", "8000")
    agentverse_code = agentverse_code.replace("AgentConfig.AGENTVERSE_API_KEY", f'"{AgentConfig.AGENTVERSE_API_KEY}"')
    agentverse_code = agentverse_code.replace("AgentConfig.ENABLE_MAILBOX", "True")
    
    # Remove port and endpoint (not needed in Agentverse)
    agentverse_code = agentverse_code.replace('port=8000,', '')
    agentverse_code = agentverse_code.replace('port=8001,', '')
    agentverse_code = agentverse_code.replace('port=8002,', '')
    agentverse_code = agentverse_code.replace('port=8003,', '')
    agentverse_code = agentverse_code.replace('port=8004,', '')
    agentverse_code = agentverse_code.replace('port=8005,', '')
    agentverse_code = agentverse_code.replace('endpoint=["http://localhost:8000/submit"],', '')
    agentverse_code = agentverse_code.replace('endpoint=["http://localhost:8001/submit"],', '')
    agentverse_code = agentverse_code.replace('endpoint=["http://localhost:8002/submit"],', '')
    agentverse_code = agentverse_code.replace('endpoint=["http://localhost:8003/submit"],', '')
    agentverse_code = agentverse_code.replace('endpoint=["http://localhost:8004/submit"],', '')
    agentverse_code = agentverse_code.replace('endpoint=["http://localhost:8005/submit"],', '')
    
    # Remove if __name__ block (not needed in Agentverse)
    if 'if __name__ == "__main__":' in agentverse_code:
        agentverse_code = agentverse_code.split('if __name__ == "__main__":')[0]
    
    return agentverse_code

def deploy_all_agents():
    """Deploy all agents to Agentverse with code"""
    
    print("=" * 70)
    print("🚀 Deploying Agents to Agentverse Cloud")
    print("=" * 70)
    print()
    
    # Check API key
    if not AgentConfig.AGENTVERSE_API_KEY or AgentConfig.AGENTVERSE_API_KEY == "your_agentverse_api_key_here":
        print("❌ Error: AGENTVERSE_API_KEY not configured")
        return False
    
    print(f"✅ Using API Key: {AgentConfig.AGENTVERSE_API_KEY[:20]}...")
    print()
    
    # Define agents
    agents = [
        {
            "file": "freelancer_agent.py",
            "name": "ReputeFlow FreelancerAgent",
            "description": "Autonomous freelancer agent for job discovery, bidding, and project execution with MeTTa reasoning.",
            "seed": AgentConfig.FREELANCER_AGENT_SEED
        },
        {
            "file": "client_agent.py",
            "name": "ReputeFlow ClientAgent",
            "description": "Client agent for job posting, bid evaluation, and project management.",
            "seed": AgentConfig.CLIENT_AGENT_SEED
        },
        {
            "file": "validator_agent.py",
            "name": "ReputeFlow ValidatorAgent",
            "description": "Validator agent for work quality assessment and dispute resolution.",
            "seed": AgentConfig.VALIDATOR_AGENT_SEED
        },
        {
            "file": "swarm_coordinator.py",
            "name": "ReputeFlow SwarmCoordinator",
            "description": "Swarm coordinator for multi-agent orchestration and task distribution.",
            "seed": AgentConfig.SWARM_COORDINATOR_SEED
        },
        {
            "file": "market_analyzer.py",
            "name": "ReputeFlow MarketAnalyzer",
            "description": "Market analyzer for trends, pricing insights, and demand forecasting.",
            "seed": AgentConfig.MARKET_ANALYZER_SEED
        },
        {
            "file": "reputation_oracle.py",
            "name": "ReputeFlow ReputationOracle",
            "description": "Reputation oracle for trust scoring and fraud detection.",
            "seed": AgentConfig.REPUTATION_ORACLE_SEED
        },
    ]
    
    deployed_agents = []
    success_count = 0
    
    for agent_info in agents:
        try:
            # Prepare code for Agentverse
            code = prepare_agent_code(agent_info["file"], agent_info["seed"])
            
            # Create hosted agent
            result = create_hosted_agent(
                agent_info["name"],
                code,
                agent_info["description"]
            )
            
            if result:
                deployed_agents.append({
                    "name": agent_info["name"],
                    "address": result.get('address', 'unknown'),
                    "file": agent_info["file"]
                })
                success_count += 1
            print()
            
        except FileNotFoundError:
            print(f"❌ File not found: {agent_info['file']}")
            print()
        except Exception as e:
            print(f"❌ Error processing {agent_info['file']}: {e}")
            import traceback
            traceback.print_exc()
            print()
    
    # Summary
    print("=" * 70)
    print(f"📊 Deployment Summary: {success_count}/{len(agents)} agents")
    print("=" * 70)
    print()
    
    if deployed_agents:
        print("✅ Deployed Agents:")
        print()
        for agent in deployed_agents:
            print(f"  • {agent['name']}")
            print(f"    Address: {agent['address']}")
            print(f"    File: {agent['file']}")
            print()
    
    if success_count == len(agents):
        print("🎉 All agents deployed successfully!")
        print()
        print("✅ Next Steps:")
        print("   1. Visit https://agentverse.ai/agents")
        print("   2. View your deployed agents")
        print("   3. Click 'Start' on each agent to run them")
        print("   4. Test chat functionality")
        print()
        print("📝 Save these addresses for your frontend!")
        print()
    else:
        print("⚠️  Some agents failed to deploy")
        print("   Check the errors above")
        print()
    
    return success_count == len(agents)

if __name__ == "__main__":
    import sys
    
    print()
    print("🚀 ReputeFlow Agentverse Deployment")
    print()
    
    try:
        success = deploy_all_agents()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Deployment cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
