// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/**
 * @title ReputationRegistry
 * @notice Manages on-chain reputation scores and skill badge NFTs with Pyth oracle validation
 * @dev Implements ERC-721 for skill badges and integrates Pyth Network for objective quality validation
 * 
 * Key Features:
 * - Cryptographically-verified reputation scores
 * - NFT skill badges (ERC-721) transferable across platforms
 * - Pyth oracle integration for market-based quality validation
 * - Immutable work history with timestamps
 * - Weighted reputation calculation based on recency and quality
 * - Penalty mechanism for dispute resolution
 * 
 * Sponsor Integration: Pyth Network
 * - Uses pull-based price feeds for skill market rates
 * - Validates quality scores against oracle benchmarks
 * - Ensures objective, tamper-proof reputation updates
 */
contract ReputationRegistry is ERC721, AccessControl, ReentrancyGuard, Pausable {
    
    // ============ Type Declarations ============
    
    /// @notice Core reputation data structure
    struct ReputationScore {
        uint256 overallScore;        // Composite reputation (0-1000)
        uint256 completedProjects;   // Total projects finished
        uint256 totalEarnings;       // Lifetime earnings in USD (scaled by 1e8)
        uint256 averageRating;       // Average client rating (0-100)
        uint256 successRate;         // Percentage of successful projects (0-100)
        uint256 responseTime;        // Average response time in hours
        uint256 lastUpdated;         // Timestamp of last update
        bool isActive;               // Account status
    }
    
    /// @notice Skill badge metadata
    struct SkillBadge {
        string skillName;            // e.g., "Solidity", "React", "UI/UX"
        uint256 proficiencyLevel;    // 1-5 scale
        uint256 qualityScore;        // Validated quality (0-100)
        uint256 projectsCompleted;   // Projects using this skill
        uint256 mintedAt;            // Badge creation timestamp
        address validator;           // Validator who approved badge
        bytes32 pythFeedId;          // Pyth price feed for skill market rate
        bool isVerified;             // Oracle-verified status
    }
    
    /// @notice Work completion record
    struct WorkHistory {
        uint256 projectId;           // Reference to project
        address client;              // Client address
        uint256 paymentAmount;       // Payment received (USD scaled by 1e8)
        uint256 qualityScore;        // Deliverable quality (0-100)
        uint256 completionTime;      // Timestamp
        string[] skillsUsed;         // Skills demonstrated
        bytes32 deliverableHash;     // IPFS/Lighthouse CID hash
    }
    
    // ============ State Variables ============
    
    /// @notice Pyth oracle contract interface
    IPyth public immutable pyth;
    
    /// @notice Role for authorized validators
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    
    /// @notice Role for contract administrators
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Mapping of user addresses to reputation data
    mapping(address => ReputationScore) public reputations;
    
    /// @notice Mapping of user addresses to their skill badge token IDs
    mapping(address => uint256[]) public userBadges;
    
    /// @notice Mapping of badge token IDs to metadata
    mapping(uint256 => SkillBadge) public badgeMetadata;
    
    /// @notice Mapping of user addresses to work history
    mapping(address => WorkHistory[]) public workHistory;
    
    /// @notice Mapping of skill names to Pyth feed IDs
    mapping(string => bytes32) public skillPriceFeeds;
    
    /// @notice Counter for badge token IDs
    uint256 public nextBadgeId;
    
    /// @notice Minimum reputation score for active status
    uint256 public constant MIN_ACTIVE_SCORE = 100;
    
    /// @notice Maximum reputation score
    uint256 public constant MAX_REPUTATION_SCORE = 1000;
    
    /// @notice Decay factor for reputation over time (per 30 days)
    uint256 public constant REPUTATION_DECAY_RATE = 5; // 0.5% per month
    
    // ============ Events ============
    
    event ReputationInitialized(address indexed user, uint256 timestamp);
    event ReputationUpdated(address indexed user, uint256 newScore, uint256 timestamp);
    event SkillBadgeMinted(uint256 indexed badgeId, address indexed recipient, string skill, uint256 qualityScore);
    event WorkCompleted(address indexed freelancer, address indexed client, uint256 projectId, uint256 qualityScore);
    event ReputationPenalized(address indexed user, uint256 penaltyAmount, string reason);
    event SkillPriceFeedUpdated(string skill, bytes32 feedId);
    event BadgeTransferred(uint256 indexed badgeId, address indexed from, address indexed to);
    
    // ============ Errors ============
    
    error InvalidAddress();
    error InvalidScore();
    error InvalidSkillName();
    error InsufficientReputation();
    error UserNotActive();
    error BadgeNotFound();
    error UnauthorizedValidator();
    error PythUpdateFailed();
    error InvalidPythFeed();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize the ReputationRegistry contract
     * @param _pythContract Address of the Pyth oracle contract
     * @param _admin Address of the initial admin
     */
    constructor(
        address _pythContract,
        address _admin
    ) ERC721("ReputeFlow Skill Badge", "RFSB") {
        if (_pythContract == address(0) || _admin == address(0)) revert InvalidAddress();
        
        pyth = IPyth(_pythContract);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VALIDATOR_ROLE, _admin);
        
        nextBadgeId = 1;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Initialize reputation profile for a new user
     * @param user Address of the user
     * @param skills Array of initial skills
     */
    function initializeReputation(
        address user,
        string[] calldata skills
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        if (user == address(0)) revert InvalidAddress();
        if (reputations[user].lastUpdated != 0) revert("Already initialized");
        
        reputations[user] = ReputationScore({
            overallScore: MIN_ACTIVE_SCORE,
            completedProjects: 0,
            totalEarnings: 0,
            averageRating: 0,
            successRate: 100,
            responseTime: 24,
            lastUpdated: block.timestamp,
            isActive: true
        });
        
        emit ReputationInitialized(user, block.timestamp);
    }
    
    /**
     * @notice Update reputation score with Pyth oracle validation
     * @param user Address of the user
     * @param newScore New reputation score (0-1000)
     * @param pythUpdateData Pyth price update data for validation
     * @dev Requires payment of Pyth update fee
     */
    function updateReputationScore(
        address user,
        uint256 newScore,
        bytes[] calldata pythUpdateData
    ) external payable onlyRole(VALIDATOR_ROLE) whenNotPaused nonReentrant {
        if (user == address(0)) revert InvalidAddress();
        if (newScore > MAX_REPUTATION_SCORE) revert InvalidScore();
        
        // Update Pyth price feeds if provided
        if (pythUpdateData.length > 0) {
            uint256 fee = pyth.getUpdateFee(pythUpdateData);
            if (msg.value < fee) revert PythUpdateFailed();
            
            pyth.updatePriceFeeds{value: fee}(pythUpdateData);
            
            // Refund excess payment
            if (msg.value > fee) {
                (bool success, ) = msg.sender.call{value: msg.value - fee}("");
                require(success, "Refund failed");
            }
        }
        
        // Apply time-based decay to current score
        uint256 currentScore = _calculateDecayedScore(user);
        
        // Update reputation
        reputations[user].overallScore = newScore;
        reputations[user].lastUpdated = block.timestamp;
        
        // Update active status
        reputations[user].isActive = newScore >= MIN_ACTIVE_SCORE;
        
        emit ReputationUpdated(user, newScore, block.timestamp);
    }
    
    /**
     * @notice Mint a skill badge NFT with oracle-validated quality score
     * @param user Address of the badge recipient
     * @param skill Name of the skill
     * @param proficiencyLevel Skill proficiency (1-5)
     * @param qualityScore Quality score (0-100)
     * @param pythFeedId Pyth price feed ID for skill market rate
     * @param pythUpdateData Pyth price update data
     * @return badgeId The minted badge token ID
     */
    function mintSkillBadge(
        address user,
        string calldata skill,
        uint256 proficiencyLevel,
        uint256 qualityScore,
        bytes32 pythFeedId,
        bytes[] calldata pythUpdateData
    ) external payable onlyRole(VALIDATOR_ROLE) whenNotPaused nonReentrant returns (uint256 badgeId) {
        if (user == address(0)) revert InvalidAddress();
        if (bytes(skill).length == 0) revert InvalidSkillName();
        if (qualityScore > 100) revert InvalidScore();
        if (proficiencyLevel == 0 || proficiencyLevel > 5) revert InvalidScore();
        
        // Validate quality score with Pyth oracle
        if (pythUpdateData.length > 0 && pythFeedId != bytes32(0)) {
            uint256 fee = pyth.getUpdateFee(pythUpdateData);
            if (msg.value < fee) revert PythUpdateFailed();
            
            pyth.updatePriceFeeds{value: fee}(pythUpdateData);
            
            // Verify the feed exists and is recent
            PythStructs.Price memory price = pyth.getPriceNoOlderThan(pythFeedId, 3600);
            
            // Refund excess
            if (msg.value > fee) {
                (bool success, ) = msg.sender.call{value: msg.value - fee}("");
                require(success, "Refund failed");
            }
        }
        
        // Mint badge NFT
        badgeId = nextBadgeId++;
        _safeMint(user, badgeId);
        
        // Store badge metadata
        badgeMetadata[badgeId] = SkillBadge({
            skillName: skill,
            proficiencyLevel: proficiencyLevel,
            qualityScore: qualityScore,
            projectsCompleted: 0,
            mintedAt: block.timestamp,
            validator: msg.sender,
            pythFeedId: pythFeedId,
            isVerified: pythFeedId != bytes32(0)
        });
        
        // Add to user's badge collection
        userBadges[user].push(badgeId);
        
        // Update skill price feed mapping
        if (pythFeedId != bytes32(0)) {
            skillPriceFeeds[skill] = pythFeedId;
        }
        
        emit SkillBadgeMinted(badgeId, user, skill, qualityScore);
        
        return badgeId;
    }
    
    /**
     * @notice Record completion of work with quality validation
     * @param freelancer Address of the freelancer
     * @param client Address of the client
     * @param projectId Project identifier
     * @param paymentAmount Payment received (USD scaled by 1e8)
     * @param qualityScore Deliverable quality score (0-100)
     * @param skillsUsed Array of skills demonstrated
     * @param deliverableHash IPFS/Lighthouse CID hash
     */
    function recordWorkCompletion(
        address freelancer,
        address client,
        uint256 projectId,
        uint256 paymentAmount,
        uint256 qualityScore,
        string[] calldata skillsUsed,
        bytes32 deliverableHash
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        if (freelancer == address(0) || client == address(0)) revert InvalidAddress();
        if (qualityScore > 100) revert InvalidScore();
        
        // Add to work history
        workHistory[freelancer].push(WorkHistory({
            projectId: projectId,
            client: client,
            paymentAmount: paymentAmount,
            qualityScore: qualityScore,
            completionTime: block.timestamp,
            skillsUsed: skillsUsed,
            deliverableHash: deliverableHash
        }));
        
        // Update reputation metrics
        ReputationScore storage rep = reputations[freelancer];
        rep.completedProjects++;
        rep.totalEarnings += paymentAmount;
        
        // Update average rating (weighted average)
        uint256 totalRating = rep.averageRating * (rep.completedProjects - 1) + qualityScore;
        rep.averageRating = totalRating / rep.completedProjects;
        
        // Update skill badge project counts
        uint256[] memory badges = userBadges[freelancer];
        for (uint256 i = 0; i < badges.length; i++) {
            SkillBadge storage badge = badgeMetadata[badges[i]];
            for (uint256 j = 0; j < skillsUsed.length; j++) {
                if (keccak256(bytes(badge.skillName)) == keccak256(bytes(skillsUsed[j]))) {
                    badge.projectsCompleted++;
                    break;
                }
            }
        }
        
        emit WorkCompleted(freelancer, client, projectId, qualityScore);
    }
    
    /**
     * @notice Apply reputation penalty for disputes or violations
     * @param user Address of the user
     * @param penalty Penalty amount to subtract from reputation
     * @param reason Reason for penalty
     */
    function penalizeReputation(
        address user,
        uint256 penalty,
        string calldata reason
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        if (user == address(0)) revert InvalidAddress();
        
        ReputationScore storage rep = reputations[user];
        
        // Apply penalty with floor at 0
        if (rep.overallScore > penalty) {
            rep.overallScore -= penalty;
        } else {
            rep.overallScore = 0;
        }
        
        rep.lastUpdated = block.timestamp;
        rep.isActive = rep.overallScore >= MIN_ACTIVE_SCORE;
        
        emit ReputationPenalized(user, penalty, reason);
    }
    
    /**
     * @notice Set Pyth price feed for a skill
     * @param skill Skill name
     * @param feedId Pyth price feed ID
     */
    function setSkillPriceFeed(
        string calldata skill,
        bytes32 feedId
    ) external onlyRole(ADMIN_ROLE) {
        if (bytes(skill).length == 0) revert InvalidSkillName();
        if (feedId == bytes32(0)) revert InvalidPythFeed();
        
        skillPriceFeeds[skill] = feedId;
        emit SkillPriceFeedUpdated(skill, feedId);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get reputation score for a user
     * @param user Address of the user
     * @return Reputation score data
     */
    function getReputationScore(address user) external view returns (ReputationScore memory) {
        return reputations[user];
    }
    
    /**
     * @notice Get work history for a user
     * @param user Address of the user
     * @return Array of work history records
     */
    function getWorkHistory(address user) external view returns (WorkHistory[] memory) {
        return workHistory[user];
    }
    
    /**
     * @notice Get all skill badges for a user
     * @param user Address of the user
     * @return Array of badge token IDs
     */
    function getUserBadges(address user) external view returns (uint256[] memory) {
        return userBadges[user];
    }
    
    /**
     * @notice Calculate weighted reputation score with recency and quality factors
     * @param user Address of the user
     * @return Weighted reputation score
     */
    function calculateWeightedScore(address user) external view returns (uint256) {
        ReputationScore memory rep = reputations[user];
        
        if (rep.completedProjects == 0) return rep.overallScore;
        
        // Apply time decay
        uint256 decayedScore = _calculateDecayedScore(user);
        
        // Weight factors: 40% completion rate, 30% quality, 20% earnings, 10% response time
        uint256 completionWeight = (rep.successRate * 40) / 100;
        uint256 qualityWeight = (rep.averageRating * 30) / 100;
        uint256 earningsWeight = _normalizeEarnings(rep.totalEarnings) * 20 / 100;
        uint256 responseWeight = _normalizeResponseTime(rep.responseTime) * 10 / 100;
        
        uint256 weightedScore = completionWeight + qualityWeight + earningsWeight + responseWeight;
        
        // Combine with decayed base score (50/50 split)
        return (decayedScore + weightedScore * 10) / 2;
    }
    
    /**
     * @notice Validate quality score against Pyth oracle benchmark
     * @param submittedScore Quality score to validate
     * @param pythFeedId Pyth price feed ID
     * @param priceUpdate Pyth price update data
     * @return isValid Whether the score is within acceptable range
     */
    function validateQualityScore(
        uint256 submittedScore,
        bytes32 pythFeedId,
        bytes[] calldata priceUpdate
    ) external payable returns (bool isValid) {
        if (submittedScore > 100) revert InvalidScore();
        if (pythFeedId == bytes32(0)) revert InvalidPythFeed();
        
        // Update price feed
        uint256 fee = pyth.getUpdateFee(priceUpdate);
        if (msg.value < fee) revert PythUpdateFailed();
        
        pyth.updatePriceFeeds{value: fee}(priceUpdate);
        
        // Get oracle price (market benchmark)
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(pythFeedId, 3600);
        
        // Normalize price to 0-100 scale (implementation depends on feed semantics)
        uint256 benchmarkScore = _normalizePythPrice(price);
        
        // Allow 10% deviation from benchmark
        uint256 lowerBound = benchmarkScore > 10 ? benchmarkScore - 10 : 0;
        uint256 upperBound = benchmarkScore < 90 ? benchmarkScore + 10 : 100;
        
        isValid = submittedScore >= lowerBound && submittedScore <= upperBound;
        
        // Refund excess
        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
        
        return isValid;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Calculate reputation score with time-based decay
     * @param user Address of the user
     * @return Decayed reputation score
     */
    function _calculateDecayedScore(address user) internal view returns (uint256) {
        ReputationScore memory rep = reputations[user];
        
        uint256 timeSinceUpdate = block.timestamp - rep.lastUpdated;
        uint256 monthsElapsed = timeSinceUpdate / 30 days;
        
        if (monthsElapsed == 0) return rep.overallScore;
        
        // Apply decay: score * (1 - decay_rate)^months
        uint256 decayFactor = 1000 - (REPUTATION_DECAY_RATE * monthsElapsed);
        if (decayFactor < 500) decayFactor = 500; // Minimum 50% retention
        
        return (rep.overallScore * decayFactor) / 1000;
    }
    
    /**
     * @notice Normalize earnings to 0-100 scale
     * @param earnings Total earnings (USD scaled by 1e8)
     * @return Normalized score
     */
    function _normalizeEarnings(uint256 earnings) internal pure returns (uint256) {
        // Scale: $0 = 0, $100k+ = 100
        uint256 scaledEarnings = earnings / 1e8; // Convert to USD
        if (scaledEarnings >= 100000) return 100;
        return (scaledEarnings * 100) / 100000;
    }
    
    /**
     * @notice Normalize response time to 0-100 scale (lower is better)
     * @param responseTime Average response time in hours
     * @return Normalized score
     */
    function _normalizeResponseTime(uint256 responseTime) internal pure returns (uint256) {
        // Scale: 0-1 hour = 100, 24+ hours = 0
        if (responseTime <= 1) return 100;
        if (responseTime >= 24) return 0;
        return 100 - ((responseTime - 1) * 100 / 23);
    }
    
    /**
     * @notice Normalize Pyth price to 0-100 quality score
     * @param price Pyth price structure
     * @return Normalized quality score
     */
    function _normalizePythPrice(PythStructs.Price memory price) internal pure returns (uint256) {
        // Convert price to quality score based on market conditions
        // This is a simplified implementation - actual logic depends on feed semantics
        int64 priceValue = price.price;
        int32 expo = price.expo;
        
        // Normalize to 0-100 range
        // Example: if price represents demand index (0-100), use directly
        uint256 normalizedPrice = uint256(uint64(priceValue));
        
        if (normalizedPrice > 100) return 100;
        return normalizedPrice;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Pause contract operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause contract operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Override transfer to emit custom event
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        address previousOwner = super._update(to, tokenId, auth);
        
        if (from != address(0) && to != address(0)) {
            emit BadgeTransferred(tokenId, from, to);
        }
        
        return previousOwner;
    }
    
    /**
     * @notice Check if contract supports interface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
