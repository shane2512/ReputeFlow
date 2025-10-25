import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';
import { useEffect, useState } from 'react';
import { formatEther } from 'viem';

export function useFreelancerData() {
  const { address } = useAccount();
  const [processedData, setProcessedData] = useState({
    totalEarnings: 0,
    activeJobs: 0,
    completedJobs: 0,
    reputationScore: 0,
    avgJobValue: 0,
    recentJobs: [] as any[],
  });

  // Read reputation score (returns full struct with all data we need)
  const { data: reputationData, isLoading: loadingReputation } = useReadContract({
    ...CONTRACTS.ReputationRegistry,
    functionName: 'getReputationScore',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Process data when contract reads complete
  useEffect(() => {
    if (!address) return;

    // Extract ALL data from reputation struct
    const repData = reputationData as any;
    const completed = repData ? Number(repData.completedProjects) : 0;
    const reputation = repData ? Number(repData.overallScore) : 0;
    const totalEarnings = repData ? Number(repData.totalEarnings) / 1e8 : 0; // USD scaled by 1e8
    const avgValue = completed > 0 ? totalEarnings / completed : 0;
    
    // Note: activeJobs would need to come from a different source
    // For now, we'll show 0 as the contract doesn't have this function
    const active = 0;

    console.log('📊 Freelancer Contract Data:', {
      address,
      totalEarnings,
      active,
      completed,
      reputation,
      avgValue,
      rawData: {
        reputationData: repData,
      }
    });

    setProcessedData({
      totalEarnings,
      activeJobs: active,
      completedJobs: completed,
      reputationScore: reputation,
      avgJobValue: avgValue,
      recentJobs: [], // Will be populated with detailed job data
    });
  }, [address, reputationData]);

  const isLoading = loadingReputation;
  
  // Consider data available if we have an address and finished loading
  // Even if values are 0, that's still valid contract data
  const hasData = !!address && !isLoading && reputationData !== undefined;

  return {
    ...processedData,
    isLoading,
    hasData,
  };
}
