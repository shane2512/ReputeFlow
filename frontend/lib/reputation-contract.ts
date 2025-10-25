/**
 * Reputation Contract Integration
 * Handles interactions with ReputationRegistry.sol
 */

import { keccak256, toBytes } from 'viem';

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
 * Utility: Convert IPFS hash to bytes32
 */
export function ipfsHashToBytes32(ipfsHash: string): `0x${string}` {
  return keccak256(toBytes(ipfsHash));
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
