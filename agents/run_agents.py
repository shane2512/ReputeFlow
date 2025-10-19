"""
Main Agent Runner
Starts all ReputeFlow agents in a coordinated manner
"""

from uagents import Bureau
from freelancer_agent import freelancer
from client_agent import client
from validator_agent import validator
from swarm_coordinator import coordinator
from market_analyzer import analyzer
from reputation_oracle import oracle
import asyncio

def main():
    """Run all agents in a bureau"""
    print("=" * 70)
    print("🤖 ReputeFlow Agent System - ASI Alliance Integration")
    print("=" * 70)
    print()
    print("Starting 6 autonomous agents...")
    print()
    print(f"  1. 👨‍💼 FreelancerAgent:      {freelancer.address}")
    print(f"  2. 👔 ClientAgent:          {client.address}")
    print(f"  3. ✅ ValidatorAgent:       {validator.address}")
    print(f"  4. 🎯 SwarmCoordinator:     {coordinator.address}")
    print(f"  5. 📊 MarketAnalyzer:       {analyzer.address}")
    print(f"  6. 🔮 ReputationOracle:     {oracle.address}")
    print()
    print("=" * 70)
    print("✅ All agents running! Press Ctrl+C to stop.")
    print("=" * 70)
    print()
    print("📡 Agent Communication:")
    print("  - Agents can discover each other via Almanac")
    print("  - Messages routed through uAgents protocol")
    print("  - Blockchain integration active")
    print()
    print("🎯 ASI Alliance Prize Track: READY FOR SUBMISSION!")
    print("=" * 70)
    
    # Create bureau to run all agents
    bureau = Bureau(
        port=8000,
        endpoint="http://localhost:8000/submit"
    )
    
    # Add all agents to bureau
    bureau.add(freelancer)
    bureau.add(client)
    bureau.add(validator)
    bureau.add(coordinator)
    bureau.add(analyzer)
    bureau.add(oracle)
    
    # Run bureau
    bureau.run()

if __name__ == "__main__":
    main()
