import os
import time
from dotenv import load_dotenv
from uagents import Agent, Context
from shared_models import (
    MatchedJobs, EnhancedJobMatchResult, EnhancedJobInfo,
    JobPosted, JobPostConfirmation
)

load_dotenv()

agent = Agent(
    name="ai_model_agent",
    seed="ai_model_seed_unique_2025",
    port=8004,
    endpoint=["http://localhost:8004/submit"]
)

@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("🚀 AI Model Agent started")
    ctx.logger.info(f"Address: {agent.address}")

@agent.on_message(model=MatchedJobs)
async def handle_matched_jobs(ctx: Context, sender: str, msg: MatchedJobs):
    """
    Receives MatchedJobs from Job Matcher,
    enhances them with AI-style recommendations,
    and sends back to the freelancer agent
    """
    ctx.logger.info(f"📊 Processing {msg.total_matches} matched jobs for {msg.freelancer_address}")
    
    enhanced_jobs = []
    
    for job in msg.matched_jobs:
        # Calculate match percentage
        match_count = len(job.matched_skills)
        total_required = len(job.required_skills)
        match_percentage = (match_count / total_required * 100) if total_required > 0 else 0
        
        # Generate AI recommendation
        if match_percentage >= 80:
            recommendation = "🔥 Excellent match! You have most required skills. Apply with confidence."
        elif match_percentage >= 60:
            recommendation = "✅ Good match! Highlight your matching skills in your proposal."
        elif match_percentage >= 40:
            recommendation = "⚠️ Moderate match. Consider acquiring missing skills or emphasize transferable experience."
        else:
            recommendation = "💡 Low match. This might be a stretch, but consider if you can quickly learn the missing skills."
        
        # Create detailed description
        description = (
            f"Client: {job.client[:10]}...{job.client[-8:]}\n"
            f"Budget: ${job.budget:.2f}\n"
            f"Match Rate: {match_percentage:.1f}%\n"
            f"Your matching skills: {', '.join(job.matched_skills)}\n"
            f"Required skills: {', '.join(job.required_skills)}"
        )
        
        enhanced_jobs.append(EnhancedJobInfo(
            job_id=job.job_id,
            description=description,
            required_skills=job.required_skills,
            matched_skills=job.matched_skills,
            client=job.client,
            budget=job.budget,
            recommendation=recommendation,
            match_percentage=match_percentage
        ))
    
    # Generate overall AI summary
    if enhanced_jobs:
        avg_match = sum(j.match_percentage for j in enhanced_jobs) / len(enhanced_jobs)
        best_match = max(enhanced_jobs, key=lambda x: x.match_percentage)
        
        ai_summary = (
            f"🤖 AI Analysis Complete:\n"
            f"Found {len(enhanced_jobs)} matching opportunities.\n"
            f"Average match rate: {avg_match:.1f}%\n"
            f"Best opportunity: Job ID {best_match.job_id} ({best_match.match_percentage:.1f}% match)\n"
            f"Recommendation: Focus on jobs with 60%+ match rate for best success probability."
        )
    else:
        ai_summary = "No matching jobs found. Consider broadening your skills or checking back later."
    
    # Create enhanced result
    enhanced_result = EnhancedJobMatchResult(
        freelancer_address=msg.freelancer_address,
        enhanced_jobs=enhanced_jobs,
        total_matches=len(enhanced_jobs),
        ai_summary=ai_summary,
        timestamp=int(time.time())
    )
    
    # Send to freelancer agent (get from environment)
    freelancer_agent_addr = os.getenv("FREELANCER_AGENT_ADDRESS")
    
    if freelancer_agent_addr:
        try:
            await ctx.send(freelancer_agent_addr, enhanced_result)
            ctx.logger.info(f"✅ Sent enhanced job analysis to Freelancer Agent: {freelancer_agent_addr}")
        except Exception as e:
            ctx.logger.error(f"❌ Failed to send enhanced results: {e}")
    else:
        ctx.logger.error("❌ FREELANCER_AGENT_ADDRESS not configured")

@agent.on_message(model=JobPosted)
async def handle_job_posted(ctx: Context, sender: str, msg: JobPosted):
    """
    Receives JobPosted confirmation from Client Agent,
    enhances it with AI message and next steps,
    sends back to Client Agent
    """
    ctx.logger.info(f"📝 Processing job posting confirmation for Job ID {msg.job_id}")
    
    if msg.success:
        # Generate AI-enhanced confirmation message
        ai_message = f"""
🎉 Congratulations! Your job has been successfully posted on-chain!

📊 Job Details:
   • Job ID: #{msg.job_id}
   • Transaction: {msg.tx_hash[:10]}...{msg.tx_hash[-8:]}
   • Network: Base Sepolia
   • Status: ✅ Confirmed on blockchain

🔗 View Transaction:
   https://sepolia.basescan.org/tx/{msg.tx_hash}

Your job is now visible to all freelancers in the ReputeFlow network.
The AI-powered matching system will automatically connect you with qualified candidates.
"""
        
        next_steps = [
            "Monitor incoming proposals from freelancers",
            "Review freelancer profiles and reputation scores",
            "Use the AI recommendations to select the best candidate",
            "Fund the escrow contract to activate the project",
            "Track milestone progress through the dashboard"
        ]
        
        ctx.logger.info("✅ Generated AI-enhanced confirmation")
    else:
        # Generate error message
        ai_message = f"""
❌ Job Posting Failed

Error: {msg.message}

Please check:
   • Your wallet has sufficient Base Sepolia ETH
   • The WorkEscrow contract is correctly configured
   • Your transaction parameters are valid

Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
"""
        
        next_steps = [
            "Check your wallet balance",
            "Verify contract addresses in .env",
            "Try posting the job again",
            "Contact support if the issue persists"
        ]
        
        ctx.logger.warning("⚠️  Generated error response")
    
    # Create enhanced confirmation
    confirmation = JobPostConfirmation(
        client_address=msg.client_address,
        job_id=msg.job_id,
        tx_hash=msg.tx_hash,
        ai_message=ai_message,
        next_steps=next_steps,
        timestamp=int(time.time())
    )
    
    # Send back to client agent
    try:
        await ctx.send(sender, confirmation)
        ctx.logger.info(f"✅ Sent AI-enhanced confirmation to Client Agent")
    except Exception as e:
        ctx.logger.error(f"❌ Failed to send confirmation: {e}")

if __name__ == "__main__":
    agent.run()