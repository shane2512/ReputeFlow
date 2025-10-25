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

export function useEscrowDetails(projectId: bigint | undefined) {
  const { data: projectData, isLoading } = useReadContract({
    ...CONTRACTS.WorkEscrow,
    functionName: 'getProject',
    args: projectId !== undefined ? [projectId] : undefined,
    query: {
      enabled: projectId !== undefined,
    },
  });

  if (!projectData || isLoading) {
    return { escrowDetails: null, isLoading };
  }

  const details = projectData as any;
  
  return {
    escrowDetails: {
      projectId: details.projectId,
      client: details.client,
      freelancer: details.freelancer,
      totalBudget: parseFloat(formatEther(details.totalBudget)),
      paidAmount: parseFloat(formatEther(details.paidAmount)),
      status: Number(details.status),
      createdAt: new Date(Number(details.createdAt) * 1000),
      completedAt: details.completedAt > 0 ? new Date(Number(details.completedAt) * 1000) : null,
    },
    isLoading: false,
  };
}
