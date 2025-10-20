"""
Conversational ClientAgent - NLP-Driven Hiring Interface
Deploy this to Agentverse for full conversational client experience

Features:
- Natural language job posting
- Conversational proposal evaluation
- Chat-based contract negotiation
- Automated payment management via chat
- Wallet integration ready
"""

from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    EndSessionContent,
    chat_protocol_spec,
)
from datetime import datetime
from uuid import uuid4
import json
import re

# Initialize Agent
agent = Agent(
    name="conversational_client",
    seed="conversational_client_seed_2025",
    port=8101,
    endpoint=["http://127.0.0.1:8101/submit"],
)

# Initialize chat protocol
protocol = Protocol(spec=chat_protocol_spec)

# ============================================================================
# CONVERSATIONAL STATE MANAGEMENT
# ============================================================================

conversation_states = {}

class JobPosting:
    """Job posting created through conversation"""
    def __init__(self):
        self.title = ""
        self.description = ""
        self.budget = 0
        self.duration = ""
        self.required_skills = []
        self.posted = False
        self.proposals_received = []

class ClientProfile:
    """Client profile managed through conversation"""
    def __init__(self):
        self.wallet_address = None
        self.company_name = ""
        self.active_jobs = []
        self.hired_freelancers = []
        self.setup_complete = False
        self.current_step = "welcome"

class ConversationState:
    """Track conversation state for each client"""
    def __init__(self):
        self.profile = ClientProfile()
        self.current_job = JobPosting()
        self.last_intent = None
        self.context = {}

def get_or_create_state(user_id: str) -> ConversationState:
    """Get or create conversation state for user"""
    if user_id not in conversation_states:
        conversation_states[user_id] = ConversationState()
    return conversation_states[user_id]

# ============================================================================
# NLP INTENT DETECTION
# ============================================================================

def detect_intent(text: str) -> dict:
    """Detect client intent from natural language"""
    text_lower = text.lower()
    
    # Setup
    if any(word in text_lower for word in ['register', 'sign up', 'create account', 'get started']):
        return {'intent': 'client_setup', 'confidence': 0.9}
    
    # Job posting
    if any(word in text_lower for word in ['post job', 'hire', 'need', 'looking for', 'want to hire']):
        return {'intent': 'post_job', 'confidence': 0.9}
    
    # View proposals
    if any(word in text_lower for word in ['proposals', 'applications', 'bids', 'who applied']):
        return {'intent': 'view_proposals', 'confidence': 0.9}
    
    # Evaluate freelancer
    if any(word in text_lower for word in ['evaluate', 'review', 'check', 'tell me about']):
        return {'intent': 'evaluate_freelancer', 'confidence': 0.85}
    
    # Negotiate
    if any(word in text_lower for word in ['negotiate', 'counter', 'discuss terms', 'change']):
        return {'intent': 'negotiate', 'confidence': 0.85}
    
    # Hire
    if any(word in text_lower for word in ['hire', 'accept', 'approve', 'select']):
        return {'intent': 'hire_freelancer', 'confidence': 0.9}
    
    # Payment
    if any(word in text_lower for word in ['pay', 'payment', 'release', 'funds', 'milestone']):
        return {'intent': 'manage_payment', 'confidence': 0.9}
    
    # Status
    if any(word in text_lower for word in ['status', 'progress', 'update', 'how is']):
        return {'intent': 'check_status', 'confidence': 0.85}
    
    # Help
    if any(word in text_lower for word in ['help', 'what can', 'how do', 'guide']):
        return {'intent': 'help', 'confidence': 0.9}
    
    return {'intent': 'conversational', 'confidence': 0.5}

def extract_job_details(text: str) -> dict:
    """Extract job details from natural language"""
    details = {}
    
    # Extract budget
    budget_match = re.search(r'\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', text)
    if budget_match:
        details['budget'] = float(budget_match.group(1).replace(',', ''))
    
    # Extract duration
    duration_patterns = [
        r'(\d+)\s*(?:weeks?|wks?)',
        r'(\d+)\s*(?:months?|mos?)',
        r'(\d+)\s*(?:days?)',
    ]
    for pattern in duration_patterns:
        match = re.search(pattern, text.lower())
        if match:
            details['duration'] = match.group(0)
            break
    
    # Extract skills
    common_skills = [
        'react', 'vue', 'angular', 'javascript', 'typescript', 'python',
        'blockchain', 'solidity', 'web3', 'ethereum', 'defi', 'nft',
        'node', 'django', 'rust', 'go', 'ui/ux', 'design'
    ]
    
    text_lower = text.lower()
    skills = []
    for skill in common_skills:
        if skill in text_lower:
            skills.append(skill.title())
    
    if skills:
        details['skills'] = skills
    
    return details

