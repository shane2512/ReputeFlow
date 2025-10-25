/**
 * Hook to fetch real reputation data from ReputationRegistry contract
 */

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

const REPUTATION_REGISTRY_ADDRESS = '0xFA07a0C1A3Cbc2aB9CB5e8b81A8c62c077925026' as const;

const REPUTATION_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getReputationScore',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'overallScore', type: 'uint256' },
          { internalType: 'uint256', name: 'completedProjects', type: 'uint256' },
          { internalType: 'uint256', name: 'totalEarnings', type: 'uint256' },
          { internalType: 'uint256', name: 'averageRating', type: 'uint256' },
          { internalType: 'uint256', name: 'successRate', type: 'uint256' },
          { internalType: 'uint256', name: 'responseTime', type: 'uint256' },
          { internalType: 'uint256', name: 'lastUpdated', type: 'uint256' },
          { internalType: 'bool', name: 'isActive', type: 'bool' },
        ],
        internalType: 'struct ReputationRegistry.ReputationScore',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserBadges',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface ReputationData {
  overallScore: number;
  completedProjects: number;
  totalEarnings: number;
  averageRating: number;
  successRate: number;
  responseTime: number;
  lastUpdated: Date;
  isActive: boolean;
  hasData: boolean;
  isLoading: boolean;
}

export function useReputationData() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [data, setData] = useState<ReputationData>({
    overallScore: 0,
    completedProjects: 0,
    totalEarnings: 0,
    averageRating: 0,
    successRate: 0,
    responseTime: 0,
    lastUpdated: new Date(),
    isActive: false,
    hasData: false,
    isLoading: true,
  });

  useEffect(() => {
    async function fetchReputationData() {
      if (!address || !publicClient) {
        console.log('❌ No address or publicClient');
        setData(prev => ({ ...prev, isLoading: false, hasData: false }));
        return;
      }

      try {
        console.log('🔍 Fetching reputation for:', address);
        console.log('📍 Contract address:', REPUTATION_REGISTRY_ADDRESS);
        console.log('🌐 Network:', await publicClient.getChainId());
        
        setData(prev => ({ ...prev, isLoading: true }));

        // Check if contract exists at address
        const code = await publicClient.getBytecode({
          address: REPUTATION_REGISTRY_ADDRESS,
        });

        console.log('📝 Contract bytecode length:', code?.length || 0);

        if (!code || code === '0x') {
          console.warn('⚠️ ReputationRegistry contract not deployed at', REPUTATION_REGISTRY_ADDRESS);
          setData(prev => ({ ...prev, isLoading: false, hasData: false }));
          return;
        }

        console.log('✅ Contract exists, calling getReputationScore...');

        const result = await publicClient.readContract({
          address: REPUTATION_REGISTRY_ADDRESS,
          abi: REPUTATION_ABI,
          functionName: 'getReputationScore',
          args: [address],
        });

        console.log('📊 Raw result from contract:', result);

        // Convert BigInt values to numbers
        const overallScore = Number(result.overallScore);
        const completedProjects = Number(result.completedProjects);
        const totalEarningsScaled = Number(result.totalEarnings);
        const averageRating = Number(result.averageRating);
        const successRate = Number(result.successRate);
        const responseTime = Number(result.responseTime);
        const lastUpdatedTimestamp = Number(result.lastUpdated);
        const isActive = result.isActive;

        // Convert earnings from scaled value (1e8) to USD
        const totalEarnings = totalEarningsScaled / 1e8;

        // Check if user has any data
        const hasData = completedProjects > 0 || totalEarnings > 0 || overallScore > 0;

        console.log('📈 Converted data:', {
          overallScore,
          completedProjects,
          totalEarnings,
          averageRating,
          successRate,
          responseTime,
          hasData
        });

        setData({
          overallScore,
          completedProjects,
          totalEarnings,
          averageRating,
          successRate,
          responseTime,
          lastUpdated: new Date(lastUpdatedTimestamp * 1000),
          isActive,
          hasData,
          isLoading: false,
        });

        console.log('✅ Reputation data loaded successfully!');
      } catch (error) {
        console.error('❌ Error fetching reputation data:', error);
        setData(prev => ({ ...prev, isLoading: false, hasData: false }));
      }
    }

    fetchReputationData();
  }, [address, publicClient]);

  return data;
}
