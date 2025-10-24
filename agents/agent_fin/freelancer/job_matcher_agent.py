from uagents import Agent, Context
from shared_models import (
    JobData, JobFetchRequest,
    FreelancerSkillsRequest, FreelancerSkillsResponse,
    MatchedJob, MatchedJobs
)
import os
from dotenv import load_dotenv

load_dotenv()

agent = Agent(
    name="job_matcher_agent",
    seed="job_matcher_seed_unique_2025",
    port=8003,
    endpoint=["http://localhost:8003/submit"]
)

JOB_FETCHER_ADDRESS = os.getenv("JOB_FETCHER_ADDRESS")
STORAGE_AGENT_ADDRESS = os.getenv("STORAGE_AGENT_ADDRESS")

def keyword_match(job_skills, freelancer_skills):
    """
    Match job required skills (milestone descriptions) with freelancer skills
    Uses intelligent partial matching and keyword associations
    """
    matched = []
    
    # Skill associations - map common job descriptions to technologies
    skill_associations = {
        'solidity': ['smart contract', 'blockchain', 'ethereum', 'web3', 'defi', 'dapp'],
        'python': ['backend', 'api', 'script', 'automation', 'data', 'ml', 'ai'],
        'react': ['frontend', 'ui', 'interface', 'web', 'component', 'spa'],
        'javascript': ['frontend', 'web', 'node', 'backend', 'fullstack'],
        'typescript': ['frontend', 'web', 'node', 'backend', 'fullstack'],
        'rust': ['blockchain', 'smart contract', 'solana', 'near', 'performance'],
        'go': ['backend', 'api', 'microservice', 'server'],
        'java': ['backend', 'enterprise', 'api', 'android'],
    }
    
    for freelancer_skill in freelancer_skills:
        freelancer_skill_lower = freelancer_skill.lower().strip()
        
        for job_skill in job_skills:
            job_skill_lower = job_skill.lower().strip()
            
            # Direct substring match
            if freelancer_skill_lower in job_skill_lower:
                if freelancer_skill not in matched:
                    matched.append(freelancer_skill)
                break
            
            # Check skill associations
            if freelancer_skill_lower in skill_associations:
                for keyword in skill_associations[freelancer_skill_lower]:
                    if keyword in job_skill_lower:
                        if freelancer_skill not in matched:
                            matched.append(freelancer_skill)
                        break
                if freelancer_skill in matched:
                    break
    
    return matched

@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("🚀 Job Matcher Agent started")
    ctx.logger.info(f"Address: {agent.address}")

@agent.on_message(model=JobData)
async def handle_jobs_for_matching(ctx: Context, sender: str, msg: JobData):
    """
    When jobs are received, this was meant for periodic matching.
    We'll store them temporarily for on-demand matching.
    """
    ctx.logger.info(f"Received {msg.total_jobs} jobs from Job Fetcher")
    ctx.storage.set("latest_jobs", str(msg.jobs))
    ctx.storage.set("latest_jobs_count", msg.total_jobs)

@agent.on_message(model=FreelancerSkillsResponse)
async def handle_matched_jobs_for_freelancer(ctx: Context, sender: str, msg: FreelancerSkillsResponse):
    """
    This handler receives skills from storage agent and matches jobs
    """
    ctx.logger.info(f"📚 Received skills for {msg.freelancer_address}: {msg.skills}")
    ctx.logger.info(f"Skills count: {len(msg.skills)}")
    
    if not msg.found or not msg.skills:
        ctx.logger.warning(f"No skills found for {msg.freelancer_address}")
        return
    
    # Get latest jobs
    jobs_str = ctx.storage.get("latest_jobs")
    if not jobs_str:
        ctx.logger.warning("No jobs available for matching")
        # Fetch jobs from job fetcher
        await ctx.send(JOB_FETCHER_ADDRESS, JobFetchRequest(
            requester_address=agent.address,
            filter_status="all"
        ))
        return
    
    jobs = eval(jobs_str)  # Convert string back to list
    ctx.logger.info(f"📋 Processing {len(jobs)} jobs for matching")
    
    matched_jobs = []
    for job in jobs:
        # Get required skills from the job (now stored on-chain)
        required_skills = job.get("required_skills", [])
        
        if not required_skills:
            ctx.logger.debug(f"Job {job.get('project_id')} has no required skills, skipping")
            continue
        
        ctx.logger.info(f"🔍 Job {job.get('project_id')} requires: {required_skills}")
        ctx.logger.info(f"👤 Freelancer has: {msg.skills}")
        
        # Match skills (case-insensitive)
        matched = keyword_match(required_skills, msg.skills)
        ctx.logger.info(f"✅ Matched skills: {matched}")
        
        if matched:
            match_score = round(len(matched) / len(required_skills) * 100, 2)
            matched_jobs.append(MatchedJob(
                job_id=job["project_id"],
                job_summary=f"Project #{job['project_id']} - Budget: {job['total_budget']:.4f} ETH",
                required_skills=required_skills,
                matched_skills=matched,
                client=job["client"],
                budget=job["total_budget"]
            ))
            ctx.logger.info(f"🎯 Match score: {match_score}%")
    
    # Always send result to AI Model (even if no matches)
    result = MatchedJobs(
        freelancer_address=msg.freelancer_address,
        matched_jobs=matched_jobs,
        total_matches=len(matched_jobs)
    )
    
    if matched_jobs:
        ctx.logger.info(f"🎯 Found {len(matched_jobs)} matches for {msg.freelancer_address}")
    else:
        ctx.logger.info(f"❌ No matching jobs found for {msg.freelancer_address}")
    
    # Send to AI Model for enhancement (or to notify user of no matches)
    if AI_MODEL_ADDRESS:
        await ctx.send(AI_MODEL_ADDRESS, result)
        ctx.logger.info(f"✅ Sent result ({len(matched_jobs)} matches) to AI Model")
    else:
        ctx.logger.warning("AI_MODEL_ADDRESS not configured")

@agent.on_message(model=MatchedJobs)
async def relay_to_requester(ctx: Context, sender: str, msg: MatchedJobs):
    """
    Relay matched jobs to whoever requested them (usually freelancer agent via AI)
    """
    ctx.logger.info(f"Relaying {msg.total_matches} matches for {msg.freelancer_address}")
    # This will be forwarded to AI Model Agent by the caller

if __name__ == "__main__":
    agent.run()