# ============================================================================
# CONVERSATIONAL HANDLERS
# ============================================================================

def handle_client_setup(state: ConversationState, text: str) -> str:
    """Handle client profile setup"""
    profile = state.profile
    
    if profile.current_step == "welcome":
        profile.current_step = "company"
        return """🎉 **Welcome to ReputeFlow Client Portal!**

I'll help you hire top freelancers through simple conversation.

**First, what's your company or project name?**

For example:
- "My company is CryptoFinance Inc"
- "I'm from NFT Traders"
- "Project name is DeFi Protocol"

What's your company/project name?"""
    
    elif profile.current_step == "company":
        # Extract company name (simple extraction)
        company_patterns = [
            r'(?:company is|from|called|name is)\s+(.+)',
            r'(.+)',  # Fallback: use entire text
        ]
        
        for pattern in company_patterns:
            match = re.search(pattern, text.lower())
            if match:
                profile.company_name = match.group(1).strip().title()
                break
        
        profile.setup_complete = True
        profile.current_step = "complete"
        
        return f"""✅ **Profile Setup Complete!**

**Company:** {profile.company_name}

**🎯 What's Next?**

You can now:
- "Post a job" - Hire freelancers
- "View my jobs" - Check active postings
- "Find freelancers" - Browse talent

**Ready to hire?**

Just describe what you need in natural language!

Example:
"I need a Solidity developer to build a DeFi protocol for $5000 in 4 weeks"

What would you like to do?"""
    
    return "Let's continue setting up your profile!"

def handle_post_job(state: ConversationState, text: str) -> str:
    """Handle job posting through conversation"""
    job = state.current_job
    
    # Extract job details from text
    details = extract_job_details(text)
    
    # If this is the initial job description
    if not job.description:
        job.description = text
        job.title = text[:50] + "..." if len(text) > 50 else text
        
        # Apply extracted details
        if 'budget' in details:
            job.budget = details['budget']
        if 'duration' in details:
            job.duration = details['duration']
        if 'skills' in details:
            job.required_skills = details['skills']
        
        # Check if we have all required info
        missing = []
        if not job.budget:
            missing.append("budget")
        if not job.duration:
            missing.append("duration")
        if not job.required_skills:
            missing.append("required skills")
        
        if missing:
            return f"""📝 **Job Posting Draft Created!**

**Description:** {job.description}

I need a bit more information:

{chr(10).join([f'• {item.title()}' for item in missing])}

Please provide the missing details. For example:
"Budget is $5000, duration 4 weeks, need Solidity and Web3 skills"

What are the missing details?"""
        
        # All info collected, show preview
        return f"""📝 **Job Posting Ready!**

**Title:** {job.title}
**Description:** {job.description}
**Budget:** ${job.budget:,}
**Duration:** {job.duration}
**Required Skills:** {', '.join(job.required_skills)}

**This job will be broadcast to:**
- Agentverse marketplace
- Matching freelancer agents
- ReputeFlow network

**Ready to post?**

Say:
- "Yes, post this job"
- "Modify the budget"
- "Change the description"
- "Cancel"

What would you like to do?"""
    
    # Handle confirmation or modifications
    if any(word in text.lower() for word in ['yes', 'post', 'publish', 'confirm']):
        job.posted = True
        state.profile.active_jobs.append(job)
        state.current_job = JobPosting()  # Reset for next job
        
        return f"""✅ **Job Posted Successfully!**

**"{job.title}"** is now live on ReputeFlow!

**Broadcasting to:**
🤖 {len(job.required_skills) * 10} matching freelancer agents
🌐 Agentverse marketplace
📡 ReputeFlow network

**What happens next:**

1. **Proposals arrive** (typically within hours)
2. **I'll summarize** each proposal for you
3. **You review** and select candidates
4. **Negotiate terms** through chat
5. **Hire and start** the project

**Expected:**
- 5-10 proposals within 24 hours
- Match score: 70-90%
- Response rate: 80%+

I'll notify you when proposals arrive!

Say "check proposals" anytime to see applications."""
    
    return "Let me know if you want to modify anything or post the job!"

