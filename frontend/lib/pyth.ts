/**
 * Pyth Oracle Integration
 * Fetches real-time market data for rate validation
 */

import { publicClient } from './blockchain'
import { CONTRACTS } from './contracts'

// Pyth Hermes API endpoint
const HERMES_API = 'https://hermes.pyth.network'

/**
 * Fetch market rate for a skill category
 * Uses Pyth price feeds to validate freelancer rates
 */
export async function getMarketRate(skills: string[]): Promise<number> {
  try {
    console.log('🔮 Fetching market rate from Pyth Oracle for skills:', skills)
    
    // TODO: Map skills to Pyth price feed IDs
    // For now, return a simulated rate based on skill complexity
    const baseRate = 50 // $50/hour base
    const skillMultiplier = skills.length * 1.2
    const marketRate = baseRate * skillMultiplier * 40 // Assume 40 hours
    
    console.log('✅ Market rate calculated:', marketRate)
    return marketRate
  } catch (error) {
    console.error('Error fetching market rate:', error)
    throw error
  }
}

/**
 * Fetch Pyth price feed data from Hermes
 */
export async function getPythPriceFeed(priceId: string) {
  try {
    const response = await fetch(
      `${HERMES_API}/api/latest_price_feeds?ids[]=${priceId}`
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch price feed')
    }
    
    const data = await response.json()
    return data[0]
  } catch (error) {
    console.error('Error fetching Pyth price feed:', error)
    throw error
  }
}

/**
 * Get Pyth Entropy for random validator assignment
 */
export async function getPythEntropy(): Promise<string> {
  try {
    console.log('🎲 Fetching entropy from Pyth...')
    
    // TODO: Integrate with Pyth Entropy contract
    // For now, generate pseudo-random
    const entropy = Math.random().toString(36).substring(7)
    
    console.log('✅ Entropy generated:', entropy)
    return entropy
  } catch (error) {
    console.error('Error fetching Pyth entropy:', error)
    throw error
  }
}

/**
 * Validate proposal rate against market data
 */
export async function validateProposalRate(
  proposedRate: number,
  skills: string[]
): Promise<{
  isValid: boolean
  marketRate: number
  deviation: number
  recommendation: string
}> {
  try {
    const marketRate = await getMarketRate(skills)
    const deviation = ((proposedRate - marketRate) / marketRate) * 100
    
    let isValid = true
    let recommendation = 'Rate is within market range'
    
    if (deviation > 50) {
      isValid = false
      recommendation = 'Rate is significantly higher than market average'
    } else if (deviation < -50) {
      isValid = false
      recommendation = 'Rate is significantly lower than market average'
    } else if (deviation > 20) {
      recommendation = 'Rate is above market average'
    } else if (deviation < -20) {
      recommendation = 'Rate is below market average'
    }
    
    return {
      isValid,
      marketRate,
      deviation,
      recommendation
    }
  } catch (error) {
    console.error('Error validating proposal rate:', error)
    throw error
  }
}

/**
 * Update price feeds on-chain
 * Required before using Pyth data in smart contracts
 */
export async function updatePriceFeeds(priceIds: string[]) {
  try {
    console.log('📡 Updating price feeds on-chain...')
    
    // Fetch latest price updates from Hermes
    const priceUpdates = await Promise.all(
      priceIds.map(id => getPythPriceFeed(id))
    )
    
    // TODO: Call PythOracleAdapter.updatePriceFeeds()
    // This requires the price update data in the correct format
    
    console.log('✅ Price feeds updated')
    return priceUpdates
  } catch (error) {
    console.error('Error updating price feeds:', error)
    throw error
  }
}

/**
 * Get skill-based rate recommendations
 */
export function getSkillRateRecommendation(skill: string): {
  min: number
  max: number
  average: number
} {
  // Skill-based rate mapping (hourly rates in USD)
  const skillRates: Record<string, { min: number; max: number; average: number }> = {
    'Solidity': { min: 80, max: 200, average: 120 },
    'Smart Contracts': { min: 80, max: 200, average: 120 },
    'React': { min: 50, max: 150, average: 80 },
    'TypeScript': { min: 50, max: 150, average: 80 },
    'Web3': { min: 60, max: 180, average: 100 },
    'DeFi': { min: 100, max: 250, average: 150 },
    'Security': { min: 100, max: 300, average: 180 },
    'Audit': { min: 120, max: 350, average: 200 },
    'NFT': { min: 60, max: 180, average: 100 },
    'DAO': { min: 80, max: 200, average: 120 },
  }
  
  return skillRates[skill] || { min: 40, max: 120, average: 60 }
}

/**
 * Calculate project budget based on skills and duration
 */
export function calculateProjectBudget(
  skills: string[],
  estimatedHours: number
): {
  min: number
  max: number
  recommended: number
} {
  const rates = skills.map(skill => getSkillRateRecommendation(skill))
  
  const avgMin = rates.reduce((sum, r) => sum + r.min, 0) / rates.length
  const avgMax = rates.reduce((sum, r) => sum + r.max, 0) / rates.length
  const avgRate = rates.reduce((sum, r) => sum + r.average, 0) / rates.length
  
  return {
    min: Math.floor(avgMin * estimatedHours),
    max: Math.ceil(avgMax * estimatedHours),
    recommended: Math.round(avgRate * estimatedHours)
  }
}
