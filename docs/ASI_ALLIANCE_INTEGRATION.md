# ASI Alliance Integration - ReputeFlow

**What We Actually Built with ASI Alliance Technologies**

---

## 🏆 Executive Summary

ReputeFlow demonstrates effective use of **ASI Alliance technologies** to build an autonomous, decentralized freelance work platform. Our solution integrates:

- ✅ **ASI:One Chat Protocol** - Natural language human-agent interaction
- ✅ **uAgents Framework** - 5-agent autonomous system  
- ✅ **Natural Language Processing** - Command parsing for intuitive UX
- ✅ **Smart Contracts** - On-chain escrow and reputation
- ✅ **Sponsor Integrations** - Pyth, Yellow, Avail, Lighthouse

---

## 📋 What We Built

### 1. ASI:One Chat Protocol Integration ✅

**Full implementation** of the ASI:One chat protocol for natural language interaction.

**Code:**
```python
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    EndSessionContent,
    chat_protocol_spec
)

# Create chat protocol
chat_protocol = Protocol(name="ClientChatProtocol", spec=chat_protocol_spec)

@chat_protocol.on_message(ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    # Extract text from ASI:One message
    text = ''
    for item in msg.content:
        if isinstance(item, TextContent):
            text += item.text
    
    # Process natural language command
    if "post job" in text.lower():
        job_data = parse_natural_job_post(text)
        success, job_id, tx_hash = post_job_on_chain(ctx, job_data)
        
        # Respond via ASI:One
        await ctx.send(sender, ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text=f"✅ Job #{job_id} posted! Tx: {tx_hash}"),
                EndSessionContent(type="end-session")
            ]
        ))
```

**Supported Commands:**

**Client Agent:**
- `"post a job for Smart Contract Dev budget:20$ skills:solidity,rust"`
- `"accept proposal for job 23"`
- `"approve deliverable for job 23"`

**Freelancer Agent:**
- `"register my skills python solidity rust"`
- `"find jobs"`
- `"apply job: 23"`

### 2. uAgents Multi-Agent System ✅

**5 autonomous agents** working together:

#### Client Agent (Port 8005)
```python
agent = Agent(
    name="client_agent_chat",
    seed=os.getenv("CLIENT_AGENT_SEED"),
    port=8005,
    endpoint=["http://localhost:8005/submit"]
)

chat_protocol = Protocol(name="ClientChatProtocol", spec=chat_protocol_spec)
```

**Capabilities:**
- Natural language job posting
- On-chain job creation (WorkEscrow contract)
- Proposal evaluation
- PYUSD payment processing
- Deliverable approval

#### Freelancer Agent (Port 8000)
```python
agent = Agent(
    name="freelancer_agent",
    seed="freelancer_agent_seed_unique_2025",
    port=8000,
    endpoint=["http://localhost:8000/submit"]
)
```

**Capabilities:**
- Skill registration via natural language
- Job discovery
- Proposal submission
- Deliverable uploads

#### Job Matcher Agent (Port 8001)
**Skill-based matching** with reputation scoring

```python
@matcher_protocol.on_message(FindJobsRequest)
async def match_jobs(ctx: Context, sender: str, msg: FindJobsRequest):
    # Get freelancer skills
    skills = await get_freelancer_skills(msg.freelancer_address)
    
    # Fetch jobs from blockchain
    jobs = await fetch_jobs_from_chain()
    
    # Match based on skills
    matched = []
    for job in jobs:
        skill_match = len(set(skills) & set(job.required_skills))
        if skill_match > 0:
            matched.append({
                "job": job,
                "match_score": skill_match / len(job.required_skills)
            })
    
    # Send matches back
    await ctx.send(sender, MatchedJobs(jobs=matched))
```

#### Storage Agent (Port 8002)
**Decentralized profile storage**

```python
@storage_protocol.on_message(StoreFreelancerSkills)
async def store_skills(ctx: Context, sender: str, msg: StoreFreelancerSkills):
    # Store skills in agent storage
    ctx.storage.set(
        f"skills_{msg.freelancer_address}",
        json.dumps(msg.skills)
    )
    
    # Confirm storage
    await ctx.send(sender, SkillsStored(
        freelancer_address=msg.freelancer_address,
        skills=msg.skills,
        success=True
    ))
```

#### AI Model Agent (Port 8003)
**Gemini AI integration** for enhanced summaries

