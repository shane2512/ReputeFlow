"""
Conversational FreelancerAgent - NLP-Driven Chat Interface
Deploy this to Agentverse for full conversational freelancer experience

Features:
- Natural language profile setup
- Conversational job discovery
- Chat-based bidding and negotiation
- Automated deliverable submission via chat
- Wallet integration ready
"""

from uagents import Agent, Context, Protocol, Model
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
    name="conversational_freelancer",
    seed="conversational_freelancer_seed_2025",
    port=8100,
    endpoint=["http://127.0.0.1:8100/submit"],
)

# Initialize chat protocol
protocol = Protocol(spec=chat_protocol_spec)

# ============================================================================
# CONVERSATIONAL STATE MANAGEMENT
# ============================================================================

# Store conversation state per user
conversation_states = {}

class FreelancerProfile:
    """Freelancer profile managed through conversation"""
    def __init__(self):
        self.wallet_address = None
        self.skills = []
        self.hourly_rate = None
        self.availability = None
        self.portfolio_links = []
        self.bio = ""
        self.experience_years = 0
        self.completed_projects = 0
        self.setup_complete = False
        self.current_step = "welcome"
        
class ConversationState:
    """Track conversation state for each user"""
    def __init__(self):
        self.profile = FreelancerProfile()
        self.active_jobs = []
        self.proposals = []
        self.negotiations = []
        self.deliverables = []
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
    """Detect user intent from natural language"""
    text_lower = text.lower()
    
    # Profile setup intents
    if any(word in text_lower for word in ['register', 'sign up', 'create profile', 'get started', 'onboard']):
        return {'intent': 'profile_setup', 'confidence': 0.9}
    
    # Skill management
    if any(word in text_lower for word in ['my skills', 'i know', 'i can', 'expertise', 'proficient']):
        return {'intent': 'add_skills', 'confidence': 0.85}
    
    # Rate setting
    if any(word in text_lower for word in ['rate', 'charge', 'price', 'hourly', 'per hour', '$']):
        return {'intent': 'set_rate', 'confidence': 0.9}
    
    # Availability
    if any(word in text_lower for word in ['available', 'availability', 'hours', 'time', 'schedule']):
        return {'intent': 'set_availability', 'confidence': 0.85}
    
    # Job discovery
    if any(word in text_lower for word in ['find job', 'show jobs', 'available jobs', 'opportunities', 'work']):
        return {'intent': 'find_jobs', 'confidence': 0.9}
    
    # Bidding
    if any(word in text_lower for word in ['bid', 'propose', 'apply', 'interested', 'submit proposal']):
        return {'intent': 'submit_bid', 'confidence': 0.9}
    
    # Negotiation
    if any(word in text_lower for word in ['negotiate', 'counter', 'discuss', 'terms', 'agreement']):
        return {'intent': 'negotiate', 'confidence': 0.85}
    
    # Deliverable submission
    if any(word in text_lower for word in ['submit', 'deliver', 'complete', 'finished', 'done']):
        return {'intent': 'submit_deliverable', 'confidence': 0.9}
    
    # Status check
    if any(word in text_lower for word in ['status', 'progress', 'update', 'how is', 'what\'s happening']):
        return {'intent': 'check_status', 'confidence': 0.85}
    
    # Help
    if any(word in text_lower for word in ['help', 'what can', 'how do', 'guide', 'assist']):
        return {'intent': 'help', 'confidence': 0.9}
    
    # Default: conversational
    return {'intent': 'conversational', 'confidence': 0.5}

def extract_skills(text: str) -> list:
    """Extract skills from natural language"""
    common_skills = [
        'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java',
        'blockchain', 'solidity', 'web3', 'ethereum', 'defi', 'nft', 'smart contracts',
        'node', 'nodejs', 'express', 'django', 'flask', 'rust', 'go', 'c++',
        'ui/ux', 'design', 'figma', 'photoshop', 'aws', 'docker', 'kubernetes'
    ]
    
    text_lower = text.lower()
    found_skills = []
    
    for skill in common_skills:
        if skill in text_lower:
            found_skills.append(skill.title())
    
    return found_skills

