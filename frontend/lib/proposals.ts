/**
 * Proposal Management System
 * Stores and retrieves proposals using Lighthouse
 */

import lighthouse from '@lighthouse-web3/sdk'

const LIGHTHOUSE_API_KEY = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY || ''

export interface Proposal {
  id: string
  jobId: number
  freelancer: string
  clientAddress?: string
  proposedRate: number
  estimatedDuration: number
  coverLetter: string
  milestoneApproach: string
  marketRate: number | null
  submittedAt: number
  status: 'pending' | 'accepted' | 'rejected'
  cid?: string
}

/**
 * Upload proposal to Lighthouse
 */
export async function uploadProposal(proposal: Omit<Proposal, 'id' | 'cid' | 'status'>): Promise<string> {
  try {
    console.log('📦 Uploading proposal to Lighthouse...')
    console.log('  Proposal data received:', {
      jobId: proposal.jobId,
      freelancer: proposal.freelancer,
      clientAddress: proposal.clientAddress,
      proposedRate: proposal.proposedRate
    })
    
    const proposalData: Proposal = {
      ...proposal,
      id: `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending' as const
    }
    
    const jsonData = JSON.stringify(proposalData, null, 2)
    const response = await lighthouse.uploadText(jsonData, LIGHTHOUSE_API_KEY)
    
    const cid = response.data.Hash
    console.log('✅ Proposal uploaded! CID:', cid)
    
    // Store proposal reference in localStorage for now
    // In production, this would be stored on-chain or in a backend
    try {
      storeProposalReference(proposal.jobId, {
        ...proposalData,
        cid
      })
    } catch (storeError) {
      console.error('❌ Error storing proposal reference:', storeError)
      // Don't fail the whole operation if storage fails
    }
    
    return cid
  } catch (error) {
    console.error('Error uploading proposal:', error)
    throw new Error('Failed to upload proposal to Lighthouse')
  }
}

/**
 * Fetch proposal from Lighthouse
 */
export async function getProposal(cid: string): Promise<Proposal | null> {
  try {
    const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${cid}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch proposal')
    }
    
    const proposal = await response.json()
    return proposal
  } catch (error) {
    console.error('Error fetching proposal:', error)
    return null
  }
}

/**
 * Store proposal reference in localStorage
 * Maps jobId -> array of proposal CIDs
 */
function storeProposalReference(jobId: number, proposal: Proposal) {
  try {
    console.log('💾 Storing proposal reference...')
    console.log('  Job ID:', jobId)
    console.log('  Freelancer:', proposal.freelancer)
    console.log('  Client Address:', proposal.clientAddress)
    
    const key = `proposals-job-${jobId}`
    const existing = localStorage.getItem(key)
    const proposals: Proposal[] = existing ? JSON.parse(existing) : []
    
    proposals.push(proposal)
    localStorage.setItem(key, JSON.stringify(proposals))
    
    // Also store in global proposals list
    const allKey = 'all-proposals'
    const allExisting = localStorage.getItem(allKey)
    const allProposals: Proposal[] = allExisting ? JSON.parse(allExisting) : []
    allProposals.push(proposal)
    localStorage.setItem(allKey, JSON.stringify(allProposals))
    
    console.log('✅ Proposal stored successfully')
    console.log('  Total proposals for this job:', proposals.length)
    console.log('  Total proposals overall:', allProposals.length)
  } catch (error) {
    console.error('Error storing proposal reference:', error)
  }
}

/**
 * Get all proposals for a job
 */
export function getProposalsForJob(jobId: number): Proposal[] {
  try {
    const key = `proposals-job-${jobId}`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error getting proposals:', error)
    return []
  }
}

/**
 * Get all proposals for jobs created by a client
 */
export function getProposalsForClient(clientAddress: string): Proposal[] {
  try {
    console.log('📝 Fetching proposals for client:', clientAddress)
    
    const allKey = 'all-proposals'
    const data = localStorage.getItem(allKey)
    const allProposals: Proposal[] = data ? JSON.parse(data) : []
    
    console.log('📊 Total proposals in storage:', allProposals.length)
    
    if (allProposals.length > 0) {
      console.log('Sample proposal:', {
        jobId: allProposals[0].jobId,
        freelancer: allProposals[0].freelancer,
        clientAddress: allProposals[0].clientAddress,
        status: allProposals[0].status
      })
    }
    
    // Filter proposals by client address (stored in proposal)
    const clientProposals = allProposals.filter(p => {
      const isMatch = p.clientAddress?.toLowerCase() === clientAddress.toLowerCase()
      if (!isMatch && allProposals.length > 0) {
        console.log('  Proposal not matched:', {
          proposalClient: p.clientAddress,
          searchingFor: clientAddress,
          match: isMatch
        })
      }
      return isMatch
    })
    
    console.log('✅ Found', clientProposals.length, 'proposals for client')
    return clientProposals
  } catch (error) {
    console.error('Error getting client proposals:', error)
    return []
  }
}

/**
 * Get proposals submitted by a freelancer
 */
export function getProposalsByFreelancer(freelancerAddress: string): Proposal[] {
  try {
    console.log('🔍 Getting proposals for freelancer:', freelancerAddress)
    
    const allKey = 'all-proposals'
    const data = localStorage.getItem(allKey)
    const allProposals: Proposal[] = data ? JSON.parse(data) : []
    
    console.log('📊 Total proposals in storage:', allProposals.length)
    
    if (allProposals.length > 0) {
      console.log('Sample proposal:', {
        freelancer: allProposals[0].freelancer,
        searchingFor: freelancerAddress,
        match: allProposals[0].freelancer?.toLowerCase() === freelancerAddress.toLowerCase()
      })
    }
    
    const filtered = allProposals.filter(p => {
      const match = p.freelancer?.toLowerCase() === freelancerAddress.toLowerCase()
      if (!match && allProposals.length > 0) {
        console.log('❌ Not matched:', {
          proposalFreelancer: p.freelancer,
          searchingFor: freelancerAddress
        })
      }
      return match
    })
    
    console.log('✅ Filtered proposals:', filtered.length)
    return filtered
  } catch (error) {
    console.error('Error getting freelancer proposals:', error)
    return []
  }
}

/**
 * Store accepted proposal mapping (proposal -> project assignment)
 */
function storeAcceptedProposal(proposal: Proposal) {
  try {
    const key = 'accepted-proposals'
    const existing = localStorage.getItem(key)
    const accepted = existing ? JSON.parse(existing) : []
    
    // Store mapping of jobId -> freelancer address
    const mapping = {
      jobId: proposal.jobId,
      freelancerAddress: proposal.freelancer,
      proposalId: proposal.id,
      acceptedAt: Date.now()
    }
    
    // Remove any existing mapping for this job
    const filtered = accepted.filter((a: any) => a.jobId !== proposal.jobId)
    filtered.push(mapping)
    
    localStorage.setItem(key, JSON.stringify(filtered))
    console.log('✅ Stored accepted proposal mapping:', mapping)
  } catch (error) {
    console.error('Error storing accepted proposal:', error)
  }
}

/**
 * Update proposal status
 */
export function updateProposalStatus(proposalId: string, status: 'accepted' | 'rejected') {
  try {
    const allKey = 'all-proposals'
    const data = localStorage.getItem(allKey)
    const allProposals: Proposal[] = data ? JSON.parse(data) : []
    
    const updated = allProposals.map(p => 
      p.id === proposalId ? { ...p, status } : p
    )
    
    localStorage.setItem(allKey, JSON.stringify(updated))
    
    // If accepted, store the mapping
    if (status === 'accepted') {
      const proposal = updated.find(p => p.id === proposalId)
      if (proposal) {
        storeAcceptedProposal(proposal)
      }
    }
  } catch (error) {
    console.error('Error updating proposal status:', error)
  }
}

/**
 * Get project IDs for accepted proposals by freelancer
 */
export function getAcceptedProjectIds(freelancerAddress: string): number[] {
  try {
    const key = 'accepted-proposals'
    const data = localStorage.getItem(key)
    const accepted = data ? JSON.parse(data) : []
    
    return accepted
      .filter((a: any) => a.freelancerAddress?.toLowerCase() === freelancerAddress.toLowerCase())
      .map((a: any) => a.jobId)
  } catch (error) {
    console.error('Error getting accepted project IDs:', error)
    return []
  }
}
