// Contract addresses on Base Sepolia
export const CONTRACT_ADDRESSES = {
  ReputationRegistry: "0xFA07a0C1A3Cbc2aB9CB5e8b81A8c62c077925026" as `0x${string}`,
  WorkEscrow: "0x543D67754A05c60035f57DA9Dc7FA6685dCe6A8B" as `0x${string}`,
  AgentMatcher: "0x79fFF158FBe10377E127516851f2b7bC4571f4F1" as `0x${string}`,
  DisputeResolver: "0x76d6F10e6051E3eeE334c506380c95fd3a67264F" as `0x${string}`,
} as const;

// Simplified ABIs - Matching actual deployed contracts
export const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getReputationScore",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "overallScore", type: "uint256" },
          { name: "completedProjects", type: "uint256" },
          { name: "totalEarnings", type: "uint256" },
          { name: "averageRating", type: "uint256" },
          { name: "successRate", type: "uint256" },
          { name: "responseTime", type: "uint256" },
          { name: "lastUpdated", type: "uint256" },
          { name: "isActive", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserBadges",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getWorkHistory",
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "projectId", type: "uint256" },
          { name: "client", type: "address" },
          { name: "completedAt", type: "uint256" },
          { name: "rating", type: "uint256" },
          { name: "earnings", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const WORK_ESCROW_ABI = [
  {
    inputs: [{ name: "projectId", type: "uint256" }],
    name: "getProject",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "projectId", type: "uint256" },
          { name: "client", type: "address" },
          { name: "freelancer", type: "address" },
          { name: "totalBudget", type: "uint256" },
          { name: "paidAmount", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "completedAt", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "yellowChannelId", type: "bytes32" },
          { name: "sourceChain", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "projectId", type: "uint256" }],
    name: "getProjectMilestones",
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "description", type: "string" },
          { name: "paymentAmount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "deliverableHash", type: "string" },
          { name: "submittedAt", type: "uint256" },
          { name: "approvedAt", type: "uint256" },
          { name: "validator", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const AGENT_MATCHER_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getActiveJobs",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "jobId", type: "uint256" }],
    name: "getJobDetails",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "client", type: "address" },
          { name: "title", type: "string" },
          { name: "budget", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAvailableJobs",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const DISPUTE_RESOLVER_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getDisputeCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "disputeId", type: "uint256" }],
    name: "getDisputeDetails",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "escrowId", type: "uint256" },
          { name: "initiator", type: "address" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Contract configurations for wagmi
export const CONTRACTS = {
  ReputationRegistry: {
    address: CONTRACT_ADDRESSES.ReputationRegistry,
    abi: REPUTATION_REGISTRY_ABI,
  },
  WorkEscrow: {
    address: CONTRACT_ADDRESSES.WorkEscrow,
    abi: WORK_ESCROW_ABI,
  },
  AgentMatcher: {
    address: CONTRACT_ADDRESSES.AgentMatcher,
    abi: AGENT_MATCHER_ABI,
  },
  DisputeResolver: {
    address: CONTRACT_ADDRESSES.DisputeResolver,
    abi: DISPUTE_RESOLVER_ABI,
  },
} as const;
