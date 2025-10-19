/**
 * Blockchain Integration Layer
 * Functions to interact with ReputeFlow smart contracts
 */

import { createPublicClient, createWalletClient, custom, http, parseEther } from 'viem'
import { baseSepolia } from 'viem/chains'
import { 
  CONTRACTS, 
  REPUTATION_REGISTRY_ABI, 
  AGENT_MATCHER_ABI, 
  WORK_ESCROW_ABI 
} from './contracts'

// Get RPC URL - prefer Alchemy if available
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
const rpcUrl = alchemyKey && alchemyKey.length > 0 && alchemyKey !== 'your_alchemy_key_here'
  ? `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`
  : 'https://sepolia.base.org'

// Log which RPC we're using (client-side only)
if (typeof window !== 'undefined') {
  console.log(alchemyKey && alchemyKey.length > 0 && alchemyKey !== 'your_alchemy_key_here' 
    ? '🔗 Using Alchemy RPC endpoint' 
    : '🔗 Using public Base Sepolia RPC')
}

// Create public client for reading with retry configuration
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrl, {
    retryCount: 3,
    retryDelay: 1000, // 1 second between retries
  }),
})

// Create wallet client for writing (requires window.ethereum)
export const getWalletClient = () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet detected')
  }
  
  return createWalletClient({
    chain: baseSepolia,
    transport: custom(window.ethereum),
  })
}

// ============================================
// REPUTATION REGISTRY FUNCTIONS
// ============================================

/**
 * Get user's reputation score
 */
export async function getUserReputation(userAddress: `0x${string}`): Promise<number> {
  try {
    const reputation = await publicClient.readContract({
      address: CONTRACTS.REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getReputation',
      args: [userAddress],
    })
    
    return Number(reputation)
  } catch (error: any) {
    // User not registered yet - this is normal for new users
    if (error.message?.includes('reverted')) {
      return 0
    }
    console.error('Error getting reputation:', error)
    return 0
  }
}

/**
 * Get user's skill badges
 */
export async function getUserSkillBadges(userAddress: `0x${string}`): Promise<number[]> {
  try {
    const badges = await publicClient.readContract({
      address: CONTRACTS.REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getSkillBadges',
      args: [userAddress],
    })
    
    return badges.map(b => Number(b))
  } catch (error: any) {
    // User not registered yet - this is normal for new users
    if (error.message?.includes('reverted')) {
      return []
    }
    console.error('Error getting skill badges:', error)
    return []
  }
}

// ============================================
// AGENT MATCHER FUNCTIONS
// ============================================

/**
 * Register as a freelancer agent
 */
export async function registerFreelancer(
  skills: string[],
  hourlyRate: number,
  availability: number,
  reputationScore: number
) {
  try {
    const walletClient = getWalletClient()
    const [account] = await walletClient.getAddresses()
    
    const hash = await walletClient.writeContract({
      address: CONTRACTS.AGENT_MATCHER,
      abi: AGENT_MATCHER_ABI,
      functionName: 'registerAgent',
      args: [account, skills, BigInt(hourlyRate), availability, BigInt(reputationScore)],
      account,
    })
    
    return hash
  } catch (error) {
    console.error('Error registering freelancer:', error)
    throw error
  }
}

/**
 * Find best agent for a job
 */
export async function findBestAgent(
  requiredSkills: string[],
  minReputation: number,
  maxBudget: number
): Promise<`0x${string}` | null> {
  try {
    const agent = await publicClient.readContract({
      address: CONTRACTS.AGENT_MATCHER,
      abi: AGENT_MATCHER_ABI,
      functionName: 'findBestAgent',
      args: [requiredSkills, BigInt(minReputation), BigInt(maxBudget)],
    })
    
    return agent
  } catch (error) {
    console.error('Error finding best agent:', error)
    return null
  }
}

// ============================================
// WORK ESCROW FUNCTIONS
// ============================================

/**
 * Get all projects from all users
 */
