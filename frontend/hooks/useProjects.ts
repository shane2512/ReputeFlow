/**
 * Hook to fetch and manage user projects
 */

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getUserProjects } from '@/lib/blockchain'

export interface Project {
  id: number
  client: string
  freelancer: string
  totalBudget: number
  status: number
  title?: string
  description?: string
}

export function useProjects() {
  const { address } = useAccount()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProjects() {
      if (!address) {
        setProjects([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const userProjects = await getUserProjects(address)
        setProjects(userProjects)
      } catch (err) {
        console.error('Error fetching projects:', err)
        setError('Failed to fetch projects')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [address])

  const refetch = async () => {
    if (!address) return
    
    try {
      setLoading(true)
      const userProjects = await getUserProjects(address)
      setProjects(userProjects)
    } catch (err) {
      console.error('Error refetching projects:', err)
      setError('Failed to refetch projects')
    } finally {
      setLoading(false)
    }
  }

  return {
    projects,
    loading,
    error,
    refetch,
  }
}
