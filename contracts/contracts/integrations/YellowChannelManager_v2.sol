// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title YellowChannelManager v2
 * @notice Simplified escrow for PYUSD payments with release functionality
 */
contract YellowChannelManager is AccessControl, ReentrancyGuard {
    
    // ============ State Variables ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    // PYUSD token address
    IERC20 public pyusdToken;
    
    // Job escrow tracking
    struct JobEscrow {
        uint256 jobId;
        address client;
        address freelancer;
        uint256 amount;
        bool isReleased;
        uint256 depositedAt;
        uint256 releasedAt;
    }
    
    mapping(uint256 => JobEscrow) public jobEscrows;
    
    // ============ Events ============
    
    event FundsDeposited(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount);
    event FundsReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);
    
    // ============ Constructor ============
    
    constructor(address _pyusdToken, address _admin) {
        require(_pyusdToken != address(0), "Invalid token");
        require(_admin != address(0), "Invalid admin");
        
        pyusdToken = IERC20(_pyusdToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
    }
    
    // ============ Main Functions ============
    
    /**
     * @notice Record escrow deposit (called after PYUSD transfer)
     * @param jobId Job identifier
     * @param client Client address
     * @param freelancer Freelancer address
     * @param amount PYUSD amount
     */
    function recordDeposit(
        uint256 jobId,
        address client,
        address freelancer,
        uint256 amount
    ) external onlyRole(OPERATOR_ROLE) {
        require(jobEscrows[jobId].amount == 0, "Job already escrowed");
        require(client != address(0) && freelancer != address(0), "Invalid addresses");
        require(amount > 0, "Invalid amount");
        
        jobEscrows[jobId] = JobEscrow({
            jobId: jobId,
            client: client,
            freelancer: freelancer,
            amount: amount,
            isReleased: false,
            depositedAt: block.timestamp,
            releasedAt: 0
        });
        
        emit FundsDeposited(jobId, client, freelancer, amount);
    }
    
    /**
     * @notice Release PYUSD from escrow to freelancer
     * @param jobId Job identifier
     */
    function releasePayment(uint256 jobId) external nonReentrant onlyRole(OPERATOR_ROLE) {
        JobEscrow storage escrow = jobEscrows[jobId];
        
        require(escrow.amount > 0, "Job not found");
        require(!escrow.isReleased, "Already released");
        require(pyusdToken.balanceOf(address(this)) >= escrow.amount, "Insufficient balance");
        
        escrow.isReleased = true;
        escrow.releasedAt = block.timestamp;
        
        // Transfer PYUSD to freelancer
        require(pyusdToken.transfer(escrow.freelancer, escrow.amount), "Transfer failed");
        
        emit FundsReleased(jobId, escrow.freelancer, escrow.amount);
    }
    
    /**
     * @notice Get escrow details
     * @param jobId Job identifier
     */
    function getEscrow(uint256 jobId) external view returns (JobEscrow memory) {
        return jobEscrows[jobId];
    }
    
    /**
     * @notice Get contract PYUSD balance
     */
    function getBalance() external view returns (uint256) {
        return pyusdToken.balanceOf(address(this));
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Emergency withdraw (admin only)
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(IERC20(token).transfer(to, amount), "Transfer failed");
        
        emit EmergencyWithdraw(token, to, amount);
    }
}
