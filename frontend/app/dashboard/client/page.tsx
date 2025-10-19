'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { 
  Award, Briefcase, TrendingUp, Users, Bot, MessageSquare, Plus,
  Search, Filter, Clock, DollarSign, CheckCircle, AlertCircle
} from 'lucide-react'
import { useReputation } from '@/hooks/useReputation'
import { useProjects } from '@/hooks/useProjects'
import CreateJobModal from '@/components/CreateJobModal'
import { getProposalsForClient, updateProposalStatus, type Proposal } from '@/lib/proposals'
import { useState as useStateReact, useEffect } from 'react'
import { autoRegisterAgent } from '@/lib/agents'

/**
 * Client Dashboard
 * - Post jobs
 * - Review proposals
 * - Track active projects
 * - Manage payments
 * - View reputation of freelancers
 */
export default function ClientDashboard() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState('projects')
  const [showCreateJob, setShowCreateJob] = useState(false)
  const [proposals, setProposals] = useStateReact<Proposal[]>([])
  
  // Auto-register agent on mount
  useEffect(() => {
    if (address) {
      autoRegisterAgent(address, 'client')
    }
  }, [address])

  // Load proposals
  useEffect(() => {
    if (address) {
      const clientProposals = getProposalsForClient(address)
      setProposals(clientProposals)
    }
  }, [address, activeTab])
  
  // Fetch real blockchain data
  const { score: reputation, badges, loading: repLoading } = useReputation()
  const { projects, loading: projectsLoading, refetch } = useProjects()
  
  // Filter projects where user is the client
  const myProjects = projects.filter(p => 
    p.client.toLowerCase() === address?.toLowerCase()
  )
  
  const activeProjects = myProjects.filter(p => p.status === 2).length // Active
  const completedProjects = myProjects.filter(p => p.status === 4).length // Completed
  const totalSpent = myProjects
    .filter(p => p.status === 4)
    .reduce((sum, p) => sum + (p.totalBudget || 0), 0)

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Award className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to access the client dashboard</p>
          <ConnectButton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Client Dashboard</h2>
              <p className="text-blue-100">Manage your projects and hire top talent</p>
              <p className="text-sm text-blue-200 mt-1">Address: {address}</p>
            </div>
            <button
              onClick={() => setShowCreateJob(true)}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Post New Job
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Briefcase className="h-8 w-8 text-blue-600" />}
            title="Active Projects"
            value={projectsLoading ? '...' : activeProjects.toString()}
            subtitle="In Progress"
            color="blue"
          />
          <StatCard
            icon={<CheckCircle className="h-8 w-8 text-green-600" />}
            title="Completed"
            value={projectsLoading ? '...' : completedProjects.toString()}
            subtitle="Projects"
            color="green"
          />
          <StatCard
            icon={<DollarSign className="h-8 w-8 text-purple-600" />}
            title="Total Spent"
            value={projectsLoading ? '...' : `$${totalSpent.toLocaleString()}`}
            subtitle="All Time"
            color="purple"
          />
          <StatCard
            icon={<Award className="h-8 w-8 text-orange-600" />}
            title="Client Rating"
            value={repLoading ? '...' : reputation.toString()}
            subtitle="Reputation Score"
            color="orange"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b">
            <div className="flex gap-4 px-6">
              <TabButton
                active={activeTab === 'projects'}
                onClick={() => setActiveTab('projects')}
                icon={<Briefcase className="h-5 w-5" />}
                label="My Projects"
              />
              <TabButton
                active={activeTab === 'proposals'}
                onClick={() => setActiveTab('proposals')}
                icon={<MessageSquare className="h-5 w-5" />}
                label="Proposals"
                badge={proposals.filter(p => p.status === 'pending').length}
              />
              <TabButton
                active={activeTab === 'agents'}
                onClick={() => setActiveTab('agents')}
                icon={<Bot className="h-5 w-5" />}
                label="AI Agents"
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'projects' && (
              <ProjectsTab projects={myProjects} loading={projectsLoading} />
            )}
            {activeTab === 'proposals' && (
              <ProposalsTab proposals={proposals} onRefresh={() => {
                const clientProposals = getProposalsForClient(address!)
                setProposals(clientProposals)
              }} />
            )}
            {activeTab === 'agents' && (
              <AgentsTab />
            )}
          </div>
        </div>
      </div>

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={showCreateJob}
        onClose={() => setShowCreateJob(false)}
        onSuccess={() => {
          setShowCreateJob(false)
          refetch()
        }}
      />
    </div>
  )
}

