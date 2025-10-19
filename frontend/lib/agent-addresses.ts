/**
 * Agent Addresses for ReputeFlow
 * These are the deployed agents in Agentverse
 */

export const AGENT_ADDRESSES = {
  // Note: Update these with your actual agent addresses from Agentverse
  // After deploying agents, copy their addresses here
  
  freelancer: "agent1qta5tj80y44j8txwyw78c7vyvc673n28ehsnqkwyvg8y5p8kgvgvga52fd3" as const, // FreelancerAgent address
  client: "agent1qd28l8zf6f3r2c284mfekmh8ha8r96vssmxcyp4azlvzsdum8lcj2vmjc7f" as const,     // ClientAgent address
  validator: "agent1q28jt2d8qzwvq5ue9v06vfa242ha7qny6x0l560rlad06my2gfqy5vkqjty" as const,  // ValidatorAgent address
  coordinator: "agent1q0g2jf22pd26wrexs2uqvnlppgqfl3le8vssl74ktvhsl2yvwcpm5lu04u6" as const, // SwarmCoordinator address
  analyzer: "agent1qv30gj7xv6qdrhyemfma69pl2rpv3gep84fl9lefev5vklyjffax2w6yklm" as const,   // MarketAnalyzer address
  oracle: "agent1qf3ph6mz2c40djk5nkd586scuxll6hq253sm27yx063xqw0s7n9gk96zqws" as const,     // ReputationOracle address
} as const

export type AgentType = keyof typeof AGENT_ADDRESSES

/**
 * Get agent address by type
 */
export function getAgentAddress(agentType: AgentType): string {
  return AGENT_ADDRESSES[agentType]
}

/**
 * Agent display names
 */
export const AGENT_NAMES: Record<AgentType, string> = {
  freelancer: "FreelancerAgent",
  client: "ClientAgent",
  validator: "ValidatorAgent",
  coordinator: "SwarmCoordinator",
  analyzer: "MarketAnalyzer",
  oracle: "ReputationOracle",
}

/**
 * Agent descriptions
 */
export const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  freelancer: "Autonomous freelancer agent for job discovery, bidding, and project execution",
  client: "Client agent for job posting, bid evaluation, and project management",
  validator: "Validator agent for work quality assessment and dispute resolution",
  coordinator: "Swarm coordinator for multi-agent orchestration and task distribution",
  analyzer: "Market analyzer for trends, pricing insights, and demand forecasting",
  oracle: "Reputation oracle for trust scoring and fraud detection",
}

/**
 * Check if agent addresses are configured
 */
export function areAgentsConfigured(): boolean {
  return Object.values(AGENT_ADDRESSES).every(addr => !addr.includes("..."))
}
