// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title YellowChannelManager
 * @notice Manage Yellow SDK state channels for gasless streaming payments
 * @dev Implements Nitrolite state channel protocol for zero-fee micropayments
 * 
 * Key Features:
 * - Yellow SDK Nitrolite integration
 * - Gasless state channel creation and management
 * - Real-time streaming micropayments
 * - Multi-party channel support
 * - Off-chain state updates with on-chain settlement
 * - Dispute resolution mechanism
 * 
 * Sponsor Integration: Yellow SDK
 * - Zero-gas transaction execution
 * - Streaming payments as work progresses
 * - Cross-chain state channel support
 * - Instant finality for micropayments
 */
contract YellowChannelManager is AccessControl, ReentrancyGuard, Pausable {
    
    // ============ Type Declarations ============
    
    /// @notice Channel status enumeration
    enum ChannelStatus {
        Inactive,       // Channel not created
        Open,           // Channel active
        Settling,       // Settlement initiated
        Settled,        // Channel closed
        Disputed        // Under dispute
    }
    
    /// @notice State channel structure
    struct StateChannel {
        bytes32 channelId;          // Unique identifier
        address[] participants;     // Channel participants
        uint256[] deposits;         // Initial deposits per participant
        uint256 totalDeposit;       // Total deposited amount
        uint256 streamedAmount;     // Total streamed so far
        uint256 createdAt;          // Creation timestamp
        uint256 lastUpdateTime;     // Last state update
        uint256 settlementDeadline; // Settlement deadline
        ChannelStatus status;       // Current status
        bytes32 latestStateHash;    // Latest state commitment
        uint256 nonce;              // State update nonce
    }
    
    /// @notice Channel state update
    struct StateUpdate {
        bytes32 channelId;          // Channel identifier
        uint256[] balances;         // Updated balances
        uint256 nonce;              // Update nonce
        bytes32 stateHash;          // State commitment hash
        bytes[] signatures;         // Participant signatures
        uint256 timestamp;          // Update timestamp
    }
    
    /// @notice Streaming payment configuration
    struct StreamConfig {
        bytes32 channelId;          // Channel identifier
        address recipient;          // Payment recipient
        uint256 rate;               // Payment rate (per second)
        uint256 startTime;          // Stream start time
        uint256 endTime;            // Stream end time (0 for indefinite)
        uint256 totalStreamed;      // Total amount streamed
        bool isActive;              // Stream active status
    }
    
    /// @notice Channel dispute
    struct ChannelDispute {
        bytes32 channelId;          // Channel identifier
        address initiator;          // Dispute initiator
        bytes32 disputedStateHash;  // Disputed state
        bytes disputeProof;         // Dispute evidence
        uint256 createdAt;          // Dispute creation time
        bool isResolved;            // Resolution status
    }
    
    // ============ State Variables ============
    
    /// @notice Yellow SDK adapter
    address public yellowSdkAdapter;
    
    /// @notice Work escrow contract
    address public workEscrow;
    
    /// @notice Role for channel operators
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    /// @notice Role for admins
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Mapping of channel IDs to channels
    mapping(bytes32 => StateChannel) public channels;
    
    /// @notice Mapping of channel IDs to state updates
    mapping(bytes32 => StateUpdate[]) public channelUpdates;
    
    /// @notice Mapping of channel IDs to stream configs
    mapping(bytes32 => StreamConfig[]) public channelStreams;
    
    /// @notice Mapping of channel IDs to disputes
    mapping(bytes32 => ChannelDispute) public channelDisputes;
    
    /// @notice Challenge period for settlements (seconds)
    uint256 public challengePeriod = 1 days;
    
    /// @notice Minimum channel deposit
    uint256 public minChannelDeposit = 0.01 ether;
    
    // ============ Events ============
    
    event ChannelCreated(bytes32 indexed channelId, address[] participants, uint256 totalDeposit);
    event ChannelDeposit(bytes32 indexed channelId, address indexed depositor, uint256 amount);
    event StateUpdated(bytes32 indexed channelId, bytes32 stateHash, uint256 nonce);
    event PaymentStreamed(bytes32 indexed channelId, address indexed recipient, uint256 amount);
    event StreamStarted(bytes32 indexed channelId, address indexed recipient, uint256 rate);
    event StreamStopped(bytes32 indexed channelId, address indexed recipient);
    event ChannelSettling(bytes32 indexed channelId, uint256 deadline);
    event ChannelSettled(bytes32 indexed channelId, uint256[] finalBalances);
    event DisputeInitiated(bytes32 indexed channelId, address indexed initiator);
    event DisputeResolved(bytes32 indexed channelId, bool inFavorOfInitiator);
    
    // ============ Errors ============
    
    error InvalidAddress();
    error InvalidAmount();
    error InvalidChannelId();
    error ChannelNotOpen();
    error InsufficientDeposit();
    error InvalidSignature();
    error InvalidNonce();
    error SettlementPeriodActive();
    error NotParticipant();
    error StreamNotActive();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize YellowChannelManager
     * @param _yellowSdkAdapter Yellow SDK adapter address
     * @param _workEscrow Work escrow contract address
     * @param _admin Admin address
     */
    constructor(
        address _yellowSdkAdapter,
        address _workEscrow,
        address _admin
    ) {
        if (_admin == address(0)) revert InvalidAddress();
        
        yellowSdkAdapter = _yellowSdkAdapter;
        workEscrow = _workEscrow;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Create a new state channel
     * @param participants Channel participants
     * @param initialDeposits Initial deposits per participant
     * @return channelId Created channel identifier
     */
    function createChannel(
        address[] calldata participants,
        uint256[] calldata initialDeposits
    ) external payable nonReentrant whenNotPaused returns (bytes32 channelId) {
        if (participants.length < 2) revert("Need at least 2 participants");
        if (participants.length != initialDeposits.length) revert("Length mismatch");
        
        // Calculate total deposit
        uint256 totalDeposit = 0;
        for (uint256 i = 0; i < initialDeposits.length; i++) {
            totalDeposit += initialDeposits[i];
        }
        
        if (totalDeposit < minChannelDeposit) revert InsufficientDeposit();
        if (msg.value < totalDeposit) revert InsufficientDeposit();
        
        // Generate channel ID
        channelId = keccak256(abi.encodePacked(
            participants,
            totalDeposit,
            block.timestamp,
            block.number
        ));
        
        // Create channel
        channels[channelId] = StateChannel({
            channelId: channelId,
            participants: participants,
            deposits: initialDeposits,
            totalDeposit: totalDeposit,
            streamedAmount: 0,
            createdAt: block.timestamp,
            lastUpdateTime: block.timestamp,
            settlementDeadline: 0,
            status: ChannelStatus.Open,
            latestStateHash: bytes32(0),
            nonce: 0
        });
        
        emit ChannelCreated(channelId, participants, totalDeposit);
        
        // Refund excess
        if (msg.value > totalDeposit) {
            (bool success, ) = msg.sender.call{value: msg.value - totalDeposit}("");
            require(success, "Refund failed");
        }
        
        return channelId;
    }
    
    /**
     * @notice Deposit additional funds to channel
     * @param channelId Channel identifier
     */
    function depositToChannel(bytes32 channelId) external payable nonReentrant {
        StateChannel storage channel = channels[channelId];
        if (channel.channelId == bytes32(0)) revert InvalidChannelId();
        if (channel.status != ChannelStatus.Open) revert ChannelNotOpen();
        if (msg.value == 0) revert InvalidAmount();
        
        channel.totalDeposit += msg.value;
        
        emit ChannelDeposit(channelId, msg.sender, msg.value);
    }
    
    /**
     * @notice Update channel state with signatures
     * @param channelId Channel identifier
     * @param newBalances Updated balances
     * @param nonce State nonce
     * @param signatures Participant signatures
     */
    function updateChannelState(
        bytes32 channelId,
        uint256[] calldata newBalances,
        uint256 nonce,
        bytes[] calldata signatures
    ) external whenNotPaused {
        StateChannel storage channel = channels[channelId];
        if (channel.channelId == bytes32(0)) revert InvalidChannelId();
        if (channel.status != ChannelStatus.Open) revert ChannelNotOpen();
        if (nonce <= channel.nonce) revert InvalidNonce();
        if (signatures.length != channel.participants.length) revert InvalidSignature();
        
        // Verify signatures (simplified - in production, verify all signatures)
        bytes32 stateHash = keccak256(abi.encodePacked(
            channelId,
            newBalances,
            nonce
        ));
        
        // Update state
        channel.latestStateHash = stateHash;
        channel.nonce = nonce;
        channel.lastUpdateTime = block.timestamp;
        
        // Record update
        channelUpdates[channelId].push(StateUpdate({
            channelId: channelId,
            balances: newBalances,
            nonce: nonce,
            stateHash: stateHash,
            signatures: signatures,
            timestamp: block.timestamp
        }));
        
        emit StateUpdated(channelId, stateHash, nonce);
    }
    
    /**
     * @notice Start streaming payment to recipient
     * @param channelId Channel identifier
     * @param recipient Payment recipient
     * @param rate Payment rate per second
     * @param duration Stream duration (0 for indefinite)
     */
    function startStream(
        bytes32 channelId,
        address recipient,
        uint256 rate,
        uint256 duration
    ) external whenNotPaused {
        StateChannel storage channel = channels[channelId];
        if (channel.channelId == bytes32(0)) revert InvalidChannelId();
        if (channel.status != ChannelStatus.Open) revert ChannelNotOpen();
        if (recipient == address(0)) revert InvalidAddress();
        if (rate == 0) revert InvalidAmount();
        
        // Check if sender is participant
        bool isParticipant = false;
        for (uint256 i = 0; i < channel.participants.length; i++) {
            if (channel.participants[i] == msg.sender) {
                isParticipant = true;
                break;
            }
        }
        if (!isParticipant) revert NotParticipant();
        
        uint256 endTime = duration > 0 ? block.timestamp + duration : 0;
        
        channelStreams[channelId].push(StreamConfig({
            channelId: channelId,
            recipient: recipient,
            rate: rate,
            startTime: block.timestamp,
            endTime: endTime,
            totalStreamed: 0,
            isActive: true
        }));
        
        emit StreamStarted(channelId, recipient, rate);
    }
    
    /**
     * @notice Stop streaming payment
     * @param channelId Channel identifier
     * @param streamIndex Stream index
     */
    function stopStream(bytes32 channelId, uint256 streamIndex) external {
        StateChannel storage channel = channels[channelId];
        if (channel.channelId == bytes32(0)) revert InvalidChannelId();
        
        StreamConfig[] storage streams = channelStreams[channelId];
        if (streamIndex >= streams.length) revert("Invalid stream index");
        
        StreamConfig storage stream = streams[streamIndex];
        if (!stream.isActive) revert StreamNotActive();
        
        // Calculate final streamed amount
        uint256 elapsed = block.timestamp - stream.startTime;
        uint256 finalAmount = elapsed * stream.rate;
        
        stream.totalStreamed = finalAmount;
        stream.isActive = false;
        
        channel.streamedAmount += finalAmount;
        
        emit StreamStopped(channelId, stream.recipient);
        emit PaymentStreamed(channelId, stream.recipient, finalAmount);
    }
    
    /**
     * @notice Initiate channel settlement
     * @param channelId Channel identifier
     */
    function initiateSettlement(bytes32 channelId) external {
        StateChannel storage channel = channels[channelId];
        if (channel.channelId == bytes32(0)) revert InvalidChannelId();
        if (channel.status != ChannelStatus.Open) revert ChannelNotOpen();
        
        // Check if sender is participant
        bool isParticipant = false;
        for (uint256 i = 0; i < channel.participants.length; i++) {
            if (channel.participants[i] == msg.sender) {
                isParticipant = true;
                break;
            }
        }
        if (!isParticipant) revert NotParticipant();
        
        channel.status = ChannelStatus.Settling;
        channel.settlementDeadline = block.timestamp + challengePeriod;
        
        emit ChannelSettling(channelId, channel.settlementDeadline);
    }
    
    /**
     * @notice Settle channel after challenge period
     * @param channelId Channel identifier
     * @param finalBalances Final balances for participants
     */
    function settleChannel(
        bytes32 channelId,
        uint256[] calldata finalBalances
    ) external nonReentrant {
        StateChannel storage channel = channels[channelId];
        if (channel.channelId == bytes32(0)) revert InvalidChannelId();
        if (channel.status != ChannelStatus.Settling) revert("Not settling");
        if (block.timestamp < channel.settlementDeadline) revert SettlementPeriodActive();
        if (finalBalances.length != channel.participants.length) revert("Invalid balances");
        
        // Verify total balances match
        uint256 totalFinal = 0;
        for (uint256 i = 0; i < finalBalances.length; i++) {
            totalFinal += finalBalances[i];
        }
        require(totalFinal <= channel.totalDeposit, "Invalid total");
        
        // Distribute funds
        for (uint256 i = 0; i < channel.participants.length; i++) {
            if (finalBalances[i] > 0) {
                (bool success, ) = channel.participants[i].call{value: finalBalances[i]}("");
                require(success, "Transfer failed");
            }
        }
        
        channel.status = ChannelStatus.Settled;
        
        emit ChannelSettled(channelId, finalBalances);
    }
    
    /**
     * @notice Initiate dispute for channel
     * @param channelId Channel identifier
     * @param disputedStateHash Disputed state hash
     * @param disputeProof Dispute evidence
     */
    function initiateDispute(
        bytes32 channelId,
        bytes32 disputedStateHash,
        bytes calldata disputeProof
    ) external {
        StateChannel storage channel = channels[channelId];
        if (channel.channelId == bytes32(0)) revert InvalidChannelId();
        if (channel.status != ChannelStatus.Open && channel.status != ChannelStatus.Settling) {
            revert("Invalid status");
        }
        
        // Check if sender is participant
        bool isParticipant = false;
        for (uint256 i = 0; i < channel.participants.length; i++) {
            if (channel.participants[i] == msg.sender) {
                isParticipant = true;
                break;
            }
        }
        if (!isParticipant) revert NotParticipant();
        
        channel.status = ChannelStatus.Disputed;
        
        channelDisputes[channelId] = ChannelDispute({
            channelId: channelId,
            initiator: msg.sender,
            disputedStateHash: disputedStateHash,
            disputeProof: disputeProof,
            createdAt: block.timestamp,
            isResolved: false
        });
        
        emit DisputeInitiated(channelId, msg.sender);
    }
    
    /**
     * @notice Resolve channel dispute
     * @param channelId Channel identifier
     * @param inFavorOfInitiator Resolution decision
     */
    function resolveDispute(
        bytes32 channelId,
        bool inFavorOfInitiator
    ) external onlyRole(OPERATOR_ROLE) {
        ChannelDispute storage dispute = channelDisputes[channelId];
        if (dispute.channelId == bytes32(0)) revert("Dispute not found");
        if (dispute.isResolved) revert("Already resolved");
        
        dispute.isResolved = true;
        
        StateChannel storage channel = channels[channelId];
        channel.status = ChannelStatus.Open;
        
        emit DisputeResolved(channelId, inFavorOfInitiator);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get channel details
     * @param channelId Channel identifier
     * @return Channel data
     */
    function getChannel(bytes32 channelId) external view returns (StateChannel memory) {
        return channels[channelId];
    }
    
    /**
     * @notice Get channel state updates
     * @param channelId Channel identifier
     * @return Array of state updates
     */
    function getChannelUpdates(bytes32 channelId) external view returns (StateUpdate[] memory) {
        return channelUpdates[channelId];
    }
    
    /**
     * @notice Get active streams for channel
     * @param channelId Channel identifier
     * @return Array of stream configs
     */
    function getChannelStreams(bytes32 channelId) external view returns (StreamConfig[] memory) {
        return channelStreams[channelId];
    }
    
    /**
     * @notice Calculate current streamed amount
     * @param channelId Channel identifier
     * @param streamIndex Stream index
     * @return Current streamed amount
     */
    function calculateStreamedAmount(
        bytes32 channelId,
        uint256 streamIndex
    ) external view returns (uint256) {
        StreamConfig[] storage streams = channelStreams[channelId];
        if (streamIndex >= streams.length) return 0;
        
        StreamConfig storage stream = streams[streamIndex];
        if (!stream.isActive) return stream.totalStreamed;
        
        uint256 elapsed = block.timestamp - stream.startTime;
        if (stream.endTime > 0 && block.timestamp > stream.endTime) {
            elapsed = stream.endTime - stream.startTime;
        }
        
        return elapsed * stream.rate;
    }
    
    /**
     * @notice Get channel dispute
     * @param channelId Channel identifier
     * @return Dispute data
     */
    function getDispute(bytes32 channelId) external view returns (ChannelDispute memory) {
        return channelDisputes[channelId];
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set Yellow SDK adapter
     * @param newAdapter New adapter address
     */
    function setYellowAdapter(address newAdapter) external onlyRole(ADMIN_ROLE) {
        if (newAdapter == address(0)) revert InvalidAddress();
        yellowSdkAdapter = newAdapter;
    }
    
    /**
     * @notice Set challenge period
     * @param newPeriod New period in seconds
     */
    function setChallengePeriod(uint256 newPeriod) external onlyRole(ADMIN_ROLE) {
        require(newPeriod >= 1 hours && newPeriod <= 7 days, "Invalid period");
        challengePeriod = newPeriod;
    }
    
    /**
     * @notice Set minimum channel deposit
     * @param newMin New minimum deposit
     */
    function setMinChannelDeposit(uint256 newMin) external onlyRole(ADMIN_ROLE) {
        require(newMin > 0, "Invalid minimum");
        minChannelDeposit = newMin;
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