// Components
function StatCard({ icon, title, value, subtitle, color }: any) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        {icon}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-4 border-b-2 transition relative ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-600 hover:text-blue-600'
      }`}
    >
      {icon}
      <span className="font-semibold">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
}

function ProjectsTab({ projects, loading }: any) {
  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading projects...</div>
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
        <p className="text-gray-600 mb-6">Post your first job to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {projects.map((project: any) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}

function ProjectCard({ project }: any) {
  const statusColors: any = {
    0: 'bg-gray-100 text-gray-600',
    1: 'bg-yellow-100 text-yellow-600',
    2: 'bg-blue-100 text-blue-600',
    3: 'bg-red-100 text-red-600',
    4: 'bg-green-100 text-green-600',
    5: 'bg-gray-100 text-gray-600',
  }

  const statusLabels: any = {
    0: 'Created',
    1: 'Funded',
    2: 'Active',
    3: 'Disputed',
    4: 'Completed',
    5: 'Cancelled',
  }

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">{project.title || `Project #${project.id}`}</h3>
          <p className="text-gray-600 text-sm">{project.description}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status]}`}>
          {statusLabels[project.status]}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <DollarSign className="h-4 w-4" />
          <span className="font-semibold">${project.totalBudget?.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>{project.milestones?.length || 0} milestones</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>Freelancer: {project.freelancer?.slice(0, 6)}...</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}

function ProposalsTab({ proposals, onRefresh }: { proposals: Proposal[], onRefresh: () => void }) {
  // Debug: Show all proposals in storage
  const allProposalsInStorage = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('all-proposals') || '[]')
    : []
  
  if (proposals.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Proposals Yet</h3>
        <p className="text-gray-600 mb-4">Freelancers will submit proposals for your posted jobs</p>
        
        {/* Debug Info */}
        {allProposalsInStorage.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-yellow-800 mb-2">
              🐛 Debug: Found {allProposalsInStorage.length} proposal(s) in storage but not showing
            </p>
            <div className="text-left text-xs text-yellow-700 space-y-2">
              {allProposalsInStorage.map((p: any, i: number) => (
                <div key={i} className="bg-white p-2 rounded">
                  <div>Job ID: {p.jobId}</div>
                  <div>Freelancer: {p.freelancer?.slice(0, 10)}...</div>
                  <div>Client Address: {p.clientAddress || 'MISSING!'}</div>
                  <div>Status: {p.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const handleAccept = (proposalId: string) => {
    if (confirm('Accept this proposal? This will assign the freelancer to the project.')) {
      updateProposalStatus(proposalId, 'accepted')
      onRefresh()
      alert('Proposal accepted! You can now proceed with the project.')
    }
  }

  const handleReject = (proposalId: string) => {
    if (confirm('Reject this proposal?')) {
      updateProposalStatus(proposalId, 'rejected')
      onRefresh()
    }
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal) => (
        <div key={proposal.id} className="border rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Proposal for Job #{proposal.jobId}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  proposal.status === 'accepted' ? 'bg-green-100 text-green-600' :
                  proposal.status === 'rejected' ? 'bg-red-100 text-red-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  {proposal.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                From: {proposal.freelancer.slice(0, 6)}...{proposal.freelancer.slice(-4)}
              </p>
              <p className="text-sm text-gray-600">
                Submitted: {new Date(proposal.submittedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">${proposal.proposedRate.toLocaleString()}</div>
              <div className="text-sm text-gray-600">{proposal.estimatedDuration} days</div>
              {proposal.marketRate && (
                <div className="text-xs text-gray-500 mt-1">
                  Market: ${proposal.marketRate.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold mb-2">Cover Letter</h4>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{proposal.coverLetter}</p>
          </div>

          {proposal.milestoneApproach && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Milestone Approach</h4>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{proposal.milestoneApproach}</p>
            </div>
          )}

          {proposal.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(proposal.id)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Accept Proposal
              </button>
              <button
                onClick={() => handleReject(proposal.id)}
                className="flex-1 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function AgentsTab() {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Bot className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">Client Agent</h3>
            <p className="text-sm text-gray-600">Automated job posting and negotiation</p>
          </div>
          <span className="ml-auto px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
            Active
          </span>
        </div>
        <div className="text-sm text-gray-600">
          <p>• Broadcasts jobs to Agentverse</p>
          <p>• Validates proposals with Pyth Oracle</p>
          <p>• Manages automated negotiations</p>
        </div>
      </div>
    </div>
  )
}
