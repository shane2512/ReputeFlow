from uagents import Model
from typing import List, Dict, Optional

# ------------------------------
# Job Fetcher → Job Matcher
# ------------------------------
class JobData(Model):
    jobs: List[Dict]
    total_jobs: int
    fetched_at: int
    contract_address: str

class JobFetchRequest(Model):
    requester_address: str
    filter_status: str = "all"

# ------------------------------
# Freelancer Registration
# ------------------------------
class RegisterProfileRequest(Model):
    freelancer_address: str
    skills: List[str]

class ProfileRegisteredResponse(Model):
    success: bool
    message: str
    freelancer_address: str

# ------------------------------
# Find Jobs Request
# ------------------------------
class FindJobsRequest(Model):
    freelancer_address: str

# ------------------------------
# Job Matcher Models
# ------------------------------
class MatchedJob(Model):
    job_id: int
    job_summary: str
    required_skills: List[str]
    matched_skills: List[str]
    client: str
    budget: float

class MatchedJobs(Model):
    freelancer_address: str
    matched_jobs: List[MatchedJob]
    total_matches: int

# ------------------------------
# AI Model Enhanced Response
# ------------------------------
class EnhancedJobInfo(Model):
    job_id: int
    description: str
    required_skills: List[str]
    matched_skills: List[str]
    client: str
    budget: float
    recommendation: str
    match_percentage: float

class EnhancedJobMatchResult(Model):
    freelancer_address: str
    enhanced_jobs: List[EnhancedJobInfo]
    total_matches: int
    ai_summary: str
    timestamp: int

# ------------------------------
# Storage Agent Models
# ------------------------------
class StoreFreelancerSkills(Model):
    freelancer_address: str
    skills: List[str]

class SkillsStored(Model):
    freelancer_address: str
    success: bool
    message: str

class FreelancerSkillsRequest(Model):
    freelancer_address: str
    requester: str

class FreelancerSkillsResponse(Model):
    freelancer_address: str
    skills: List[str]
    found: bool

class ListFreelancersRequest(Model):
    requester: str

class ListFreelancersResponse(Model):
    freelancer_addresses: List[str]
    total_count: int

# ------------------------------
# Job Application & Proposals
# ------------------------------
class GenerateProposalRequest(Model):
    freelancer_address: str
    job_id: int
    job_details: Dict
    freelancer_skills: List[str]

class ProposalGenerated(Model):
    freelancer_address: str
    job_id: int
    proposal_text: str
    estimated_hours: int
    success: bool

class StoreProposal(Model):
    job_id: int
    freelancer_address: str
    proposal_text: str
    estimated_hours: int
    timestamp: int

class ProposalStored(Model):
    job_id: int
    freelancer_address: str
    success: bool
    message: str

class GetProposalsRequest(Model):
    job_id: int
    requester: str

class ProposalData(Model):
    freelancer_address: str
    proposal_text: str
    estimated_hours: int
    timestamp: int

class ProposalsResponse(Model):
    job_id: int
    proposals: List[ProposalData]
    total_count: int

# ------------------------------
# Client Agent Models
# ------------------------------
class JobPosted(Model):
    client_address: str
    job_id: int
    tx_hash: str
    success: bool
    message: str
    timestamp: int

class JobPostConfirmation(Model):
    client_address: str
    job_id: int
    tx_hash: str
    ai_message: str
    next_steps: List[str]
    timestamp: int

# ------------------------------
# Client Agent → AI Model
# ------------------------------
class JobPostRequest(Model):
    """Request to post a job on-chain"""
    client_address: str
    title: str
    description: str
    budget: float
    required_skills: List[str]
    milestones: List[Dict]