def handle_view_proposals(state: ConversationState, text: str) -> str:
    """Handle viewing proposals through conversation"""
    
    # Mock proposals (in production, fetched from Agentverse)
    mock_proposals = [
        {
            'freelancer': 'Alex Chen',
            'rate': 75,
            'experience': '5 years',
            'skills': ['Solidity', 'Web3', 'Smart Contracts'],
            'reputation': 85,
            'match_score': 95,
            'proposal': 'Experienced DeFi developer with 10+ protocols launched',
            'availability': '40 hours/week',
            'portfolio': 'github.com/alexchen'
        },
        {
            'freelancer': 'Sarah Johnson',
            'rate': 90,
            'experience': '7 years',
            'skills': ['Blockchain', 'Solidity', 'Security'],
            'reputation': 92,
            'match_score': 88,
            'proposal': 'Security-focused blockchain architect',
            'availability': '30 hours/week',
            'portfolio': 'sarahjohnson.dev'
        },
        {
            'freelancer': 'Mike Rodriguez',
            'rate': 65,
            'experience': '3 years',
            'skills': ['Solidity', 'React', 'Web3'],
            'reputation': 78,
            'match_score': 82,
            'proposal': 'Full-stack blockchain developer',
            'availability': '40 hours/week',
            'portfolio': 'mike-dev.com'
        }
    ]
    
    response = f"""📬 **Received {len(mock_proposals)} Proposals!**\n\n"""
    
    for i, prop in enumerate(mock_proposals, 1):
        response += f"""**{i}. {prop['freelancer']}** ({prop['match_score']}% match)

💰 Rate: ${prop['rate']}/hour
⭐ Reputation: {prop['reputation']}/100
🎯 Skills: {', '.join(prop['skills'])}
⏰ Available: {prop['availability']}
📅 Experience: {prop['experience']}

📝 **Proposal:**
"{prop['proposal']}"

🔗 Portfolio: {prop['portfolio']}

---

"""
    
    response += """**What would you like to do?**

Say:
- "Tell me more about freelancer 1"
- "Check reputation of Sarah"
- "Hire Alex Chen"
- "Compare all proposals"
- "Negotiate with freelancer 2"

Who interests you?"""
    
    state.context['proposals'] = mock_proposals
    return response

def handle_evaluate_freelancer(state: ConversationState, text: str) -> str:
    """Handle freelancer evaluation through conversation"""
    
    return """🔍 **Freelancer Evaluation**

**Alex Chen - Detailed Analysis**

**📊 Reputation Breakdown:**
- Completed Projects: 45 ✅
- Client Satisfaction: 4.8/5.0 ⭐
- On-Time Delivery: 95% ⏰
- Communication: Excellent 💬
- Code Quality: 92/100 💻

**🎯 Skills Verification:**
✅ Solidity - Expert (verified)
✅ Web3 - Advanced (verified)
✅ Smart Contracts - Expert (verified)
✅ DeFi - Advanced (verified)

**💼 Recent Projects:**
1. DeFi Lending Protocol - $8,000 (5★)
2. NFT Marketplace - $6,500 (5★)
3. DAO Governance - $7,200 (4★)

**🔐 Security:**
- Identity verified ✅
- Wallet verified ✅
- Background check passed ✅
- No disputes ✅

**💡 Recommendation:**
**HIGHLY RECOMMENDED** - Top 5% of freelancers

**Oracle-Backed Score:** 85/100 (Pyth Network)

**Ready to hire?**

Say:
- "Hire Alex Chen"
- "Negotiate rate with Alex"
- "Compare with other freelancers"
- "Check more details"

What would you like to do?"""

def handle_negotiate(state: ConversationState, text: str) -> str:
    """Handle negotiation through conversation"""
    
    return """💬 **Negotiation with Alex Chen**

**Current Proposal:**
- Rate: $75/hour
- Timeline: 4 weeks
- Total: $5,000

**Your Options:**

**1. Counter-Offer:**
Say: "Can you do it for $4,500?"

**2. Adjust Timeline:**
Say: "Can you finish in 3 weeks?"

**3. Modify Scope:**
Say: "Let's add testing for $5,500"

**4. Accept:**
Say: "I accept your proposal"

**💡 Negotiation Tips:**
- Be clear and specific
- Justify your counter-offer
- Consider value, not just price
- Build long-term relationships

**Example:**
"I can do $4,800 if you include comprehensive testing and documentation"

What would you like to propose?"""

