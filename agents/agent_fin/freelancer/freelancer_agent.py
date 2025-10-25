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
    JobFetchRequest, JobData,
    GenerateProposalRequest, ProposalGenerated,
    StoreProposal, ProposalStored
)
from datetime import datetime
from uuid import uuid4
import os
import time
import json
import sys
import re
from dotenv import load_dotenv
from web3 import Web3

# Try to import NLP service (optional - will fallback if not available)
try:
    # Add parent directory to path for nlp_service import
    if '__file__' in globals():
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from nlp_service import convert_to_command_freelancer
    NLP_AVAILABLE = True
except Exception as e:
    print(f"NLP service not available: {e}")
    NLP_AVAILABLE = False
    def convert_to_command_freelancer(text):
        return text  # Fallback: return original text

load_dotenv()

agent = Agent(
    name="freelancer_agent",
    seed="freelancer_agent_seed_unique_2025",
    port=8000,
    endpoint=["http://localhost:8000/submit"]
)

STORAGE_AGENT_ADDRESS = os.getenv("STORAGE_AGENT_ADDRESS")
JOB_MATCHER_ADDRESS = os.getenv("JOB_MATCHER_ADDRESS")
AI_MODEL_ADDRESS = os.getenv("AI_MODEL_AGENT_ADDRESS")  # Fixed: was AI_MODEL_ADDRESS
JOB_FETCHER_ADDRESS = os.getenv("JOB_FETCHER_ADDRESS")
WEB3_PROVIDER_URL = os.getenv("WEB3_PROVIDER_URL", "https://sepolia.base.org")
WORK_ESCROW_ADDRESS = os.getenv("WORK_ESCROW")
FREELANCER_PRIVATE_KEY = os.getenv("FREELANCER_PRIVATE_KEY")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL))

# Use freelancer's private key if provided, otherwise use agent address
if FREELANCER_PRIVATE_KEY:
    freelancer_account = w3.eth.account.from_key(FREELANCER_PRIVATE_KEY)
    FREELANCER_WALLET = freelancer_account.address
else:
    # Use agent's address as the freelancer identifier
    FREELANCER_WALLET = None  # Will be set to agent.address after agent initialization

# Chat protocol for ASI:One compatibility
chat_protocol = Protocol(name="FreelancerChatProtocol", spec=chat_protocol_spec)

def parse_natural_skills_registration(text: str):
    """
    Parse natural language skills registration without API
    Handles formats like: "register my skills python solidity rust"
    Returns: list of skills or None if can't parse
    """
    text_lower = text.lower()
    
    # Check if it's a skills registration intent
    if not any(word in text_lower for word in ['register', 'skill', 'my skill']):
        return None
    
    skills = []
    
    # Try format with colon: "register skills: python, solidity"
    if ':' in text:
        skills_part = text.split(':', 1)[1].strip()
        skills = [s.strip() for s in re.split(r'[,\s]+', skills_part) if s.strip()]
    else:
        # Try natural format: "register my skills python solidity rust"
        # Remove common words
        words_to_remove = [
            'register', 'my', 'skills', 'skill', 'are', 'is', 'in', 'with', 
            'i', 'know', 'can', 'do', 'want', 'to', 'the', 'a', 'an', 'and', 'or'
        ]
        words = text.lower().split()
        skills = [w.strip() for w in words if w.strip() and w.strip() not in words_to_remove and len(w) > 1]
    
    # Filter out empty strings and return
    skills = [s for s in skills if s and len(s) > 1]
    
    return skills if len(skills) > 0 else None