def extract_rate(text: str) -> float:
    """Extract hourly rate from text"""
    # Look for patterns like $50, 50/hour, 50 per hour
    patterns = [
        r'\$\s*(\d+(?:\.\d{2})?)',
        r'(\d+(?:\.\d{2})?)\s*(?:per|/)\s*hour',
        r'(\d+(?:\.\d{2})?)\s*(?:dollars|usd)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return float(match.group(1))
    
    return None

def extract_hours(text: str) -> int:
    """Extract availability hours from text"""
    # Look for patterns like "40 hours", "20-30 hours"
    patterns = [
        r'(\d+)\s*(?:hours?|hrs?)',
        r'(\d+)\s*(?:per|/)\s*week',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return int(match.group(1))
    
    return None

# ============================================================================
# CONVERSATIONAL HANDLERS
# ============================================================================

def handle_profile_setup(state: ConversationState, text: str) -> str:
    """Handle profile setup conversation"""
    profile = state.profile
    
    if profile.current_step == "welcome":
        profile.current_step = "skills"
        return """🎉 **Welcome to ReputeFlow!**

Let's set up your freelancer profile. I'll guide you through a quick conversation.

**First, tell me about your skills!**

For example:
- "I'm proficient in React, Blockchain, and Solidity"
- "I know Python, Django, and AWS"
- "My skills are UI/UX design and Figma"

What are your main skills?"""
    
    elif profile.current_step == "skills":
        skills = extract_skills(text)
        if skills:
            profile.skills.extend(skills)
            profile.current_step = "rate"
            return f"""✅ **Great! I've added these skills:**
{chr(10).join([f'• {skill}' for skill in skills])}

**Next, what's your hourly rate?**

For example:
- "I charge $75 per hour"
- "My rate is $100/hour"
- "$50 per hour"

What rate would you like to set?"""
        else:
            return """I couldn't detect any skills in your message. 

Please mention specific technologies or skills like:
- Programming languages (Python, JavaScript, Solidity)
- Frameworks (React, Django, Web3)
- Other skills (Design, AWS, Blockchain)

What are your skills?"""
    
    elif profile.current_step == "rate":
        rate = extract_rate(text)
        if rate:
            profile.hourly_rate = rate
            profile.current_step = "availability"
            return f"""💰 **Perfect! Your rate is set to ${rate}/hour**

**How many hours per week are you available?**

For example:
- "40 hours per week"
- "20-30 hours"
- "Full-time, 40 hours"

What's your availability?"""
        else:
            return """I couldn't find a rate in your message.

Please specify your hourly rate like:
- "$75 per hour"
- "I charge $100/hour"
- "My rate is $50"

What's your hourly rate?"""
    
    elif profile.current_step == "availability":
        hours = extract_hours(text)
        if hours:
            profile.availability = hours
            profile.current_step = "bio"
            return f"""⏰ **Excellent! You're available {hours} hours/week**

**Tell me a bit about yourself!**

Write a short bio (2-3 sentences) about:
- Your experience
- What you specialize in
- What makes you unique

What's your professional bio?"""
        else:
            return """I couldn't detect hours in your message.

Please specify like:
- "40 hours per week"
- "20 hours"
- "Full-time availability"

How many hours per week are you available?"""
    
    elif profile.current_step == "bio":
        profile.bio = text
        profile.setup_complete = True
        profile.current_step = "complete"
        
        return f"""✅ **Profile Setup Complete!**

**Your Freelancer Profile:**

**Skills:** {', '.join(profile.skills)}
**Rate:** ${profile.hourly_rate}/hour
**Availability:** {profile.availability} hours/week
**Bio:** {profile.bio}

**🎯 What's Next?**

You can now:
- "Find available jobs" - Discover opportunities
- "Check my status" - View your profile
- "Update my skills" - Add more skills
- "Submit a proposal" - Apply to jobs

What would you like to do?"""
    
    return "Let's continue setting up your profile!"

def handle_find_jobs(state: ConversationState, text: str) -> str:
    """Handle job discovery through conversation"""
    
    # Simulate job discovery (in production, this queries Agentverse)
    mock_jobs = [
        {
            'id': 'job_001',
            'title': 'DeFi Protocol Development',
            'budget': 5000,
            'skills': ['Solidity', 'Web3', 'Smart Contracts'],
            'description': 'Build a DeFi lending protocol with automated market making',
            'duration': '4 weeks',
            'client': 'CryptoFinance Inc'
        },
        {
            'id': 'job_002',
            'title': 'React Dashboard for NFT Marketplace',
            'budget': 3000,
            'skills': ['React', 'TypeScript', 'Web3'],
            'description': 'Create a modern dashboard for NFT trading platform',
            'duration': '3 weeks',
            'client': 'NFT Traders'
        },
        {
            'id': 'job_003',
            'title': 'Smart Contract Audit',
            'budget': 8000,
            'skills': ['Solidity', 'Security', 'Blockchain'],
            'description': 'Audit and secure smart contracts for token launch',
            'duration': '2 weeks',
            'client': 'SecureChain Labs'
        }
    ]
    
    # Match jobs with freelancer skills
    profile = state.profile
    matched_jobs = []
    
    for job in mock_jobs:
        match_score = 0
        for skill in profile.skills:
            if skill in job['skills']:
                match_score += 1
        
        if match_score > 0:
            job['match_score'] = (match_score / len(job['skills'])) * 100
            matched_jobs.append(job)
    
    # Sort by match score
    matched_jobs.sort(key=lambda x: x['match_score'], reverse=True)
    
    if not matched_jobs:
        return """🔍 **No matching jobs found right now**

Try:
- Adding more skills to your profile
- Checking back later
- Broadening your skill set

Say "update my skills" to add more!"""
    
    # Format job listings
    response = f"""🎯 **Found {len(matched_jobs)} Matching Jobs!**\n\n"""
    
    for i, job in enumerate(matched_jobs[:3], 1):
        response += f"""**{i}. {job['title']}** ({int(job['match_score'])}% match)
💰 Budget: ${job['budget']:,}
⏰ Duration: {job['duration']}
🏢 Client: {job['client']}
🎯 Skills: {', '.join(job['skills'])}

📝 {job['description']}

---

"""
    
    response += """**Interested in any of these?**

Say:
- "I want to bid on job 1"
- "Tell me more about job 2"
- "Apply to the DeFi project"

Which job interests you?"""
    
    state.active_jobs = matched_jobs
    return response

def handle_submit_bid(state: ConversationState, text: str) -> str:
    """Handle bid submission through conversation"""
    
    if not state.active_jobs:
        return """You haven't browsed any jobs yet!

Say "find jobs" to see available opportunities."""
    
    # Extract job reference from text
    job_num = None
    for i in range(1, 4):
        if f"job {i}" in text.lower() or f"{i}" in text:
            job_num = i - 1
            break
    
    if job_num is None or job_num >= len(state.active_jobs):
        job_num = 0  # Default to first job
    
    job = state.active_jobs[job_num]
    profile = state.profile
    
    # Calculate proposed rate
    estimated_hours = job['budget'] / profile.hourly_rate
    
    # Generate proposal
    proposal = f"""📝 **Proposal Generated!**

**For:** {job['title']}
**Client:** {job['client']}

**Your Proposal:**

Hi {job['client']},

I'm excited about your {job['title']} project! With my expertise in {', '.join(profile.skills[:3])}, I'm confident I can deliver exceptional results.

**My Approach:**
✅ {job['description']}
✅ Clean, well-documented code
✅ Regular progress updates
✅ On-time delivery

**Terms:**
💰 Rate: ${profile.hourly_rate}/hour
⏰ Estimated: {int(estimated_hours)} hours
💵 Total: ${job['budget']:,}
📅 Timeline: {job['duration']}

**Why Choose Me:**
{profile.bio}

**Match Score:** {int(job['match_score'])}%

I'm available to start immediately and can commit {profile.availability} hours/week.

Looking forward to working with you!

---

**Ready to submit?**

Say:
- "Yes, submit this proposal"
- "Modify the proposal"
- "Change the rate"
- "Cancel"

What would you like to do?"""
    
    state.context['pending_proposal'] = {
        'job': job,
        'proposal': proposal,
        'rate': profile.hourly_rate,
        'hours': estimated_hours
    }
    
    return proposal

def handle_negotiate(state: ConversationState, text: str) -> str:
    """Handle negotiation through conversation"""
    
    return """💬 **Negotiation Mode**

**Current Terms:**
- Rate: $75/hour
- Timeline: 4 weeks
- Budget: $5,000

**Client's Counter-Offer:**
"Can you do it for $4,500 in 3 weeks?"

**Your Options:**

Say:
- "I accept the counter-offer"
- "I counter with $4,750 in 3.5 weeks"
- "My rate is firm at $75/hour"
- "Let's discuss the timeline"

**Negotiation Tips:**
✅ Be professional and flexible
✅ Justify your rates with value
✅ Find win-win solutions
✅ Know your minimum acceptable terms

What's your response?"""

def handle_submit_deliverable(state: ConversationState, text: str) -> str:
    """Handle deliverable submission through conversation"""
    
    return """📦 **Submit Deliverable**

**Active Project:** DeFi Protocol Development
**Milestone:** Smart Contract Implementation
**Due:** Tomorrow

**What are you submitting?**

You can:
1. Share a link to your work
   - "Here's the GitHub repo: github.com/..."
   - "Code is at: https://..."

2. Describe what you completed
   - "I've completed the lending contract with tests"
   - "Finished the UI integration"

3. Upload to decentralized storage
   - "Upload to Lighthouse"
   - "Store on IPFS"

**Example:**
"I've completed the smart contracts. Here's the repo: github.com/mywork. All tests passing, ready for review."

What would you like to submit?"""

def handle_check_status(state: ConversationState, text: str) -> str:
    """Handle status check through conversation"""
    profile = state.profile
    
    if not profile.setup_complete:
        return """⚙️ **Profile Setup In Progress**

You're currently setting up your profile.
Complete the setup to start finding jobs!"""
    
    return f"""📊 **Your ReputeFlow Status**

**Profile:**
✅ Setup Complete
👤 Skills: {', '.join(profile.skills)}
💰 Rate: ${profile.hourly_rate}/hour
⏰ Availability: {profile.availability} hrs/week

**Activity:**
📝 Active Proposals: 0
💼 Ongoing Projects: 0
✅ Completed Projects: {profile.completed_projects}
⭐ Reputation Score: 0 (New freelancer)

**What's Next:**
- "Find jobs" to discover opportunities
- "Update my skills" to add more expertise
- "Check available jobs" to see matches

What would you like to do?"""

def handle_help(state: ConversationState, text: str) -> str:
    """Provide help through conversation"""
    
    return """💡 **ReputeFlow Conversational Guide**

**I understand natural language! Just talk to me.**

**Getting Started:**
- "Register as a freelancer"
- "Set up my profile"
- "I want to get started"

**Finding Work:**
- "Find available jobs"
- "Show me opportunities"
- "What jobs match my skills?"

**Applying:**
- "I want to bid on this job"
- "Submit a proposal"
- "Apply to the DeFi project"

**Managing Work:**
- "Submit my deliverable"
- "Check project status"
- "Negotiate terms"

**Profile Management:**
- "Update my skills"
- "Change my rate"
- "Check my status"

**Just ask naturally!** I'll understand and help you. 🚀

What would you like to do?"""

def handle_conversational(state: ConversationState, text: str) -> str:
    """Handle general conversation"""
    
    profile = state.profile
    
    if not profile.setup_complete:
        return """👋 **Welcome to ReputeFlow!**

I'm your conversational freelancer assistant. I'll help you:
- Set up your profile
- Find jobs
- Submit proposals
- Manage projects
- Get paid

**Ready to get started?**

Say "register" or "set up my profile" to begin!"""
    
    return """I'm here to help! 

You can:
- "Find jobs" - Discover opportunities
- "Check status" - View your profile
- "Submit proposal" - Apply to jobs
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
    if intent == 'profile_setup' or not state.profile.setup_complete:
        return handle_profile_setup(state, text)
    elif intent == 'add_skills':
        skills = extract_skills(text)
        if skills:
            state.profile.skills.extend(skills)
            return f"✅ Added skills: {', '.join(skills)}\n\nWhat else would you like to do?"
        return "I couldn't detect any skills. Please mention specific technologies."
    elif intent == 'set_rate':
        rate = extract_rate(text)
        if rate:
            state.profile.hourly_rate = rate
            return f"💰 Rate updated to ${rate}/hour\n\nWhat's next?"
        return "Please specify your rate like '$75 per hour'"
    elif intent == 'set_availability':
        hours = extract_hours(text)
        if hours:
            state.profile.availability = hours
            return f"⏰ Availability set to {hours} hours/week\n\nWhat else?"
        return "Please specify hours like '40 hours per week'"
    elif intent == 'find_jobs':
        return handle_find_jobs(state, text)
    elif intent == 'submit_bid':
        return handle_submit_bid(state, text)
    elif intent == 'negotiate':
        return handle_negotiate(state, text)
    elif intent == 'submit_deliverable':
        return handle_submit_deliverable(state, text)
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
    ctx.logger.info("Conversational FreelancerAgent starting...")
    ctx.logger.info(f"Agent address: {agent.address}")
    ctx.logger.info("NLP-driven chat interface ready!")
    ctx.logger.info("Supports: Profile setup, Job discovery, Bidding, Negotiation")

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
                    # Don't end session - keep conversation going
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