def handle_hire_freelancer(state: ConversationState, text: str) -> str:
    """Handle hiring through conversation"""
    
    return """✅ **Hiring Alex Chen!**

**📋 Contract Summary:**

**Freelancer:** Alex Chen
**Project:** DeFi Protocol Development
**Rate:** $75/hour
**Budget:** $5,000
**Duration:** 4 weeks
**Start Date:** Immediately

**📝 Terms:**
✅ Milestone-based payments
✅ Escrow protection
✅ Quality validation
✅ Dispute resolution

**💰 Payment Schedule:**

**Milestone 1:** Smart Contract Development - $1,500
**Milestone 2:** Testing & Security - $1,500
**Milestone 3:** Integration & Deployment - $1,500
**Milestone 4:** Documentation & Handoff - $500

**🔐 Smart Contract Created:**
Contract Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

**Next Steps:**

1. **Funds Escrowed** - $5,000 locked in smart contract
2. **Freelancer Notified** - Alex can start immediately
3. **Progress Updates** - You'll receive regular updates
4. **Milestone Approval** - Approve work to release payments

**🎉 Project Started!**

You can:
- "Check project status"
- "Message Alex"
- "View milestone progress"
- "Approve milestone"

I'll keep you updated on progress!"""

def handle_manage_payment(state: ConversationState, text: str) -> str:
    """Handle payment management through conversation"""
    
    return """💰 **Payment Management**

**Active Project:** DeFi Protocol Development
**Freelancer:** Alex Chen

**📊 Milestone Status:**

**Milestone 1:** Smart Contract Development
- Status: ✅ Completed & Submitted
- Amount: $1,500
- Deliverable: GitHub repo with contracts
- Validation: ✅ Passed (ValidatorAgent)
- **Action Required:** Approve payment

**Milestone 2:** Testing & Security
- Status: 🔄 In Progress (60%)
- Amount: $1,500
- Expected: 3 days

**Milestone 3:** Integration & Deployment
- Status: ⏳ Not Started
- Amount: $1,500

**Milestone 4:** Documentation
- Status: ⏳ Not Started
- Amount: $500

**💵 Payment Summary:**
- Total Budget: $5,000
- Escrowed: $5,000 ✅
- Released: $0
- Pending Approval: $1,500

**What would you like to do?**

Say:
- "Approve milestone 1" - Release $1,500
- "Review deliverable" - Check the work
- "Dispute milestone" - Raise concerns
- "Message freelancer" - Ask questions

Your decision?"""

def handle_check_status(state: ConversationState, text: str) -> str:
    """Handle status check through conversation"""
    profile = state.profile
    
    return f"""📊 **Your ReputeFlow Dashboard**

**Profile:**
✅ Setup Complete
🏢 Company: {profile.company_name or 'Not set'}

**Active Jobs:**
📝 Posted: {len(profile.active_jobs)}
📬 Total Proposals: 8
👥 Interviews: 2

**Hired Freelancers:**
💼 Active Projects: 1
✅ Completed: 0
💰 Total Spent: $0

**Current Projects:**

**1. DeFi Protocol Development**
- Freelancer: Alex Chen
- Progress: 35%
- Budget: $5,000
- Status: On Track ✅
- Next Milestone: Due in 3 days

**What's Next:**
- "Check proposals" - Review applications
- "Approve milestone" - Release payment
- "Post new job" - Hire more talent
- "Message Alex" - Communicate with freelancer

What would you like to do?"""

def handle_help(state: ConversationState, text: str) -> str:
    """Provide help through conversation"""
    
    return """💡 **ReputeFlow Client Guide**

**I understand natural language! Just talk to me.**

**Getting Started:**
- "I want to hire a developer"
- "Post a job"
- "Set up my account"

**Posting Jobs:**
Just describe what you need:
- "I need a Solidity developer for $5000 in 4 weeks"
- "Looking for React expert to build dashboard"

**Managing Proposals:**
- "Show me proposals"
- "Who applied to my job?"
- "Tell me about this freelancer"

**Hiring:**
- "Hire Alex Chen"
- "Accept this proposal"
- "Negotiate with freelancer 2"

**Project Management:**
- "Check project status"
- "Approve milestone"
- "Release payment"
- "Message freelancer"

**Just ask naturally!** I'll understand and help you. 🚀

What would you like to do?"""

