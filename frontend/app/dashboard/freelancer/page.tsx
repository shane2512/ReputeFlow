'use client'

import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { 
  Award, Briefcase, TrendingUp, Users, Bot, MessageSquare, Search,
  Clock, DollarSign, CheckCircle, AlertCircle, Star, Target
} from 'lucide-react'
import { useReputation } from '@/hooks/useReputation'
import { useJobs } from '@/hooks/useJobs'
import { useProjects } from '@/hooks/useProjects'
import SubmitProposalModal from '@/components/SubmitProposalModal'
import { autoRegisterAgent } from '@/lib/agents'
import { getProposalsByFreelancer, getAcceptedProjectIds, type Proposal } from '@/lib/proposals'

/**
 * Freelancer Dashboard
 * - Browse available jobs
 * - Submit proposals
 * - Track active work
 * - Manage deliverables
 * - View reputation and earnings
 */
export default function FreelancerDashboard() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState('available')
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [myProposals, setMyProposals] = useState<Proposal[]>([])

  // Auto-register agent on mount
  useEffect(() => {
    if (address) {
      autoRegisterAgent(address, 'freelancer')
    }
  }, [address])

  // Load proposals - refresh every time tab changes or component mounts
  useEffect(() => {
    if (address) {
      console.log('🔄 Loading proposals for:', address)
      const proposals = getProposalsByFreelancer(address)
      console.log('📊 Found proposals:', proposals.length)
      console.log('Proposals:', proposals)
      setMyProposals(proposals)
    }
  }, [address, activeTab])

  // Also refresh proposals when returning to the page
  useEffect(() => {
    const handleFocus = () => {
      if (address && activeTab === 'proposals') {
        console.log('🔄 Page focused, refreshing proposals...')
        const proposals = getProposalsByFreelancer(address)
        setMyProposals(proposals)
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [address, activeTab])
  
  // Fetch real blockchain data
  const { score: reputation, badges, loading: repLoading } = useReputation()
  const { projects, loading: projectsLoading } = useProjects()
  const { jobs, loading: jobsLoading } = useJobs()
  
  // Filter projects where user has accepted proposals
  const acceptedProjectIds = address ? getAcceptedProjectIds(address) : []
  console.log('🎯 Accepted project IDs:', acceptedProjectIds)
  console.log('📦 All projects from blockchain:', projects)
  console.log('📦 Project IDs available:', projects.map(p => p.id))
  
  const myProjects = projects.filter(p => {
    // Show if user is assigned as freelancer OR has accepted proposal
    const isAssigned = p.freelancer?.toLowerCase() === address?.toLowerCase()
    const hasAcceptedProposal = acceptedProjectIds.includes(p.id)
    
    console.log(`Project ${p.id}:`, {
      isAssigned,
      hasAcceptedProposal,
      freelancer: p.freelancer,
      yourAddress: address
    })
    
    return isAssigned || hasAcceptedProposal
  })
  
  console.log('📊 My projects:', myProjects.length)
  console.log('My projects:', myProjects)
  
  // Filter available jobs
  // Show all jobs EXCEPT those where the user is the client
  // (Users can't bid on their own jobs)
  const availableJobs = jobs.filter(j => 
    j.client.toLowerCase() !== address?.toLowerCase()
  )
  
  const activeProjects = myProjects.filter(p => p.status === 2).length // Active
  const completedProjects = myProjects.filter(p => p.status === 4).length // Completed
  const totalEarned = myProjects
    .filter(p => p.status === 4)
    .reduce((sum, p) => sum + (p.totalBudget || 0), 0)

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Award className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to access the freelancer dashboard</p>
          <ConnectButton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-white mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Freelancer Dashboard</h2>
              <p className="text-purple-100">Find work and build your reputation</p>
              <p className="text-sm text-purple-200 mt-1">Address: {address}</p>
            </div>
            <Link
              href="/jobs"
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition flex items-center gap-2"
            >
              <Search className="h-5 w-5" />
              Browse Jobs
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Award className="h-8 w-8 text-purple-600" />}
            title="Reputation"
            value={repLoading ? '...' : reputation.toString()}
            subtitle="Score"
            color="purple"
          />
          <StatCard
            icon={<Briefcase className="h-8 w-8 text-blue-600" />}
            title="Active Projects"
            value={projectsLoading ? '...' : activeProjects.toString()}
            subtitle="In Progress"
            color="blue"
          />
          <StatCard
            icon={<DollarSign className="h-8 w-8 text-green-600" />}
            title="Total Earned"
            value={projectsLoading ? '...' : `$${totalEarned.toLocaleString()}`}
            subtitle="All Time"
            color="green"
          />
          <StatCard
            icon={<CheckCircle className="h-8 w-8 text-orange-600" />}
            title="Completed"
            value={projectsLoading ? '...' : completedProjects.toString()}
            subtitle="Projects"
            color="orange"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b">
            <div className="flex gap-4 px-6">
              <TabButton
                active={activeTab === 'available'}
                onClick={() => setActiveTab('available')}
                icon={<Target className="h-5 w-5" />}
                label="Available Jobs"
                badge={availableJobs.length}
              />
              <TabButton
                active={activeTab === 'active'}
                onClick={() => setActiveTab('active')}
                icon={<Briefcase className="h-5 w-5" />}
                label="My Projects"
              />
              <TabButton
                active={activeTab === 'proposals'}
                onClick={() => setActiveTab('proposals')}
                icon={<MessageSquare className="h-5 w-5" />}
                label="Proposals"
                badge={myProposals.length}
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
            {activeTab === 'available' && (
              <AvailableJobsTab 
                jobs={availableJobs} 
                loading={jobsLoading}
                onSubmitProposal={(job: any) => {
                  setSelectedJob(job)
                  setShowProposalModal(true)
                }}
              />
            )}
            {activeTab === 'active' && (
              <ActiveProjectsTab projects={myProjects} loading={projectsLoading} />
            )}
            {activeTab === 'proposals' && (
              <ProposalsTab proposals={myProposals} />
            )}
            {activeTab === 'agents' && (
              <AgentsTab />
            )}
          </div>
        </div>

        {/* Reputation & Badges */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold mb-4">Reputation & Badges</h3>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-20 w-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {reputation}
            </div>
            <div>
              <div className="text-2xl font-bold">{reputation}/100</div>
              <div className="text-gray-600">Reputation Score</div>
              <div className="flex gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(reputation / 20)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {badges.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {badges.map((badge: any, i: number) => (
                <div key={i} className="border rounded-lg p-4 text-center">
                  <Award className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm font-semibold">Badge #{badge}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p>Complete projects to earn badges</p>
            </div>
          )}
        </div>
      </div>

      {/* Proposal Submission Modal */}
      {showProposalModal && selectedJob && (
        <SubmitProposalModal
          isOpen={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          onSuccess={() => {
            setShowProposalModal(false)
            // Reload proposals immediately
            if (address) {
              const proposals = getProposalsByFreelancer(address)
              setMyProposals(proposals)
            }
            alert('Proposal submitted successfully!')
          }}
          job={selectedJob}
        />
      )}
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
          ? 'border-purple-600 text-purple-600'
          : 'border-transparent text-gray-600 hover:text-purple-600'
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

function AvailableJobsTab({ jobs, loading, onSubmitProposal }: any) {
  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading available jobs...</div>
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Jobs Available</h3>
        <p className="text-gray-600 mb-6">Check back later for new opportunities</p>
        <Link
          href="/jobs"
          className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          Browse All Jobs
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.map((job: any) => (
        <JobCard key={job.id} job={job} onSubmitProposal={onSubmitProposal} />
      ))}
    </div>
  )
}

