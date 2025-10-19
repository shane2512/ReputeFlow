"""
Almanac Registration Module
Registers all ReputeFlow agents in the Fetch.ai Almanac for public discovery
"""

from uagents import Agent, Context
from config import AgentConfig
import requests
import json

class AlmanacRegistrar:
    """Handles agent registration in Almanac"""
    
    def __init__(self):
        self.almanac_url = "https://almanac.fetch.ai/api/v1"
        self.api_key = AgentConfig.ALMANAC_API_KEY
        
    async def register_agent(self, agent: Agent, metadata: dict) -> bool:
        """
        Register an agent in the Almanac
        
        Args:
            agent: The uAgent to register
            metadata: Agent metadata (description, capabilities, etc.)
        
        Returns:
            bool: True if registration successful
        """
        try:
            registration_data = {
                "address": agent.address,
                "name": agent.name,
                "endpoints": agent._endpoints if hasattr(agent, '_endpoints') else [],
                "metadata": metadata,
                "protocols": self._get_protocols(agent),
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Register in Almanac
            response = requests.post(
                f"{self.almanac_url}/agents",
                headers=headers,
                json=registration_data
            )
            
            if response.status_code in [200, 201]:
                print(f"✅ {agent.name} registered in Almanac")
                print(f"   Address: {agent.address}")
                return True
            else:
                print(f"❌ Failed to register {agent.name}: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error registering {agent.name}: {e}")
            return False
    
    def _get_protocols(self, agent: Agent) -> list:
        """Extract protocols from agent"""
        # Return list of message types the agent handles
        return [
            "JobOpportunity",
            "BidSubmission",
            "ValidationRequest",
            "MarketQuery",
            "ReputationQuery",
        ]
    
    async def update_agent_status(self, agent_address: str, status: dict) -> bool:
        """Update agent status in Almanac"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.patch(
                f"{self.almanac_url}/agents/{agent_address}/status",
                headers=headers,
                json=status
            )
            
            return response.status_code == 200
        except Exception as e:
            print(f"Error updating status: {e}")
            return False
    
    async def search_agents(self, query: dict) -> list:
        """Search for agents in Almanac"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"{self.almanac_url}/agents/search",
                headers=headers,
                params=query
            )
            
            if response.status_code == 200:
                return response.json().get("agents", [])
            return []
        except Exception as e:
            print(f"Error searching agents: {e}")
            return []


async def register_all_agents():
    """Register all ReputeFlow agents in Almanac"""
    from freelancer_agent import freelancer
    from client_agent import client
    from validator_agent import validator
    from swarm_coordinator import coordinator
    from market_analyzer import analyzer
    from reputation_oracle import oracle
    
    registrar = AlmanacRegistrar()
    
    agents_metadata = [
        {
            "agent": freelancer,
            "metadata": {
                "description": "Autonomous freelancer agent for job discovery and bidding",
                "capabilities": ["job_discovery", "bidding", "project_execution"],
                "category": "freelancer",
                "version": "1.0.0",
                "tags": ["work", "freelance", "jobs"]
            }
        },
        {
            "agent": client,
            "metadata": {
                "description": "Client agent for job posting and freelancer management",
                "capabilities": ["job_posting", "bid_evaluation", "project_management"],
                "category": "client",
                "version": "1.0.0",
                "tags": ["hiring", "projects", "management"]
            }
        },
        {
            "agent": validator,
            "metadata": {
                "description": "Validator agent for work quality assessment",
                "capabilities": ["work_validation", "quality_scoring", "dispute_resolution"],
                "category": "validator",
                "version": "1.0.0",
                "tags": ["validation", "quality", "disputes"]
            }
        },
        {
            "agent": coordinator,
            "metadata": {
                "description": "Swarm coordinator for multi-agent orchestration",
                "capabilities": ["task_assignment", "health_monitoring", "coordination"],
                "category": "coordinator",
                "version": "1.0.0",
                "tags": ["swarm", "orchestration", "coordination"]
            }
        },
        {
            "agent": analyzer,
            "metadata": {
                "description": "Market analyzer for trends and pricing insights",
                "capabilities": ["market_analysis", "pricing", "demand_forecasting"],
                "category": "analyzer",
                "version": "1.0.0",
                "tags": ["market", "analysis", "trends"]
            }
        },
        {
            "agent": oracle,
            "metadata": {
                "description": "Reputation oracle for trust scoring and fraud detection",
                "capabilities": ["reputation_tracking", "fraud_detection", "trust_scoring"],
                "category": "oracle",
                "version": "1.0.0",
                "tags": ["reputation", "trust", "security"]
            }
        },
    ]
    
    print("=" * 70)
    print("🌐 Registering ReputeFlow Agents in Almanac")
    print("=" * 70)
    print()
    
    success_count = 0
    for agent_info in agents_metadata:
        success = await registrar.register_agent(
            agent_info["agent"],
            agent_info["metadata"]
        )
        if success:
            success_count += 1
        print()
    
    print("=" * 70)
    print(f"✅ Registration Complete: {success_count}/{len(agents_metadata)} agents")
    print("=" * 70)
    print()
    print("🔍 Agents are now discoverable in the Fetch.ai Almanac!")
    print("🌐 Visit https://almanac.fetch.ai to view registered agents")
    print()


if __name__ == "__main__":
    import asyncio
    asyncio.run(register_all_agents())
