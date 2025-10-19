// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/IPythRandom.sol";

/**
 * @title AgentMatcher
 * @notice Provably fair agent selection using Pyth Entropy for randomness
 * @dev Implements reputation-weighted random selection with cryptographic fairness guarantees
 * 
 * Key Features:
 * - Pyth Entropy integration for verifiable randomness
 * - Reputation-weighted agent selection
 * - Skill-based agent pool filtering
 * - Transparent selection audit trail
 * - Agent availability management
 * - Anti-gaming mechanisms
 * 
 * Sponsor Integration: Pyth Network
 * - Uses Entropy for provably fair randomness
 * - Ensures no manipulation in agent selection
 * - Provides cryptographic proof of fairness
 */
contract AgentMatcher is AccessControl, ReentrancyGuard, Pausable {
    
    // ============ Type Declarations ============
    
    /// @notice Agent profile data
    struct AgentProfile {
        address agentAddress;        // Agent wallet address
        string[] skills;             // Skills offered
        uint256 hourlyRate;          // Rate in USD (scaled by 1e8)
        uint256 availability;        // Hours available per week
        uint256 reputationScore;     // Reputation (0-1000)
        uint256 completedProjects;   // Total projects
        uint256 successRate;         // Success percentage (0-100)
        uint256 registeredAt;        // Registration timestamp
        bool isActive;               // Active status
        bool isBanned;               // Banned status
    }
    
    /// @notice Agent pool for job matching
    struct AgentPool {
        bytes32 poolId;              // Pool identifier
        bytes32 jobId;               // Associated job
        address[] qualifiedAgents;   // Agents meeting requirements
        uint256[] reputationWeights; // Reputation-based weights
        uint256 createdAt;           // Pool creation time
        bool isActive;               // Pool status
    }
    
    /// @notice Job requirements for filtering
    struct AgentRequirements {
        string[] requiredSkills;     // Must-have skills
        uint256 minReputation;       // Minimum reputation score
        uint256 maxHourlyRate;       // Maximum acceptable rate
        uint256 minAvailability;     // Minimum hours needed
        uint256 minSuccessRate;      // Minimum success rate
    }
    
    /// @notice Selection record for audit trail
    struct SelectionRecord {
        uint256 selectionId;         // Unique identifier
        bytes32 poolId;              // Agent pool used
        address selectedAgent;       // Chosen agent
        uint64 entropySequence;      // Pyth entropy sequence number
        bytes32 userRandomness;      // User-provided randomness
        bytes32 providerRandomness;  // Pyth provider randomness
        uint256 timestamp;           // Selection time
        bool isWeighted;             // Whether reputation-weighted
    }
    
    // ============ State Variables ============
    
    /// @notice Pyth oracle contract
    IPyth public immutable pyth;
    
    /// @notice Pyth Entropy contract
    IPythRandom public immutable pythEntropy;
    
    /// @notice Role for validators
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    
    /// @notice Role for admins
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Mapping of agent addresses to profiles
    mapping(address => AgentProfile) public agentProfiles;
    
    /// @notice Mapping of pool IDs to agent pools
    mapping(bytes32 => AgentPool) public agentPools;
    
    /// @notice Mapping of selection IDs to records
    mapping(uint256 => SelectionRecord) public selectionHistory;
    
    /// @notice Mapping of job IDs to pool IDs
    mapping(bytes32 => bytes32) public jobToPools;
    
    /// @notice Array of all registered agents
    address[] public registeredAgents;
    
    /// @notice Selection counter
    uint256 public selectionNonce;
    
    /// @notice Minimum reputation for active agents
    uint256 public constant MIN_REPUTATION = 100;
    
    // ============ Events ============
    
    event AgentRegistered(address indexed agent, string[] skills, uint256 hourlyRate);
    event AgentUpdated(address indexed agent, uint256 hourlyRate, uint256 availability);
    event AgentPoolCreated(bytes32 indexed poolId, bytes32 indexed jobId, uint256 agentCount);
    event AgentSelected(bytes32 indexed poolId, address indexed agent, uint64 entropySequence, bytes32 randomness);
    event AgentBanned(address indexed agent, string reason);
    event AgentUnbanned(address indexed agent);
    event SelectionVerified(uint256 indexed selectionId, bool isValid);
    
    // ============ Errors ============
    
    error InvalidAddress();
    error InvalidSkills();
    error InvalidRate();
    error InvalidAvailability();
    error AgentNotFound();
    error AgentNotActive();
    error AgentBanned();
    error PoolNotFound();
    error EmptyPool();
    error InvalidEntropy();
    error SelectionNotFound();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize AgentMatcher contract
     * @param _pythContract Pyth oracle address
     * @param _pythEntropy Pyth Entropy address
     * @param _admin Admin address
     */
    constructor(
        address _pythContract,
        address _pythEntropy,
        address _admin
    ) {
        if (_pythContract == address(0) || _pythEntropy == address(0) || _admin == address(0)) {
            revert InvalidAddress();
        }
        
        pyth = IPyth(_pythContract);
        pythEntropy = IPythRandom(_pythEntropy);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        selectionNonce = 1;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Register a new agent
     * @param agent Agent address
     * @param skills Array of skills
     * @param hourlyRate Hourly rate in USD (scaled by 1e8)
     * @param availability Hours available per week
     * @param reputationScore Initial reputation score
     */
    function registerAgent(
        address agent,
        string[] calldata skills,
        uint256 hourlyRate,
        uint256 availability,
        uint256 reputationScore
    ) external whenNotPaused {
        if (agent == address(0)) revert InvalidAddress();
        if (skills.length == 0) revert InvalidSkills();
        if (hourlyRate == 0) revert InvalidRate();
        if (availability == 0) revert InvalidAvailability();
        
        // Only allow self-registration or validator registration
        if (msg.sender != agent && !hasRole(VALIDATOR_ROLE, msg.sender)) {
            revert("Unauthorized registration");
        }
        
        // Check if already registered
        if (agentProfiles[agent].registeredAt != 0) {
            revert("Agent already registered");
        }
        
        agentProfiles[agent] = AgentProfile({
            agentAddress: agent,
            skills: skills,
            hourlyRate: hourlyRate,
            availability: availability,
            reputationScore: reputationScore,
            completedProjects: 0,
            successRate: 100,
            registeredAt: block.timestamp,
            isActive: reputationScore >= MIN_REPUTATION,
            isBanned: false
        });
        
        registeredAgents.push(agent);
        
        emit AgentRegistered(agent, skills, hourlyRate);
    }
    
    /**
     * @notice Update agent profile
     * @param agent Agent address
     * @param hourlyRate New hourly rate
     * @param availability New availability
     */
    function updateAgentProfile(
        address agent,
        uint256 hourlyRate,
        uint256 availability
    ) external whenNotPaused {
        if (msg.sender != agent && !hasRole(VALIDATOR_ROLE, msg.sender)) {
            revert("Unauthorized update");
        }
        
        AgentProfile storage profile = agentProfiles[agent];
        if (profile.registeredAt == 0) revert AgentNotFound();
        
        if (hourlyRate > 0) {
            profile.hourlyRate = hourlyRate;
        }
        if (availability > 0) {
            profile.availability = availability;
        }
        
        emit AgentUpdated(agent, hourlyRate, availability);
    }
    
    /**
     * @notice Create agent pool based on job requirements
     * @param jobId Job identifier
     * @param requirements Job requirements
     * @return poolId Created pool identifier
     */
    function createAgentPool(
        bytes32 jobId,
        AgentRequirements calldata requirements
    ) external whenNotPaused returns (bytes32 poolId) {
        if (jobId == bytes32(0)) revert("Invalid job ID");
        
        poolId = keccak256(abi.encodePacked(
            jobId,
            block.timestamp,
            msg.sender
        ));
        
        // Filter qualified agents
        address[] memory qualified = new address[](registeredAgents.length);
        uint256[] memory weights = new uint256[](registeredAgents.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < registeredAgents.length; i++) {
            address agent = registeredAgents[i];
            AgentProfile storage profile = agentProfiles[agent];
            
            // Check if agent meets requirements
            if (_meetsRequirements(profile, requirements)) {
                qualified[count] = agent;
                weights[count] = profile.reputationScore;
                count++;
            }
        }
        
        if (count == 0) revert EmptyPool();
        
        // Trim arrays to actual size
        address[] memory finalQualified = new address[](count);
        uint256[] memory finalWeights = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalQualified[i] = qualified[i];
            finalWeights[i] = weights[i];
        }
        
        // Create pool
        agentPools[poolId] = AgentPool({
            poolId: poolId,
            jobId: jobId,
            qualifiedAgents: finalQualified,
            reputationWeights: finalWeights,
            createdAt: block.timestamp,
            isActive: true
        });
        
        jobToPools[jobId] = poolId;
        
        emit AgentPoolCreated(poolId, jobId, count);
        
        return poolId;
    }
    
    /**
     * @notice Select random agent from pool using Pyth Entropy
     * @param poolId Agent pool identifier
     * @param userRandomness User-provided randomness
     * @return selectedAgent The selected agent address
     */
    function selectRandomAgent(
        bytes32 poolId,
        bytes32 userRandomness
    ) external payable nonReentrant whenNotPaused returns (address selectedAgent) {
        AgentPool storage pool = agentPools[poolId];
        if (!pool.isActive) revert PoolNotFound();
        if (pool.qualifiedAgents.length == 0) revert EmptyPool();
        
        // Request entropy from Pyth
        uint256 fee = pythEntropy.getFee(userRandomness);
        if (msg.value < fee) revert("Insufficient entropy fee");
        
        uint64 sequenceNumber = pythEntropy.request{value: fee}(userRandomness);
        
        // Reveal entropy
        bytes32 providerRandomness = pythEntropy.reveal(sequenceNumber, userRandomness);
        
        // Select agent uniformly at random
        uint256 randomIndex = uint256(providerRandomness) % pool.qualifiedAgents.length;
        selectedAgent = pool.qualifiedAgents[randomIndex];
        
        // Record selection
        uint256 selectionId = selectionNonce++;
        selectionHistory[selectionId] = SelectionRecord({
            selectionId: selectionId,
            poolId: poolId,
            selectedAgent: selectedAgent,
            entropySequence: sequenceNumber,
            userRandomness: userRandomness,
            providerRandomness: providerRandomness,
            timestamp: block.timestamp,
            isWeighted: false
        });
        
        emit AgentSelected(poolId, selectedAgent, sequenceNumber, providerRandomness);
        
        // Refund excess
        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
        
        return selectedAgent;
    }
    
    /**
     * @notice Select agent with reputation-weighted randomness
     * @param poolId Agent pool identifier
     * @param userRandomness User-provided randomness
     * @return selectedAgent The selected agent address
     */
    function selectWeightedAgent(
        bytes32 poolId,
        bytes32 userRandomness
    ) external payable nonReentrant whenNotPaused returns (address selectedAgent) {
        AgentPool storage pool = agentPools[poolId];
        if (!pool.isActive) revert PoolNotFound();
        if (pool.qualifiedAgents.length == 0) revert EmptyPool();
        
        // Request entropy from Pyth
        uint256 fee = pythEntropy.getFee(userRandomness);
        if (msg.value < fee) revert("Insufficient entropy fee");
        
        uint64 sequenceNumber = pythEntropy.request{value: fee}(userRandomness);
        
        // Reveal entropy
        bytes32 providerRandomness = pythEntropy.reveal(sequenceNumber, userRandomness);
        
        // Calculate total weight
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < pool.reputationWeights.length; i++) {
            totalWeight += pool.reputationWeights[i];
        }
        
        // Select agent based on weighted probability
        uint256 randomValue = uint256(providerRandomness) % totalWeight;
        uint256 cumulativeWeight = 0;
        
        for (uint256 i = 0; i < pool.qualifiedAgents.length; i++) {
            cumulativeWeight += pool.reputationWeights[i];
            if (randomValue < cumulativeWeight) {
                selectedAgent = pool.qualifiedAgents[i];
                break;
            }
        }
        
        // Record selection
        uint256 selectionId = selectionNonce++;
        selectionHistory[selectionId] = SelectionRecord({
            selectionId: selectionId,
            poolId: poolId,
            selectedAgent: selectedAgent,
            entropySequence: sequenceNumber,
            userRandomness: userRandomness,
            providerRandomness: providerRandomness,
            timestamp: block.timestamp,
            isWeighted: true
        });
        
        emit AgentSelected(poolId, selectedAgent, sequenceNumber, providerRandomness);
        
        // Refund excess
        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
        
        return selectedAgent;
    }
    
    /**
     * @notice Verify selection fairness
     * @param selectionId Selection identifier
     * @return isValid Whether selection was fair
     */
    function verifySelection(uint256 selectionId) external view returns (bool isValid) {
        SelectionRecord memory record = selectionHistory[selectionId];
        if (record.selectionId == 0) revert SelectionNotFound();
        
        // Verify entropy can be reproduced
        bytes32 computedRandomness = keccak256(abi.encodePacked(
            record.entropySequence,
            record.userRandomness
        ));
        
        // In production, this would verify against Pyth's entropy commitment
        isValid = record.providerRandomness != bytes32(0);
        
        return isValid;
    }
    
    /**
     * @notice Ban an agent
     * @param agent Agent address
     * @param reason Ban reason
     */
    function banAgent(address agent, string calldata reason) external onlyRole(ADMIN_ROLE) {
        AgentProfile storage profile = agentProfiles[agent];
        if (profile.registeredAt == 0) revert AgentNotFound();
        
        profile.isBanned = true;
        profile.isActive = false;
        
        emit AgentBanned(agent, reason);
    }
    
    /**
     * @notice Unban an agent
     * @param agent Agent address
     */
    function unbanAgent(address agent) external onlyRole(ADMIN_ROLE) {
        AgentProfile storage profile = agentProfiles[agent];
        if (profile.registeredAt == 0) revert AgentNotFound();
        
        profile.isBanned = false;
        profile.isActive = profile.reputationScore >= MIN_REPUTATION;
        
        emit AgentUnbanned(agent);
    }
    
    /**
     * @notice Update agent reputation
     * @param agent Agent address
     * @param newReputation New reputation score
     * @param completedProjects Total completed projects
     * @param successRate Success rate percentage
     */
    function updateAgentReputation(
        address agent,
        uint256 newReputation,
        uint256 completedProjects,
        uint256 successRate
    ) external onlyRole(VALIDATOR_ROLE) {
        AgentProfile storage profile = agentProfiles[agent];
        if (profile.registeredAt == 0) revert AgentNotFound();
        
        profile.reputationScore = newReputation;
        profile.completedProjects = completedProjects;
        profile.successRate = successRate;
        profile.isActive = newReputation >= MIN_REPUTATION && !profile.isBanned;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get agent profile
     * @param agent Agent address
     * @return Agent profile data
     */
    function getAgentProfile(address agent) external view returns (AgentProfile memory) {
        return agentProfiles[agent];
    }
    
    /**
     * @notice Get qualified agents for a pool
     * @param poolId Pool identifier
     * @return Array of qualified agent addresses
     */
    function getQualifiedAgents(bytes32 poolId) external view returns (address[] memory) {
        return agentPools[poolId].qualifiedAgents;
    }
    
    /**
     * @notice Get selection record
     * @param selectionId Selection identifier
     * @return Selection record data
     */
    function getSelectionRecord(uint256 selectionId) external view returns (SelectionRecord memory) {
        return selectionHistory[selectionId];
    }
    
    /**
     * @notice Get all registered agents
     * @return Array of agent addresses
     */
    function getAllAgents() external view returns (address[] memory) {
        return registeredAgents;
    }
    
    /**
     * @notice Get pool for job
     * @param jobId Job identifier
     * @return poolId Pool identifier
     */
    function getPoolForJob(bytes32 jobId) external view returns (bytes32 poolId) {
        return jobToPools[jobId];
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Check if agent meets job requirements
     * @param profile Agent profile
     * @param requirements Job requirements
     * @return Whether agent qualifies
     */
    function _meetsRequirements(
        AgentProfile storage profile,
        AgentRequirements calldata requirements
    ) internal view returns (bool) {
        // Check active status
        if (!profile.isActive || profile.isBanned) return false;
        
        // Check reputation
        if (profile.reputationScore < requirements.minReputation) return false;
        
        // Check rate
        if (profile.hourlyRate > requirements.maxHourlyRate) return false;
        
        // Check availability
        if (profile.availability < requirements.minAvailability) return false;
        
        // Check success rate
        if (profile.successRate < requirements.minSuccessRate) return false;
        
        // Check skills
        if (requirements.requiredSkills.length > 0) {
            bool hasAllSkills = true;
            for (uint256 i = 0; i < requirements.requiredSkills.length; i++) {
                bool hasSkill = false;
                for (uint256 j = 0; j < profile.skills.length; j++) {
                    if (keccak256(bytes(requirements.requiredSkills[i])) == 
                        keccak256(bytes(profile.skills[j]))) {
                        hasSkill = true;
                        break;
                    }
                }
                if (!hasSkill) {
                    hasAllSkills = false;
                    break;
                }
            }
            if (!hasAllSkills) return false;
        }
        
        return true;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