function JobCard({ job, onSubmitProposal }: any) {
  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
          <p className="text-gray-600 text-sm mb-3">{job.description}</p>
          <div className="flex flex-wrap gap-2">
            {job.skills?.map((skill: string) => (
              <span key={skill} className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">${job.totalBudget?.toLocaleString()}</div>
          <div className="text-sm text-gray-600">{job.milestones?.length || 0} milestones</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/jobs/${job.id}`}
          className="flex-1 text-center px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition"
        >
          View Details
        </Link>
        <button 
          onClick={() => onSubmitProposal(job)}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          Submit Proposal
        </button>
      </div>
    </div>
  )
}

function ActiveProjectsTab({ projects, loading }: any) {
  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading projects...</div>
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Active Projects</h3>
        <p className="text-gray-600">Submit proposals to start working</p>
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
  const completedMilestones = project.milestones?.filter((m: any) => m.completed).length || 0
  const totalMilestones = project.milestones?.length || 0
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  return (
    <div className="border rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">{project.title || `Project #${project.id}`}</h3>
          <p className="text-gray-600 text-sm">{project.description}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-green-600">${project.totalBudget?.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Budget</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold">{completedMilestones}/{totalMilestones} milestones</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="flex-1 text-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          View Project
        </Link>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          Submit Deliverable
        </button>
      </div>
    </div>
  )
}

function ProposalsTab({ proposals }: { proposals: Proposal[] }) {
  if (proposals.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Proposals Yet</h3>
        <p className="text-gray-600">Submit proposals for available jobs to get started</p>
      </div>
    )
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
                  {proposal.status === 'accepted' ? '✅ Accepted' :
                   proposal.status === 'rejected' ? '❌ Rejected' :
                   '⏳ Pending'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Submitted: {new Date(proposal.submittedAt).toLocaleDateString()}
              </p>
              {proposal.clientAddress && (
                <p className="text-sm text-gray-600">
                  Client: {proposal.clientAddress.slice(0, 6)}...{proposal.clientAddress.slice(-4)}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">${proposal.proposedRate}</div>
              <div className="text-sm text-gray-600">{proposal.estimatedDuration} days</div>
              {proposal.marketRate && (
                <div className="text-xs text-gray-500 mt-1">
                  Market: ${proposal.marketRate}/hr
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold text-gray-700">Cover Letter:</span>
              <p className="text-gray-600 mt-1">{proposal.coverLetter}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Approach:</span>
              <p className="text-gray-600 mt-1">{proposal.milestoneApproach}</p>
            </div>
          </div>

          {proposal.status === 'accepted' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-semibold">
                🎉 Congratulations! Your proposal was accepted. You can now start working on this project.
              </p>
            </div>
          )}

          {proposal.status === 'rejected' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                This proposal was not accepted. Keep improving and try again!
              </p>
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
          <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Bot className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold">Freelancer Agent</h3>
            <p className="text-sm text-gray-600">Automated job discovery and bidding</p>
          </div>
          <span className="ml-auto px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
            Active
          </span>
        </div>
        <div className="text-sm text-gray-600">
          <p>• Scans Agentverse for matching jobs</p>
          <p>• Uses MeTTa reasoning for job ranking</p>
          <p>• Submits proposals with Pyth-validated rates</p>
        </div>
      </div>
    </div>
  )
}