@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("🚀 Freelancer Agent started")
    ctx.logger.info(f"Address: {agent.address}")
    ctx.logger.info("=" * 50)
    ctx.logger.info("ASI:One Chat Protocol Enabled")
    ctx.logger.info("Available Commands:")
    ctx.logger.info("1. 'register skills: python, solidity, react' - Register your skills")
    ctx.logger.info("2. 'find jobs' - Find matching jobs")
    ctx.logger.info("3. 'apply job: <job_id>' - Apply for a job")
    ctx.logger.info(f"Wallet: {FREELANCER_WALLET}")
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
    
    # Extract wallet address if embedded in message
    wallet_address = None
    if text.startswith('[WALLET:'):
        # Extract wallet address from [WALLET:0x...] prefix
        end_bracket = text.find(']')
        if end_bracket > 0:
            wallet_address = text[8:end_bracket]  # Skip '[WALLET:'
            text = text[end_bracket + 1:].strip()  # Remove prefix from text
            ctx.logger.info(f"👛 Extracted wallet address: {wallet_address}")
            ctx.storage.set("current_wallet_address", wallet_address)
    
    ctx.logger.info(f"💬 Received chat message: {text}")
    
    # Convert natural language to command using NLP
    original_text = text
    text = convert_to_command_freelancer(text)
    
    if text != original_text:
        ctx.logger.info(f"🤖 NLP converted: '{original_text}' → '{text}'")
    
    response_text = ""
    
    # Parse commands
    text_lower = text.lower().strip()
    
    if "register" in text_lower and "skill" in text_lower:
        # Try natural language parsing first
        skills = parse_natural_skills_registration(text)
        
        if skills:
            ctx.logger.info(f"✅ Parsed skills: {skills}")
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
            response_text = "❌ Please provide skills. Try: 'register skills: python, solidity' or 'register my skills python solidity'"
    
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
        # Don't send response now - wait for AI-enhanced results
        response_text = None
    
    elif "apply" in text_lower and "job" in text_lower:
        # Apply for a job
        # Format: "apply job: 1" or "apply for job 1"
        try:
            # Extract job ID
            if ":" in text:
                job_id_str = text.split(":", 1)[1].strip()
            else:
                # Try to find number in text
                import re
                numbers = re.findall(r'\d+', text)
                job_id_str = numbers[0] if numbers else None
            
            if job_id_str:
                job_id = int(job_id_str)
                
                # Get wallet address from storage
                wallet_addr = ctx.storage.get("current_wallet_address")
                
                # Store application context
                ctx.storage.set("applying_job_id", job_id)
                ctx.storage.set("applying_freelancer", sender)
                ctx.storage.set("applying_wallet", wallet_addr)
                
                ctx.logger.info(f"📝 Applying for Job {job_id} from {sender}")
                ctx.logger.info(f"👛 Using wallet: {wallet_addr}")
                
                # First, get freelancer skills
                await ctx.send(STORAGE_AGENT_ADDRESS, FreelancerSkillsRequest(
                    freelancer_address=sender,
                    requester=str(ctx.agent.address)
                ))
                
                # Don't send response now - wait for AI-generated proposal
                response_text = None
            else:
                response_text = "❌ Please provide a job ID. Format: 'apply job: 1'"
        except Exception as e:
            ctx.logger.error(f"Error parsing apply command: {e}")
            response_text = "❌ Invalid format. Use: 'apply job: 1'"
    
    elif "submit" in text_lower and "deliverable" in text_lower:
        # Submit deliverable for a job
        # Format: "submit deliverable: 1 https://ipfs.io/ipfs/Qm... Great work completed!"
        try:
            if ":" in text:
                parts = text.split(":", 1)[1].strip().split(maxsplit=2)
                if len(parts) >= 2:
                    job_id = int(parts[0])
                    deliverable_url = parts[1]
                    description = parts[2] if len(parts) > 2 else "Deliverable submitted"
                    
                    # Store deliverable info
                    deliverable_data = {
                        "job_id": job_id,
                        "freelancer": FREELANCER_WALLET or agent.address,
                        "url": deliverable_url,
                        "description": description,
                        "timestamp": int(time.time()),
                        "status": "submitted"
                    }
                    ctx.storage.set(f"deliverable_{job_id}", json.dumps(deliverable_data))
                    
                    ctx.logger.info(f"📦 Deliverable submitted for Job #{job_id}")
                    ctx.logger.info(f"   URL: {deliverable_url}")
                    
                    response_text = f"""✅ Deliverable Submitted!

Job #{job_id}
📦 Deliverable: {deliverable_url[:50]}...
📝 Description: {description}

⏳ Waiting for client approval to release payment.
"""
                else:
                    response_text = "❌ Please provide job ID and deliverable URL.\n\nFormat: 'submit deliverable: 1 https://ipfs.io/... Description'"
            else:
                response_text = "❌ Invalid format.\n\nUse: 'submit deliverable: <job_id> <url> <description>'"
        except Exception as e:
            ctx.logger.error(f"Error submitting deliverable: {e}")
            response_text = f"❌ Error: {str(e)}\n\nFormat: 'submit deliverable: 1 https://ipfs.io/... Description'"
    
    elif "help" in text_lower:
        response_text = (
            "👋 Welcome to ReputeFlow Freelancer Agent!\n\n"
            "Available commands:\n"
            "1️⃣ Register skills:\n"
            "   • 'register skills: python, solidity, react'\n"
            "   • 'register my skills python solidity rust'\n"
            "2️⃣ Find jobs: 'find jobs'\n"
            "3️⃣ Apply for job: 'apply job: 1'\n"
            "4️⃣ Submit deliverable: 'submit deliverable: 1 https://ipfs.io/... Description'\n"
            "5️⃣ Help: 'help'\n\n"
            "I help you find Web3 freelance opportunities matching your skills!"
        )
    
    else:
        response_text = (
            "🤔 I didn't understand that command.\n\n"
            "Try:\n"
            "• 'register skills: python, solidity' or 'register my skills python solidity'\n"
            "• 'find jobs' - to search for matching jobs\n"
            "• 'help' - for more information"
        )
    
    # Send response back (only if we have a response)
    if response_text is not None:
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
    
    # Store jobs for later use (e.g., when applying)
    ctx.storage.set("latest_jobs", json.dumps(msg.jobs))
    ctx.logger.info(f"💾 Stored {len(msg.jobs)} jobs in cache")
    
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
async def handle_skills_response(ctx: Context, sender: str, msg: FreelancerSkillsResponse):
    """Handle skills response - either for job search or job application"""
    ctx.logger.info(f"📚 Received skills from {sender}: {msg.skills}")
    
    # Check if this is for job application
    applying_job_id = ctx.storage.get("applying_job_id")
    if applying_job_id:
        ctx.logger.info(f"📝 Skills received for job application (Job {applying_job_id})")
        await handle_skills_for_application(ctx, sender, msg)
        return
    
    # Otherwise, this is for job search
    if ctx.storage.get("job_search_initiated") != "true":
        ctx.logger.warning("⚠️ Job search not initiated, ignoring skills response")
        return
    
    ctx.logger.info(f"✅ Step 4: Processing skills for job matching")
    
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

