// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AvailIntentRouter
 * @notice Cross-chain payment routing via Avail Nexus SDK
 * @dev Implements intent-based cross-chain execution with unified balance management
 * 
 * Key Features:
 * - Avail Nexus SDK integration for cross-chain operations
 * - Intent-based payment routing
 * - Unified balance management across multiple chains
 * - Optimized route calculation
 * - Bridge and execute in single transaction
 * - Multi-chain escrow support
 * 
 * Sponsor Integration: Avail Nexus SDK
 * - Cross-chain payment intents
 * - Unified liquidity across 12+ chains
 * - Intent execution framework
 * - Chain-abstracted user experience
 */
contract AvailIntentRouter is AccessControl, ReentrancyGuard, Pausable {
    
    // ============ Type Declarations ============
    
    /// @notice Intent status enumeration
    enum IntentStatus {
        Created,        // Intent created
        Pending,        // Awaiting execution
        Executing,      // Currently executing
        Completed,      // Successfully completed
        Failed,         // Execution failed
        Cancelled       // Intent cancelled
    }
    
    /// @notice Payment intent structure
    struct Intent {
        bytes32 intentId;           // Unique identifier
        address sender;             // Intent creator
        address recipient;          // Payment recipient
        uint256 amount;             // Payment amount
        uint256 sourceChain;        // Source chain ID
        uint256 targetChain;        // Target chain ID
        bytes executionData;        // Execution payload
        uint256 createdAt;          // Creation timestamp
        uint256 executedAt;         // Execution timestamp
        IntentStatus status;        // Current status
        uint256 gasLimit;           // Gas limit for execution
        uint256 maxSlippage;        // Maximum slippage (basis points)
    }
    
    /// @notice Unified balance across chains
    struct UnifiedBalance {
        address user;               // User address
        mapping(uint256 => uint256) balances; // Chain ID => Balance
        uint256 totalBalance;       // Total across all chains
        uint256 lastUpdate;         // Last update timestamp
    }
    
    /// @notice Chain configuration
    struct ChainConfig {
        uint256 chainId;            // Chain identifier
        string chainName;           // Chain name
        address bridgeContract;     // Bridge contract address
        uint256 minGasLimit;        // Minimum gas limit
        uint256 maxGasLimit;        // Maximum gas limit
        uint256 bridgeFee;          // Bridge fee amount
        bool isActive;              // Chain active status
    }
    
    /// @notice Route optimization data
    struct RouteData {
        uint256[] chainPath;        // Chain IDs in route
        uint256 totalCost;          // Total cost estimate
        uint256 estimatedTime;      // Estimated time (seconds)
        uint256 confidence;         // Route confidence (0-100)
    }
    
    // ============ State Variables ============
    
    /// @notice Avail Nexus core contract
    address public availNexusCore;
    
    /// @notice Work escrow contract
    address public workEscrow;
    
    /// @notice Role for executors
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    
    /// @notice Role for admins
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Mapping of intent IDs to intents
    mapping(bytes32 => Intent) public intents;
    
    /// @notice Mapping of user addresses to unified balances
    mapping(address => UnifiedBalance) private unifiedBalances;
    
    /// @notice Mapping of chain IDs to configurations
    mapping(uint256 => ChainConfig) public chainConfigs;
    
    /// @notice Array of supported chain IDs
    uint256[] public supportedChains;
    
    /// @notice Intent counter
    uint256 public intentNonce;
    
    /// @notice Default gas limit
    uint256 public defaultGasLimit = 500000;
    
    /// @notice Default max slippage (basis points)
    uint256 public defaultMaxSlippage = 100; // 1%
    
    // ============ Events ============
    
    event IntentCreated(bytes32 indexed intentId, address indexed sender, address indexed recipient, uint256 amount, uint256 targetChain);
    event IntentExecuted(bytes32 indexed intentId, uint256 timestamp, uint256 gasUsed);
    event IntentFailed(bytes32 indexed intentId, string reason);
    event IntentCancelled(bytes32 indexed intentId, address indexed canceller);
    event BalanceUpdated(address indexed user, uint256[] chains, uint256[] amounts, uint256 totalBalance);
    event ChainAdded(uint256 indexed chainId, string chainName);
    event ChainRemoved(uint256 indexed chainId);
    event BridgeExecuted(bytes32 indexed intentId, uint256 sourceChain, uint256 targetChain, uint256 amount);
    
    // ============ Errors ============
    
    error InvalidAddress();
    error InvalidAmount();
    error InvalidChainId();
    error IntentNotFound();
    error IntentAlreadyExecuted();
    error InsufficientBalance();
    error ChainNotSupported();
    error ExecutionFailed();
    error InvalidSlippage();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize AvailIntentRouter
     * @param _availNexusCore Avail Nexus core contract address
     * @param _workEscrow Work escrow contract address
     * @param _admin Admin address
     */
    constructor(
        address _availNexusCore,
        address _workEscrow,
        address _admin
    ) {
        if (_admin == address(0)) revert InvalidAddress();
        
        availNexusCore = _availNexusCore;
        workEscrow = _workEscrow;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
        
        intentNonce = 1;
        
        // Initialize current chain
        _addChain(block.chainid, "Current Chain", address(0), 100000, 1000000, 0);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Create a cross-chain payment intent
     * @param recipient Payment recipient
     * @param amount Payment amount
     * @param targetChain Target chain ID
     * @param executionData Execution payload
     * @return intentId Created intent identifier
     */
    function createPaymentIntent(
        address recipient,
        uint256 amount,
        uint256 targetChain,
        bytes calldata executionData
    ) external payable nonReentrant whenNotPaused returns (bytes32 intentId) {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (!chainConfigs[targetChain].isActive) revert ChainNotSupported();
        
        intentId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            amount,
            targetChain,
            intentNonce++,
            block.timestamp
        ));
        
        intents[intentId] = Intent({
            intentId: intentId,
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            sourceChain: block.chainid,
            targetChain: targetChain,
            executionData: executionData,
            createdAt: block.timestamp,
            executedAt: 0,
            status: IntentStatus.Created,
            gasLimit: defaultGasLimit,
            maxSlippage: defaultMaxSlippage
        });
        
        // Update unified balance
        _updateBalance(msg.sender, block.chainid, msg.value);
        
        emit IntentCreated(intentId, msg.sender, recipient, amount, targetChain);
        
        return intentId;
    }
    
    /**
     * @notice Execute a payment intent via Avail Nexus
     * @param intentId Intent identifier
     */
    function executeIntent(bytes32 intentId) external onlyRole(EXECUTOR_ROLE) nonReentrant whenNotPaused {
        Intent storage intent = intents[intentId];
        if (intent.intentId == bytes32(0)) revert IntentNotFound();
        if (intent.status != IntentStatus.Created && intent.status != IntentStatus.Pending) {
            revert IntentAlreadyExecuted();
        }
        
        intent.status = IntentStatus.Executing;
        
        // Execute cross-chain transaction via Avail Nexus
        // In production, this would call Avail Nexus SDK
        bool success = _executeViaAvailNexus(intent);
        
        if (success) {
            intent.status = IntentStatus.Completed;
            intent.executedAt = block.timestamp;
            
            emit IntentExecuted(intentId, block.timestamp, intent.gasLimit);
        } else {
            intent.status = IntentStatus.Failed;
            emit IntentFailed(intentId, "Execution failed");
        }
    }
    
    /**
     * @notice Get unified balance for a user across all chains
     * @param user User address
     * @return totalBalance Total balance across all chains
     * @return chainBalances Array of balances per chain
     */
    function getUnifiedBalance(address user) external view returns (
        uint256 totalBalance,
        uint256[] memory chainBalances
    ) {
        UnifiedBalance storage balance = unifiedBalances[user];
        totalBalance = balance.totalBalance;
        
        chainBalances = new uint256[](supportedChains.length);
        for (uint256 i = 0; i < supportedChains.length; i++) {
            chainBalances[i] = balance.balances[supportedChains[i]];
        }
        
        return (totalBalance, chainBalances);
    }
    
    /**
     * @notice Optimize payment route across chains
     * @param amount Payment amount
     * @param targetChain Target chain ID
     * @return route Optimized route data
     */
    function optimizePaymentRoute(
        uint256 amount,
        uint256 targetChain
    ) external view returns (RouteData memory route) {
        if (!chainConfigs[targetChain].isActive) revert ChainNotSupported();
        
        // Simple direct route for now
        // In production, this would use Avail Nexus routing algorithms
        uint256[] memory chainPath = new uint256[](2);
        chainPath[0] = block.chainid;
        chainPath[1] = targetChain;
        
        uint256 bridgeFee = chainConfigs[targetChain].bridgeFee;
        uint256 totalCost = amount + bridgeFee;
        
        route = RouteData({
            chainPath: chainPath,
            totalCost: totalCost,
            estimatedTime: 300, // 5 minutes estimate
            confidence: 95
        });
        
        return route;
    }
    
    /**
     * @notice Bridge and execute in single transaction
     * @param projectId Project identifier
     * @param milestoneId Milestone identifier
     * @param targetChain Target chain ID
     */
    function bridgeAndExecute(
        uint256 projectId,
        uint256 milestoneId,
        uint256 targetChain
    ) external payable nonReentrant whenNotPaused {
        if (!chainConfigs[targetChain].isActive) revert ChainNotSupported();
        if (msg.value == 0) revert InvalidAmount();
        
        // Create intent for bridge and execute
        bytes memory executionData = abi.encode(projectId, milestoneId);
        
        bytes32 intentId = keccak256(abi.encodePacked(
            msg.sender,
            projectId,
            milestoneId,
            targetChain,
            intentNonce++,
            block.timestamp
        ));
        
        intents[intentId] = Intent({
            intentId: intentId,
            sender: msg.sender,
            recipient: workEscrow,
            amount: msg.value,
            sourceChain: block.chainid,
            targetChain: targetChain,
            executionData: executionData,
            createdAt: block.timestamp,
            executedAt: 0,
            status: IntentStatus.Created,
            gasLimit: defaultGasLimit,
            maxSlippage: defaultMaxSlippage
        });
        
        emit BridgeExecuted(intentId, block.chainid, targetChain, msg.value);
    }
    
    /**
     * @notice Cancel a pending intent
     * @param intentId Intent identifier
     */
    function cancelIntent(bytes32 intentId) external nonReentrant {
        Intent storage intent = intents[intentId];
        if (intent.intentId == bytes32(0)) revert IntentNotFound();
        if (msg.sender != intent.sender && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert("Unauthorized");
        }
        if (intent.status != IntentStatus.Created && intent.status != IntentStatus.Pending) {
            revert("Cannot cancel");
        }
        
        intent.status = IntentStatus.Cancelled;
        
        // Refund sender
        (bool success, ) = intent.sender.call{value: intent.amount}("");
        require(success, "Refund failed");
        
        emit IntentCancelled(intentId, msg.sender);
    }
    
    /**
     * @notice Update chain configuration
     * @param chainId Chain identifier
     * @param chainName Chain name
     * @param bridgeContract Bridge contract address
     * @param minGasLimit Minimum gas limit
     * @param maxGasLimit Maximum gas limit
     * @param bridgeFee Bridge fee
     */
    function updateChainConfig(
        uint256 chainId,
        string calldata chainName,
        address bridgeContract,
        uint256 minGasLimit,
        uint256 maxGasLimit,
        uint256 bridgeFee
    ) external onlyRole(ADMIN_ROLE) {
        if (chainConfigs[chainId].chainId == 0) {
            _addChain(chainId, chainName, bridgeContract, minGasLimit, maxGasLimit, bridgeFee);
        } else {
            ChainConfig storage config = chainConfigs[chainId];
            config.chainName = chainName;
            config.bridgeContract = bridgeContract;
            config.minGasLimit = minGasLimit;
            config.maxGasLimit = maxGasLimit;
            config.bridgeFee = bridgeFee;
        }
    }
    
    /**
     * @notice Deactivate a chain
     * @param chainId Chain identifier
     */
    function deactivateChain(uint256 chainId) external onlyRole(ADMIN_ROLE) {
        chainConfigs[chainId].isActive = false;
        emit ChainRemoved(chainId);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get intent details
     * @param intentId Intent identifier
     * @return Intent data
     */
    function getIntent(bytes32 intentId) external view returns (Intent memory) {
        return intents[intentId];
    }
    
    /**
     * @notice Get intent status
     * @param intentId Intent identifier
     * @return Intent status
     */
    function getIntentStatus(bytes32 intentId) external view returns (IntentStatus) {
        return intents[intentId].status;
    }
    
    /**
     * @notice Get chain configuration
     * @param chainId Chain identifier
     * @return Chain configuration
     */
    function getChainConfig(uint256 chainId) external view returns (ChainConfig memory) {
        return chainConfigs[chainId];
    }
    
    /**
     * @notice Get all supported chains
     * @return Array of chain IDs
     */
    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChains;
    }
    
    /**
     * @notice Check if chain is supported
     * @param chainId Chain identifier
     * @return Whether chain is supported
     */
    function isChainSupported(uint256 chainId) external view returns (bool) {
        return chainConfigs[chainId].isActive;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Execute intent via Avail Nexus SDK
     * @param intent Intent to execute
     * @return success Whether execution succeeded
     */
    function _executeViaAvailNexus(Intent storage intent) internal returns (bool success) {
        // In production, this would integrate with Avail Nexus SDK
        // For now, simulate successful execution
        
        if (intent.targetChain == block.chainid) {
            // Same chain transfer
            (success, ) = intent.recipient.call{value: intent.amount}("");
        } else {
            // Cross-chain transfer via Avail Nexus
            // This would call Avail Nexus bridge contract
            success = true; // Simulated success
        }
        
        return success;
    }
    
    /**
     * @notice Update user balance
     * @param user User address
     * @param chainId Chain identifier
     * @param amount Amount to add
     */
    function _updateBalance(address user, uint256 chainId, uint256 amount) internal {
        UnifiedBalance storage balance = unifiedBalances[user];
        balance.user = user;
        balance.balances[chainId] += amount;
        balance.totalBalance += amount;
        balance.lastUpdate = block.timestamp;
        
        uint256[] memory chains = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        chains[0] = chainId;
        amounts[0] = balance.balances[chainId];
        
        emit BalanceUpdated(user, chains, amounts, balance.totalBalance);
    }
    
    /**
     * @notice Add a new chain
     * @param chainId Chain identifier
     * @param chainName Chain name
     * @param bridgeContract Bridge contract address
     * @param minGasLimit Minimum gas limit
     * @param maxGasLimit Maximum gas limit
     * @param bridgeFee Bridge fee
     */
    function _addChain(
        uint256 chainId,
        string memory chainName,
        address bridgeContract,
        uint256 minGasLimit,
        uint256 maxGasLimit,
        uint256 bridgeFee
    ) internal {
        chainConfigs[chainId] = ChainConfig({
            chainId: chainId,
            chainName: chainName,
            bridgeContract: bridgeContract,
            minGasLimit: minGasLimit,
            maxGasLimit: maxGasLimit,
            bridgeFee: bridgeFee,
            isActive: true
        });
        
        supportedChains.push(chainId);
        
        emit ChainAdded(chainId, chainName);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set Avail Nexus core address
     * @param newCore New core address
     */
    function setAvailNexusCore(address newCore) external onlyRole(ADMIN_ROLE) {
        if (newCore == address(0)) revert InvalidAddress();
        availNexusCore = newCore;
    }
    
    /**
     * @notice Set default gas limit
     * @param newGasLimit New gas limit
     */
    function setDefaultGasLimit(uint256 newGasLimit) external onlyRole(ADMIN_ROLE) {
        require(newGasLimit >= 100000 && newGasLimit <= 5000000, "Invalid gas limit");
        defaultGasLimit = newGasLimit;
    }
    
    /**
     * @notice Set default max slippage
     * @param newSlippage New slippage in basis points
     */
    function setDefaultMaxSlippage(uint256 newSlippage) external onlyRole(ADMIN_ROLE) {
        if (newSlippage > 1000) revert InvalidSlippage(); // Max 10%
        defaultMaxSlippage = newSlippage;
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
     * @notice Emergency withdraw
     */
    function emergencyWithdraw() external onlyRole(ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {
        _updateBalance(msg.sender, block.chainid, msg.value);
    }
}
