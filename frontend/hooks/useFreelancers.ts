'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

export interface Freelancer {
  address: string
  name?: string
  title?: string
  reputation: number
  skills: string[]
  hourlyRate?: number
  completedProjects: number
  availability: string
  verified: boolean
}

export function useFreelancers() {
  const { address } = useAccount()
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFreelancers = async () => {
    if (!address) {
      setFreelancers([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // TODO: Fetch registered freelancers from AgentMatcher contract
      // For now, returning empty array until we implement agent registration
      
      // const registeredAgents = await getRegisteredAgents()
      // const freelancerList = await Promise.all(
      //   registeredAgents.map(async (agent) => {
      //     const reputation = await getUserReputation(agent.address)
      //     return {
      //       address: agent.address,
      //       reputation,
      //       skills: agent.skills,
      //       hourlyRate: agent.rate,
      //       completedProjects: agent.completedJobs,
      //       availability: 'Available',
      //       verified: reputation > 50
      //     }
      //   })
      // )

      setFreelancers([])
    } catch (err: any) {
      console.error('Error fetching freelancers:', err)
      setError(err.message || 'Failed to fetch freelancers')
      setFreelancers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFreelancers()
  }, [address])

  return {
    freelancers,
    loading,
    error,
    refetch: fetchFreelancers
  }
}