# Helper function for when applying for a job
async def handle_skills_for_application(ctx: Context, sender: str, msg: FreelancerSkillsResponse):
    """Handle skills response when applying for a job"""
    applying_job_id = ctx.storage.get("applying_job_id")
    
    if not applying_job_id:
        ctx.logger.warning("No applying_job_id found")
        return
    
    # This is for job application
    job_id = int(applying_job_id)
    freelancer = ctx.storage.get("applying_freelancer")
    
    ctx.logger.info(f"📝 Generating proposal for Job {job_id}")
    
    if not msg.found or not msg.skills:
        await ctx.send(freelancer, ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text="❌ No skills found! Please register your skills first."),
            ]
        ))
        ctx.storage.remove("applying_job_id")
        ctx.storage.remove("applying_freelancer")
        return
    
    # Get job details from storage
    jobs_json = ctx.storage.get("latest_jobs")
    wallet_addr = ctx.storage.get("applying_wallet")
    
    if jobs_json:
        jobs = json.loads(jobs_json)
        job_details = next((j for j in jobs if j.get("project_id") == job_id), None)
        
        if job_details:
            # Request AI to generate proposal
            ctx.logger.info(f"📝 Using wallet address for proposal: {wallet_addr}")
            await ctx.send(AI_MODEL_ADDRESS, GenerateProposalRequest(
                freelancer_address=wallet_addr,
                job_id=job_id,
                job_details=job_details,
                freelancer_skills=msg.skills
            ))
            ctx.logger.info(f"✅ Sent proposal generation request to AI Model")
        else:
            await ctx.send(freelancer, ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid4(),
                content=[
                    TextContent(type="text", text=f"❌ Job #{job_id} not found. Please search for jobs first."),
                ]
            ))
            ctx.storage.remove("applying_job_id")
            ctx.storage.remove("applying_freelancer")
    else:
        await ctx.send(freelancer, ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text="❌ No jobs available. Please search for jobs first using 'find jobs'."),
            ]
        ))
        ctx.storage.remove("applying_job_id")
        ctx.storage.remove("applying_freelancer")

@agent.on_message(model=ProposalGenerated)
async def handle_proposal_generated(ctx: Context, sender: str, msg: ProposalGenerated):
    """Handle generated proposal from AI Model"""
    ctx.logger.info(f"✅ Received generated proposal for Job {msg.job_id}")
    
    freelancer = ctx.storage.get("applying_freelancer")
    
    if msg.success:
        # Store the proposal
        await ctx.send(STORAGE_AGENT_ADDRESS, StoreProposal(
            job_id=msg.job_id,
            freelancer_address=msg.freelancer_address,
            proposal_text=msg.proposal_text,
            estimated_hours=msg.estimated_hours,
            timestamp=int(time.time())
        ))
        
        # Notify freelancer
        await ctx.send(freelancer, ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text=f"✅ Proposal submitted for Job #{msg.job_id}!\n\n{msg.proposal_text}\n\nEstimated Hours: {msg.estimated_hours}"),
            ]
        ))
    else:
        await ctx.send(freelancer, ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text=f"❌ Failed to generate proposal for Job #{msg.job_id}"),
            ]
        ))
    
    # Clean up
    ctx.storage.remove("applying_job_id")
    ctx.storage.remove("applying_freelancer")
    ctx.storage.remove("applying_wallet")

@agent.on_message(model=ProposalStored)
async def handle_proposal_stored(ctx: Context, sender: str, msg: ProposalStored):
    """Confirmation that proposal was stored"""
    ctx.logger.info(f"✅ Proposal stored: {msg.message}")

# Attach chat protocol to agent
agent.include(chat_protocol, publish_manifest=True)

if __name__ == "__main__":
    agent.run()