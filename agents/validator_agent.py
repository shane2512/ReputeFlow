"""
ValidatorAgent - Validates work quality and participates in dispute resolution
Provides consensus-based validation for milestone completions
"""

from uagents import Agent, Context, Model, Protocol
from uagents.setup import fund_agent_if_low
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)
from datetime import datetime
from uuid import uuid4
from config import AgentConfig, DISPUTE_RESOLVER_ABI, WORK_ESCROW_ABI
from typing import List

# Message Models
class ValidationRequest(Model):
    """Request to validate work"""
    project_id: int
    milestone_id: int
    deliverable_url: str
    description: str
    client_address: str
    freelancer_address: str

class ValidationResponse(Model):
    """Validation result"""
    project_id: int
    milestone_id: int
    validator_address: str
    approved: bool
    quality_score: int  # 0-100
    feedback: str
    evidence: List[str]

class DisputeVote(Model):
    """Vote on dispute resolution"""
    dispute_id: int
    validator_address: str
    vote: str  # "client" or "freelancer"
    reasoning: str
    confidence: float  # 0.0-1.0

class ValidationStandards(Model):
    """Update validation standards"""
    criteria: List[str]
    weights: List[float]
    minimum_score: int

# Initialize ValidatorAgent
validator = Agent(
    name="validator_agent",
    seed=AgentConfig.VALIDATOR_AGENT_SEED,
    port=AgentConfig.AGENT_PORT_START + 2,
    endpoint=["http://localhost:8002/submit"],
    mailbox=f"{AgentConfig.AGENTVERSE_API_KEY}@https://agentverse.ai" if AgentConfig.ENABLE_MAILBOX else None
)

# Validator State
class ValidatorState:
    def __init__(self):
        self.address = None
        self.validation_count = 0
        self.dispute_votes = 0
        self.reputation_score = 100
        self.validation_standards = {
            "code_quality": 0.3,
            "documentation": 0.2,
            "testing": 0.2,
            "completeness": 0.3
        }
        self.minimum_score = 70
        self.active_validations = []
        self.validation_history = []

state = ValidatorState()

@validator.on_event("startup")
async def startup(ctx: Context):
    """Initialize validator on startup"""
    ctx.logger.info("ValidatorAgent starting...")
    ctx.logger.info(f"Validator address: {validator.address}")
    
    fund_agent_if_low(validator.wallet.address())
    
    account = AgentConfig.get_account()
    state.address = account.address
    
    ctx.logger.info(f"ValidatorAgent ready! Reputation: {state.reputation_score}")

@validator.on_message(model=ValidationRequest)
async def handle_validation_request(ctx: Context, sender: str, msg: ValidationRequest):
    """Handle work validation request"""
    ctx.logger.info(f"Validation request for project {msg.project_id}, milestone {msg.milestone_id}")
    
    # Perform validation
    validation_result = await validate_work(ctx, msg)
    
    # Create response
    response = ValidationResponse(
        project_id=msg.project_id,
        milestone_id=msg.milestone_id,
        validator_address=state.address,
        approved=validation_result["approved"],
        quality_score=validation_result["score"],
        feedback=validation_result["feedback"],
        evidence=validation_result["evidence"]
    )
    
    # Send response back to requester
    await ctx.send(sender, response)
    
    # Update state
    state.validation_count += 1
    state.validation_history.append({
        "project_id": msg.project_id,
        "milestone_id": msg.milestone_id,
        "score": validation_result["score"],
        "approved": validation_result["approved"],
        "timestamp": ctx.timestamp
    })
    
    ctx.logger.info(f"Validation complete: {'APPROVED' if validation_result['approved'] else 'REJECTED'} (Score: {validation_result['score']})")

