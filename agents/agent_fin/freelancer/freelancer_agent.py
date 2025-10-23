from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)
from shared_models import (
    StoreFreelancerSkills, SkillsStored,
    FindJobsRequest, FreelancerSkillsRequest, FreelancerSkillsResponse,
    MatchedJobs, EnhancedJobMatchResult,
    JobFetchRequest, JobData
)
from datetime import datetime
from uuid import uuid4
import os
from dotenv import load_dotenv

load_dotenv()

agent = Agent(
    name="freelancer_agent",
    seed="freelancer_agent_seed_unique_2025",
    port=8000,
    endpoint=["http://localhost:8000/submit"]
)

STORAGE_AGENT_ADDRESS = os.getenv("STORAGE_AGENT_ADDRESS")
JOB_MATCHER_ADDRESS = os.getenv("JOB_MATCHER_ADDRESS")
AI_MODEL_ADDRESS = os.getenv("AI_MODEL_ADDRESS")
JOB_FETCHER_ADDRESS = os.getenv("JOB_FETCHER_ADDRESS")

# Chat protocol for ASI:One compatibility
chat_protocol = Protocol(name="FreelancerChatProtocol", spec=chat_protocol_spec)

@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("🚀 Freelancer Agent started")
    ctx.logger.info(f"Address: {agent.address}")
    ctx.logger.info("=" * 50)
    ctx.logger.info("ASI:One Chat Protocol Enabled")
    ctx.logger.info("Available Commands:")
    ctx.logger.info("1. 'register skills: python, solidity, react' - Register your skills")
    ctx.logger.info("2. 'find jobs' - Find matching jobs")
    ctx.logger.info("=" * 50)

# ========== ASI:One Chat Protocol Handler ==========
@chat_protocol.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    """
    Handle incoming chat messages from ASI:One
    """
    # Send acknowledgement
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id),
    )
    
    # Collect text from message
    text = ''
    for item in msg.content:
        if isinstance(item, TextContent):
            text += item.text
    
    ctx.logger.info(f"💬 Received chat message: {text}")
    
    response_text = ""
    
    # Parse commands
    text_lower = text.lower().strip()
    
    if "register" in text_lower and "skill" in text_lower:
        # Extract skills from message
        # Format: "register skills: python, solidity, react"
        if ":" in text:
            skills_part = text.split(":", 1)[1].strip()
            skills = [s.strip() for s in skills_part.split(",") if s.strip()]
            
            if skills:
                # Store freelancer address and initiate registration
                ctx.storage.set("pending_registration", sender)
                ctx.storage.set("pending_skills", str(skills))
                
                # Send to storage agent
                await ctx.send(STORAGE_AGENT_ADDRESS, StoreFreelancerSkills(
                    freelancer_address=sender,
                    skills=skills
                ))
                
                response_text = f"✅ Registering your skills: {', '.join(skills)}\nI'll notify you once registration is complete."
            else:
                response_text = "❌ Please provide skills in format: 'register skills: python, solidity, react'"
        else:
            response_text = "❌ Please provide skills in format: 'register skills: python, solidity, react'"
    
    elif "find" in text_lower and "job" in text_lower:
        # Initiate job search
        ctx.storage.set("job_search_requester", sender)
        ctx.storage.set("current_freelancer", sender)
        ctx.storage.set("job_search_initiated", "true")
        
        # Request jobs from job fetcher
        await ctx.send(JOB_FETCHER_ADDRESS, JobFetchRequest(
            requester_address=str(ctx.agent.address),
            filter_status="all"
        ))
        
        ctx.logger.info(f"🔍 Job search initiated for {sender}")
        response_text = "🔍 Searching for matching jobs...\nI'll send you the results shortly!"
    
    elif "help" in text_lower:
        response_text = (
            "👋 Welcome to ReputeFlow Freelancer Agent!\n\n"
            "Available commands:\n"
            "1️⃣ Register skills: 'register skills: python, solidity, react'\n"
            "2️⃣ Find jobs: 'find jobs'\n"
            "3️⃣ Help: 'help'\n\n"
            "I help you find Web3 freelance opportunities matching your skills!"
        )
    
    else:
        response_text = (
            "🤔 I didn't understand that command.\n\n"
            "Try:\n"
            "• 'register skills: python, solidity, react' - to register your skills\n"
            "• 'find jobs' - to search for matching jobs\n"
            "• 'help' - for more information"
        )
    
    # Send response back
    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(),
        msg_id=uuid4(),
        content=[
            TextContent(type="text", text=response_text),
        ]
    ))

@chat_protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    """Handle chat acknowledgements"""
    pass

