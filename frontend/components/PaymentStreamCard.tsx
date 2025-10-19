'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Zap, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import { getChannelStatus, type StateChannel } from '@/lib/yellow'

interface PaymentStreamCardProps {
  channelId: string
  projectId: number
  totalBudget: number
}

/**
 * Payment Stream Visualization
 * Shows real-time Yellow Network state channel payments
 */
export default function PaymentStreamCard({ channelId, projectId, totalBudget }: PaymentStreamCardProps) {
  const [channel, setChannel] = useState<StateChannel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChannelStatus()
    
    // Refresh every 5 seconds to show streaming progress
    const interval = setInterval(loadChannelStatus, 5000)
    return () => clearInterval(interval)
  }, [channelId])

  const loadChannelStatus = async () => {
    try {
      const status = await getChannelStatus(channelId)
      setChannel(status)
    } catch (error) {
      console.error('Error loading channel status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
        <div className="animate-pulse">
          <div className="h-6 bg-yellow-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-yellow-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="text-center text-gray-600">
          <Zap className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>No payment channel active</p>
        </div>
      </div>
    )
  }

  const streamedPercentage = (channel.streamedAmount / channel.totalDeposit) * 100
  const remainingAmount = channel.totalDeposit - channel.streamedAmount

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-yellow-500 rounded-full flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Yellow Payment Stream</h3>
            <p className="text-sm text-gray-600">Gasless state channel • Zero fees</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
          <div className="h-2 w-2 bg-green-600 rounded-full animate-pulse"></div>
          Active
        </div>
      </div>

      {/* Channel Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total Deposited</div>
          <div className="text-2xl font-bold text-gray-900">${channel.totalDeposit.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Streamed</div>
          <div className="text-2xl font-bold text-green-600">${channel.streamedAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Streaming Progress</span>
          <span className="font-semibold text-gray-900">{streamedPercentage.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-white rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500 relative"
            style={{ width: `${streamedPercentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 text-center">
          <DollarSign className="h-5 w-5 text-gray-600 mx-auto mb-1" />
          <div className="text-xs text-gray-600">Remaining</div>
          <div className="text-sm font-bold text-gray-900">${remainingAmount.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <Clock className="h-5 w-5 text-gray-600 mx-auto mb-1" />
          <div className="text-xs text-gray-600">Last Update</div>
          <div className="text-sm font-bold text-gray-900">
            {new Date(channel.lastUpdateTime).toLocaleTimeString()}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <TrendingUp className="h-5 w-5 text-gray-600 mx-auto mb-1" />
          <div className="text-xs text-gray-600">Gas Saved</div>
          <div className="text-sm font-bold text-green-600">100%</div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-lg p-4">
        <div className="text-sm font-semibold mb-2 text-gray-900">Yellow Network Features</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Zero gas fees for payments</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Instant settlement via state channels</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Cross-chain support via Avail Nexus</span>
          </div>
        </div>
      </div>

      {/* Channel ID */}
      <div className="mt-4 p-3 bg-white rounded-lg">
        <div className="text-xs text-gray-600 mb-1">Channel ID</div>
        <div className="text-xs font-mono text-gray-900 break-all">{channel.channelId}</div>
      </div>
    </div>
  )
}

// Add shimmer animation to global CSS
const shimmerStyle = `
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
`
