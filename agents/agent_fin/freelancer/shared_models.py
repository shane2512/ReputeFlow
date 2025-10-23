# shared_models.py
from uagents import Model
from typing import List, Dict, Optional, Any

# ------------------------------
# Job Fetcher → Job Matcher
# ------------------------------
class JobData(Model):
    jobs: List[Dict] = []
    total_jobs: int = 0
    fetched_at: int = 0
    contract_address: str = ""

class JobFetchRequest(Model):
    requester_address: str
    filter_status: str = "all"  # all, created, funded, active

class JobFetchResponse(Model):
    success: bool = True
    jobs: List[Dict] = []
    total_jobs: int = 0
    error: str = ""

# ------------------------------
# Job Matcher → AI Model → Freelancer
# ------------------------------
class MatchedJob(Model):
    job_id: int
    title: Optional[str] = None
    description: Optional[str] = None
    client: Optional[str] = None
    budget: Optional[float] = 0.0
    required_skills: List[str] = []
    matched_skills: List[str] = []
    match_score: float = 0.0

class MatchedJobs(Model):
    freelancer_address: str
    matched_jobs: List[MatchedJob] = []
    total_matches: int = 0

class JobSummary(Model):
    job_id: int
    summary_text: str

class EnhancedJobInfo(Model):
    job_id: int
    description: str
    required_skills: List[str] = []
    matched_skills: List[str] = []
    client: str = ""
    budget: float = 0.0
    recommendation: str = ""
    match_percentage: float = 0.0

class EnhancedJobMatchResult(Model):
    freelancer_address: str
    enhanced_jobs: List[EnhancedJobInfo] = []
    total_matches: int = 0
    ai_summary: str = ""
    timestamp: int = 0

# Legacy support
class EnhancedJobMatchResultLegacy(Model):
    freelancer_address: str
    enhanced_jobs: List[Dict] = []
    total_matches: int = 0
    ai_recommendations: List[str] = []
    summary: str = ""
    timestamp: int = 0
    original_requester: Optional[str] = None

# ------------------------------
# Storage / Freelancer Skills Agent
# ------------------------------
class FindJobsRequest(Model):
    freelancer_address: str

class StoreFreelancerSkills(Model):
    freelancer_address: str
    skills: List[str] = []

class SkillsStored(Model):
    freelancer_address: str
    success: bool = False
    message: str = ""

class FreelancerSkillsRequest(Model):
    requester: str
    freelancer_address: str

class FreelancerSkillsResponse(Model):
    freelancer_address: str
    skills: List[str] = []
    found: bool = False
    hourly_rate: float = 0.0
    experience_years: int = 0
    reputation_score: int = 0
    availability_hours: int = 0

class ListFreelancersRequest(Model):
    requester: str

class ListFreelancersResponse(Model):
    freelancer_addresses: List[str] = []
    total_count: int = 0

# ------------------------------
# Client Agent → AI Model
# ------------------------------
class JobPostRequest(Model):
    """Request to post a job on-chain"""
    client_address: str
    title: str
    description: str
    budget: float
    required_skills: List[str] = []
    milestones: List[Dict] = []  # [{"description": str, "amount": float}]

class JobPosted(Model):
    """Confirmation that job was posted on-chain"""
    client_address: str
    job_id: int
    tx_hash: str
    success: bool
    message: str
    timestamp: int

class JobPostConfirmation(Model):
    """AI-enhanced confirmation message"""
    client_address: str
    job_id: int
    tx_hash: str
    ai_message: str
    next_steps: List[str] = []
    timestamp: int