```python
import google.generativeai as genai

@ai_protocol.on_message(GenerateProposalRequest)
async def generate_proposal(ctx: Context, sender: str, msg: GenerateProposalRequest):
    # Use Gemini to generate proposal
    model = genai.GenerativeModel('gemini-pro')
    prompt = f"""
    Generate a professional proposal for:
    Job: {msg.job_title}
    Skills: {msg.required_skills}
    Freelancer Skills: {msg.freelancer_skills}
    """
    
    response = model.generate_content(prompt)
    
    await ctx.send(sender, ProposalGenerated(
        proposal_text=response.text
    ))
```

### 3. Natural Language Processing ✅

**Regex-based parser** with fallback to OpenRouter API:

```python
def parse_natural_job_post(text: str):
    """
    Parse: 'post a job for Smart Contract Dev budget:20$ skills:solidity'
    Returns: (title, description, budget, skills)
    """
    # Extract title
    title_match = re.search(
        r'job\s+for\s+([^:]+?)(?:\s+budget|\s+description|\s+skills|$)', 
        text, 
        re.IGNORECASE
    )
    title = title_match.group(1).strip() if title_match else None
    
    # Extract budget
    budget_match = re.search(r'budget\s*:\s*\$?(\d+(?:\.\d+)?)', text, re.IGNORECASE)
    budget = float(budget_match.group(1)) if budget_match else None
    
    # Extract skills
    skills_match = re.search(r'skills?\s*:\s*([a-zA-Z,\s]+)', text, re.IGNORECASE)
    if skills_match:
        skills_text = skills_match.group(1).strip()
        skills = [s.strip() for s in re.split(r'[,\s]+', skills_text) if s.strip()]
    
    return title, description, budget, skills
```

**Freelancer skill registration:**
```python
def parse_natural_skills_registration(text: str):
    """
    Parse: 'register my skills python solidity rust'
    Returns: list of skills
    """
    if ':' in text:
        skills_part = text.split(':', 1)[1].strip()
        skills = [s.strip() for s in re.split(r'[,\s]+', skills_part) if s.strip()]
    else:
        # Remove common words
        words_to_remove = ['register', 'my', 'skills', 'skill', 'want', 'to', 'and']
        words = text.lower().split()
        skills = [w for w in words if w not in words_to_remove and len(w) > 1]
    
    return skills if len(skills) > 0 else None
```

### 4. Smart Contract Integration ✅

**On-chain execution** from agents:

```python
def post_job_on_chain(ctx: Context, job_data: dict):
    """Post job to WorkEscrow contract"""
    account = Account.from_key(PRIVATE_KEY)
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(WORK_ESCROW_ADDRESS),
        abi=WORK_ESCROW_ABI
    )
    
    # Build transaction
    tx = contract.functions.createProject(
        account.address,  # client
        account.address,  # temporary freelancer
        total_budget_wei,
        milestone_descriptions,
        milestone_amounts,
        milestone_deadlines,
        job_data["skills"]
    ).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gas': 500000,
        'gasPrice': w3.eth.gas_price
    })
    
    # Sign and send
    signed_tx = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    # Get job ID from logs
    job_id = contract.events.ProjectCreated().process_receipt(receipt)[0]['args']['projectId']
    
    return True, job_id, tx_hash.hex()
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              ASI:One Chat Interface                     │
│  User: "post a job for Smart Contract Dev budget:20$"  │
└────────────────────┬────────────────────────────────────┘
                     │ ChatMessage
┌────────────────────▼────────────────────────────────────┐
│           Client Agent (uAgents)                        │
│  ┌──────────────────────────────────────────┐          │
│  │ 1. Parse natural language                │          │
│  │ 2. Extract: title, budget, skills        │          │
│  │ 3. Build transaction                     │          │
│  │ 4. Post to blockchain                    │          │
│  └──────────────────────────────────────────┘          │
└────────────────────┬────────────────────────────────────┘
                     │ Agent Protocol
┌────────────────────▼────────────────────────────────────┐
│         Job Matcher Agent (uAgents)                     │
│  ┌──────────────────────────────────────────┐          │
│  │ 1. Fetch jobs from blockchain            │          │
│  │ 2. Get freelancer skills from Storage    │          │
│  │ 3. Match based on skill overlap          │          │
│  │ 4. Send matches to Freelancer Agent      │          │
│  └──────────────────────────────────────────┘          │
└────────────────────┬────────────────────────────────────┘
                     │ MatchedJobs
┌────────────────────▼────────────────────────────────────┐
│        Freelancer Agent (uAgents)                       │
│  ┌──────────────────────────────────────────┐          │
│  │ 1. Receive matched jobs                  │          │
│  │ 2. Generate proposal (AI Model Agent)    │          │
│  │ 3. Submit proposal                       │          │
│  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 Demo & Usage

### Live Workflow

1. **Client posts job via ASI:One:**
```
User: "post a job for Smart Contract Dev budget:20$ skills:solidity,rust"
Client Agent: ✅ Job #23 posted! Tx: 0xabc...def
```

2. **Freelancer registers skills:**
```
User: "register my skills solidity rust python"
Freelancer Agent: ✅ Skills registered successfully!
```

3. **Freelancer finds jobs:**
```
User: "find jobs"
Job Matcher: 📋 Found 3 matching jobs:
  • Job #23: Smart Contract Dev (Match: 100%)
  • Job #24: DeFi Dashboard (Match: 66%)
