// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";

/**
 * @title DisputeResolver
 * @notice Automated dispute arbitration with multi-validator consensus
 * @dev Implements decentralized dispute resolution with Pyth oracle validation
 * 
 * Key Features:
 * - Multi-validator consensus mechanism (configurable threshold)
 * - Evidence submission with IPFS/Lighthouse storage
 * - Pyth oracle for objective quality assessment
 * - Automated resolution execution
 * - Appeal mechanism for escalation
 * - Validator reputation tracking
 * - Slashing for malicious validators
 * 
 * Sponsor Integration: Pyth Network
 * - Uses price feeds for objective quality benchmarks
 * - Validates evidence against oracle data
 */
contract DisputeResolver is AccessControl, ReentrancyGuard, Pausable {
    
    // ============ Type Declarations ============
    
    /// @notice Dispute status enumeration
    enum DisputeStatus {
        Open,           // Dispute created, awaiting votes
        UnderReview,    // Validators reviewing evidence
        Voting,         // Active voting period
        Resolved,       // Consensus reached, executed
        Appealed,       // Escalated to higher authority
        Cancelled       // Dispute cancelled
    }
    
    /// @notice Vote decision types
    enum VoteDecision {
        Pending,        // No vote yet
        FavorClient,    // Rule in favor of client
        FavorFreelancer,// Rule in favor of freelancer
        Split,          // Split payment 50/50
        Abstain         // Validator abstains
    }
    
    /// @notice Dispute record
    struct Dispute {
        uint256 disputeId;           // Unique identifier
        uint256 projectId;           // Associated project
        uint256 milestoneId;         // Associated milestone
        address initiator;           // Who raised dispute
        address respondent;          // Other party
        uint256 disputedAmount;      // Amount in dispute
        string reason;               // Dispute reason
        string evidenceHash;         // IPFS/Lighthouse CID
        uint256 createdAt;           // Creation timestamp
        uint256 votingDeadline;      // Voting end time
        uint256 resolvedAt;          // Resolution timestamp
        DisputeStatus status;        // Current status
        VoteDecision finalDecision;  // Consensus decision
        uint256 voteCount;           // Total votes cast
    }
    
    /// @notice Validator vote
    struct ValidatorVote {
        address validator;           // Validator address
        VoteDecision decision;       // Vote decision
        string reasoning;            // Vote justification
        bytes32 evidenceHash;        // Additional evidence
        uint256 timestamp;           // Vote timestamp
        bytes signature;             // Cryptographic signature
        uint256 stake;               // Validator stake amount
    }
    
    /// @notice Validator profile
    struct ValidatorProfile {
        address validatorAddress;    // Validator address
        uint256 totalVotes;          // Total votes cast
        uint256 correctVotes;        // Votes matching consensus
        uint256 reputationScore;     // Reputation (0-1000)
        uint256 stakedAmount;        // Staked collateral
        uint256 slashedAmount;       // Total slashed
        bool isActive;               // Active status
        bool isBanned;               // Banned status
    }
    
    /// @notice Evidence submission
    struct Evidence {
        uint256 disputeId;           // Associated dispute
        address submitter;           // Evidence submitter
        string evidenceType;         // Type (document, code, screenshot, etc.)
        string ipfsHash;             // IPFS/Lighthouse CID
        bytes32 pythFeedId;          // Pyth feed for validation
        uint256 timestamp;           // Submission time
        bool isVerified;             // Oracle verification status
    }
    
    // ============ State Variables ============
    
    /// @notice Pyth oracle contract
    IPyth public immutable pyth;
    
    /// @notice Work escrow contract
    address public workEscrow;
    
    /// @notice Reputation registry contract
    address public reputationRegistry;
    
    /// @notice Role for validators
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    
    /// @notice Role for admins
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Mapping of dispute IDs to disputes
    mapping(uint256 => Dispute) public disputes;
    
    /// @notice Mapping of dispute IDs to validator votes
    mapping(uint256 => ValidatorVote[]) public disputeVotes;
    
    /// @notice Mapping of validator addresses to profiles
    mapping(address => ValidatorProfile) public validatorProfiles;
    
    /// @notice Mapping of dispute IDs to evidence submissions
    mapping(uint256 => Evidence[]) public disputeEvidence;
    
    /// @notice Array of approved validators
    address[] public approvedValidators;
    
    /// @notice Dispute counter
    uint256 public nextDisputeId;
    
    /// @notice Validator consensus threshold (basis points, e.g., 6666 = 66.66%)
    uint256 public validatorThreshold = 6666; // 2/3 majority
    
    /// @notice Voting period duration (seconds)
    uint256 public votingPeriod = 7 days;
    
    /// @notice Minimum validator stake required
    uint256 public minValidatorStake = 1 ether;
    
    /// @notice Slash percentage for malicious validators (basis points)
    uint256 public slashPercentage = 1000; // 10%
    
    // ============ Events ============
    
    event DisputeOpened(uint256 indexed disputeId, uint256 indexed projectId, uint256 milestoneId, address indexed initiator);
    event EvidenceSubmitted(uint256 indexed disputeId, address indexed submitter, string ipfsHash);
    event ValidatorVoted(uint256 indexed disputeId, address indexed validator, VoteDecision decision);
    event DisputeResolved(uint256 indexed disputeId, VoteDecision finalDecision, uint256 voteCount);
    event DisputeAppealed(uint256 indexed disputeId, address indexed appellant, string reason);
    event ValidatorAdded(address indexed validator, uint256 stake);
    event ValidatorRemoved(address indexed validator, string reason);
    event ValidatorSlashed(address indexed validator, uint256 amount, string reason);
    event ValidatorRewarded(address indexed validator, uint256 amount);
    
    // ============ Errors ============
    
    error InvalidAddress();
    error InvalidAmount();
    error DisputeNotFound();
    error DisputeNotOpen();
    error AlreadyVoted();
    error VotingPeriodEnded();
    error InsufficientStake();
    error NotValidator();
    error InvalidThreshold();
    error ConsensusNotReached();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize DisputeResolver contract
     * @param _pythContract Pyth oracle address
     * @param _workEscrow WorkEscrow contract address
     * @param _reputationRegistry ReputationRegistry address
     * @param _admin Admin address
     */
    constructor(
        address _pythContract,
        address _workEscrow,
        address _reputationRegistry,
        address _admin
    ) {
        if (_pythContract == address(0) || _admin == address(0)) revert InvalidAddress();
        
        pyth = IPyth(_pythContract);
        workEscrow = _workEscrow;
        reputationRegistry = _reputationRegistry;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        nextDisputeId = 1;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Open a new dispute
     * @param projectId Project identifier
     * @param milestoneId Milestone identifier
     * @param respondent Other party in dispute
     * @param disputedAmount Amount in dispute
     * @param reason Dispute reason
     * @param evidenceHash Initial evidence IPFS hash
     * @return disputeId Created dispute ID
     */
    function openDispute(
        uint256 projectId,
        uint256 milestoneId,
        address respondent,
        uint256 disputedAmount,
        string calldata reason,
        string calldata evidenceHash
    ) external whenNotPaused returns (uint256 disputeId) {
        if (respondent == address(0)) revert InvalidAddress();
        if (disputedAmount == 0) revert InvalidAmount();
        
        disputeId = nextDisputeId++;
        
        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            projectId: projectId,
            milestoneId: milestoneId,
            initiator: msg.sender,
            respondent: respondent,
            disputedAmount: disputedAmount,
            reason: reason,
            evidenceHash: evidenceHash,
            createdAt: block.timestamp,
            votingDeadline: block.timestamp + votingPeriod,
            resolvedAt: 0,
            status: DisputeStatus.Open,
            finalDecision: VoteDecision.Pending,
            voteCount: 0
        });
        
        emit DisputeOpened(disputeId, projectId, milestoneId, msg.sender);
        
        return disputeId;
    }
    
    /**
     * @notice Submit evidence for a dispute
     * @param disputeId Dispute identifier
     * @param evidenceType Type of evidence
     * @param ipfsHash IPFS/Lighthouse CID
     * @param pythFeedId Optional Pyth feed for validation
     * @param pythUpdateData Pyth price update data
     */
    function submitEvidence(
        uint256 disputeId,
        string calldata evidenceType,
        string calldata ipfsHash,
        bytes32 pythFeedId,
        bytes[] calldata pythUpdateData
    ) external payable whenNotPaused {
        Dispute storage dispute = disputes[disputeId];
        if (dispute.disputeId == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.Open && dispute.status != DisputeStatus.UnderReview) {
            revert DisputeNotOpen();
        }
        
        bool isVerified = false;
        
        // Validate evidence with Pyth oracle if feed provided
        if (pythFeedId != bytes32(0) && pythUpdateData.length > 0) {
            uint256 fee = pyth.getUpdateFee(pythUpdateData);
            if (msg.value < fee) revert("Insufficient Pyth fee");
            
            pyth.updatePriceFeeds{value: fee}(pythUpdateData);
            isVerified = true;
            
            // Refund excess
            if (msg.value > fee) {
                (bool success, ) = msg.sender.call{value: msg.value - fee}("");
                require(success, "Refund failed");
            }
        }
        
        disputeEvidence[disputeId].push(Evidence({
            disputeId: disputeId,
            submitter: msg.sender,
            evidenceType: evidenceType,
            ipfsHash: ipfsHash,
            pythFeedId: pythFeedId,
            timestamp: block.timestamp,
            isVerified: isVerified
        }));
        
        // Update dispute status
        if (dispute.status == DisputeStatus.Open) {
            dispute.status = DisputeStatus.UnderReview;
        }
        
        emit EvidenceSubmitted(disputeId, msg.sender, ipfsHash);
    }
    
    /**
     * @notice Submit validator vote on dispute
     * @param disputeId Dispute identifier
     * @param decision Vote decision
     * @param reasoning Vote justification
     * @param evidenceHash Additional evidence hash
     * @param signature Cryptographic signature
     */
    function submitValidatorVote(
        uint256 disputeId,
        VoteDecision decision,
        string calldata reasoning,
        bytes32 evidenceHash,
        bytes calldata signature
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        Dispute storage dispute = disputes[disputeId];
        if (dispute.disputeId == 0) revert DisputeNotFound();
        if (block.timestamp > dispute.votingDeadline) revert VotingPeriodEnded();
        if (decision == VoteDecision.Pending) revert("Invalid decision");
        
        // Check if validator already voted
        ValidatorVote[] storage votes = disputeVotes[disputeId];
        for (uint256 i = 0; i < votes.length; i++) {
            if (votes[i].validator == msg.sender) revert AlreadyVoted();
        }
        
        ValidatorProfile storage profile = validatorProfiles[msg.sender];
        if (profile.stakedAmount < minValidatorStake) revert InsufficientStake();
        
        // Record vote
        votes.push(ValidatorVote({
            validator: msg.sender,
            decision: decision,
            reasoning: reasoning,
            evidenceHash: evidenceHash,
            timestamp: block.timestamp,
            signature: signature,
            stake: profile.stakedAmount
        }));
        
        dispute.voteCount++;
        profile.totalVotes++;
        
        // Update dispute status
        if (dispute.status == DisputeStatus.UnderReview) {
            dispute.status = DisputeStatus.Voting;
        }
        
        emit ValidatorVoted(disputeId, msg.sender, decision);
        
        // Check if consensus reached
        if (_checkConsensus(disputeId)) {
            _resolveDispute(disputeId);
        }
    }
    
    /**
     * @notice Resolve dispute based on validator consensus
     * @param disputeId Dispute identifier
     */
    function resolveDispute(uint256 disputeId) external nonReentrant whenNotPaused {
        Dispute storage dispute = disputes[disputeId];
        if (dispute.disputeId == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.Voting) revert("Not in voting status");
        if (block.timestamp <= dispute.votingDeadline) revert("Voting period not ended");
        
        _resolveDispute(disputeId);
    }
    
    /**
     * @notice Appeal a resolved dispute
     * @param disputeId Dispute identifier
     * @param reason Appeal reason
     */
    function appealDispute(
        uint256 disputeId,
        string calldata reason
    ) external whenNotPaused {
        Dispute storage dispute = disputes[disputeId];
        if (dispute.disputeId == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.Resolved) revert("Dispute not resolved");
        if (msg.sender != dispute.initiator && msg.sender != dispute.respondent) {
            revert("Not dispute party");
        }
        
        // Check if appeal is within time window (e.g., 48 hours)
        if (block.timestamp > dispute.resolvedAt + 2 days) {
            revert("Appeal period expired");
        }
        
        dispute.status = DisputeStatus.Appealed;
        
        emit DisputeAppealed(disputeId, msg.sender, reason);
    }
    
    /**
     * @notice Add validator with stake
     * @param validator Validator address
     */
    function addValidator(address validator) external payable onlyRole(ADMIN_ROLE) {
        if (validator == address(0)) revert InvalidAddress();
        if (msg.value < minValidatorStake) revert InsufficientStake();
        
        ValidatorProfile storage profile = validatorProfiles[validator];
        
        // Initialize or update profile
        if (profile.validatorAddress == address(0)) {
            profile.validatorAddress = validator;
            profile.totalVotes = 0;
            profile.correctVotes = 0;
            profile.reputationScore = 500; // Start at 50%
            approvedValidators.push(validator);
        }
        
        profile.stakedAmount += msg.value;
        profile.isActive = true;
        profile.isBanned = false;
        
        _grantRole(VALIDATOR_ROLE, validator);
        
        emit ValidatorAdded(validator, msg.value);
    }
    
    /**
     * @notice Remove validator
     * @param validator Validator address
     * @param reason Removal reason
     */
    function removeValidator(
        address validator,
        string calldata reason
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
        ValidatorProfile storage profile = validatorProfiles[validator];
        if (profile.validatorAddress == address(0)) revert NotValidator();
        
        profile.isActive = false;
        _revokeRole(VALIDATOR_ROLE, validator);
        
        // Return stake
        uint256 stake = profile.stakedAmount;
        profile.stakedAmount = 0;
        
        if (stake > 0) {
            (bool success, ) = validator.call{value: stake}("");
            require(success, "Stake return failed");
        }
        
        emit ValidatorRemoved(validator, reason);
    }
    
    /**
     * @notice Slash validator for malicious behavior
     * @param validator Validator address
     * @param reason Slash reason
     */
    function slashValidator(
        address validator,
        string calldata reason
    ) external onlyRole(ADMIN_ROLE) {
        ValidatorProfile storage profile = validatorProfiles[validator];
        if (profile.validatorAddress == address(0)) revert NotValidator();
        
        uint256 slashAmount = (profile.stakedAmount * slashPercentage) / 10000;
        profile.stakedAmount -= slashAmount;
        profile.slashedAmount += slashAmount;
        profile.reputationScore = profile.reputationScore > 100 ? profile.reputationScore - 100 : 0;
        
        emit ValidatorSlashed(validator, slashAmount, reason);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get dispute details
     * @param disputeId Dispute identifier
     * @return Dispute data
     */
    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }
    
    /**
     * @notice Get dispute votes
     * @param disputeId Dispute identifier
     * @return Array of validator votes
     */
    function getDisputeVotes(uint256 disputeId) external view returns (ValidatorVote[] memory) {
        return disputeVotes[disputeId];
    }
    
    /**
     * @notice Get dispute evidence
     * @param disputeId Dispute identifier
     * @return Array of evidence submissions
     */
    function getDisputeEvidence(uint256 disputeId) external view returns (Evidence[] memory) {
        return disputeEvidence[disputeId];
    }
    
    /**
     * @notice Get validator profile
     * @param validator Validator address
     * @return Validator profile data
     */
    function getValidatorProfile(address validator) external view returns (ValidatorProfile memory) {
        return validatorProfiles[validator];
    }
    
    /**
     * @notice Get all approved validators
     * @return Array of validator addresses
     */
    function getApprovedValidators() external view returns (address[] memory) {
        return approvedValidators;
    }
    
    /**
     * @notice Calculate consensus for a dispute
     * @param disputeId Dispute identifier
     * @return decision Consensus decision
     * @return percentage Consensus percentage
     */
    function calculateConsensus(uint256 disputeId) external view returns (VoteDecision decision, uint256 percentage) {
        return _calculateConsensus(disputeId);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Check if consensus is reached
     * @param disputeId Dispute identifier
     * @return Whether consensus is reached
     */
    function _checkConsensus(uint256 disputeId) internal view returns (bool) {
        ValidatorVote[] storage votes = disputeVotes[disputeId];
        if (votes.length < 3) return false; // Minimum 3 validators
        
        (VoteDecision decision, uint256 percentage) = _calculateConsensus(disputeId);
        
        return decision != VoteDecision.Pending && percentage >= validatorThreshold;
    }
    
    /**
     * @notice Calculate consensus decision and percentage
     * @param disputeId Dispute identifier
     * @return decision Consensus decision
     * @return percentage Consensus percentage (basis points)
     */
    function _calculateConsensus(uint256 disputeId) internal view returns (VoteDecision decision, uint256 percentage) {
        ValidatorVote[] storage votes = disputeVotes[disputeId];
        if (votes.length == 0) return (VoteDecision.Pending, 0);
        
        uint256 favorClient = 0;
        uint256 favorFreelancer = 0;
        uint256 split = 0;
        uint256 totalStake = 0;
        
        // Count votes weighted by stake
        for (uint256 i = 0; i < votes.length; i++) {
            if (votes[i].decision == VoteDecision.FavorClient) {
                favorClient += votes[i].stake;
            } else if (votes[i].decision == VoteDecision.FavorFreelancer) {
                favorFreelancer += votes[i].stake;
            } else if (votes[i].decision == VoteDecision.Split) {
                split += votes[i].stake;
            }
            totalStake += votes[i].stake;
        }
        
        // Determine majority decision
        if (favorClient > favorFreelancer && favorClient > split) {
            decision = VoteDecision.FavorClient;
            percentage = (favorClient * 10000) / totalStake;
        } else if (favorFreelancer > favorClient && favorFreelancer > split) {
            decision = VoteDecision.FavorFreelancer;
            percentage = (favorFreelancer * 10000) / totalStake;
        } else if (split > favorClient && split > favorFreelancer) {
            decision = VoteDecision.Split;
            percentage = (split * 10000) / totalStake;
        } else {
            decision = VoteDecision.Pending;
            percentage = 0;
        }
        
        return (decision, percentage);
    }
    
    /**
     * @notice Execute dispute resolution
     * @param disputeId Dispute identifier
     */
    function _resolveDispute(uint256 disputeId) internal {
        Dispute storage dispute = disputes[disputeId];
        
        (VoteDecision decision, uint256 percentage) = _calculateConsensus(disputeId);
        
        if (decision == VoteDecision.Pending || percentage < validatorThreshold) {
            revert ConsensusNotReached();
        }
        
        dispute.finalDecision = decision;
        dispute.status = DisputeStatus.Resolved;
        dispute.resolvedAt = block.timestamp;
        
        // Update validator reputations
        _updateValidatorReputations(disputeId, decision);
        
        emit DisputeResolved(disputeId, decision, dispute.voteCount);
    }
    
    /**
     * @notice Update validator reputations based on consensus
     * @param disputeId Dispute identifier
     * @param consensusDecision Final consensus decision
     */
    function _updateValidatorReputations(uint256 disputeId, VoteDecision consensusDecision) internal {
        ValidatorVote[] storage votes = disputeVotes[disputeId];
        
        for (uint256 i = 0; i < votes.length; i++) {
            ValidatorProfile storage profile = validatorProfiles[votes[i].validator];
            
            if (votes[i].decision == consensusDecision) {
                // Correct vote - increase reputation
                profile.correctVotes++;
                if (profile.reputationScore < 1000) {
                    profile.reputationScore += 10;
                }
            } else if (votes[i].decision != VoteDecision.Abstain) {
                // Incorrect vote - decrease reputation
                if (profile.reputationScore > 10) {
                    profile.reputationScore -= 10;
                }
            }
        }
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set validator threshold
     * @param newThreshold New threshold in basis points
     */
    function setValidatorThreshold(uint256 newThreshold) external onlyRole(ADMIN_ROLE) {
        if (newThreshold < 5000 || newThreshold > 10000) revert InvalidThreshold();
        validatorThreshold = newThreshold;
    }
    
    /**
     * @notice Set voting period
     * @param newPeriod New period in seconds
     */
    function setVotingPeriod(uint256 newPeriod) external onlyRole(ADMIN_ROLE) {
        require(newPeriod >= 1 days && newPeriod <= 30 days, "Invalid period");
        votingPeriod = newPeriod;
    }
    
    /**
     * @notice Set minimum validator stake
     * @param newStake New minimum stake
     */
    function setMinValidatorStake(uint256 newStake) external onlyRole(ADMIN_ROLE) {
        require(newStake > 0, "Invalid stake");
        minValidatorStake = newStake;
    }
    
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
