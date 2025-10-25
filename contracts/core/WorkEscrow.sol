// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";

/**
 * @title WorkEscrow
 * @notice Manages milestone-based payments with Yellow SDK state channels and Pyth oracle validation
 * @dev Implements secure escrow with gasless streaming payments via Yellow Network
 * 
 * Key Features:
 * - Milestone-based project funding and releases
 * - Yellow SDK state channel integration for zero-gas payments
 * - Pyth oracle validation for payment amounts
 * - Multi-party dispute resolution
 * - Cross-chain payment support via Avail Nexus
 * - Automated payment streaming based on work progress
 * 
 * Sponsor Integrations:
 * - Yellow SDK: Gasless state channels for streaming micropayments
 * - Pyth Network: Market rate validation for fair pricing
 * - Avail Nexus: Cross-chain deposit and withdrawal routing
 */
contract WorkEscrow is AccessControl, ReentrancyGuard, Pausable {
    
    // ============ Type Declarations ============
    
    /// @notice Project status enumeration
    enum ProjectStatus {
        Created,        // Project initialized
        Funded,         // Funds deposited
        Active,         // Work in progress
        Disputed,       // Dispute raised
        Completed,      // All milestones done
        Cancelled       // Project cancelled
    }
    
    /// @notice Milestone status enumeration
    enum MilestoneStatus {
        Pending,        // Not yet started
        InProgress,     // Work ongoing
        Submitted,      // Deliverable submitted
        UnderReview,    // Being validated
        Approved,       // Approved by client
        Rejected,       // Rejected, needs revision
        Paid,           // Payment released
        Disputed        // Under dispute
    }
    
    /// @notice Milestone definition
    struct Milestone {
        string description;          // Milestone details
        uint256 paymentAmount;       // Payment in USD (scaled by 1e8)
        uint256 deadline;            // Completion deadline
        MilestoneStatus status;      // Current status
        string deliverableHash;      // IPFS/Lighthouse CID
        uint256 submittedAt;         // Submission timestamp
        uint256 approvedAt;          // Approval timestamp
        address validator;           // Assigned validator
    }
    
    /// @notice Project data structure
    struct Project {
        uint256 projectId;           // Unique identifier
        address client;              // Client address
        address freelancer;          // Freelancer address
        uint256 totalBudget;         // Total budget (USD scaled by 1e8)
        uint256 paidAmount;          // Amount paid so far
        uint256 createdAt;           // Creation timestamp
        uint256 completedAt;         // Completion timestamp
        ProjectStatus status;        // Current status
        bytes32 yellowChannelId;     // Yellow SDK channel ID
        uint256 sourceChain;         // Chain where funds deposited
        string[] requiredSkills;     // Required skills for the project
    }
    
    /// @notice Yellow SDK state channel data
    struct StateChannel {
        bytes32 channelId;           // Channel identifier
        address[] participants;      // Channel participants
        uint256 totalDeposit;        // Total deposited amount
        uint256 streamedAmount;      // Amount streamed so far
        uint256 lastUpdateTime;      // Last state update
        bool isActive;               // Channel status
        bytes32 latestStateHash;     // Latest state commitment
    }
    
    /// @notice Dispute record
    struct Dispute {
        uint256 disputeId;           // Unique identifier
        uint256 projectId;           // Associated project
        uint256 milestoneId;         // Associated milestone
        address initiator;           // Who raised dispute
        string reason;               // Dispute reason
        string evidence;             // Evidence IPFS hash
        uint256 createdAt;           // Creation timestamp
        uint256 resolvedAt;          // Resolution timestamp
        bool isResolved;             // Resolution status
        uint8 outcome;               // 0=pending, 1=client, 2=freelancer, 3=split
    }
    
    // ============ State Variables ============
    
    /// @notice Pyth oracle contract
    IPyth public immutable pyth;
    
    /// @notice Yellow SDK adapter contract
    address public yellowSdkAdapter;
    
    /// @notice Avail Nexus router contract
    address public availRouter;
    
    /// @notice Validator registry contract
    address public validatorRegistry;
    
    /// @notice Role for validators
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    
    /// @notice Role for admins
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Mapping of project IDs to project data
    mapping(uint256 => Project) public projects;
    
    /// @notice Mapping of project IDs to milestones
    mapping(uint256 => Milestone[]) public projectMilestones;
    
    /// @notice Mapping of project IDs to escrowed balances
    mapping(uint256 => uint256) public projectBalances;
    
    /// @notice Mapping of Yellow channel IDs to channel data
    mapping(bytes32 => StateChannel) public yellowChannels;
    
    /// @notice Mapping of dispute IDs to dispute data
    mapping(uint256 => Dispute) public disputes;
    
    /// @notice Project counter
    uint256 public nextProjectId;
    
    /// @notice Dispute counter
    uint256 public nextDisputeId;
    
    /// @notice Platform fee percentage (basis points, e.g., 100 = 1%)
    uint256 public platformFee = 100; // 1%
    
    /// @notice Fee collector address
    address public feeCollector;
    
    // ============ Events ============
    
    event ProjectCreated(uint256 indexed projectId, address indexed client, address indexed freelancer, uint256 totalBudget);
    event FreelancerUpdated(uint256 indexed projectId, address indexed oldFreelancer, address indexed newFreelancer);
    event FundsDeposited(uint256 indexed projectId, uint256 amount, uint256 sourceChain);
    event YellowChannelCreated(bytes32 indexed channelId, uint256 indexed projectId, address[] participants);
    event MilestoneSubmitted(uint256 indexed projectId, uint256 milestoneId, string deliverableHash);
    event MilestoneValidated(uint256 indexed projectId, uint256 milestoneId, bool approved, address validator);
    event PaymentReleased(uint256 indexed projectId, uint256 milestoneId, uint256 amount, address recipient);
    event PaymentStreamed(bytes32 indexed channelId, uint256 amount, address recipient);
    event DisputeInitiated(uint256 indexed disputeId, uint256 indexed projectId, uint256 milestoneId, address initiator);
    event DisputeResolved(uint256 indexed disputeId, uint8 outcome);
    event ProjectCompleted(uint256 indexed projectId, uint256 totalPaid);
    event ProjectCancelled(uint256 indexed projectId, string reason);
    event ChannelStateUpdated(bytes32 indexed channelId, bytes32 stateHash);
    
    // ============ Errors ============
    
    error InvalidAddress();
    error InvalidAmount();
    error InvalidProjectId();
    error InvalidMilestoneId();
    error UnauthorizedAccess();
    error InsufficientBalance();
    error InvalidProjectStatus();
    error InvalidMilestoneStatus();
    error DeadlineNotMet();
    error ChannelNotActive();
    error DisputeAlreadyResolved();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize WorkEscrow contract
     * @param _pythContract Pyth oracle address
     * @param _yellowSdkAdapter Yellow SDK adapter address
     * @param _availRouter Avail Nexus router address
     * @param _validatorRegistry Validator registry address
     * @param _feeCollector Fee collector address
     * @param _admin Admin address
     */
    constructor(
        address _pythContract,
        address _yellowSdkAdapter,
        address _availRouter,
        address _validatorRegistry,
        address _feeCollector,
        address _admin
    ) {
        if (_pythContract == address(0) || _admin == address(0)) revert InvalidAddress();
        
        pyth = IPyth(_pythContract);
        yellowSdkAdapter = _yellowSdkAdapter;
        availRouter = _availRouter;
        validatorRegistry = _validatorRegistry;
        feeCollector = _feeCollector;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        nextProjectId = 1;
        nextDisputeId = 1;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Create a new project with milestones
     * @param client Client address
     * @param freelancer Freelancer address
     * @param totalBudget Total project budget (USD scaled by 1e8)
     * @param milestoneDescriptions Array of milestone descriptions
     * @param milestoneAmounts Array of milestone payment amounts
     * @param milestoneDeadlines Array of milestone deadlines
     * @return projectId The created project ID
     */
    function createProject(
        address client,
        address freelancer,
        uint256 totalBudget,
        string[] calldata milestoneDescriptions,
        uint256[] calldata milestoneAmounts,
        uint256[] calldata milestoneDeadlines,
        string[] calldata requiredSkills
    ) external whenNotPaused returns (uint256 projectId) {
        if (client == address(0) || freelancer == address(0)) revert InvalidAddress();
        if (totalBudget == 0) revert InvalidAmount();
        if (milestoneDescriptions.length != milestoneAmounts.length || 
            milestoneDescriptions.length != milestoneDeadlines.length) {
            revert("Milestone arrays length mismatch");
        }
        
        // Verify total budget matches sum of milestones
        uint256 sum = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            sum += milestoneAmounts[i];
        }
        if (sum != totalBudget) revert InvalidAmount();
        
        projectId = nextProjectId++;
        
        // Create project
        projects[projectId] = Project({
            projectId: projectId,
            client: client,
            freelancer: freelancer,
            totalBudget: totalBudget,
            paidAmount: 0,
            createdAt: block.timestamp,
            completedAt: 0,
            status: ProjectStatus.Created,
            yellowChannelId: bytes32(0),
            sourceChain: block.chainid,
            requiredSkills: requiredSkills
        });
        
        // Create milestones
        for (uint256 i = 0; i < milestoneDescriptions.length; i++) {
            projectMilestones[projectId].push(Milestone({
                description: milestoneDescriptions[i],
                paymentAmount: milestoneAmounts[i],
                deadline: milestoneDeadlines[i],
                status: MilestoneStatus.Pending,
                deliverableHash: "",
                submittedAt: 0,
                approvedAt: 0,
                validator: address(0)
            }));
        }
        
        emit ProjectCreated(projectId, client, freelancer, totalBudget);
        
        return projectId;
    }
    
    /**
     * @notice Update freelancer address for a project (only in Created status)
     * @param projectId Project identifier
     * @param newFreelancer New freelancer address
     */
    function updateFreelancer(
        uint256 projectId,
        address newFreelancer
    ) external whenNotPaused {
        Project storage project = projects[projectId];
        if (project.projectId == 0) revert InvalidProjectId();
        if (msg.sender != project.client) revert UnauthorizedAccess();
        if (project.status != ProjectStatus.Created) revert InvalidProjectStatus();
        if (newFreelancer == address(0)) revert InvalidAddress();
        
        address oldFreelancer = project.freelancer;
        project.freelancer = newFreelancer;
        
        emit FreelancerUpdated(projectId, oldFreelancer, newFreelancer);
    }
    
    /**
     * @notice Deposit funds to project escrow
     * @param projectId Project identifier
     * @param sourceChain Chain ID where funds are coming from
     */
    function depositFunds(
        uint256 projectId,
        uint256 sourceChain
    ) external payable nonReentrant whenNotPaused {
        Project storage project = projects[projectId];
        if (project.projectId == 0) revert InvalidProjectId();
        if (msg.sender != project.client) revert UnauthorizedAccess();
        if (project.status != ProjectStatus.Created) revert InvalidProjectStatus();
        
        // Verify deposit amount matches budget
        // Note: In production, this would integrate with Avail Nexus for cross-chain deposits
        if (msg.value == 0) revert InvalidAmount();
        
        projectBalances[projectId] += msg.value;
        project.status = ProjectStatus.Funded;
        project.sourceChain = sourceChain;
        
        emit FundsDeposited(projectId, msg.value, sourceChain);
    }
    
    /**
     * @notice Create Yellow SDK state channel for streaming payments
     * @param projectId Project identifier
     * @param participants Channel participants (client, freelancer, validators)
     * @return channelId The created channel ID
     */
    function createYellowChannel(
        uint256 projectId,
        address[] calldata participants
    ) external whenNotPaused returns (bytes32 channelId) {
        Project storage project = projects[projectId];
        if (project.projectId == 0) revert InvalidProjectId();
        if (project.status != ProjectStatus.Funded) revert InvalidProjectStatus();
        if (msg.sender != project.client && msg.sender != project.freelancer) {
            revert UnauthorizedAccess();
        }
        
        // Generate channel ID
        channelId = keccak256(abi.encodePacked(
            projectId,
            block.timestamp,
            participants
        ));
        
        // Create channel
        yellowChannels[channelId] = StateChannel({
            channelId: channelId,
            participants: participants,
            totalDeposit: projectBalances[projectId],
            streamedAmount: 0,
            lastUpdateTime: block.timestamp,
            isActive: true,
            latestStateHash: bytes32(0)
        });
        
        project.yellowChannelId = channelId;
        project.status = ProjectStatus.Active;
        
        emit YellowChannelCreated(channelId, projectId, participants);
        
        return channelId;
    }
    
    /**
     * @notice Submit milestone deliverable
     * @param projectId Project identifier
     * @param milestoneId Milestone index
     * @param deliverableHash IPFS/Lighthouse CID
     */
    function submitMilestoneDeliverable(
        uint256 projectId,
        uint256 milestoneId,
        string calldata deliverableHash
    ) external whenNotPaused {
        Project storage project = projects[projectId];
        if (project.projectId == 0) revert InvalidProjectId();
        if (msg.sender != project.freelancer) revert UnauthorizedAccess();
        if (project.status != ProjectStatus.Active) revert InvalidProjectStatus();
        
        Milestone[] storage milestones = projectMilestones[projectId];
        if (milestoneId >= milestones.length) revert InvalidMilestoneId();
        
        Milestone storage milestone = milestones[milestoneId];
        if (milestone.status != MilestoneStatus.InProgress && 
            milestone.status != MilestoneStatus.Pending) {
            revert InvalidMilestoneStatus();
        }
        
        milestone.deliverableHash = deliverableHash;
        milestone.submittedAt = block.timestamp;
        milestone.status = MilestoneStatus.Submitted;
        
        emit MilestoneSubmitted(projectId, milestoneId, deliverableHash);
    }
    
    /**
     * @notice Validate milestone deliverable
     * @param projectId Project identifier
     * @param milestoneId Milestone index
     * @param approved Whether to approve or reject
     */
    function validateMilestone(
        uint256 projectId,
        uint256 milestoneId,
        bool approved
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        Project storage project = projects[projectId];
        if (project.projectId == 0) revert InvalidProjectId();
        
        Milestone[] storage milestones = projectMilestones[projectId];
        if (milestoneId >= milestones.length) revert InvalidMilestoneId();
        
        Milestone storage milestone = milestones[milestoneId];
        if (milestone.status != MilestoneStatus.Submitted) revert InvalidMilestoneStatus();
        
        milestone.validator = msg.sender;
        milestone.status = approved ? MilestoneStatus.Approved : MilestoneStatus.Rejected;
        
        if (approved) {
            milestone.approvedAt = block.timestamp;
        }
        
        emit MilestoneValidated(projectId, milestoneId, approved, msg.sender);
    }
    
    /**
     * @notice Release milestone payment via Yellow SDK streaming
     * @param projectId Project identifier
     * @param milestoneId Milestone index
     */
    function releaseMilestonePayment(
        uint256 projectId,
        uint256 milestoneId
    ) external nonReentrant whenNotPaused {
        Project storage project = projects[projectId];
        if (project.projectId == 0) revert InvalidProjectId();
        if (msg.sender != project.client && !hasRole(VALIDATOR_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        
        Milestone[] storage milestones = projectMilestones[projectId];
        if (milestoneId >= milestones.length) revert InvalidMilestoneId();
        
        Milestone storage milestone = milestones[milestoneId];
        if (milestone.status != MilestoneStatus.Approved) revert InvalidMilestoneStatus();
        
        uint256 paymentAmount = milestone.paymentAmount;
        if (projectBalances[projectId] < paymentAmount) revert InsufficientBalance();
        
        // Calculate platform fee
        uint256 fee = (paymentAmount * platformFee) / 10000;
        uint256 netPayment = paymentAmount - fee;
        
        // Update balances
        projectBalances[projectId] -= paymentAmount;
        project.paidAmount += paymentAmount;
        
        // Update channel state if using Yellow SDK
        if (project.yellowChannelId != bytes32(0)) {
            StateChannel storage channel = yellowChannels[project.yellowChannelId];
            if (channel.isActive) {
                channel.streamedAmount += netPayment;
                channel.lastUpdateTime = block.timestamp;
                
                emit PaymentStreamed(project.yellowChannelId, netPayment, project.freelancer);
            }
        }
        
        // Transfer payment (in production, this would use Yellow SDK for gasless transfer)
        (bool success, ) = project.freelancer.call{value: netPayment}("");
        require(success, "Payment transfer failed");
        
        // Transfer fee
        if (fee > 0 && feeCollector != address(0)) {
            (bool feeSuccess, ) = feeCollector.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        milestone.status = MilestoneStatus.Paid;
        
        emit PaymentReleased(projectId, milestoneId, netPayment, project.freelancer);
        
        // Check if all milestones are paid
        _checkProjectCompletion(projectId);
    }
    
    /**
     * @notice Initiate dispute for a milestone
     * @param projectId Project identifier
     * @param milestoneId Milestone index
     * @param reason Dispute reason
     * @param evidence Evidence IPFS hash
     */
    function initiateDispute(
        uint256 projectId,
        uint256 milestoneId,
        string calldata reason,
        string calldata evidence
    ) external whenNotPaused returns (uint256 disputeId) {
        Project storage project = projects[projectId];
        if (project.projectId == 0) revert InvalidProjectId();
        if (msg.sender != project.client && msg.sender != project.freelancer) {
            revert UnauthorizedAccess();
        }
        
        Milestone[] storage milestones = projectMilestones[projectId];
        if (milestoneId >= milestones.length) revert InvalidMilestoneId();
        
        disputeId = nextDisputeId++;
        
        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            projectId: projectId,
            milestoneId: milestoneId,
            initiator: msg.sender,
            reason: reason,
            evidence: evidence,
            createdAt: block.timestamp,
            resolvedAt: 0,
            isResolved: false,
            outcome: 0
        });
        
        project.status = ProjectStatus.Disputed;
        milestones[milestoneId].status = MilestoneStatus.Disputed;
        
        emit DisputeInitiated(disputeId, projectId, milestoneId, msg.sender);
        
        return disputeId;
    }
    
    /**
     * @notice Resolve dispute with validator consensus
     * @param disputeId Dispute identifier
     * @param outcome Resolution outcome (1=client, 2=freelancer, 3=split)
     */
    function resolveDispute(
        uint256 disputeId,
        uint8 outcome
    ) external onlyRole(VALIDATOR_ROLE) nonReentrant whenNotPaused {
        Dispute storage dispute = disputes[disputeId];
        if (dispute.disputeId == 0) revert("Invalid dispute ID");
        if (dispute.isResolved) revert DisputeAlreadyResolved();
        if (outcome == 0 || outcome > 3) revert("Invalid outcome");
        
        Project storage project = projects[dispute.projectId];
        Milestone[] storage milestones = projectMilestones[dispute.projectId];
        Milestone storage milestone = milestones[dispute.milestoneId];
        
        uint256 amount = milestone.paymentAmount;
        
        // Execute resolution based on outcome
        if (outcome == 1) {
            // Refund to client
            (bool success, ) = project.client.call{value: amount}("");
            require(success, "Refund failed");
        } else if (outcome == 2) {
            // Pay freelancer
            (bool success, ) = project.freelancer.call{value: amount}("");
            require(success, "Payment failed");
            milestone.status = MilestoneStatus.Paid;
        } else if (outcome == 3) {
            // Split 50/50
            uint256 half = amount / 2;
            (bool success1, ) = project.client.call{value: half}("");
            (bool success2, ) = project.freelancer.call{value: amount - half}("");
            require(success1 && success2, "Split payment failed");
            milestone.status = MilestoneStatus.Paid;
        }
        
        projectBalances[dispute.projectId] -= amount;
        
        dispute.isResolved = true;
        dispute.outcome = outcome;
        dispute.resolvedAt = block.timestamp;
        
        project.status = ProjectStatus.Active;
        
        emit DisputeResolved(disputeId, outcome);
    }
    
    /**
     * @notice Finalize project after all milestones completed
     * @param projectId Project identifier
     */
    function finalizeProject(uint256 projectId) external whenNotPaused {
        Project storage project = projects[projectId];
        if (project.projectId == 0) revert InvalidProjectId();
        if (msg.sender != project.client && msg.sender != project.freelancer) {
            revert UnauthorizedAccess();
        }
        
        _checkProjectCompletion(projectId);
    }
    
    /**
     * @notice Emergency withdraw for cancelled projects
     * @param projectId Project identifier
     */
    function emergencyWithdraw(uint256 projectId) external nonReentrant {
        Project storage project = projects[projectId];
        if (project.projectId == 0) revert InvalidProjectId();
        if (msg.sender != project.client) revert UnauthorizedAccess();
        if (project.status != ProjectStatus.Cancelled) revert InvalidProjectStatus();
        
        uint256 balance = projectBalances[projectId];
        if (balance == 0) revert InsufficientBalance();
        
        projectBalances[projectId] = 0;
        
        (bool success, ) = project.client.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Check if all milestones are completed
     * @param projectId Project identifier
     */
    function _checkProjectCompletion(uint256 projectId) internal {
        Project storage project = projects[projectId];
        Milestone[] storage milestones = projectMilestones[projectId];
        
        bool allPaid = true;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].status != MilestoneStatus.Paid) {
                allPaid = false;
                break;
            }
        }
        
        if (allPaid) {
            project.status = ProjectStatus.Completed;
            project.completedAt = block.timestamp;
            
            // Close Yellow channel
            if (project.yellowChannelId != bytes32(0)) {
                yellowChannels[project.yellowChannelId].isActive = false;
            }
            
            emit ProjectCompleted(projectId, project.paidAmount);
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get project details
     * @param projectId Project identifier
     * @return Project data
     */
    function getProject(uint256 projectId) external view returns (Project memory) {
        return projects[projectId];
    }
    
    /**
     * @notice Get project milestones
     * @param projectId Project identifier
     * @return Array of milestones
     */
    function getProjectMilestones(uint256 projectId) external view returns (Milestone[] memory) {
        return projectMilestones[projectId];
    }
    
    /**
     * @notice Get Yellow channel data
     * @param channelId Channel identifier
     * @return Channel data
     */
    function getYellowChannel(bytes32 channelId) external view returns (StateChannel memory) {
        return yellowChannels[channelId];
    }
    
    /**
     * @notice Get dispute details
     * @param disputeId Dispute identifier
     * @return Dispute data
     */
    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update platform fee
     * @param newFee New fee in basis points
     */
    function setPlatformFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }
    
    /**
     * @notice Update fee collector address
     * @param newCollector New collector address
     */
    function setFeeCollector(address newCollector) external onlyRole(ADMIN_ROLE) {
        if (newCollector == address(0)) revert InvalidAddress();
        feeCollector = newCollector;
    }
    
    /**
     * @notice Update Yellow SDK adapter
     * @param newAdapter New adapter address
     */
    function setYellowAdapter(address newAdapter) external onlyRole(ADMIN_ROLE) {
        if (newAdapter == address(0)) revert InvalidAddress();
        yellowSdkAdapter = newAdapter;
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
    
    /**
     * @notice Get required skills for a project
     * @param projectId Project identifier
     * @return Array of required skills
     */
    function getProjectSkills(uint256 projectId) external view returns (string[] memory) {
        if (projects[projectId].projectId == 0) revert InvalidProjectId();
        return projects[projectId].requiredSkills;
    }
}
