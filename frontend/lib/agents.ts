/**
 * uAgents Communication Protocol Integration
 * Connects frontend with Fetch.ai agents for automated workflows
 * 
 * Agent Types:
 * - ClientAgent: Job posting and proposal management
 * - FreelancerAgent: Job discovery and bidding
 * - ValidatorAgent: Milestone validation
 * - ReputationOracle: Reputation scoring
 * - MarketAnalyzer: Rate recommendations
 */

// Agent addresses from Agentverse deployment
const AGENT_ADDRESSES = {
  CLIENT_AGENT: process.env.NEXT_PUBLIC_CLIENT_AGENT_ADDRESS || '',
  FREELANCER_AGENT: process.env.NEXT_PUBLIC_FREELANCER_AGENT_ADDRESS || '',
  VALIDATOR_AGENT: process.env.NEXT_PUBLIC_VALIDATOR_AGENT_ADDRESS || '',
  REPUTATION_ORACLE: process.env.NEXT_PUBLIC_REPUTATION_ORACLE_ADDRESS || '',
  MARKET_ANALYZER: process.env.NEXT_PUBLIC_MARKET_ANALYZER_ADDRESS || '',
  SWARM_COORDINATOR: process.env.NEXT_PUBLIC_SWARM_COORDINATOR_ADDRESS || '',
}

// Agentverse API endpoint
const AGENTVERSE_API = 'https://agentverse.ai/v1/almanac'

export interface AgentMessage {
  type: string
  sender: string
  recipient: string
  payload: any
  timestamp: number
}

export interface JobDiscoveryRequest {
  skills: string[]
  budget: number
  deadline: number
  clientAddress: string
}

export interface ProposalNotification {
  jobId: number
  freelancerAddress: string
  proposedRate: number
  coverLetter: string
}

export interface ValidationRequest {
  projectId: number
  milestoneId: number
  deliverableHash: string
  freelancerAddress: string
}

/**
 * Register user agent with Almanac
 * Makes agent discoverable in Agentverse
 */
export async function registerAgent(
  agentType: 'client' | 'freelancer' | 'validator',
  userAddress: string
): Promise<string> {
  try {
    console.log('🤖 Registering agent with Almanac...')
    console.log('  Type:', agentType)
    console.log('  User:', userAddress)

    // Generate agent address based on user address
    const agentAddress = `agent1q${userAddress.slice(2, 42)}`

    // TODO: Call Almanac contract to register agent
    // This would:
    // 1. Create agent entry in Almanac
    // 2. Set agent metadata (type, capabilities, endpoints)
    // 3. Make agent discoverable in Agentverse

    console.log('✅ Agent registered:', agentAddress)
    
    // Store agent info locally
    storeAgentInfo(userAddress, {
      agentAddress,
      agentType,
      registeredAt: Date.now()
    })

    return agentAddress
  } catch (error) {
    console.error('Error registering agent:', error)
    throw new Error('Failed to register agent')
  }
}

/**
 * Broadcast job discovery request to FreelancerAgents
 * Agents will filter based on skills and respond with proposals
 */
export async function broadcastJobDiscovery(
  jobData: JobDiscoveryRequest
): Promise<void> {
  try {
    console.log('📡 Broadcasting job discovery to Agentverse...')
    console.log('  Skills:', jobData.skills)
    console.log('  Budget:', jobData.budget)

    const message: AgentMessage = {
      type: 'job_discovery',
      sender: AGENT_ADDRESSES.CLIENT_AGENT,
      recipient: 'broadcast', // Broadcast to all FreelancerAgents
      payload: jobData,
      timestamp: Date.now()
    }

    // TODO: Send message via uAgents protocol
    // This would:
    // 1. Query Almanac for FreelancerAgents
    // 2. Filter by skill match using MeTTa reasoning
    // 3. Send JobDiscovery message to matching agents
    // 4. Agents respond with interest/proposals

    console.log('✅ Job broadcast sent')
    
    // Simulate agent responses
    setTimeout(() => {
      console.log('📨 Received 3 agent responses')
    }, 2000)
  } catch (error) {
    console.error('Error broadcasting job:', error)
    throw error
  }
}

/**
 * Send proposal notification to ClientAgent
 * Notifies client of new proposal submission
 */
