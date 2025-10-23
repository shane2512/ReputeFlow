from uagents import Agent, Context
from shared_models import (
    StoreFreelancerSkills, SkillsStored,
    FreelancerSkillsRequest, FreelancerSkillsResponse,
    ListFreelancersRequest, ListFreelancersResponse
)
import json
import os
from dotenv import load_dotenv

load_dotenv()

agent = Agent(
    name="storage_agent",
    seed="storage_agent_seed_unique_2025",
    port=8002,
    endpoint=["http://localhost:8002/submit"]
)

def get_all_freelancer_addresses(ctx: Context):
    """Get list of all registered freelancers"""
    freelancers_list_json = ctx.storage.get("freelancers_list")
    if freelancers_list_json:
        return json.loads(freelancers_list_json)
    return []

def get_freelancer_skills(ctx: Context, address: str):
    """Get skills for a specific freelancer"""
    skills_json = ctx.storage.get(address)
    if skills_json:
        return json.loads(skills_json)
    return []

def store_freelancer_skills(ctx: Context, address: str, skills: list):
    """Store skills for a freelancer"""
    ctx.storage.set(address, json.dumps(skills))
    
    freelancers = get_all_freelancer_addresses(ctx)
    if address not in freelancers:
        freelancers.append(address)
        ctx.storage.set("freelancers_list", json.dumps(freelancers))
        ctx.storage.set("freelancer_count", len(freelancers))
    
    return True

@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("🚀 Storage Agent Started")
    ctx.logger.info(f"Address: {agent.address}")
    
    if not ctx.storage.get("freelancers_list"):
        ctx.storage.set("freelancers_list", json.dumps([]))
        ctx.storage.set("freelancer_count", 0)
        ctx.logger.info("Initialized empty freelancer storage")

@agent.on_message(model=StoreFreelancerSkills)
async def store_skills_handler(ctx: Context, sender: str, msg: StoreFreelancerSkills):
    """Handle requests to store freelancer skills"""
    ctx.logger.info(f"Storing skills for {msg.freelancer_address}: {msg.skills}")
    
    success = store_freelancer_skills(ctx, msg.freelancer_address, msg.skills)
    
    response = SkillsStored(
        freelancer_address=msg.freelancer_address,
        success=success,
        message=f"Stored {len(msg.skills)} skills successfully"
    )
    
    # Send response back to the sender (freelancer agent) only
    # The freelancer agent will handle sending chat messages to the user
    await ctx.send(sender, response)
    ctx.logger.info(f"✅ Skills stored for {msg.freelancer_address}, response sent to {sender}")

@agent.on_message(model=FreelancerSkillsRequest)
async def skills_request_handler(ctx: Context, sender: str, msg: FreelancerSkillsRequest):
    """Handle requests to retrieve freelancer skills"""
    ctx.logger.info(f"Retrieving skills for {msg.freelancer_address} requested by {sender}")
    
    skills = get_freelancer_skills(ctx, msg.freelancer_address)
    
    response = FreelancerSkillsResponse(
        freelancer_address=msg.freelancer_address,
        skills=skills,
        found=len(skills) > 0
    )
    
    await ctx.send(sender, response)
    ctx.logger.info(f"✅ Sent {len(skills)} skills to {sender}")

@agent.on_message(model=ListFreelancersRequest)
async def list_request_handler(ctx: Context, sender: str, msg: ListFreelancersRequest):
    """Handle requests to list all freelancers"""
    ctx.logger.info(f"Listing all freelancers requested by {sender}")
    
    freelancers = get_all_freelancer_addresses(ctx)
    
    response = ListFreelancersResponse(
        freelancer_addresses=freelancers,
        total_count=len(freelancers)
    )
    
    await ctx.send(sender, response)
    ctx.logger.info(f"✅ Sent {len(freelancers)} freelancer addresses to {sender}")

if __name__ == "__main__":
    agent.run()