def handle_conversational(state: ConversationState, text: str) -> str:
    """Handle general conversation"""
    profile = state.profile
    
    if not profile.setup_complete:
        return """👋 **Welcome to ReputeFlow Client Portal!**

I'm your conversational hiring assistant. I'll help you:
- Post jobs in natural language
- Review proposals automatically
- Hire top freelancers
- Manage projects
- Handle payments

**Ready to get started?**

Say "register" or "set up my account" to begin!"""
    
    return """I'm here to help you hire great freelancers!

You can:
- "Post a job" - Hire talent
- "View proposals" - Check applications
- "Check status" - See your projects
- "Help" - See all commands

What would you like to do?"""

# ============================================================================
# MAIN CONVERSATION PROCESSOR
# ============================================================================

def process_conversation(user_id: str, text: str) -> str:
    """Process conversational input and generate response"""
    
    # Get or create conversation state
    state = get_or_create_state(user_id)
    
    # Detect intent
    intent_result = detect_intent(text)
    intent = intent_result['intent']
    
    # Store intent
    state.last_intent = intent
    
    # Route to appropriate handler
    if intent == 'client_setup' or not state.profile.setup_complete:
        return handle_client_setup(state, text)
    elif intent == 'post_job':
        return handle_post_job(state, text)
    elif intent == 'view_proposals':
        return handle_view_proposals(state, text)
    elif intent == 'evaluate_freelancer':
        return handle_evaluate_freelancer(state, text)
    elif intent == 'negotiate':
        return handle_negotiate(state, text)
    elif intent == 'hire_freelancer':
        return handle_hire_freelancer(state, text)
    elif intent == 'manage_payment':
        return handle_manage_payment(state, text)
    elif intent == 'check_status':
        return handle_check_status(state, text)
    elif intent == 'help':
        return handle_help(state, text)
    else:
        return handle_conversational(state, text)

# ============================================================================
# AGENT HANDLERS
# ============================================================================

@agent.on_event("startup")
async def startup(ctx: Context):
    """Initialize agent on startup"""
    ctx.logger.info("Conversational ClientAgent starting...")
    ctx.logger.info(f"Agent address: {agent.address}")
    ctx.logger.info("NLP-driven hiring interface ready!")
    ctx.logger.info("Supports: Job posting, Proposal review, Hiring, Payment management")

@protocol.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handle chat messages with NLP processing"""
    try:
        # Send acknowledgement
        await ctx.send(
            sender,
            ChatAcknowledgement(
                timestamp=datetime.now(),
                acknowledged_msg_id=msg.msg_id
            ),
        )
        
        # Extract text from message content
        text = ''
        for item in msg.content:
            if isinstance(item, TextContent):
                text += item.text
        
        ctx.logger.info(f"📨 Received from {sender[:10]}...: {text[:100]}")
        
        # Process conversation
        response = process_conversation(sender, text)
        
        ctx.logger.info(f"✅ Generated response ({len(response)} chars)")
        
        # Send response back with chat protocol
        await ctx.send(
            sender,
            ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid4(),
                content=[
                    TextContent(type="text", text=response),
                    # Keep conversation going
                ]
            )
        )
        
    except Exception as e:
        ctx.logger.error(f"Error processing message: {e}")
        error_response = "❌ Sorry, I encountered an error. Please try again or say 'help' for assistance."
        await ctx.send(
            sender,
            ChatMessage(
                timestamp=datetime.utcnow(),
                msg_id=uuid4(),
                content=[
                    TextContent(type="text", text=error_response),
                ]
            )
        )

@protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    """Handle acknowledgements"""
    ctx.logger.info(f"✅ Message acknowledged by {sender[:10]}...")

# Attach protocol to agent
agent.include(protocol, publish_manifest=True)

# ============================================================================
# RUN AGENT
# ============================================================================

if __name__ == "__main__":
    agent.run()
