'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { Award, ArrowLeft } from 'lucide-react'
import { useReputation } from '@/hooks/useReputation'
import { useProjects } from '@/hooks/useProjects'
import ReputationDashboard from '@/components/ReputationDashboard'

/**
 * Reputation Page
 * Comprehensive view of user's reputation, badges, and achievements
 */
export default function ReputationPage() {
  const { address, isConnected } = useAccount()
  const { score: reputation, loading: repLoading } = useReputation()
  const { projects, loading: projectsLoading } = useProjects()

  // Calculate metrics
  const myProjects = projects.filter(p => 
    p.freelancer.toLowerCase() === address?.toLowerCase() ||
    p.client.toLowerCase() === address?.toLowerCase()
  )

  const completedProjects = myProjects.filter(p => p.status === 4).length
  const onTimeDelivery = completedProjects > 0 ? 95 : 0 // Placeholder
  const qualityScore = completedProjects > 0 ? 92 : 0 // Placeholder
  const disputes = 0 // Placeholder

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Award className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to view your reputation</p>
          <ConnectButton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard/freelancer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Dashboard
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2">Your Reputation</h2>
          <p className="text-gray-600">
            Track your achievements, earn badges, and build your professional reputation
          </p>
        </div>

        {/* Reputation Dashboard */}
        {repLoading || projectsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reputation data...</p>
          </div>
        ) : (
          <ReputationDashboard
            userAddress={address!}
            reputationScore={reputation}
            projectsCompleted={completedProjects}
            onTimeDelivery={onTimeDelivery}
            qualityScore={qualityScore}
            disputes={disputes}
          />
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-2 text-blue-900">How Reputation Works</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Complete projects</strong> to increase your reputation score</p>
            <p>• <strong>Deliver on time</strong> to boost your reliability rating</p>
            <p>• <strong>Maintain quality</strong> through validator approvals</p>
            <p>• <strong>Earn badges</strong> by achieving milestones and mint them as NFTs</p>
            <p>• <strong>Level up</strong> to unlock better opportunities and higher rates</p>
          </div>
        </div>
      </div>
    </div>
  )
}