export async function getAllProjects() {
  try {
    console.log('Fetching all projects from blockchain...')
    console.log('WorkEscrow address:', CONTRACTS.WORK_ESCROW)
    
    // Get nextProjectId (projects are numbered 1 to nextProjectId-1)
    const nextProjectId = await publicClient.readContract({
      address: CONTRACTS.WORK_ESCROW,
      abi: WORK_ESCROW_ABI,
      functionName: 'nextProjectId',
      args: [],
    })
    
    const projectCount = Number(nextProjectId) - 1 // Projects start at 1
    console.log('Next project ID:', Number(nextProjectId))
    console.log('Total projects:', projectCount)
    
    if (projectCount <= 0) {
      console.log('No projects found on blockchain')
      return []
    }

    // Fetch all projects by ID (1 to nextProjectId-1)
    const projects = []
    for (let i = 1; i <= projectCount; i++) {
      try {
        const projectData = await publicClient.readContract({
          address: CONTRACTS.WORK_ESCROW,
          abi: WORK_ESCROW_ABI,
          functionName: 'getProject',
          args: [BigInt(i)],
        })
        
        // Fetch milestones for this project
        const milestonesData = await publicClient.readContract({
          address: CONTRACTS.WORK_ESCROW,
          abi: WORK_ESCROW_ABI,
          functionName: 'getProjectMilestones',
          args: [BigInt(i)],
        }) as any[]
        
        // Debug: Log raw values from contract
        console.log(`Project ${i} raw totalBudget:`, (projectData as any).totalBudget.toString())
        if (milestonesData.length > 0) {
          console.log(`Project ${i} raw milestone amount:`, milestonesData[0].paymentAmount.toString())
        }
        
        // Transform milestones (amounts are scaled by 1e8 in contract)
        const milestones = milestonesData.map((m: any) => ({
          description: m.description || m[0],
          amount: Number((m.paymentAmount || m[1]) / BigInt(1e8)), // Descale from contract using BigInt division
          deadline: Number(m.deadline || m[2]),
          status: Number(m.status || m[3]),
          completed: Number(m.status || m[3]) === 6, // MilestoneStatus.Paid = 6
        }))
        
        const totalBudget = Number((projectData as any).totalBudget / BigInt(1e8))
        console.log(`Project ${i} descaled totalBudget:`, totalBudget)
        
        projects.push({
          id: i,
          client: (projectData as any).client,
          freelancer: (projectData as any).freelancer,
          totalBudget, // Descaled from contract using BigInt division
          status: Number((projectData as any).status),
          milestones,
        })
      } catch (err) {
        console.error(`Error fetching project ${i}:`, err)
      }
    }

    console.log('All projects fetched:', projects)
    return projects
  } catch (error) {
    console.error('Error fetching all projects:', error)
    return []
  }
}

/**
 * Create a new project with escrow
 */
export async function createProject(
  freelancerAddress: `0x${string}`,
  totalBudget: number,
  milestones: {
    description: string
    amount: number
    deadline: number
  }[]
) {
  try {
    const walletClient = getWalletClient()
    const [account] = await walletClient.getAddresses()
    
    const milestoneDescriptions = milestones.map(m => m.description)
    // Scale amounts by 1e8 for contract (USD with 8 decimals)
    const milestoneAmounts = milestones.map(m => BigInt(Math.floor(m.amount * 1e8)))
    const milestoneDeadlines = milestones.map(m => BigInt(m.deadline))
    const scaledBudget = BigInt(Math.floor(totalBudget * 1e8))
    
    console.log('Creating project with:')
    console.log('  totalBudget (input):', totalBudget)
    console.log('  scaledBudget:', scaledBudget.toString())
    console.log('  milestoneAmounts:', milestoneAmounts.map(a => a.toString()))
    
    const hash = await walletClient.writeContract({
      address: CONTRACTS.WORK_ESCROW,
      abi: WORK_ESCROW_ABI,
      functionName: 'createProject',
      args: [
        account,
        freelancerAddress,
        scaledBudget, // Scale total budget by 1e8
        milestoneDescriptions,
        milestoneAmounts,
        milestoneDeadlines,
      ],
      // No ETH value needed - budget is stored as uint256, not paid upfront
      account,
    })
    
    return hash
  } catch (error) {
    console.error('Error creating project:', error)
    throw error
  }
}

/**
 * Get project details
 */
export async function getProject(projectId: number) {
  try {
    const project = await publicClient.readContract({
      address: CONTRACTS.WORK_ESCROW,
      abi: WORK_ESCROW_ABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    })
    
    return {
      client: project.client,
      freelancer: project.freelancer,
      totalBudget: Number(project.totalBudget),
      status: Number(project.status),
    }
  } catch (error) {
    console.error('Error getting project:', error)
    return null
  }
}

/**
 * Get user's active projects
 */
export async function getUserProjects(userAddress: `0x${string}`) {
  try {
    console.log('📊 Fetching projects for user:', userAddress)
    
    // Get all projects from contract
    const allProjects = await getAllProjects()
    
    // Filter projects where user is either client or freelancer
    const userProjects = allProjects.filter(p => 
      p.client.toLowerCase() === userAddress.toLowerCase() ||
      p.freelancer.toLowerCase() === userAddress.toLowerCase()
    )
    
    console.log('✅ Found', userProjects.length, 'projects for user')
    return userProjects
  } catch (error) {
    console.error('Error fetching user projects:', error)
    return []
  }
}

/**
 * Get all active jobs
 */
export async function getActiveJobs() {
  // This would need to query events or maintain an index
  // For now, return empty array
  // TODO: Implement event querying or use subgraph
  return []
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if user has connected wallet
 */
export function isWalletConnected(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum
}

/**
 * Get connected wallet address
 */
export async function getConnectedAddress(): Promise<`0x${string}` | null> {
  try {
    if (!isWalletConnected()) return null
    
    const walletClient = getWalletClient()
    const [address] = await walletClient.getAddresses()
    return address
  } catch (error) {
    console.error('Error getting connected address:', error)
    return null
  }
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Convert Wei to ETH
 */
export function weiToEth(wei: bigint): number {
  return Number(wei) / 1e18
}

/**
 * Convert ETH to Wei
 */
export function ethToWei(eth: number): bigint {
  return BigInt(Math.floor(eth * 1e18))
}
