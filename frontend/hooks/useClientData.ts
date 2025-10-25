import { useAccount, usePublicClient } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';

const WORK_ESCROW_ADDRESS = '0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B' as const;

// Minimal ABI for WorkEscrow
const WORK_ESCROW_ABI = [
  {
    inputs: [],
    name: 'nextProjectId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'projectId', type: 'uint256' }],
    name: 'getProject',
    outputs: [{
      components: [
        { internalType: 'uint256', name: 'projectId', type: 'uint256' },
        { internalType: 'address', name: 'client', type: 'address' },
        { internalType: 'address', name: 'freelancer', type: 'address' },
        { internalType: 'uint256', name: 'totalBudget', type: 'uint256' },
        { internalType: 'uint256', name: 'paidAmount', type: 'uint256' },
        { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
        { internalType: 'uint256', name: 'completedAt', type: 'uint256' },
        { internalType: 'uint8', name: 'status', type: 'uint8' },
        { internalType: 'bytes32', name: 'yellowChannelId', type: 'bytes32' },
        { internalType: 'uint256', name: 'sourceChain', type: 'uint256' }
      ],
      internalType: 'struct WorkEscrow.Project',
      name: '',
      type: 'tuple'
    }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useClientData() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [processedData, setProcessedData] = useState({
    totalSpent: 0,
    activeProjects: 0,
    completedProjects: 0,
    avgProjectCost: 0,
    activeProjectsList: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    async function fetchClientProjects() {
      if (!address || !publicClient) {
        console.log('❌ No address or publicClient for client data');
        setIsLoading(false);
        setHasData(false);
        return;
      }

      try {
        console.log('🔍 Fetching client projects for:', address);
        setIsLoading(true);

        // Get next project ID (total projects = nextProjectId - 1)
        const nextProjectId = await publicClient.readContract({
          address: WORK_ESCROW_ADDRESS,
          abi: WORK_ESCROW_ABI,
          functionName: 'nextProjectId',
        });

        const projectCount = Number(nextProjectId) - 1; // Projects are 1-indexed
        console.log('📊 Total projects in contract:', projectCount);

      let totalSpent = 0;
      let activeCount = 0;
      let completedCount = 0;
      const clientProjects = [];

      // Fetch all projects and filter by client address
      for (let i = 1; i <= Number(projectCount); i++) {
        try {
          const project = await publicClient.readContract({
            address: WORK_ESCROW_ADDRESS,
            abi: WORK_ESCROW_ABI,
            functionName: 'getProject',
            args: [BigInt(i)],
          });

          // Check if this project belongs to the connected client
          if (project.client.toLowerCase() === address.toLowerCase()) {
            const budgetEth = Number(project.totalBudget) / 1e18;
            const budgetUsd = budgetEth * 2000; // Approximate ETH to USD
            
            totalSpent += budgetUsd;
            
            // Status: 0=Created, 1=InProgress, 2=Completed, 3=Disputed
            if (project.status === 2) {
              completedCount++;
            } else if (project.status === 0 || project.status === 1) {
              activeCount++;
            }

            clientProjects.push({
              id: i.toString(),
              budget: budgetUsd,
              status: project.status,
              freelancer: project.freelancer,
            });
          }
        } catch (err) {
          console.log(`⚠️ Could not fetch project ${i}:`, err);
        }
      }

      const totalProjects = activeCount + completedCount;
      const avgCost = totalProjects > 0 ? totalSpent / totalProjects : 0;

      console.log('📈 Client data processed:', {
        totalSpent,
        activeCount,
        completedCount,
        avgCost,
        projectsFound: clientProjects.length
      });

      setProcessedData({
        totalSpent,
        activeProjects: activeCount,
        completedProjects: completedCount,
        avgProjectCost: avgCost,
        activeProjectsList: clientProjects,
      });

      setHasData(clientProjects.length > 0);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error fetching client data:', error);
      setIsLoading(false);
      setHasData(false);
    }
    }

    fetchClientProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return {
    ...processedData,
    isLoading,
    hasData,
  };
}