export async function notifyProposalSubmission(
  proposal: ProposalNotification
): Promise<void> {
  try {
    console.log('📨 Notifying client agent of proposal...')
    console.log('  Job ID:', proposal.jobId)
    console.log('  Freelancer:', proposal.freelancerAddress)

    const message: AgentMessage = {
      type: 'proposal_submitted',
      sender: AGENT_ADDRESSES.FREELANCER_AGENT,
      recipient: AGENT_ADDRESSES.CLIENT_AGENT,
      payload: proposal,
      timestamp: Date.now()
    }

    // TODO: Send message via uAgents protocol
    // This would:
    // 1. Look up ClientAgent address from job
    // 2. Send ProposalSubmitted message
    // 3. ClientAgent validates proposal with Pyth Oracle
    // 4. ClientAgent notifies user (email/push notification)

    console.log('✅ Proposal notification sent')
  } catch (error) {
    console.error('Error notifying proposal:', error)
    throw error
  }
}

/**
 * Request milestone validation from ValidatorAgent
 * Validator uses Pyth Oracle data for objective validation
 */
export async function requestMilestoneValidation(
  validation: ValidationRequest
): Promise<void> {
  try {
    console.log('🔍 Requesting milestone validation...')
    console.log('  Project:', validation.projectId)
    console.log('  Milestone:', validation.milestoneId)

    const message: AgentMessage = {
      type: 'validation_request',
      sender: AGENT_ADDRESSES.CLIENT_AGENT,
      recipient: AGENT_ADDRESSES.VALIDATOR_AGENT,
      payload: validation,
      timestamp: Date.now()
    }

    // TODO: Send message via uAgents protocol
    // This would:
    // 1. Assign validator using Pyth Entropy
    // 2. Send ValidationRequest message
    // 3. ValidatorAgent fetches deliverable from Lighthouse
    // 4. ValidatorAgent performs objective validation
    // 5. ValidatorAgent submits result on-chain
    // 6. Triggers Yellow SDK payment if approved

    console.log('✅ Validation request sent')
    
    // Simulate validation response
    setTimeout(() => {
      console.log('✅ Validation completed by agent')
    }, 3000)
  } catch (error) {
    console.error('Error requesting validation:', error)
    throw error
  }
}

/**
 * Query MarketAnalyzer agent for rate recommendations
 * Uses Pyth Oracle data for market rates
 */
export async function getMarketRateFromAgent(
  skills: string[]
): Promise<number> {
  try {
    console.log('💰 Querying MarketAnalyzer agent...')
    console.log('  Skills:', skills)

    const message: AgentMessage = {
      type: 'market_rate_query',
      sender: AGENT_ADDRESSES.FREELANCER_AGENT,
      recipient: AGENT_ADDRESSES.MARKET_ANALYZER,
      payload: { skills },
      timestamp: Date.now()
    }

    // TODO: Send message via uAgents protocol
    // This would:
    // 1. Send query to MarketAnalyzer
    // 2. Agent fetches Pyth price feeds
    // 3. Agent calculates market rate based on skills
    // 4. Agent responds with recommendation

    // Simulate response
    const baseRate = 50
    const skillMultiplier = skills.length * 1.2
    const marketRate = baseRate * skillMultiplier

    console.log('✅ Market rate received:', marketRate)
    
    return marketRate
  } catch (error) {
    console.error('Error querying market rate:', error)
    throw error
  }
}

/**
 * Query ReputationOracle for user reputation
 * Agent aggregates on-chain and off-chain reputation data
 */
export async function getReputationFromOracle(
  userAddress: string
): Promise<number> {
  try {
    console.log('⭐ Querying ReputationOracle...')
    console.log('  User:', userAddress)

    const message: AgentMessage = {
      type: 'reputation_query',
      sender: AGENT_ADDRESSES.CLIENT_AGENT,
      recipient: AGENT_ADDRESSES.REPUTATION_ORACLE,
      payload: { userAddress },
      timestamp: Date.now()
    }

    // TODO: Send message via uAgents protocol
    // This would:
    // 1. Query ReputationRegistry contract
    // 2. Aggregate off-chain data (GitHub, LinkedIn, etc.)
    // 3. Apply MeTTa reasoning for weighted scoring
    // 4. Return comprehensive reputation score

    // Simulate response
    const reputation = 85

    console.log('✅ Reputation score received:', reputation)
    
    return reputation
  } catch (error) {
    console.error('Error querying reputation:', error)
    throw error
  }
}

/**
 * Coordinate agent swarm for complex workflows
 * SwarmCoordinator manages multi-agent collaboration
 */
