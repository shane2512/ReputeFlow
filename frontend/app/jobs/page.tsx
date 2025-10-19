'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Award, Search, Filter, Briefcase, Clock, DollarSign, MapPin, Star, AlertCircle, Loader2 } from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useJobs } from '@/hooks/useJobs'
import SubmitBidModal from '@/components/SubmitBidModal'

// Sample demo data for display purposes
const demoJobListings = [
  {
    id: 1,
    title: 'Smart Contract Audit - DeFi Protocol',
    description: 'Need experienced Solidity developer to audit our DeFi lending protocol. Must have experience with security best practices.',
    budget: 5000,
    duration: '2-3 weeks',
    skills: ['Solidity', 'Smart Contracts', 'Security', 'DeFi'],
    client: {
      address: '0x1234...5678',
      reputation: 92,
      projectsPosted: 15
    },
    postedAt: '2 hours ago',
    proposals: 8,
    category: 'Development'
  },
  {
    id: 2,
    title: 'Web3 Frontend Development',
    description: 'Build a modern React frontend for NFT marketplace with wallet integration and responsive design.',
    budget: 3500,
    duration: '3-4 weeks',
    skills: ['React', 'TypeScript', 'Web3.js', 'TailwindCSS'],
    client: {
      address: '0xabcd...efgh',
      reputation: 88,
      projectsPosted: 8
    },
    postedAt: '5 hours ago',
    proposals: 12,
    category: 'Development'
  },
  {
    id: 3,
    title: 'Tokenomics Design & Whitepaper',
    description: 'Design tokenomics model for new DeFi project and create comprehensive whitepaper.',
    budget: 4000,
    duration: '2 weeks',
    skills: ['Tokenomics', 'DeFi', 'Economics', 'Writing'],
    client: {
      address: '0x9876...4321',
      reputation: 95,
      projectsPosted: 22
    },
    postedAt: '1 day ago',
    proposals: 15,
    category: 'Consulting'
  },
  {
    id: 4,
    title: 'NFT Collection Smart Contracts',
    description: 'Develop ERC-721 smart contracts for generative NFT collection with reveal mechanism.',
    budget: 2500,
    duration: '1-2 weeks',
    skills: ['Solidity', 'NFTs', 'ERC-721', 'OpenZeppelin'],
    client: {
      address: '0x5555...6666',
      reputation: 85,
      projectsPosted: 5
    },
    postedAt: '2 days ago',
    proposals: 6,
    category: 'Development'
  },
  {
    id: 5,
    title: 'Blockchain Integration for E-commerce',
    description: 'Integrate crypto payments and NFT loyalty program into existing e-commerce platform.',
    budget: 6000,
    duration: '4-5 weeks',
    skills: ['Web3', 'Node.js', 'Payment Integration', 'APIs'],
    client: {
      address: '0x7777...8888',
      reputation: 90,
      projectsPosted: 12
    },
    postedAt: '3 days ago',
    proposals: 10,
    category: 'Development'
  },
  {
    id: 6,
    title: 'DAO Governance Smart Contracts',
    description: 'Build governance contracts with voting mechanisms, proposal system, and treasury management.',
    budget: 7500,
    duration: '4-6 weeks',
    skills: ['Solidity', 'DAO', 'Governance', 'Smart Contracts'],
    client: {
      address: '0x9999...0000',
      reputation: 93,
      projectsPosted: 18
    },
    postedAt: '4 days ago',
    proposals: 14,
    category: 'Development'
  },
]

export default function JobsPage() {
  const { isConnected } = useAccount()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('recent')
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [showBidModal, setShowBidModal] = useState(false)
  
  // Fetch real blockchain data
  const { jobs: blockchainJobs, loading } = useJobs()
  
  // Use blockchain jobs if available, otherwise show demo data
  const jobListings = blockchainJobs.length > 0 ? blockchainJobs.map(job => ({
    id: job.id,
    title: job.title || `Project #${job.id}`,
    description: job.description || 'On-chain project - details available after connection',
    budget: job.totalBudget,
    duration: 'TBD',
    skills: job.skills || [],
    client: {
      address: job.client.slice(0, 6) + '...' + job.client.slice(-4),
      reputation: 0,
      projectsPosted: 0
    },
    postedAt: 'Recently',
    proposals: 0,
    category: 'Development'
  })) : demoJobListings

  const categories = ['All', 'Development', 'Consulting', 'Design', 'Writing']

  const handleApplyClick = (job: any) => {
    setSelectedJob(job)
    setShowBidModal(true)
  }
  
  const filteredJobs = jobListings.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Award className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ReputeFlow
            </h1>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/jobs" className="text-blue-600 font-semibold">Jobs</Link>
            <Link href="/freelancers" className="hover:text-blue-600 transition">Freelancers</Link>
            <Link href="/dashboard" className="hover:text-blue-600 transition">Dashboard</Link>
          </nav>
          <ConnectButton />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Data Source Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900">
              {blockchainJobs.length > 0 ? (
                <><strong>Live Data:</strong> Showing {blockchainJobs.length} real job(s) from blockchain.</>
              ) : (
                <><strong>Demo Mode:</strong> No jobs found on blockchain. {!isConnected ? 'Connect your wallet to see real opportunities.' : 'Create a job to see it here!'}</>
              )}
            </p>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Browse Jobs</h2>
          <p className="text-gray-600">Find your next opportunity in Web3</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs, skills, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-4 mt-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('recent')}
                className={`px-4 py-2 rounded-lg transition ${
                  sortBy === 'recent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Most Recent
              </button>
              <button
                onClick={() => setSortBy('budget')}
                className={`px-4 py-2 rounded-lg transition ${
                  sortBy === 'budget' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Highest Budget
              </button>
              <button
                onClick={() => setSortBy('proposals')}
                className={`px-4 py-2 rounded-lg transition ${
                  sortBy === 'proposals' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Least Competition
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">{filteredJobs.length} jobs found</p>
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {filteredJobs.map(job => (
            <JobCard key={job.id} job={job} onApply={() => handleApplyClick(job)} />
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Bid Submission Modal */}
      {selectedJob && (
        <SubmitBidModal
          isOpen={showBidModal}
          onClose={() => setShowBidModal(false)}
          onSuccess={() => {
            alert('Bid submitted successfully!')
            setShowBidModal(false)
          }}
          job={selectedJob}
        />
      )}
    </div>
  )
}

function JobCard({ job, onApply }: { job: any; onApply: () => void }) {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2 hover:text-blue-600 cursor-pointer">
            {job.title}
          </h3>
          <p className="text-gray-600 mb-4">{job.description}</p>
        </div>
        <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
          {job.category}
        </span>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {job.skills.map((skill: string) => (
          <span key={skill} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
            {skill}
          </span>
        ))}
      </div>

      {/* Job Details */}
      <div className="grid md:grid-cols-4 gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <DollarSign className="h-4 w-4" />
          <span className="font-semibold text-green-600">${job.budget.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="h-4 w-4" />
          <span>{job.duration}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Briefcase className="h-4 w-4" />
          <span>{job.proposals} proposals</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="h-4 w-4" />
          <span>{job.postedAt}</span>
        </div>
      </div>

      {/* Client Info */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
            {job.client.address.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{job.client.address}</p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{job.client.reputation}/100</span>
              <span>•</span>
              <span>{job.client.projectsPosted} projects</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onApply}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Apply Now
        </button>
      </div>
    </div>
  )
}
