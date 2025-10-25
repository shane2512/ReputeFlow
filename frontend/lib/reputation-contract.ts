/**
 * Reputation Contract Integration
 * Handles interactions with ReputationRegistry.sol
 */

import { ethers } from 'ethers';

// Contract address (Base Sepolia)
export const REPUTATION_REGISTRY_ADDRESS = '0xFA07a0C1A3Cbc2aB9CB5e8b81A8c62c077925026';

// Minimal ABI for reputation functions
export const REPUTATION_REGISTRY_ABI = [
  // Read functions
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getReputationScore",
    "outputs": [{
      "components": [
        {"internalType": "uint256", "name": "overallScore", "type": "uint256"},
        {"internalType": "uint256", "name": "completedProjects", "type": "uint256"},
        {"internalType": "uint256", "name": "totalEarnings", "type": "uint256"},
        {"internalType": "uint256", "name": "averageRating", "type": "uint256"},
        {"internalType": "uint256", "name": "successRate", "type": "uint256"},
        {"internalType": "uint256", "name": "responseTime", "type": "uint256"},
        {"internalType": "uint256", "name": "lastUpdated", "type": "uint256"},
        {"internalType": "bool", "name": "isActive", "type": "bool"}
      ],
      "internalType": "struct ReputationRegistry.ReputationScore",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserBadges",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "badgeMetadata",
    "outputs": [
      {"internalType": "string", "name": "skillName", "type": "string"},
      {"internalType": "uint256", "name": "proficiencyLevel", "type": "uint256"},
      {"internalType": "uint256", "name": "qualityScore", "type": "uint256"},
      {"internalType": "uint256", "name": "projectsCompleted", "type": "uint256"},
      {"internalType": "uint256", "name": "mintedAt", "type": "uint256"},
      {"internalType": "address", "name": "validator", "type": "address"},
      {"internalType": "bytes32", "name": "pythFeedId", "type": "bytes32"},
      {"internalType": "bool", "name": "isVerified", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Write functions
  {
    "inputs": [
      {"internalType": "address", "name": "freelancer", "type": "address"},
      {"internalType": "address", "name": "client", "type": "address"},
      {"internalType": "uint256", "name": "projectId", "type": "uint256"},
      {"internalType": "uint256", "name": "paymentAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "qualityScore", "type": "uint256"},
      {"internalType": "string[]", "name": "skillsUsed", "type": "string[]"},
      {"internalType": "bytes32", "name": "deliverableHash", "type": "bytes32"}
    ],
    "name": "recordWorkCompletion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "string[]", "name": "skills", "type": "string[]"}
    ],
    "name": "initializeReputation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export interface ReputationScore {
  overallScore: bigint;
  completedProjects: bigint;
  totalEarnings: bigint;
  averageRating: bigint;
  successRate: bigint;
  responseTime: bigint;
  lastUpdated: bigint;
  isActive: boolean;
}

export interface SkillBadge {
  skillName: string;
  proficiencyLevel: bigint;
  qualityScore: bigint;
  projectsCompleted: bigint;
  mintedAt: bigint;
  validator: string;
  pythFeedId: string;
  isVerified: boolean;
}

/**
 * Get reputation score for a freelancer
 */
export async function getReputationScore(
  provider: ethers.Provider,
  freelancerAddress: string
): Promise<ReputationScore | null> {
  try {
    const contract = new ethers.Contract(
      REPUTATION_REGISTRY_ADDRESS,
      REPUTATION_REGISTRY_ABI,
      provider
    );

    const score = await contract.getReputationScore(freelancerAddress);
    
    return {
      overallScore: score.overallScore,
      completedProjects: score.completedProjects,
      totalEarnings: score.totalEarnings,
      averageRating: score.averageRating,
      successRate: score.successRate,
      responseTime: score.responseTime,
      lastUpdated: score.lastUpdated,
      isActive: score.isActive
    };
  } catch (error) {
    console.error('Error fetching reputation score:', error);
    return null;
  }
}

/**
 * Get skill badges for a freelancer
 */
export async function getSkillBadges(
  provider: ethers.Provider,
  freelancerAddress: string
): Promise<SkillBadge[]> {
  try {
    const contract = new ethers.Contract(
      REPUTATION_REGISTRY_ADDRESS,
      REPUTATION_REGISTRY_ABI,
      provider
    );

    const badgeIds = await contract.getUserBadges(freelancerAddress);
    const badges: SkillBadge[] = [];

    for (const badgeId of badgeIds) {
      const metadata = await contract.badgeMetadata(badgeId);
      badges.push({
        skillName: metadata.skillName,
        proficiencyLevel: metadata.proficiencyLevel,
        qualityScore: metadata.qualityScore,
        projectsCompleted: metadata.projectsCompleted,
        mintedAt: metadata.mintedAt,
        validator: metadata.validator,
        pythFeedId: metadata.pythFeedId,
        isVerified: metadata.isVerified
      });
    }

    return badges;
  } catch (error) {
    console.error('Error fetching skill badges:', error);
    return [];
  }
}

/**
 * Record work completion (called by validator/admin when deliverable is approved)
 * This automatically updates reputation metrics
 */
export async function recordWorkCompletion(
  signer: ethers.Signer,
  freelancerAddress: string,
  clientAddress: string,
  projectId: number,
  paymentAmountUSD: number, // In USD (will be scaled by 1e8)
  qualityScore: number, // 0-100
  skillsUsed: string[],
  deliverableIPFSHash: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = new ethers.Contract(
      REPUTATION_REGISTRY_ADDRESS,
      REPUTATION_REGISTRY_ABI,
      signer
    );

    // Scale payment amount (USD to 1e8)
    const scaledPayment = BigInt(Math.floor(paymentAmountUSD * 1e8));

    // Convert IPFS hash to bytes32
    const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes(deliverableIPFSHash));

    // Call contract
    const tx = await contract.recordWorkCompletion(
      freelancerAddress,
      clientAddress,
      projectId,
      scaledPayment,
      qualityScore,
      skillsUsed,
      deliverableHash
    );

    await tx.wait();

    console.log('✅ Work completion recorded! Reputation updated.');
    console.log('Transaction hash:', tx.hash);

    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error('Error recording work completion:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to record work completion' 
    };
  }
}

/**
 * Initialize reputation for a new freelancer
 */
export async function initializeReputation(
  signer: ethers.Signer,
  freelancerAddress: string,
  initialSkills: string[]
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = new ethers.Contract(
      REPUTATION_REGISTRY_ADDRESS,
      REPUTATION_REGISTRY_ABI,
      signer
    );

    const tx = await contract.initializeReputation(freelancerAddress, initialSkills);
    await tx.wait();

    console.log('✅ Reputation initialized!');
    console.log('Transaction hash:', tx.hash);

    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error('Error initializing reputation:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to initialize reputation' 
    };
  }
}

/**
 * Format reputation score for display
 */
export function formatReputationScore(score: ReputationScore) {
  return {
    score: Number(score.overallScore),
    completedProjects: Number(score.completedProjects),
    totalEarnings: Number(score.totalEarnings) / 1e8, // Convert back to USD
    averageRating: Number(score.averageRating),
    successRate: Number(score.successRate),
    responseTime: Number(score.responseTime),
    lastUpdated: new Date(Number(score.lastUpdated) * 1000),
    isActive: score.isActive
  };
}
