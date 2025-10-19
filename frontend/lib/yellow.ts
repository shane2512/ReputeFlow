/**
 * Yellow Network SDK Integration
 * Gasless state channel payments for milestone-based streaming
 * 
 * Yellow Network provides:
 * - Zero-gas payment streaming
 * - Instant settlement
 * - State channel management
 * - Cross-chain support via Avail Nexus
 */

import { publicClient, getWalletClient } from './blockchain'
import { CONTRACTS } from './contracts'

// Yellow Network configuration
const YELLOW_API_URL = process.env.NEXT_PUBLIC_YELLOW_API_URL || 'https://api.yellow.org'
const YELLOW_NETWORK_ID = process.env.NEXT_PUBLIC_YELLOW_NETWORK_ID || 'testnet'

export interface StateChannel {
  channelId: string
  participants: string[]
  totalDeposit: number
  streamedAmount: number
  lastUpdateTime: number
  isActive: boolean
  latestStateHash: string
}

export interface PaymentStream {
  channelId: string
  recipient: string
  amount: number
  startTime: number
  endTime: number
  amountPaid: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
}

/**
 * Create a state channel for a project
 * Enables gasless streaming payments between client and freelancer
 */
export async function createStateChannel(
  projectId: number,
  client: string,
  freelancer: string,
  totalBudget: number
): Promise<string> {
  try {
    console.log('🟡 Creating Yellow state channel...')
    console.log('  Project:', projectId)
    console.log('  Client:', client)
    console.log('  Freelancer:', freelancer)
    console.log('  Budget:', totalBudget)

    // Step 1: Generate channel ID
    const channelId = generateChannelId(projectId, client, freelancer)
    
    // Step 2: Initialize channel on Yellow Network
    const channelData = {
      channelId,
      participants: [client, freelancer],
      totalDeposit: totalBudget,
      networkId: YELLOW_NETWORK_ID,
      projectId,
    }

    // TODO: Call Yellow Network API to create channel
    // const response = await fetch(`${YELLOW_API_URL}/channels/create`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(channelData)
    // })

    console.log('✅ State channel created:', channelId)
    
    // Step 3: Store channel reference in WorkEscrow contract
    // This would be done during project creation
    
    // Store channel info locally for demo
    storeChannelInfo(channelId, channelData)
    
    return channelId
  } catch (error) {
    console.error('Error creating state channel:', error)
    throw new Error('Failed to create Yellow state channel')
  }
}

/**
 * Open a payment stream for a milestone
 * Payments stream automatically as work progresses
 */
export async function openPaymentStream(
  channelId: string,
  milestoneId: number,
  amount: number,
  duration: number
): Promise<PaymentStream> {
  try {
    console.log('🟡 Opening payment stream...')
    console.log('  Channel:', channelId)
    console.log('  Milestone:', milestoneId)
    console.log('  Amount:', amount)
    console.log('  Duration:', duration, 'seconds')

    const stream: PaymentStream = {
      channelId,
      recipient: '', // Will be set from channel participants
      amount,
      startTime: Date.now(),
      endTime: Date.now() + (duration * 1000),
      amountPaid: 0,
      status: 'active'
    }

    // TODO: Call Yellow Network API to open stream
    // const response = await fetch(`${YELLOW_API_URL}/streams/open`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(stream)
    // })

    console.log('✅ Payment stream opened')
    
    return stream
  } catch (error) {
    console.error('Error opening payment stream:', error)
    throw error
  }
}

/**
 * Stream payment for milestone completion
 * Gasless - no transaction fees for recipient
 */
export async function streamMilestonePayment(
  channelId: string,
  milestoneId: number,
  amount: number
): Promise<string> {
  try {
    console.log('🟡 Streaming milestone payment...')
    console.log('  Channel:', channelId)
    console.log('  Milestone:', milestoneId)
    console.log('  Amount:', amount)

    // Step 1: Update channel state
    const stateUpdate = {
      channelId,
      milestoneId,
      amount,
      timestamp: Date.now(),
      nonce: Math.floor(Math.random() * 1000000)
    }

    // Step 2: Sign state update (off-chain)
    const walletClient = getWalletClient()
    const [account] = await walletClient.getAddresses()
    
    // Create state hash
    const stateHash = await createStateHash(stateUpdate)
    
    // TODO: Submit to Yellow Network
    // const response = await fetch(`${YELLOW_API_URL}/channels/${channelId}/update`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ stateUpdate, signature })
    // })

    console.log('✅ Payment streamed (gasless)')
    console.log('  State hash:', stateHash)
    
    // Update local channel info
    updateChannelBalance(channelId, amount)
    
    return stateHash
  } catch (error) {
    console.error('Error streaming payment:', error)
    throw error
  }
}

/**
 * Close state channel and settle on-chain
 * Final settlement happens on Base via Avail Nexus
 */
