'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { 
  Award, ArrowLeft, Clock, DollarSign, CheckCircle, AlertCircle, 
  Upload, FileText, User, Calendar, TrendingUp, Shield
} from 'lucide-react'
import { useJobs } from '@/hooks/useJobs'
import { getPythEntropy } from '@/lib/pyth'
import { createStateChannel, getChannelStatus } from '@/lib/yellow'
import PaymentStreamCard from '@/components/PaymentStreamCard'
import { getProposalsByFreelancer } from '@/lib/proposals'

/**
 * Project Detail Page
 * - View project information
 * - Track milestone progress
 * - Submit deliverables (freelancer)
 * - Approve milestones (client)
 * - View validator assignments
 */
export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { jobs, loading } = useJobs()
  
  const projectId = parseInt(params.id as string)
  const project = jobs.find(j => j.id === projectId)
  
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null)
  const [showDeliverableModal, setShowDeliverableModal] = useState(false)
  const [validators, setValidators] = useState<Record<number, string>>({})
  const [channelId, setChannelId] = useState<string | null>(null)
  const [hasAcceptedProposal, setHasAcceptedProposal] = useState(false)

  // Check if freelancer has accepted proposal for this project
  useEffect(() => {
    if (address && project) {
      const isClient = project.client?.toLowerCase() === address.toLowerCase()
      const isFreelancer = project.freelancer?.toLowerCase() === address.toLowerCase()
      
      if (isClient) {
        // Client always has access
        setHasAcceptedProposal(true)
      } else if (isFreelancer) {
        // Check if freelancer has accepted proposal
        const proposals = getProposalsByFreelancer(address)
        const acceptedProposal = proposals.find(
          p => p.jobId === projectId && p.status === 'accepted'
        )
        setHasAcceptedProposal(!!acceptedProposal)
      }
    }
  }, [address, project, projectId])

  // Assign validators using Pyth Entropy and create payment channel
  useEffect(() => {
    if (project?.milestones) {
      assignValidators()
      initializePaymentChannel()
    }
  }, [project])

  const assignValidators = async () => {
    if (!project?.milestones) return
    
    const validatorAddresses: Record<number, string> = {}
    
    for (let i = 0; i < project.milestones.length; i++) {
      // Use Pyth Entropy for random validator selection
      const entropy = await getPythEntropy()
      // In production, this would select from a pool of registered validators
      validatorAddresses[i] = `0x${entropy}...validator`
    }
    
    setValidators(validatorAddresses)
  }

  const initializePaymentChannel = async () => {
    if (!project) return
    
    try {
      // Create Yellow state channel for gasless payments
      const channel = await createStateChannel(
        project.id,
        project.client,
        project.freelancer,
        project.totalBudget
      )
      setChannelId(channel)
    } catch (error) {
      console.error('Error creating payment channel:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Award className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to view project details</p>
          <ConnectButton />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
          <Link href="/jobs" className="text-blue-600 hover:underline">
            Back to Jobs
          </Link>
        </div>
      </div>
    )
  }

  const isClient = project.client.toLowerCase() === address?.toLowerCase()
  const isFreelancer = project.freelancer.toLowerCase() === address?.toLowerCase()
  const canInteract = isClient || isFreelancer

  // Check if freelancer has access (accepted proposal)
  if (isFreelancer && !hasAcceptedProposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            You need an accepted proposal to access this project.
          </p>
          <div className="space-y-3">
            <Link
              href="/dashboard/freelancer"
              className="block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/jobs"
              className="block px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Browse Jobs
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const statusColors: Record<number, string> = {
    0: 'bg-gray-100 text-gray-600',
    1: 'bg-yellow-100 text-yellow-600',
    2: 'bg-blue-100 text-blue-600',
    3: 'bg-red-100 text-red-600',
    4: 'bg-green-100 text-green-600',
    5: 'bg-gray-100 text-gray-600',
  }

  const statusLabels: Record<number, string> = {
    0: 'Created',
    1: 'Funded',
    2: 'Active',
    3: 'Disputed',
    4: 'Completed',
    5: 'Cancelled',
  }

  const completedMilestones = project.milestones?.filter((m: any) => m.completed).length || 0
  const totalMilestones = project.milestones?.length || 0
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  // Show proposal status for freelancers
  const showProposalStatus = isFreelancer && hasAcceptedProposal

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href={isClient ? '/dashboard/client' : '/dashboard/freelancer'}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Dashboard
        </Link>

        {/* Project Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">{project.title || `Project #${project.id}`}</h2>
              <p className="text-gray-600">{project.description}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[project.status]}`}>
              {statusLabels[project.status]}
            </span>
          </div>

          {/* Project Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-sm text-gray-600">Total Budget</div>
                <div className="text-xl font-bold">${project.totalBudget?.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">Milestones</div>
                <div className="text-xl font-bold">{completedMilestones}/{totalMilestones}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-sm text-gray-600">Client</div>
                <div className="text-sm font-mono">{project.client.slice(0, 6)}...{project.client.slice(-4)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-sm text-gray-600">Freelancer</div>
                <div className="text-sm font-mono">{project.freelancer.slice(0, 6)}...{project.freelancer.slice(-4)}</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Skills */}
          {project.skills && project.skills.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">Required Skills</div>
              <div className="flex flex-wrap gap-2">
                {project.skills.map((skill: string) => (
                  <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Yellow Payment Stream */}
        {channelId && (
          <PaymentStreamCard
            channelId={channelId}
            projectId={project.id}
            totalBudget={project.totalBudget}
          />
        )}

        {/* Milestones */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-2xl font-bold mb-6">Milestones</h3>
          
          <div className="space-y-4">
            {project.milestones?.map((milestone: any, index: number) => (
              <MilestoneCard
                key={index}
                milestone={milestone}
                index={index}
                isClient={isClient}
                isFreelancer={isFreelancer}
                validator={validators[index]}
                onSubmitDeliverable={() => {
                  setSelectedMilestone(index)
                  setShowDeliverableModal(true)
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Deliverable Submission Modal */}
      {showDeliverableModal && selectedMilestone !== null && project.milestones && (
        <DeliverableModal
          milestone={project.milestones[selectedMilestone]}
          milestoneIndex={selectedMilestone}
          projectId={project.id}
          onClose={() => setShowDeliverableModal(false)}
          onSuccess={() => {
            setShowDeliverableModal(false)
            alert('Deliverable submitted! Waiting for validation.')
          }}
        />
      )}
    </div>
  )
}

// Milestone Card Component
function MilestoneCard({ milestone, index, isClient, isFreelancer, validator, onSubmitDeliverable }: any) {
  const milestoneStatusColors: Record<number, string> = {
    0: 'bg-gray-100 text-gray-600',
    1: 'bg-blue-100 text-blue-600',
    2: 'bg-yellow-100 text-yellow-600',
    3: 'bg-purple-100 text-purple-600',
    4: 'bg-green-100 text-green-600',
    5: 'bg-red-100 text-red-600',
    6: 'bg-green-100 text-green-600',
    7: 'bg-red-100 text-red-600',
  }

  const milestoneStatusLabels: Record<number, string> = {
    0: 'Pending',
    1: 'In Progress',
    2: 'Submitted',
    3: 'Under Review',
    4: 'Approved',
    5: 'Rejected',
    6: 'Paid',
    7: 'Disputed',
  }

  const status = milestone.completed ? 6 : milestone.status || 0

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">{index + 1}</span>
            </div>
            <div>
              <h4 className="text-lg font-semibold">{milestone.description}</h4>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${milestoneStatusColors[status]}`}>
                {milestoneStatusLabels[status]}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">${milestone.amount?.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Payment</div>
        </div>
      </div>

      {/* Validator Info */}
      {validator && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-purple-50 rounded-lg">
          <Shield className="h-5 w-5 text-purple-600" />
          <div className="text-sm">
            <span className="text-gray-600">Validator:</span>
            <span className="font-mono ml-2 text-purple-600">{validator}</span>
          </div>
        </div>
      )}

      {/* Deadline */}
      {milestone.deadline && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Calendar className="h-4 w-4" />
          <span>Deadline: {new Date(milestone.deadline * 1000).toLocaleDateString()}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isFreelancer && !milestone.completed && (
          <button
            onClick={onSubmitDeliverable}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Submit Deliverable
          </button>
        )}
        {isClient && status === 2 && (
          <>
            <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              Approve
            </button>
            <button className="flex-1 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition">
              Request Changes
            </button>
          </>
        )}
        {milestone.completed && (
          <div className="flex-1 flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Completed & Paid</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Deliverable Submission Modal
function DeliverableModal({ milestone, milestoneIndex, projectId, onClose, onSuccess }: any) {
  const [deliverableUrl, setDeliverableUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Upload deliverable to Lighthouse
      console.log('Uploading deliverable...')
      
      // TODO: Update milestone status on-chain
      console.log('Updating milestone status...')
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      onSuccess()
    } catch (error) {
      console.error('Error submitting deliverable:', error)
      alert('Failed to submit deliverable')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Submit Deliverable</h3>
          <p className="text-sm text-gray-600 mt-1">Milestone {milestoneIndex + 1}: {milestone.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Deliverable URL / IPFS CID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={deliverableUrl}
              onChange={(e) => setDeliverableUrl(e.target.value)}
              placeholder="https://... or bafkrei..."
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the deliverable..."
              rows={4}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Deliverable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
