/**
 * Milestones Management Hook
 * Handles milestone operations, deliverable submissions, and validator assignments
 */

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { publicClient } from '@/lib/blockchain'
import { CONTRACTS, WORK_ESCROW_ABI } from '@/lib/contracts'
import { getPythEntropy } from '@/lib/pyth'

export interface Milestone {
  description: string
  amount: number
  deadline: number
  status: number
  deliverableHash: string
  submittedAt: number
  approvedAt: number
  validator: string
  completed: boolean
}

export function useMilestones(projectId: number) {
  const { address } = useAccount()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMilestones = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch milestones from contract
      const milestonesData = await publicClient.readContract({
        address: CONTRACTS.WORK_ESCROW,
        abi: WORK_ESCROW_ABI,
        functionName: 'getProjectMilestones',
        args: [BigInt(projectId)],
      }) as any[]

      // Transform milestones
      const transformed: Milestone[] = milestonesData.map((m: any) => ({
        description: m.description || m[0],
        amount: Number((m.paymentAmount || m[1]) / BigInt(1e8)),
        deadline: Number(m.deadline || m[2]),
        status: Number(m.status || m[3]),
        deliverableHash: m.deliverableHash || m[4] || '',
        submittedAt: Number(m.submittedAt || m[5] || 0),
        approvedAt: Number(m.approvedAt || m[6] || 0),
        validator: m.validator || m[7] || '0x0000000000000000000000000000000000000000',
        completed: Number(m.status || m[3]) === 6, // MilestoneStatus.Paid
      }))

      setMilestones(transformed)
    } catch (err: any) {
      console.error('Error fetching milestones:', err)
      setError(err.message || 'Failed to fetch milestones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchMilestones()
    }
  }, [projectId])

  return {
    milestones,
    loading,
    error,
    refetch: fetchMilestones,
  }
}

/**
 * Assign validators to milestones using Pyth Entropy
 */
export async function assignValidators(milestoneCount: number): Promise<string[]> {
  const validators: string[] = []
  
  for (let i = 0; i < milestoneCount; i++) {
    // Use Pyth Entropy for random selection
    const entropy = await getPythEntropy()
    
    // In production, this would:
    // 1. Fetch list of registered validators from AgentMatcher.sol
    // 2. Use entropy to randomly select one
    // 3. Assign via smart contract
    
    // For now, generate a pseudo-validator address
    validators.push(`0x${entropy.padEnd(40, '0')}`)
  }
  
  return validators
}

/**
 * Submit deliverable for a milestone
 */
export async function submitDeliverable(
  projectId: number,
  milestoneId: number,
  deliverableHash: string
): Promise<string> {
  try {
    console.log('Submitting deliverable...')
    
    // TODO: Call WorkEscrow.submitDeliverable()
    // This would:
    // 1. Update milestone status to Submitted
    // 2. Store deliverable hash (Lighthouse CID)
    // 3. Notify validator agent
    
    // Placeholder transaction hash
    return '0x' + Math.random().toString(16).substr(2, 64)
  } catch (error) {
    console.error('Error submitting deliverable:', error)
    throw error
  }
}

/**
 * Approve milestone (client action)
 */
export async function approveMilestone(
  projectId: number,
  milestoneId: number
): Promise<string> {
  try {
    console.log('Approving milestone...')
    
    // TODO: Call WorkEscrow.approveMilestone()
    // This would:
    // 1. Update milestone status to Approved
    // 2. Trigger Yellow SDK payment stream
    // 3. Update ReputationRegistry
    
    return '0x' + Math.random().toString(16).substr(2, 64)
  } catch (error) {
    console.error('Error approving milestone:', error)
    throw error
  }
}

/**
 * Request changes for milestone (client action)
 */
export async function requestMilestoneChanges(
  projectId: number,
  milestoneId: number,
  feedback: string
): Promise<string> {
  try {
    console.log('Requesting changes...')
    
    // TODO: Call WorkEscrow.rejectMilestone()
    // This would:
    // 1. Update milestone status to Rejected
    // 2. Store feedback
    // 3. Notify freelancer agent
    
    return '0x' + Math.random().toString(16).substr(2, 64)
  } catch (error) {
    console.error('Error requesting changes:', error)
    throw error
  }
}

/**
 * Validate milestone (validator action)
 */
export async function validateMilestone(
  projectId: number,
  milestoneId: number,
  approved: boolean,
  validationNotes: string
): Promise<string> {
  try {
    console.log('Validating milestone...')
    
    // TODO: Call WorkEscrow.validateMilestone()
    // This would:
    // 1. Validator agent submits validation result
    // 2. Uses Pyth Oracle data for objective validation
    // 3. Updates milestone status
    // 4. Triggers payment if approved
    
    return '0x' + Math.random().toString(16).substr(2, 64)
  } catch (error) {
    console.error('Error validating milestone:', error)
    throw error
  }
}