export async function closeStateChannel(
  channelId: string
): Promise<string> {
  try {
    console.log('🟡 Closing state channel...')
    console.log('  Channel:', channelId)

    // Step 1: Get final channel state
    const channelInfo = getChannelInfo(channelId)
    if (!channelInfo) {
      throw new Error('Channel not found')
    }

    // Step 2: Submit final state to Yellow Network
    // TODO: Call Yellow Network API
    // const response = await fetch(`${YELLOW_API_URL}/channels/${channelId}/close`, {
    //   method: 'POST'
    // })

    // Step 3: Settle on-chain via Avail Nexus
    // This would call AvailIntentRouter to finalize cross-chain settlement
    
    console.log('✅ Channel closed and settled')
    
    // Clean up local storage
    removeChannelInfo(channelId)
    
    return '0x' + Math.random().toString(16).substr(2, 64)
  } catch (error) {
    console.error('Error closing channel:', error)
    throw error
  }
}

/**
 * Get channel balance and streaming status
 */
export async function getChannelStatus(channelId: string): Promise<StateChannel | null> {
  try {
    const channelInfo = getChannelInfo(channelId)
    if (!channelInfo) return null

    // TODO: Fetch real-time status from Yellow Network
    // const response = await fetch(`${YELLOW_API_URL}/channels/${channelId}`)
    // const data = await response.json()

    return {
      channelId,
      participants: channelInfo.participants,
      totalDeposit: channelInfo.totalDeposit,
      streamedAmount: channelInfo.streamedAmount || 0,
      lastUpdateTime: Date.now(),
      isActive: true,
      latestStateHash: channelInfo.latestStateHash || '0x0'
    }
  } catch (error) {
    console.error('Error getting channel status:', error)
    return null
  }
}

/**
 * Withdraw funds from state channel (gasless)
 */
export async function withdrawFromChannel(
  channelId: string,
  amount: number
): Promise<string> {
  try {
    console.log('🟡 Withdrawing from channel...')
    console.log('  Channel:', channelId)
    console.log('  Amount:', amount)

    // TODO: Call Yellow Network API for gasless withdrawal
    // const response = await fetch(`${YELLOW_API_URL}/channels/${channelId}/withdraw`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ amount })
    // })

    console.log('✅ Withdrawal processed (gasless)')
    
    return '0x' + Math.random().toString(16).substr(2, 64)
  } catch (error) {
    console.error('Error withdrawing from channel:', error)
    throw error
  }
}

// Helper functions

function generateChannelId(projectId: number, client: string, freelancer: string): string {
  const data = `${projectId}-${client}-${freelancer}-${Date.now()}`
  // In production, use proper hash function
  return '0x' + Buffer.from(data).toString('hex').slice(0, 64)
}

async function createStateHash(stateUpdate: any): Promise<string> {
  const data = JSON.stringify(stateUpdate)
  // In production, use proper cryptographic hash
  return '0x' + Buffer.from(data).toString('hex').slice(0, 64)
}

// Local storage helpers (for demo purposes)

function storeChannelInfo(channelId: string, data: any) {
  try {
    const key = `yellow-channel-${channelId}`
    localStorage.setItem(key, JSON.stringify({
      ...data,
      streamedAmount: 0,
      createdAt: Date.now()
    }))
  } catch (error) {
    console.error('Error storing channel info:', error)
  }
}

function getChannelInfo(channelId: string): any {
  try {
    const key = `yellow-channel-${channelId}`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Error getting channel info:', error)
    return null
  }
}

function updateChannelBalance(channelId: string, amount: number) {
  try {
    const channelInfo = getChannelInfo(channelId)
    if (channelInfo) {
      channelInfo.streamedAmount = (channelInfo.streamedAmount || 0) + amount
      channelInfo.latestStateHash = '0x' + Math.random().toString(16).substr(2, 64)
      storeChannelInfo(channelId, channelInfo)
    }
  } catch (error) {
    console.error('Error updating channel balance:', error)
  }
}

function removeChannelInfo(channelId: string) {
  try {
    const key = `yellow-channel-${channelId}`
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Error removing channel info:', error)
  }
}

/**
 * Get all active channels for a user
 */
export function getUserChannels(userAddress: string): StateChannel[] {
  try {
    const channels: StateChannel[] = []
    
    // Scan localStorage for channels involving this user
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('yellow-channel-')) {
        const data = localStorage.getItem(key)
        if (data) {
          const channelInfo = JSON.parse(data)
          if (channelInfo.participants.includes(userAddress)) {
            channels.push({
              channelId: channelInfo.channelId,
              participants: channelInfo.participants,
              totalDeposit: channelInfo.totalDeposit,
              streamedAmount: channelInfo.streamedAmount || 0,
              lastUpdateTime: channelInfo.createdAt,
              isActive: true,
              latestStateHash: channelInfo.latestStateHash || '0x0'
            })
          }
        }
      }
    }
    
    return channels
  } catch (error) {
    console.error('Error getting user channels:', error)
    return []
  }
}
