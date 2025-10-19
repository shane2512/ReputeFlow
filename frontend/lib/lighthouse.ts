/**
 * Lighthouse Storage Integration
 * Decentralized storage for job metadata to reduce gas costs
 */

import lighthouse from '@lighthouse-web3/sdk'

// Lighthouse configuration
const LIGHTHOUSE_API_KEY = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY || ''

/**
 * Upload job metadata to Lighthouse
 * Returns IPFS CID for on-chain storage
 */
export async function uploadJobMetadata(metadata: {
  title: string
  description: string
  skills: string[]
  milestones: {
    description: string
    amount: number
    deadline: number
  }[]
  budget: number
  createdAt: number
}) {
  try {
    console.log('Uploading job metadata to Lighthouse...')
    
    // Convert metadata to JSON string
    const jsonData = JSON.stringify(metadata, null, 2)
    
    // Upload to Lighthouse
    const response = await lighthouse.uploadText(
      jsonData,
      LIGHTHOUSE_API_KEY
    )
    
    const cid = response.data.Hash
    console.log('Metadata uploaded to Lighthouse! CID:', cid)
    console.log('View at: https://gateway.lighthouse.storage/ipfs/' + cid)
    
    return cid
  } catch (error) {
    console.error('Error uploading to Lighthouse:', error)
    throw new Error('Failed to upload metadata to Lighthouse')
  }
}

/**
 * Retrieve job metadata from Lighthouse
 */
export async function getJobMetadata(cid: string) {
  try {
    console.log('Fetching metadata from Lighthouse:', cid)
    
    const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${cid}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch from Lighthouse')
    }
    
    const metadata = await response.json()
    console.log('Metadata retrieved:', metadata)
    
    return metadata
  } catch (error) {
    console.error('Error fetching from Lighthouse:', error)
    return null
  }
}

/**
 * Upload freelancer profile to Lighthouse
 */
export async function uploadFreelancerProfile(profile: {
  name: string
  title: string
  bio: string
  skills: string[]
  hourlyRate: number
  portfolio?: string[]
}) {
  try {
    console.log('Uploading freelancer profile to Lighthouse...')
    
    const jsonData = JSON.stringify(profile, null, 2)
    const response = await lighthouse.uploadText(jsonData, LIGHTHOUSE_API_KEY)
    
    const cid = response.data.Hash
    console.log('Profile uploaded! CID:', cid)
    
    return cid
  } catch (error) {
    console.error('Error uploading profile:', error)
    throw new Error('Failed to upload profile to Lighthouse')
  }
}

/**
 * Upload work deliverable to Lighthouse
 */
export async function uploadDeliverable(file: File) {
  try {
    console.log('Uploading deliverable to Lighthouse...')
    
    const response = await lighthouse.upload(
      [file],
      LIGHTHOUSE_API_KEY
    )
    
    const cid = response.data.Hash
    console.log('Deliverable uploaded! CID:', cid)
    
    return cid
  } catch (error) {
    console.error('Error uploading deliverable:', error)
    throw new Error('Failed to upload deliverable to Lighthouse')
  }
}

/**
 * Check if Lighthouse is configured
 */
export function isLighthouseConfigured(): boolean {
  return LIGHTHOUSE_API_KEY !== ''
}

/**
 * Get Lighthouse gateway URL for a CID
 */
export function getLighthouseUrl(cid: string): string {
  return `https://gateway.lighthouse.storage/ipfs/${cid}`
}
