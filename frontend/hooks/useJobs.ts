'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getAllProjects } from '@/lib/blockchain'
import { getJobMetadata } from '@/lib/lighthouse'

export interface Job {
  id: number
  title: string
  description: string
  client: string
  freelancer: string
  totalBudget: number
  status: number
  createdAt: number
  skills?: string[]
  milestones?: {
    description: string
    amount: number
    deadline: number
    completed: boolean
  }[]
}

export function useJobs() {
  const { address } = useAccount()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch ALL projects from blockchain (all users)
      const allProjects = await getAllProjects()
      
      console.log('Fetched projects from blockchain:', allProjects)
      
      // Transform to Job format and fetch metadata from Lighthouse
      const jobList: Job[] = await Promise.all(allProjects.map(async (project: any) => {
        // Check if first milestone contains a CID (Lighthouse metadata)
        const firstMilestone = project.milestones?.[0]?.description || ''
        let metadata = null
        
        if (firstMilestone.startsWith('bafkrei')) {
          try {
            metadata = await getJobMetadata(firstMilestone)
            console.log(`Fetched metadata for project ${project.id}:`, metadata)
          } catch (err) {
            console.warn(`Failed to fetch metadata for project ${project.id}:`, err)
          }
        }
        
        // Use metadata for display info, but blockchain data for amounts
        return {
          id: project.id || 0,
          title: metadata?.title || `Project #${project.id || 0}`,
          description: metadata?.description || 'Project details stored on-chain',
          client: project.client,
          freelancer: project.freelancer,
          totalBudget: project.totalBudget, // Already descaled in blockchain.ts
          status: Number(project.status || 0),
          createdAt: metadata?.createdAt || Date.now(),
          skills: metadata?.skills || [],
          // Use blockchain milestones (with correct amounts) but merge with metadata descriptions
          milestones: project.milestones?.map((m: any, i: number) => ({
            ...m,
            description: metadata?.milestones?.[i]?.description || m.description
          })) || []
        }
      }))

      console.log('Transformed jobs:', jobList)
      setJobs(jobList)
    } catch (err: any) {
      console.error('Error fetching jobs:', err)
      setError(err.message || 'Failed to fetch jobs')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs
  }
}
