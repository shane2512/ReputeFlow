/**
 * Hook to fetch and manage user reputation data
 */

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getUserReputation, getUserSkillBadges } from '@/lib/blockchain'

export interface ReputationData {
  score: number
  badges: number[]
  loading: boolean
  error: string | null
}

export function useReputation() {
  const { address } = useAccount()
  const [data, setData] = useState<ReputationData>({
    score: 0,
    badges: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function fetchReputation() {
      if (!address) {
        setData({ score: 0, badges: [], loading: false, error: null })
        return
      }

      try {
        setData(prev => ({ ...prev, loading: true, error: null }))
        
        const [score, badges] = await Promise.all([
          getUserReputation(address),
          getUserSkillBadges(address),
        ])

        setData({
          score,
          badges,
          loading: false,
          error: null,
        })
      } catch (error) {
        console.error('Error fetching reputation:', error)
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch reputation data',
        }))
      }
    }

    fetchReputation()
  }, [address])

  return data
}
