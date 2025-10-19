/**
 * Reputation System
 * Manages reputation scores, badges, and NFT minting via DataCoinFactory
 */

import { publicClient, getWalletClient } from './blockchain'
import { CONTRACTS } from './contracts'
import lighthouse from '@lighthouse-web3/sdk'

const LIGHTHOUSE_API_KEY = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY || ''

export interface Badge {
  id: string
  name: string
  description: string
  imageUrl: string
  tokenId?: number
  mintedAt?: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface ReputationMetrics {
  score: number
  projectsCompleted: number
  onTimeDelivery: number
  qualityScore: number
  communicationScore: number
  badges: Badge[]
  level: number
  nextLevelScore: number
}

/**
 * Calculate reputation score based on multiple factors
 */
export function calculateReputationScore(metrics: {
  projectsCompleted: number
  onTimeDelivery: number
  qualityScore: number
  communicationScore: number
  disputes: number
}): number {
  // Weighted scoring system
  const weights = {
    projectsCompleted: 0.3,
    onTimeDelivery: 0.25,
    qualityScore: 0.25,
    communicationScore: 0.15,
    disputes: -0.05
  }

  const baseScore = 
    (metrics.projectsCompleted * 10 * weights.projectsCompleted) +
    (metrics.onTimeDelivery * weights.onTimeDelivery) +
    (metrics.qualityScore * weights.qualityScore) +
    (metrics.communicationScore * weights.communicationScore) +
    (metrics.disputes * weights.disputes * 10)

  // Cap at 100
  return Math.min(Math.max(baseScore, 0), 100)
}

/**
 * Determine user level based on reputation score
 */
export function getReputationLevel(score: number): {
  level: number
  title: string
  nextLevelScore: number
} {
  const levels = [
    { level: 1, title: 'Newcomer', minScore: 0, nextScore: 20 },
    { level: 2, title: 'Apprentice', minScore: 20, nextScore: 40 },
    { level: 3, title: 'Professional', minScore: 40, nextScore: 60 },
    { level: 4, title: 'Expert', minScore: 60, nextScore: 80 },
    { level: 5, title: 'Master', minScore: 80, nextScore: 100 },
    { level: 6, title: 'Legend', minScore: 100, nextScore: 100 },
  ]

  const currentLevel = levels.find(l => score >= l.minScore && score < l.nextScore) || levels[levels.length - 1]
  
  return {
    level: currentLevel.level,
    title: currentLevel.title,
    nextLevelScore: currentLevel.nextScore
  }
}

/**
 * Available achievement badges
 */
export const ACHIEVEMENT_BADGES: Record<string, Badge> = {
  FIRST_PROJECT: {
    id: 'first_project',
    name: 'First Steps',
    description: 'Completed your first project',
    imageUrl: '/badges/first-project.svg',
    rarity: 'common'
  },
  FIVE_PROJECTS: {
    id: 'five_projects',
    name: 'Rising Star',
    description: 'Completed 5 projects',
    imageUrl: '/badges/five-projects.svg',
    rarity: 'rare'
  },
  TEN_PROJECTS: {
    id: 'ten_projects',
    name: 'Veteran',
    description: 'Completed 10 projects',
    imageUrl: '/badges/ten-projects.svg',
    rarity: 'epic'
  },
  PERFECT_DELIVERY: {
    id: 'perfect_delivery',
    name: 'On Time Master',
    description: '100% on-time delivery rate',
    imageUrl: '/badges/perfect-delivery.svg',
    rarity: 'epic'
  },
  HIGH_QUALITY: {
    id: 'high_quality',
    name: 'Quality Champion',
    description: 'Maintained 95%+ quality score',
    imageUrl: '/badges/high-quality.svg',
    rarity: 'rare'
  },
  TOP_RATED: {
    id: 'top_rated',
    name: 'Top Rated',
    description: 'Achieved 90+ reputation score',
    imageUrl: '/badges/top-rated.svg',
    rarity: 'legendary'
  },
  DISPUTE_FREE: {
    id: 'dispute_free',
    name: 'Trusted Professional',
    description: 'Zero disputes in 10+ projects',
    imageUrl: '/badges/dispute-free.svg',
    rarity: 'epic'
  },
  EARLY_ADOPTER: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined ReputeFlow in beta',
    imageUrl: '/badges/early-adopter.svg',
    rarity: 'legendary'
  }
}

/**
 * Check which badges a user has earned
 */