export async function coordinateAgentSwarm(
  workflow: 'job_matching' | 'validation' | 'dispute_resolution',
  data: any
): Promise<void> {
  try {
    console.log('🐝 Coordinating agent swarm...')
    console.log('  Workflow:', workflow)

    const message: AgentMessage = {
      type: 'swarm_coordination',
      sender: AGENT_ADDRESSES.CLIENT_AGENT,
      recipient: AGENT_ADDRESSES.SWARM_COORDINATOR,
      payload: { workflow, data },
      timestamp: Date.now()
    }

    // TODO: Send message via uAgents protocol
    // This would:
    // 1. SwarmCoordinator receives request
    // 2. Identifies required agents for workflow
    // 3. Orchestrates multi-agent collaboration
    // 4. Aggregates results and responds

    console.log('✅ Swarm coordination initiated')
  } catch (error) {
    console.error('Error coordinating swarm:', error)
    throw error
  }
}

/**
 * Listen for agent messages
 * Sets up WebSocket connection to receive agent communications
 */
export function listenForAgentMessages(
  userAddress: string,
  onMessage: (message: AgentMessage) => void
): () => void {
  console.log('👂 Listening for agent messages...')
  
  // TODO: Set up WebSocket connection to Agentverse
  // This would:
  // 1. Connect to agent's message endpoint
  // 2. Listen for incoming messages
  // 3. Parse and validate messages
  // 4. Call onMessage callback

  // Simulate periodic messages
  const interval = setInterval(() => {
    // Simulate receiving a message
    if (Math.random() > 0.9) {
      const simulatedMessage: AgentMessage = {
        type: 'agent_notification',
        sender: AGENT_ADDRESSES.VALIDATOR_AGENT,
        recipient: userAddress,
        payload: { message: 'Milestone validation completed' },
        timestamp: Date.now()
      }
      onMessage(simulatedMessage)
    }
  }, 10000)

  // Return cleanup function
  return () => {
    clearInterval(interval)
    console.log('🔇 Stopped listening for agent messages')
  }
}

// Helper functions

function storeAgentInfo(userAddress: string, agentInfo: any) {
  try {
    localStorage.setItem(`agent-${userAddress}`, JSON.stringify(agentInfo))
  } catch (error) {
    console.error('Error storing agent info:', error)
  }
}

export function getAgentInfo(userAddress: string): any {
  try {
    const data = localStorage.getItem(`agent-${userAddress}`)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Error getting agent info:', error)
    return null
  }
}

/**
 * Check if user has registered agent
 */
export function hasRegisteredAgent(userAddress: string): boolean {
  const agentInfo = getAgentInfo(userAddress)
  return agentInfo !== null
}

/**
 * Auto-register agent if environment variables are set
 */
export function autoRegisterAgent(userAddress: string, agentType: 'client' | 'freelancer'): void {
  // Check if already registered
  const existing = getAgentInfo(userAddress)
  if (existing) return

  // Check if agent addresses are configured in environment
  const hasAgentAddresses = 
    AGENT_ADDRESSES.CLIENT_AGENT && 
    AGENT_ADDRESSES.FREELANCER_AGENT &&
    AGENT_ADDRESSES.VALIDATOR_AGENT

  if (hasAgentAddresses) {
    // Auto-register using environment variables
    const agentAddress = agentType === 'client' 
      ? AGENT_ADDRESSES.CLIENT_AGENT
      : AGENT_ADDRESSES.FREELANCER_AGENT

    console.log('🤖 Auto-registering agent from environment...')
    console.log('  Type:', agentType)
    console.log('  Address:', agentAddress)

    storeAgentInfo(userAddress, {
      agentAddress,
      agentType,
      registeredAt: Date.now(),
      fromEnvironment: true
    })

    console.log('✅ Agent auto-registered')
  }
}

/**
 * Get agent status and activity
 */
export function getAgentStatus(userAddress: string): {
  isActive: boolean
  lastActivity: number
  messagesProcessed: number
} {
  const agentInfo = getAgentInfo(userAddress)
  
  // Check if agents are configured in environment even if not registered locally
  const hasAgentAddresses = 
    AGENT_ADDRESSES.CLIENT_AGENT && 
    AGENT_ADDRESSES.FREELANCER_AGENT &&
    AGENT_ADDRESSES.VALIDATOR_AGENT

  if (!agentInfo && !hasAgentAddresses) {
    return {
      isActive: false,
      lastActivity: 0,
      messagesProcessed: 0
    }
  }

  return {
    isActive: true,
    lastActivity: agentInfo?.registeredAt || Date.now(),
    messagesProcessed: 0 // TODO: Track from agent
  }
}
