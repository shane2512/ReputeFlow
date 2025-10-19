/**
 * Contract addresses and ABIs for ReputeFlow
 */

export const CONTRACTS = {
  REPUTATION_REGISTRY: process.env.NEXT_PUBLIC_REPUTATION_REGISTRY as `0x${string}`,
  WORK_ESCROW: process.env.NEXT_PUBLIC_WORK_ESCROW as `0x${string}`,
  AGENT_MATCHER: process.env.NEXT_PUBLIC_AGENT_MATCHER as `0x${string}`,
  DISPUTE_RESOLVER: process.env.NEXT_PUBLIC_DISPUTE_RESOLVER as `0x${string}`,
  DATACOIN_FACTORY: process.env.NEXT_PUBLIC_DATACOIN_FACTORY as `0x${string}`,
}

// Simplified ABIs - add full ABIs as needed
export const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getReputation",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getSkillBadges",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const

export const AGENT_MATCHER_ABI = [
  {
    inputs: [
      { name: "agent", type: "address" },
      { name: "skills", type: "string[]" },
      { name: "hourlyRate", type: "uint256" },
      { name: "availability", type: "uint8" },
      { name: "reputationScore", type: "uint256" },
    ],
    name: "registerAgent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "requiredSkills", type: "string[]" },
      { name: "minReputation", type: "uint256" },
      { name: "maxBudget", type: "uint256" },
    ],
    name: "findBestAgent",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const

export const WORK_ESCROW_ABI = [
  {
    inputs: [
      { name: "client", type: "address" },
      { name: "freelancer", type: "address" },
      { name: "totalBudget", type: "uint256" },
      { name: "milestoneDescriptions", type: "string[]" },
      { name: "milestoneAmounts", type: "uint256[]" },
      { name: "milestoneDeadlines", type: "uint256[]" },
    ],
    name: "createProject",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "projectId", type: "uint256" }],
    name: "getProject",
    outputs: [
      {
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
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "projectId", type: "uint256" },
      { indexed: true, name: "client", type: "address" },
      { indexed: true, name: "freelancer", type: "address" },
      { indexed: false, name: "totalBudget", type: "uint256" },
    ],
    name: "ProjectCreated",
    type: "event",
  },
  {
    inputs: [],
    name: "nextProjectId",
    outputs: [{ name: "", type: "uint256" }],
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
] as const