async def validate_work(ctx: Context, request: ValidationRequest) -> dict:
    """
    Validate work quality based on deliverables
    In production, this would:
    1. Fetch deliverables from IPFS/Lighthouse
    2. Run automated tests
    3. Check code quality metrics
    4. Verify documentation
    5. Use MeTTa reasoning for complex validation
    """
    
    # Simulated validation logic
    scores = {}
    evidence = []
    
    # Code Quality Check (30%)
    code_quality_score = 85  # Would analyze actual code
    scores["code_quality"] = code_quality_score
    evidence.append(f"Code quality: {code_quality_score}/100")
    
    # Documentation Check (20%)
    doc_score = 90  # Would check README, comments, etc.
    scores["documentation"] = doc_score
    evidence.append(f"Documentation: {doc_score}/100")
    
    # Testing Check (20%)
    test_score = 80  # Would run tests and check coverage
    scores["testing"] = test_score
    evidence.append(f"Testing: {test_score}/100")
    
    # Completeness Check (30%)
    completeness_score = 95  # Would verify all requirements met
    scores["completeness"] = completeness_score
    evidence.append(f"Completeness: {completeness_score}/100")
    
    # Calculate weighted score
    total_score = sum(
        scores[criterion] * weight 
        for criterion, weight in state.validation_standards.items()
    )
    
    # Determine approval
    approved = total_score >= state.minimum_score
    
    # Generate feedback
    if approved:
        feedback = f"Work meets quality standards. Overall score: {total_score:.1f}/100"
    else:
        feedback = f"Work needs improvement. Overall score: {total_score:.1f}/100. "
        low_scores = [k for k, v in scores.items() if v < state.minimum_score]
        if low_scores:
            feedback += f"Areas to improve: {', '.join(low_scores)}"
    
    return {
        "approved": approved,
        "score": int(total_score),
        "feedback": feedback,
        "evidence": evidence
    }

@validator.on_message(model=DisputeVote)
async def handle_dispute_vote_request(ctx: Context, sender: str, msg: DisputeVote):
    """Handle dispute voting request"""
    ctx.logger.info(f"Dispute vote request for dispute {msg.dispute_id}")
    
    # Analyze dispute and make decision
    decision = await analyze_dispute(ctx, msg)
    
    # Submit vote on-chain
    await submit_dispute_vote(ctx, msg.dispute_id, decision)
    
    state.dispute_votes += 1
    ctx.logger.info(f"Vote submitted for dispute {msg.dispute_id}: {decision['vote']}")

async def analyze_dispute(ctx: Context, dispute_info: DisputeVote) -> dict:
    """
    Analyze dispute and determine vote
    In production, this would:
    1. Review project history
    2. Analyze deliverables
    3. Check communication logs
    4. Use MeTTa reasoning for complex cases
    """
    
    # Simulated dispute analysis
    # In production, fetch actual dispute data from blockchain
    
    ctx.logger.info(f"Analyzing dispute {dispute_info.dispute_id}...")
    
    # Factors to consider
    factors = {
        "deliverable_quality": 0.4,
        "timeline_adherence": 0.2,
        "communication": 0.2,
        "requirements_met": 0.2
    }
    
    # Simulated scores (would be calculated from actual data)
    freelancer_score = 75
    client_score = 60
    
    # Determine vote based on scores
    if freelancer_score > client_score:
        vote = "freelancer"
        confidence = (freelancer_score - client_score) / 100
        reasoning = f"Freelancer provided quality work ({freelancer_score}% compliance)"
    else:
        vote = "client"
        confidence = (client_score - freelancer_score) / 100
        reasoning = f"Client's concerns are valid ({client_score}% justified)"
    
    return {
        "vote": vote,
        "confidence": confidence,
        "reasoning": reasoning
    }

async def submit_dispute_vote(ctx: Context, dispute_id: int, decision: dict):
    """Submit dispute vote to DisputeResolver contract"""
    try:
        w3 = AgentConfig.get_web3()
        account = AgentConfig.get_account()
        
        dispute_contract = w3.eth.contract(
            address=AgentConfig.DISPUTE_RESOLVER,
            abi=DISPUTE_RESOLVER_ABI
        )
        
        # In production, call voteOnDispute function
        ctx.logger.info(f"Submitting vote: {decision['vote']} (confidence: {decision['confidence']:.2f})")
        
        # Simulated transaction
        # tx = dispute_contract.functions.voteOnDispute(
        #     dispute_id,
        #     decision['vote'] == 'freelancer'
        # ).build_transaction({...})
        
    except Exception as e:
        ctx.logger.error(f"Error submitting vote: {e}")

@validator.on_message(model=ValidationStandards)
async def handle_standards_update(ctx: Context, sender: str, msg: ValidationStandards):
    """Update validation standards"""
    ctx.logger.info("Updating validation standards...")
    
    # Update standards
    for i, criterion in enumerate(msg.criteria):
        if i < len(msg.weights):
            state.validation_standards[criterion] = msg.weights[i]
    
    state.minimum_score = msg.minimum_score
    
    ctx.logger.info(f"Standards updated. Minimum score: {state.minimum_score}")