# ========== Internal Agent Message Handlers (not part of chat protocol) ==========
@agent.on_message(model=SkillsStored)
async def handle_registration_response(ctx: Context, sender: str, msg: SkillsStored):
    """Response from storage agent after registration - notify user via chat"""
    requester = ctx.storage.get("pending_registration")
    
    if msg.success:
        ctx.logger.info(f"✅ Profile registered successfully!")
        response_text = f"🎉 Success! Your profile has been registered with skills: {ctx.storage.get('pending_skills')}\n\nYou can now use 'find jobs' to discover matching opportunities!"
    else:
        ctx.logger.error(f"❌ Profile registration failed: {msg.message}")
        response_text = f"❌ Registration failed: {msg.message}\n\nPlease try again."
    
    # Send response back to user via chat
    if requester:
        await ctx.send(requester, ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text=response_text),
            ]
        ))
        ctx.storage.remove("pending_registration")
        ctx.storage.remove("pending_skills")

@agent.on_message(model=JobData)
async def handle_jobs_received(ctx: Context, sender: str, msg: JobData):
    """Step 2: Received jobs from job fetcher - forward to job matcher"""
    ctx.logger.info(f"📦 Received {msg.total_jobs} jobs from {sender}")
    
    if ctx.storage.get("job_search_initiated") != "true":
        ctx.logger.warning("⚠️ Job search not initiated, ignoring jobs")
        return
    
    ctx.logger.info(f"✅ Step 2: Forwarding {msg.total_jobs} jobs to Job Matcher")
    
    # Forward jobs to Job Matcher so it can store them
    await ctx.send(JOB_MATCHER_ADDRESS, msg)
    
    # Step 3: Get freelancer skills from storage
    freelancer_addr = ctx.storage.get("current_freelancer")
    if not freelancer_addr:
        ctx.logger.error("No current freelancer found")
        return
    
    ctx.logger.info(f"Step 3: Requesting skills for {freelancer_addr}...")
    await ctx.send(STORAGE_AGENT_ADDRESS, FreelancerSkillsRequest(
        freelancer_address=freelancer_addr,
        requester=agent.address
    ))

@agent.on_message(model=FreelancerSkillsResponse)
async def handle_skills_and_match(ctx: Context, sender: str, msg: FreelancerSkillsResponse):
    """Step 4: Received skills, now perform matching"""
    ctx.logger.info(f"📚 Received skills from {sender}: {msg.skills}")
    
    if ctx.storage.get("job_search_initiated") != "true":
        ctx.logger.warning("⚠️ Job search not initiated, ignoring skills response")
        return
    
    ctx.logger.info(f"✅ Step 4: Processing skills for matching")
    
    if not msg.found or not msg.skills:
        ctx.logger.warning("❌ No skills found. Please register your profile first!")
        
        # Notify user via chat
        requester = ctx.storage.get("job_search_requester")
        if requester:
            await ctx.send(requester, ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid4(),
                content=[
                    TextContent(type="text", text="❌ No skills found in your profile!\n\nPlease register your skills first using:\n'register skills: python, solidity, react'"),
                    EndSessionContent(type="end-session"),
                ]
            ))
        
        ctx.storage.remove("job_search_initiated")
        ctx.storage.remove("job_search_requester")
        ctx.storage.remove("current_freelancer")
        return
    
    # Step 5: Send skills response to Job Matcher for matching
    ctx.logger.info(f"✅ Step 5: Forwarding skills to Job Matcher for matching")
    
    # The Job Matcher already has the jobs (from Job Fetcher)
    # Now send the skills response so it can perform matching
    await ctx.send(JOB_MATCHER_ADDRESS, msg)
    ctx.logger.info(f"📤 Sent skills to Job Matcher: {JOB_MATCHER_ADDRESS}")
    
    # Don't remove job_search_initiated yet - wait for AI Model response
    # ctx.storage.remove("job_search_initiated")

@agent.on_message(model=EnhancedJobMatchResult)
async def handle_enhanced_results(ctx: Context, sender: str, msg: EnhancedJobMatchResult):
    """Receive AI-enhanced job matches and send to user via chat"""
    requester = ctx.storage.get("job_search_requester")
    
    ctx.logger.info(f"🤖 Received {msg.total_matches} AI-enhanced job matches")
    
    if msg.total_matches == 0:
        response_text = "😔 No matching jobs found at the moment.\n\nTry:\n• Updating your skills\n• Checking back later for new opportunities"
    else:
        response_text = f"🎯 Found {msg.total_matches} matching jobs!\n\n"
        response_text += f"{msg.ai_summary}\n\n"
        response_text += "📋 Job Details:\n\n"
        
        for idx, job in enumerate(msg.enhanced_jobs[:3], 1):  # Show top 3
            response_text += f"{idx}. Job #{job.job_id}\n"
            response_text += f"   {job.description}\n"
            response_text += f"   {job.recommendation}\n\n"
        
        if msg.total_matches > 3:
            response_text += f"... and {msg.total_matches - 3} more jobs!\n\n"
        
        response_text += "💡 Tip: Apply to jobs with 60%+ match rate for best results!"
    
    # Send results back to user via chat
    if requester:
        await ctx.send(requester, ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text=response_text),
                EndSessionContent(type="end-session"),
            ]
        ))
        ctx.storage.remove("job_search_requester")
        ctx.storage.remove("current_freelancer")
        ctx.storage.remove("current_jobs")

# Attach chat protocol to agent
agent.include(chat_protocol, publish_manifest=True)

if __name__ == "__main__":
    agent.run()