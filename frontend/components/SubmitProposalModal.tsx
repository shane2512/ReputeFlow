'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, Clock, FileText, TrendingUp, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import { getMarketRate, validateProposalRate } from '@/lib/pyth'
import { uploadProposal } from '@/lib/proposals'
import { notifyProposalSubmission } from '@/lib/agents'

interface SubmitProposalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  job: any
}

/**
 * Proposal Submission Modal
 * - Freelancer submits bid for a job
 * - Pyth Oracle validates market rate
 * - Stores proposal on-chain or via Lighthouse
 */
export default function SubmitProposalModal({ isOpen, onClose, onSuccess, job }: SubmitProposalModalProps) {
  const { address } = useAccount()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marketRate, setMarketRate] = useState<number | null>(null)
  const [loadingRate, setLoadingRate] = useState(false)
  
  // Form state
  const [proposedRate, setProposedRate] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [milestoneApproach, setMilestoneApproach] = useState('')

  // Fetch market rate from Pyth Oracle when modal opens
  useEffect(() => {
    if (isOpen && job) {
      fetchMarketRate()
    }
  }, [isOpen, job])

  const fetchMarketRate = async () => {
    setLoadingRate(true)
    try {
      // Fetch market rate from Pyth Oracle based on job skills
      const skills = job.skills || []
      const rate = await getMarketRate(skills)
      setMarketRate(rate)
    } catch (err) {
      console.error('Error fetching market rate:', err)
      // Fallback to job budget if Pyth fails
      setMarketRate(job.totalBudget || 0)
    } finally {
      setLoadingRate(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address) {
      setError('Please connect your wallet')
      return
    }

    // Validation
    if (!proposedRate || !estimatedDuration || !coverLetter) {
      setError('Please fill in all required fields')
      return
    }

    const rate = parseFloat(proposedRate)
    if (rate <= 0) {
      setError('Proposed rate must be greater than 0')
      return
    }

    // Check if rate is significantly different from market rate
    if (marketRate && Math.abs(rate - marketRate) / marketRate > 0.5) {
      const confirmed = confirm(
        `Your proposed rate ($${rate}) differs significantly from the market rate ($${marketRate}). Continue?`
      )
      if (!confirmed) return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Upload proposal details to Lighthouse
      console.log('📦 Uploading proposal to Lighthouse...')
      console.log('🔍 Job data:', {
        jobId: job.id,
        jobClient: job.client,
        jobTitle: job.title
      })
      
      const proposalData = {
        jobId: job.id,
        freelancer: address,
        clientAddress: job.client, // Add client address for filtering
        proposedRate: rate,
        estimatedDuration: parseInt(estimatedDuration),
        coverLetter,
        milestoneApproach,
        marketRate,
        submittedAt: Date.now(),
      }
      
      console.log('📋 Proposal data being submitted:', {
        jobId: proposalData.jobId,
        freelancer: proposalData.freelancer,
        clientAddress: proposalData.clientAddress
      })

      const cid = await uploadProposal(proposalData)
      console.log('✅ Proposal uploaded! CID:', cid)
      
      // FALLBACK: Also store directly in localStorage to ensure it's saved
      console.log('💾 Storing proposal directly in localStorage as fallback...')
      const proposalWithId = {
        ...proposalData,
        id: `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending' as const,
        cid
      }
      
      const allKey = 'all-proposals'
      const existing = localStorage.getItem(allKey)
      const allProposals = existing ? JSON.parse(existing) : []
      allProposals.push(proposalWithId)
      localStorage.setItem(allKey, JSON.stringify(allProposals))
      console.log('✅ Proposal stored in localStorage. Total proposals:', allProposals.length)

      // Step 2: Notify client via agent communication
      console.log('📨 Notifying client agent...')
      try {
        await notifyProposalSubmission({
          jobId: job.id,
          freelancerAddress: address,
          proposedRate: rate,
          coverLetter
        })
        console.log('✅ Client agent notified')
      } catch (err) {
        console.error('Failed to notify client agent:', err)
        // Don't fail if agent notification fails
      }
      
      // Step 3: Store proposal reference on-chain (optional)
      // Could use a ProposalRegistry contract or emit event
      
      alert('Proposal submitted successfully! The client will be notified.')
      onSuccess()
      onClose()
      resetForm()
    } catch (err: any) {
      console.error('Error submitting proposal:', err)
      setError(err.message || 'Failed to submit proposal')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setProposedRate('')
    setEstimatedDuration('')
    setCoverLetter('')
    setMilestoneApproach('')
    setError(null)
  }

  if (!isOpen) return null

  const rateComparison = marketRate && proposedRate ? 
    ((parseFloat(proposedRate) - marketRate) / marketRate * 100).toFixed(1) : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Submit Proposal</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Job Summary */}
        <div className="px-6 py-4 bg-blue-50 border-b">
          <h3 className="font-semibold text-lg mb-2">{job.title}</h3>
          <div className="flex gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Budget: ${job.totalBudget?.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {job.milestones?.length || 0} milestones
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Market Rate Info */}
          {loadingRate ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <TrendingUp className="h-5 w-5 animate-pulse" />
                <span>Fetching market rate from Pyth Oracle...</span>
              </div>
            </div>
          ) : marketRate ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="font-semibold">Market Rate (Pyth Oracle)</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                ${marketRate.toLocaleString()}
              </div>
              <p className="text-sm text-green-700 mt-1">
                Based on current market data for similar projects
              </p>
            </div>
          ) : null}

          {/* Proposed Rate */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Your Proposed Rate (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="number"
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
                placeholder="5000"
                min="0"
                step="0.01"
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            {rateComparison && (
              <p className={`text-sm mt-1 ${
                parseFloat(rateComparison) > 20 ? 'text-red-600' :
                parseFloat(rateComparison) < -20 ? 'text-orange-600' :
                'text-green-600'
              }`}>
                {parseFloat(rateComparison) > 0 ? '+' : ''}{rateComparison}% vs market rate
              </p>
            )}
          </div>

          {/* Estimated Duration */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Estimated Duration (days) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="number"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="14"
                min="1"
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Cover Letter */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Cover Letter <span className="text-red-500">*</span>
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Explain why you're the best fit for this project..."
              rows={5}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Highlight your relevant experience and skills
            </p>
          </div>

          {/* Milestone Approach */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Milestone Approach (Optional)
            </label>
            <textarea
              value={milestoneApproach}
              onChange={(e) => setMilestoneApproach(e.target.value)}
              placeholder="Describe how you plan to approach each milestone..."
              rows={4}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