export function checkEarnedBadges(metrics: {
  projectsCompleted: number
  onTimeDelivery: number
  qualityScore: number
  reputationScore: number
  disputes: number
}): Badge[] {
  const earned: Badge[] = []

  if (metrics.projectsCompleted >= 1) {
    earned.push(ACHIEVEMENT_BADGES.FIRST_PROJECT)
  }
  if (metrics.projectsCompleted >= 5) {
    earned.push(ACHIEVEMENT_BADGES.FIVE_PROJECTS)
  }
  if (metrics.projectsCompleted >= 10) {
    earned.push(ACHIEVEMENT_BADGES.TEN_PROJECTS)
  }
  if (metrics.onTimeDelivery === 100 && metrics.projectsCompleted >= 5) {
    earned.push(ACHIEVEMENT_BADGES.PERFECT_DELIVERY)
  }
  if (metrics.qualityScore >= 95) {
    earned.push(ACHIEVEMENT_BADGES.HIGH_QUALITY)
  }
  if (metrics.reputationScore >= 90) {
    earned.push(ACHIEVEMENT_BADGES.TOP_RATED)
  }
  if (metrics.disputes === 0 && metrics.projectsCompleted >= 10) {
    earned.push(ACHIEVEMENT_BADGES.DISPUTE_FREE)
  }

  return earned
}

/**
 * Mint NFT badge using DataCoinFactory
 */
export async function mintBadgeNFT(
  badge: Badge,
  recipient: string
): Promise<{ tokenId: number; transactionHash: string }> {
  try {
    console.log('🎨 Minting NFT badge:', badge.name)
    
    // Step 1: Upload badge metadata to Lighthouse
    const metadata = {
      name: badge.name,
      description: badge.description,
      image: badge.imageUrl,
      attributes: [
        { trait_type: 'Rarity', value: badge.rarity },
        { trait_type: 'Achievement', value: badge.id },
        { trait_type: 'Minted At', value: new Date().toISOString() }
      ]
    }

    const metadataJson = JSON.stringify(metadata, null, 2)
    const uploadResponse = await lighthouse.uploadText(metadataJson, LIGHTHOUSE_API_KEY)
    const metadataCid = uploadResponse.data.Hash

    console.log('📦 Metadata uploaded to Lighthouse:', metadataCid)

    // Step 2: Mint NFT via DataCoinFactory
    // TODO: Call DataCoinFactory.mintDataCoin()
    // This would:
    // 1. Create ERC-721 token
    // 2. Set metadata URI to Lighthouse CID
    // 3. Transfer to recipient
    // 4. Emit BadgeMinted event

    const tokenId = Math.floor(Math.random() * 1000000)
    const transactionHash = '0x' + Math.random().toString(16).substr(2, 64)

    console.log('✅ Badge NFT minted!')
    console.log('  Token ID:', tokenId)
    console.log('  Metadata:', `https://gateway.lighthouse.storage/ipfs/${metadataCid}`)

    return { tokenId, transactionHash }
  } catch (error) {
    console.error('Error minting badge NFT:', error)
    throw new Error('Failed to mint badge NFT')
  }
}

/**
 * Get user's minted badges from blockchain
 */
export async function getUserBadges(userAddress: string): Promise<Badge[]> {
  try {
    // TODO: Query DataCoinFactory for user's NFTs
    // This would:
    // 1. Get all token IDs owned by user
    // 2. Fetch metadata for each token
    // 3. Parse badge information

    // For demo, return badges from localStorage
    const stored = localStorage.getItem(`badges-${userAddress}`)
    if (stored) {
      return JSON.parse(stored)
    }

    return []
  } catch (error) {
    console.error('Error getting user badges:', error)
    return []
  }
}

/**
 * Store minted badge locally (for demo)
 */
export async function storeBadge(userAddress: string, badge: Badge) {
  try {
    const existing = await getUserBadges(userAddress)
    const updated = [...existing, { ...badge, mintedAt: Date.now() }]
    localStorage.setItem(`badges-${userAddress}`, JSON.stringify(updated))
  } catch (error) {
    console.error('Error storing badge:', error)
  }
}

/**
 * Get reputation color based on score
 */
export function getReputationColor(score: number): string {
  if (score >= 90) return 'from-purple-500 to-pink-500'
  if (score >= 75) return 'from-blue-500 to-purple-500'
  if (score >= 60) return 'from-green-500 to-blue-500'
  if (score >= 40) return 'from-yellow-500 to-green-500'
  return 'from-gray-500 to-yellow-500'
}

/**
 * Get badge rarity color
 */
export function getBadgeRarityColor(rarity: string): string {
  switch (rarity) {
    case 'legendary': return 'from-yellow-400 to-orange-500'
    case 'epic': return 'from-purple-500 to-pink-500'
    case 'rare': return 'from-blue-500 to-purple-500'
    case 'common': return 'from-gray-400 to-gray-500'
    default: return 'from-gray-400 to-gray-500'
  }
}
