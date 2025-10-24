from uagents import Agent, Context
from shared_models import JobData, JobFetchRequest
from web3 import Web3
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()

agent = Agent(
    name="job_fetcher_agent",
    seed="job_fetcher_seed_unique_2025",
    port=8001,
    endpoint=["http://localhost:8001/submit"]
)

WEB3_PROVIDER_URL = os.getenv("WEB3_PROVIDER_URL")
WORK_ESCROW_ADDRESS = os.getenv("WORK_ESCROW")
JOB_MATCHER_ADDRESS = os.getenv("JOB_MATCHER_ADDRESS")

w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL))

# WorkEscrow ABI with skills support
WORK_ESCROW_ABI = [
    {
        "inputs": [],
        "name": "nextProjectId",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "projectId", "type": "uint256"}],
        "name": "projects",
        "outputs": [
            {"internalType": "uint256", "name": "projectId", "type": "uint256"},
            {"internalType": "address", "name": "client", "type": "address"},
            {"internalType": "address", "name": "freelancer", "type": "address"},
            {"internalType": "uint256", "name": "totalBudget", "type": "uint256"},
            {"internalType": "uint256", "name": "paidAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
            {"internalType": "uint256", "name": "completedAt", "type": "uint256"},
            {"internalType": "uint8", "name": "status", "type": "uint8"},
            {"internalType": "bytes32", "name": "yellowChannelId", "type": "bytes32"},
            {"internalType": "uint256", "name": "sourceChain", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "projectId", "type": "uint256"}],
        "name": "getProjectSkills",
        "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
        "stateMutability": "view",
        "type": "function"
    }
]

PROJECT_STATUS = {
    0: "Created",
    1: "Funded",
    2: "Active",
    3: "Disputed",
    4: "Completed",
    5: "Cancelled"
}

def get_contract():
    return w3.eth.contract(
        address=Web3.to_checksum_address(WORK_ESCROW_ADDRESS),
        abi=WORK_ESCROW_ABI
    )

def fetch_jobs_from_contract(ctx: Context):
    contract = get_contract()
    try:
        next_id = contract.functions.nextProjectId().call()
        jobs = []
        for pid in range(1, next_id):
            try:
                project = contract.functions.projects(pid).call()
                status = PROJECT_STATUS.get(project[7], "Unknown")
                
                if status in ["Created", "Funded"]:
                    # Fetch required skills for the project
                    try:
                        required_skills = contract.functions.getProjectSkills(pid).call()
                    except Exception as skill_error:
                        ctx.logger.warning(f"Could not fetch skills for project {pid}: {skill_error}")
                        required_skills = []
                    
                    jobs.append({
                        "project_id": project[0],
                        "client": project[1],
                        "freelancer": project[2],
                        "total_budget": project[3] / 10**18,  # Convert from wei to ETH
                        "status": status,
                        "required_skills": required_skills,
                        "created_at": project[5]
                    })
                    ctx.logger.info(f" Job {pid}: Skills = {required_skills}")
            except Exception as e:
                ctx.logger.warning(f"Error fetching project {pid}: {e}")
                continue
        
        return jobs
    except Exception as e:
        ctx.logger.error(f"Fetch jobs error: {e}")
        return []

@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("🚀 Job Fetcher Agent started")
    ctx.logger.info(f"Address: {agent.address}")

@agent.on_interval(period=60.0)
async def fetch_and_send(ctx: Context):
    """Periodically fetch jobs and send to job matcher"""
    try:
        jobs = fetch_jobs_from_contract(ctx)
        if jobs and JOB_MATCHER_ADDRESS:
            data = JobData(
                jobs=jobs,
                total_jobs=len(jobs),
                fetched_at=int(time.time()),
                contract_address=WORK_ESCROW_ADDRESS
            )
            ctx.logger.info(f"Sending JobData with {len(jobs)} jobs")
            await ctx.send(JOB_MATCHER_ADDRESS, data)
            ctx.logger.info(f"✅ Sent {len(jobs)} jobs to Job Matcher")
    except Exception as e:
        ctx.logger.error(f"❌ Error in fetch_and_send: {e}")
        import traceback
        traceback.print_exc()

@agent.on_message(model=JobFetchRequest)
async def fetch_request_handler(ctx: Context, sender: str, msg: JobFetchRequest):
    """Handle on-demand job fetch requests"""
    ctx.logger.info(f"Received job fetch request from {sender}")
    jobs = fetch_jobs_from_contract(ctx)
    
    try:
        data = JobData(
            jobs=jobs,
            total_jobs=len(jobs),
            fetched_at=int(time.time()),
            contract_address=WORK_ESCROW_ADDRESS
        )
        ctx.logger.info(f"Created JobData: jobs={len(jobs)}, total={data.total_jobs}")
        await ctx.send(sender, data)
        ctx.logger.info(f"✅ Sent {len(jobs)} jobs to {sender}")
    except Exception as e:
        ctx.logger.error(f"❌ Error sending JobData: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    agent.run()