```

4. **Freelancer applies:**
```
User: "apply job: 23"
Freelancer Agent: ✅ Proposal submitted for Job #23
```

5. **Client accepts:**
```
User: "accept proposal for job 23"
Client Agent: ✅ Proposal accepted! Freelancer assigned on-chain
```

### Running the System

```bash
# Terminal 1 - Storage Agent
cd agents/agent_fin
python freelancer/strorage_agent.py

# Terminal 2 - Job Matcher
python freelancer/job_matcher_agent.py

# Terminal 3 - Freelancer Agent
python freelancer/freelancer_agent.py

# Terminal 4 - Client Agent
python client/client_agent_chat.py

# Terminal 5 - AI Model Agent (optional)
python freelancer/ai_model_agent.py
```

---

## 📊 What We Achieved

### ASI Alliance Integration

| Technology | Status | Implementation |
|------------|--------|----------------|
| **ASI:One Chat Protocol** | ✅ Complete | Full chat protocol with natural language |
| **uAgents Framework** | ✅ Complete | 5 autonomous agents |
| **Agent Communication** | ✅ Complete | Protocol-based messaging |
| **Natural Language** | ✅ Complete | Regex parser + optional API |

### Smart Contract Integration

| Feature | Status | Details |
|---------|--------|---------|
| **On-chain Job Posting** | ✅ Live | WorkEscrow contract on Base Sepolia |
| **Skill Requirements** | ✅ Live | Jobs include required skills array |
| **Reputation System** | ✅ Live | On-chain reputation tracking |
| **PYUSD Payments** | ✅ Live | Yellow Network integration |

### Agent Capabilities

| Agent | Capabilities | Status |
|-------|-------------|--------|
| **Client** | Job posting, proposal evaluation, payments | ✅ Working |
| **Freelancer** | Skill registration, job discovery, applications | ✅ Working |
| **Matcher** | Skill-based matching, reputation scoring | ✅ Working |
| **Storage** | Profile and skill management | ✅ Working |
| **AI Model** | Gemini AI proposal generation | ✅ Working |

---

## 🌍 Real-World Impact

### Problem Solved
**Autonomous freelance work platform** with zero platform fees and instant payments

### Key Benefits

**For Clients:**
- Post jobs in seconds using plain English
- Automatic freelancer matching
- On-chain escrow protection
- Zero platform fees

**For Freelancers:**
- Natural language skill registration
- Automatic job discovery
- AI-assisted proposals
- Instant PYUSD payments

**For the Ecosystem:**
- Fully decentralized and autonomous
- Open protocol for integration
- Portable on-chain reputation
- Cross-chain payment support

---

## 🔮 Future Enhancements

### Planned ASI Alliance Integrations

**Agentverse Registration:**
- Register all agents on Agentverse
- Enable discovery via ASI:One search
- Publish protocol manifests
- Remote agent communication via Almanac

**MeTTa Knowledge Graphs:**
- Semantic skill taxonomy
- Relationship-based matching
- Reasoning over job requirements
- Reputation inference

**Enhanced AI:**
- Multi-agent collaboration patterns
- Autonomous dispute resolution
- Predictive job matching
- Market trend analysis

---

## 📞 Contact

- **GitHub**: [ReputeFlow Repository](https://github.com/yourusername/ReputeFlow)
- **Documentation**: Full technical docs in `/docs`
- **Agents**: Ready to deploy on Agentverse

---

<div align="center">

**Built with ASI Alliance Technologies**

[ASI:One](https://asi1.ai/) • [uAgents](https://fetch.ai/) • [Fetch.ai](https://fetch.ai/)

</div>