@validator.on_interval(period=3600.0)  # Every hour
async def report_validator_stats(ctx: Context):
    """Report validator statistics"""
    ctx.logger.info("=== Validator Statistics ===")
    ctx.logger.info(f"Total Validations: {state.validation_count}")
    ctx.logger.info(f"Dispute Votes: {state.dispute_votes}")
    ctx.logger.info(f"Reputation: {state.reputation_score}")
    
    if state.validation_history:
        recent = state.validation_history[-10:]
        approval_rate = sum(1 for v in recent if v["approved"]) / len(recent)
        avg_score = sum(v["score"] for v in recent) / len(recent)
        ctx.logger.info(f"Recent Approval Rate: {approval_rate:.1%}")
        ctx.logger.info(f"Average Score: {avg_score:.1f}")
    
    ctx.logger.info("=" * 30)

@validator.on_interval(period=600.0)  # Every 10 minutes
async def check_pending_validations(ctx: Context):
    """Check for pending validation requests"""
    ctx.logger.info(f"Active validations: {len(state.active_validations)}")

# Initialize chat protocol for Agentverse
chat_proto = Protocol(spec=chat_protocol_spec)

# ============================================
# CHAT PROTOCOL HANDLERS (For Agentverse)
# ============================================

@chat_proto.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handle incoming chat messages from other agents or users"""
    ctx.logger.info(f"Received chat message from {sender}")
    
    for item in msg.content:
        if isinstance(item, TextContent):
            user_message = item.text.lower()
            ctx.logger.info(f"Message: {user_message}")
            
            # Send acknowledgement
            ack = ChatAcknowledgement(
                timestamp=datetime.utcnow(),
                acknowledged_msg_id=msg.msg_id
            )
            await ctx.send(sender, ack)
            
            # Process message and generate response
            response_text = await process_chat_request(ctx, user_message)
            
            # Send response
            response = ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid4(),
                content=[TextContent(type="text", text=response_text)]
            )
            await ctx.send(sender, response)

@chat_proto.on_message(ChatAcknowledgement)
async def handle_chat_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    """Handle chat acknowledgements"""
    ctx.logger.info(f"Received acknowledgement from {sender} for message: {msg.acknowledged_msg_id}")

async def process_chat_request(ctx: Context, message: str) -> str:
    """Process chat requests and return appropriate response"""
    
    # Validation requests
    if "validate" in message or "check" in message:
        return f"✅ ValidatorAgent Ready\n\n" \
               f"📊 Validation Stats:\n" \
               f"• Active Validations: {len(state.active_validations)}\n" \
               f"• Completed: {state.validation_stats['total_validations']}\n" \
               f"• Approval Rate: {state.validation_stats['approval_rate']:.1%}\n" \
               f"• Avg Quality Score: {state.validation_stats['avg_quality_score']:.1f}/100\n\n" \
               f"I provide objective work quality assessment!"
    
    # Quality scoring
    elif "quality" in message or "score" in message:
        return f"🎯 Quality Assessment Criteria:\n\n" \
               f"• Code Quality: 30%\n" \
               f"• Functionality: 30%\n" \
               f"• Documentation: 20%\n" \
               f"• Best Practices: 20%\n\n" \
               f"Minimum passing score: 70/100\n" \
               f"Current avg: {state.validation_stats['avg_quality_score']:.1f}/100"
    
    # Dispute resolution
    elif "dispute" in message:
        return f"⚖️ Dispute Resolution\n\n" \
               f"Active Disputes: {len(state.active_disputes)}\n" \
               f"Resolved: {state.validation_stats.get('disputes_resolved', 0)}\n\n" \
               f"I participate in multi-validator consensus for fair outcomes."
    
    # Status check
    elif "status" in message:
        return f"📈 Validator Status:\n\n" \
               f"🟢 Online & Ready\n" \
               f"📊 Total Validations: {state.validation_stats['total_validations']}\n" \
               f"✅ Approved: {int(state.validation_stats['total_validations'] * state.validation_stats['approval_rate'])}\n" \
               f"❌ Rejected: {int(state.validation_stats['total_validations'] * (1 - state.validation_stats['approval_rate']))}\n" \
               f"⚖️ Active Disputes: {len(state.active_disputes)}"
    
    # Default help message
    else:
        return f"👋 Hi! I'm your ValidatorAgent.\n\n" \
               f"I can help you with:\n" \
               f"• ✅ Validate work - 'Validate this milestone'\n" \
               f"• 🎯 Quality scoring - 'Check quality'\n" \
               f"• ⚖️ Dispute resolution - 'Review dispute'\n" \
               f"• 📊 Validation stats - 'Show status'\n\n" \
               f"Current Status:\n" \
               f"Active: {len(state.active_validations)} | Completed: {state.validation_stats['total_validations']}"

# Include chat protocol in agent
validator.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    print("Starting ValidatorAgent...")
    print(f"Validator Address: {validator.address}")
    validator.run()
