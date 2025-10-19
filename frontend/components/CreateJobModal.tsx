'use client'

import { useState } from 'react'
import { X, Plus, Trash2, DollarSign, Calendar, FileText, Upload, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import { createProject } from '@/lib/blockchain'
import { uploadJobMetadata, isLighthouseConfigured } from '@/lib/lighthouse'
import { broadcastJobDiscovery } from '@/lib/agents'
import { parseEther } from 'viem'

interface Milestone {
  description: string
  amount: number
  deadline: number
}

interface CreateJobModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateJobModal({ isOpen, onClose, onSuccess }: CreateJobModalProps) {
  const { address } = useAccount()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [milestones, setMilestones] = useState<Milestone[]>([
    { description: '', amount: 0, deadline: 0 }
  ])

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill))
  }

  const addMilestone = () => {
    setMilestones([...milestones, { description: '', amount: 0, deadline: 0 }])
  }

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index))
    }
  }

  const updateMilestone = (index: number, field: keyof Milestone, value: string | number) => {
    const updated = [...milestones]
    updated[index] = { ...updated[index], [field]: value }
    setMilestones(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address) {
      setError('Please connect your wallet')
      return
    }

    // Validation
    if (!title || !description || skills.length === 0 || !totalBudget) {
      setError('Please fill in all required fields')
      return
    }

    if (milestones.some(m => !m.description || m.amount <= 0 || m.deadline <= 0)) {
      setError('Please complete all milestone details')
      return
    }

    const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amount, 0)
    if (totalMilestoneAmount !== parseFloat(totalBudget)) {
      setError(`Milestone amounts must equal total budget ($${totalBudget})`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Upload metadata to Lighthouse (reduces gas by 95%!)
      let metadataCid = ''
      
      if (isLighthouseConfigured()) {
        console.log('📦 Uploading job metadata to Lighthouse...')
        metadataCid = await uploadJobMetadata({
          title,
          description,
          skills,
          milestones,
          budget: parseFloat(totalBudget),
          createdAt: Date.now()
        })
        console.log('✅ Metadata uploaded! CID:', metadataCid)
      } else {
        console.warn('⚠️ Lighthouse not configured. Using on-chain storage (higher gas).')
      }

      // Step 2: Create project on blockchain
      // Using client address as temporary freelancer (will be updated when freelancer is hired)
      const freelancerAddress = address as `0x${string}`
      
      // Use short milestone descriptions to save gas
      // Full descriptions are stored in Lighthouse
      const optimizedMilestones = milestones.map((m, index) => ({
        description: metadataCid || `M${index + 1}`, // Use CID or short code
        amount: m.amount,
        deadline: Math.floor(Date.now() / 1000) + (m.deadline * 24 * 60 * 60)
      }))
      
      console.log('⛓️ Creating project on blockchain...')
      const hash = await createProject(
        freelancerAddress,
        parseFloat(totalBudget),
        optimizedMilestones
      )

      console.log('✅ Project created! Transaction hash:', hash)
      if (metadataCid) {
        console.log('📄 View metadata: https://gateway.lighthouse.storage/ipfs/' + metadataCid)
      }

      // Broadcast job to FreelancerAgents via uAgents
      try {
        await broadcastJobDiscovery({
          skills,
          budget: parseFloat(totalBudget),
          deadline: Math.max(...milestones.map(m => m.deadline)),
          clientAddress: address
        })
        console.log('📡 Job broadcasted to agent network')
      } catch (err) {
        console.error('Failed to broadcast to agents:', err)
        // Don't fail the whole operation if agent broadcast fails
      }
      
      // TODO: Broadcast to Agentverse
      // await broadcastJobToAgents({ title, description, skills, budget: totalBudget, metadataCid })

      // Success!
      onSuccess()
      onClose()
      resetForm()
    } catch (err: any) {
      console.error('Error creating project:', err)
      setError(err.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setSkills([])
    setSkillInput('')
    setTotalBudget('')
    setMilestones([{ description: '', amount: 0, deadline: 0 }])
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Create New Job</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Smart Contract Audit for DeFi Protocol"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project requirements, deliverables, and expectations..."
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Required Skills <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="e.g., Solidity, React, Web3"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm flex items-center gap-2"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Total Budget */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Total Budget (USD) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              placeholder="5000"
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Milestones */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold">
                Milestones <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addMilestone}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Milestone
              </button>
            </div>
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">Milestone {index + 1}</span>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={milestone.description}
                    onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                    placeholder="Milestone description"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Amount ($)</label>
                      <input
                        type="number"
                        value={milestone.amount || ''}
                        onChange={(e) => updateMilestone(index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="1000"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Deadline (days)</label>
                      <input
                        type="number"
                        value={milestone.deadline || ''}
                        onChange={(e) => updateMilestone(index, 'deadline', parseInt(e.target.value) || 0)}
                        placeholder="7"
                        min="1"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
