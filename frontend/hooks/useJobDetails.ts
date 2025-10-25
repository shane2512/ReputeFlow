import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';
import { formatEther } from 'viem';

export function useJobDetails(jobId: bigint | undefined) {
  const { data: jobDetails, isLoading } = useReadContract({
    ...CONTRACTS.AgentMatcher,
    functionName: 'getJobDetails',
    args: jobId !== undefined ? [jobId] : undefined,
    query: {
      enabled: jobId !== undefined,
    },
  });

  if (!jobDetails || isLoading) {
    return { jobDetails: null, isLoading };
  }

  const details = jobDetails as any;
  
  return {
    jobDetails: {
      client: details.client,
      title: details.title,
      budget: parseFloat(formatEther(details.budget)),
      deadline: new Date(Number(details.deadline) * 1000),
      status: Number(details.status),
    },
    isLoading: false,
  };
}

export function useEscrowDetails(escrowId: bigint | undefined) {
  const { data: escrowDetails, isLoading } = useReadContract({
    ...CONTRACTS.WorkEscrow,
    functionName: 'getEscrowDetails',
    args: escrowId !== undefined ? [escrowId] : undefined,
    query: {
      enabled: escrowId !== undefined,
    },
  });

  if (!escrowDetails || isLoading) {
    return { escrowDetails: null, isLoading };
  }

  const details = escrowDetails as any;
  
  return {
    escrowDetails: {
      client: details.client,
      freelancer: details.freelancer,
      amount: parseFloat(formatEther(details.amount)),
      status: Number(details.status),
      deadline: new Date(Number(details.deadline) * 1000),
    },
    isLoading: false,
  };
}
