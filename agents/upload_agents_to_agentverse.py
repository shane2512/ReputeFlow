"""
Upload agent code to Agentverse for cloud hosting
This uploads the actual Python code so agents can run in Agentverse
"""

import requests
import json
from config import AgentConfig

# Read agent files
def read_agent_file(filename):
    """Read agent Python file"""
    with open(filename, 'r', encoding='utf-8') as f:
        return f.read()

def upload_agent_code(agent_address, agent_name, code, description):
    """
    Upload agent code to Agentverse
    
    Args:
        agent_address: Agent's address
        agent_name: Display name
        code: Python code as string
        description: Agent description
    """
    
    # Agentverse API endpoint for updating agent
    api_url = f"https://agentverse.ai/v1/hosting/agents/{agent_address}"
    
    headers = {
        "Authorization": f"Bearer {AgentConfig.AGENTVERSE_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Prepare payload with code
    payload = {
        "name": agent_name,
        "description": description,
        "code": code,
        "protocol_digest": "",  # Will be auto-generated
    }
    
    try:
        print(f"📤 Uploading code for {agent_name}...")
        print(f"   Address: {agent_address}")
        print(f"   Code size: {len(code)} bytes")
        
        # Update agent with code
        response = requests.put(api_url, headers=headers, json=payload)
        
        if response.status_code in [200, 201]:
            print(f"✅ {agent_name} code uploaded successfully!")
            return True
        else:
            print(f"❌ Failed to upload {agent_name}")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error uploading {agent_name}: {e}")
        return False

def upload_all_agents():
    """Upload all agent codes to Agentverse"""
    
    print("=" * 70)
    print("📦 Uploading Agent Code to Agentverse")
    print("=" * 70)
    print()
    
    # Check API key
    if not AgentConfig.AGENTVERSE_API_KEY or AgentConfig.AGENTVERSE_API_KEY == "your_agentverse_api_key_here":
        print("❌ Error: AGENTVERSE_API_KEY not configured")
        return False
    
    print(f"✅ Using API Key: {AgentConfig.AGENTVERSE_API_KEY[:20]}...")
    print()
    
    # Define agents with their files
    agents = [
        {
            "file": "freelancer_agent.py",
            "address": "agent1qg2c3cg05w32dstlt4lxcuamrmeygfnjjnmu4r63464jkq6y3jl3zqqu3ha",
            "name": "ReputeFlow FreelancerAgent",
            "description": "Autonomous freelancer agent for job discovery, bidding, and project execution with MeTTa reasoning."
        },
        {
            "file": "client_agent.py",
            "address": "agent1qv0zdw34w07s0ts74dd2c7y5807fhkmnmeeykkv09je82pxfdw42cuckm3m",
            "name": "ReputeFlow ClientAgent",
            "description": "Client agent for job posting, bid evaluation, and project management."
        },
        {
            "file": "validator_agent.py",
            "address": "agent1q0vutp2fl3npmzpz99pzlhs4mhjmw26fwsusxjuxpsey5y2wtqvqj20fwlg",
            "name": "ReputeFlow ValidatorAgent",
            "description": "Validator agent for work quality assessment and dispute resolution."
        },
        {
            "file": "swarm_coordinator.py",
            "address": "agent1qgazsp86sqcuzk2gp003pkstg3j3k2edts509p4cns2kx3dgkr3nq74q7up",
            "name": "ReputeFlow SwarmCoordinator",
            "description": "Swarm coordinator for multi-agent orchestration and task distribution."
        },
        {
            "file": "market_analyzer.py",
            "address": "agent1qglckvq0m8w6s65ejd539uc20cnge2t802xs8mf72fffqjxtf748yr6um4p",
            "name": "ReputeFlow MarketAnalyzer",
            "description": "Market analyzer for trends, pricing insights, and demand forecasting."
        },
        {
            "file": "reputation_oracle.py",
            "address": "agent1q2hvnygdzwwhf6m8r632ve7he5lezqk6ty5gxwz5whwm9hms2emaw5dfu2w",
            "name": "ReputeFlow ReputationOracle",
            "description": "Reputation oracle for trust scoring and fraud detection."
        },
    ]
    
    success_count = 0
    
    for agent_info in agents:
        try:
            # Read agent code
            code = read_agent_file(agent_info["file"])
            
            # Upload to Agentverse
            success = upload_agent_code(
                agent_info["address"],
                agent_info["name"],
                code,
                agent_info["description"]
            )
            
            if success:
                success_count += 1
            print()
            
        except FileNotFoundError:
            print(f"❌ File not found: {agent_info['file']}")
            print()
        except Exception as e:
            print(f"❌ Error processing {agent_info['file']}: {e}")
            print()
    
    # Summary
    print("=" * 70)
    print(f"📊 Upload Summary: {success_count}/{len(agents)} agents")
    print("=" * 70)
    print()
    
    if success_count == len(agents):
        print("🎉 All agent codes uploaded successfully!")
        print()
        print("✅ Next Steps:")
        print("   1. Visit https://agentverse.ai/agents")
        print("   2. Click on each agent")
        print("   3. Click 'Start' to run them in the cloud")
        print("   4. Test chat functionality")
        print()
    else:
        print("⚠️  Some agents failed to upload")
        print("   Check the errors above")
        print()
    
    return success_count == len(agents)

if __name__ == "__main__":
    import sys
    
    print()
    print("🚀 ReputeFlow Agent Code Upload")
    print()
    
    try:
        success = upload_all_agents()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Upload cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
