// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LighthouseStorageAdapter
 * @notice Interface with Lighthouse for encrypted decentralized storage
 * @dev Provides on-chain registry for Lighthouse IPFS storage with access control
 * 
 * Key Features:
 * - Lighthouse storage integration for encrypted files
 * - On-chain access control management
 * - IPFS CID registry and verification
 * - Time-based access permissions
 * - Token-gated content access
 * - File metadata tracking
 * 
 * Sponsor Integration: Lighthouse Storage
 * - Encrypted deliverable storage
 * - Access-controlled file sharing
 * - IPFS content addressing
 * - Integration with DataCoin factory
 */
contract LighthouseStorageAdapter is AccessControl, ReentrancyGuard, Pausable {
    
    // ============ Type Declarations ============
    
    /// @notice File access level
    enum AccessLevel {
        Private,        // Only owner
        Restricted,     // Whitelisted users
        TokenGated,     // Requires token ownership
        Public          // Anyone can access
    }
    
    /// @notice Stored file metadata
    struct StoredFile {
        string cid;                 // Lighthouse IPFS CID
        address owner;              // File owner
        string fileName;            // Original file name
        uint256 fileSize;           // File size in bytes
        string fileType;            // MIME type
        AccessLevel accessLevel;    // Access control level
        uint256 uploadedAt;         // Upload timestamp
        uint256 expiresAt;          // Expiration timestamp (0 for permanent)
        bool isEncrypted;           // Encryption status
        bytes32 encryptionKey;      // Encryption key hash
    }
    
    /// @notice Access permission
    struct AccessPermission {
        address user;               // User address
        string cid;                 // File CID
        uint256 grantedAt;          // Grant timestamp
        uint256 expiresAt;          // Expiration timestamp
        bool canDownload;           // Download permission
        bool canShare;              // Share permission
        bool isPermanent;           // Permanent access flag
    }
    
    /// @notice Access condition for token-gating
    struct AccessCondition {
        string cid;                 // File CID
        address tokenContract;      // Required token contract
        uint256 minBalance;         // Minimum token balance
        uint256[] requiredTokenIds; // Required token IDs (for NFTs)
        bool requiresAll;           // Require all tokens or any
    }
    
    // ============ State Variables ============
    
    /// @notice Lighthouse API endpoint (off-chain)
    string public lighthouseEndpoint;
    
    /// @notice DataCoin factory contract
    address public dataCoinFactory;
    
    /// @notice Role for uploaders
    bytes32 public constant UPLOADER_ROLE = keccak256("UPLOADER_ROLE");
    
    /// @notice Role for admins
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Mapping of CIDs to file metadata
    mapping(string => StoredFile) public storedFiles;
    
    /// @notice Mapping of CID to access permissions
    mapping(string => mapping(address => AccessPermission)) public accessPermissions;
    
    /// @notice Mapping of CID to access conditions
    mapping(string => AccessCondition) public accessConditions;
    
    /// @notice Mapping of owner to their file CIDs
    mapping(address => string[]) public ownerFiles;
    
    /// @notice Mapping of user to accessible CIDs
    mapping(address => string[]) public userAccessibleFiles;
    
    /// @notice Total files stored
    uint256 public totalFilesStored;
    
    /// @notice Storage fee per GB (in wei)
    uint256 public storageFeePerGB = 0.001 ether;
    
    // ============ Events ============
    
    event FileUploaded(string indexed cid, address indexed owner, string fileName, uint256 fileSize);
    event AccessGranted(string indexed cid, address indexed user, uint256 expiresAt);
    event AccessRevoked(string indexed cid, address indexed user);
    event AccessConditionSet(string indexed cid, address tokenContract, uint256 minBalance);
    event FileDeleted(string indexed cid, address indexed owner);
    event FileMetadataUpdated(string indexed cid);
    
    // ============ Errors ============
    
    error InvalidCID();
    error InvalidAddress();
    error FileNotFound();
    error UnauthorizedAccess();
    error AccessExpired();
    error InsufficientBalance();
    error InvalidAccessLevel();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize LighthouseStorageAdapter
     * @param _lighthouseEndpoint Lighthouse API endpoint
     * @param _dataCoinFactory DataCoin factory address
     * @param _admin Admin address
     */
    constructor(
        string memory _lighthouseEndpoint,
        address _dataCoinFactory,
        address _admin
    ) {
        if (_admin == address(0)) revert InvalidAddress();
        
        lighthouseEndpoint = _lighthouseEndpoint;
        dataCoinFactory = _dataCoinFactory;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPLOADER_ROLE, _admin);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Register uploaded file from Lighthouse
     * @param cid Lighthouse IPFS CID
     * @param fileName Original file name
     * @param fileSize File size in bytes
     * @param fileType MIME type
     * @param accessLevel Access control level
     * @param isEncrypted Whether file is encrypted
     * @param encryptionKey Encryption key hash
     */
    function registerFile(
        string calldata cid,
        string calldata fileName,
        uint256 fileSize,
        string calldata fileType,
        AccessLevel accessLevel,
        bool isEncrypted,
        bytes32 encryptionKey
    ) external payable whenNotPaused {
        if (bytes(cid).length == 0) revert InvalidCID();
        if (storedFiles[cid].uploadedAt != 0) revert("File already registered");
        
        // Calculate storage fee
        uint256 fileSizeGB = (fileSize + 1e9 - 1) / 1e9; // Round up to nearest GB
        uint256 fee = fileSizeGB * storageFeePerGB;
        if (msg.value < fee) revert InsufficientBalance();
        
        // Register file
        storedFiles[cid] = StoredFile({
            cid: cid,
            owner: msg.sender,
            fileName: fileName,
            fileSize: fileSize,
            fileType: fileType,
            accessLevel: accessLevel,
            uploadedAt: block.timestamp,
            expiresAt: 0,
            isEncrypted: isEncrypted,
            encryptionKey: encryptionKey
        });
        
        ownerFiles[msg.sender].push(cid);
        totalFilesStored++;
        
        emit FileUploaded(cid, msg.sender, fileName, fileSize);
        
        // Refund excess
        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
    }
    
    /**
     * @notice Grant access to a user
     * @param cid File CID
     * @param user User address
     * @param duration Access duration (0 for permanent)
     * @param canDownload Download permission
     * @param canShare Share permission
     */
    function grantAccess(
        string calldata cid,
        address user,
        uint256 duration,
        bool canDownload,
        bool canShare
    ) external whenNotPaused {
        StoredFile storage file = storedFiles[cid];
        if (file.uploadedAt == 0) revert FileNotFound();
        if (msg.sender != file.owner && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        if (user == address(0)) revert InvalidAddress();
        
        uint256 expiresAt = duration > 0 ? block.timestamp + duration : 0;
        
        accessPermissions[cid][user] = AccessPermission({
            user: user,
            cid: cid,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            canDownload: canDownload,
            canShare: canShare,
            isPermanent: duration == 0
        });
        
        userAccessibleFiles[user].push(cid);
        
        emit AccessGranted(cid, user, expiresAt);
    }
    
    /**
     * @notice Revoke access from a user
     * @param cid File CID
     * @param user User address
     */
    function revokeAccess(string calldata cid, address user) external {
        StoredFile storage file = storedFiles[cid];
        if (file.uploadedAt == 0) revert FileNotFound();
        if (msg.sender != file.owner && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        
        delete accessPermissions[cid][user];
        
        emit AccessRevoked(cid, user);
    }
    
    /**
     * @notice Set token-gated access condition
     * @param cid File CID
     * @param tokenContract Required token contract
     * @param minBalance Minimum token balance
     * @param requiredTokenIds Required token IDs (for NFTs)
     * @param requiresAll Require all tokens or any
     */
    function setAccessCondition(
        string calldata cid,
        address tokenContract,
        uint256 minBalance,
        uint256[] calldata requiredTokenIds,
        bool requiresAll
    ) external {
        StoredFile storage file = storedFiles[cid];
        if (file.uploadedAt == 0) revert FileNotFound();
        if (msg.sender != file.owner) revert UnauthorizedAccess();
        if (tokenContract == address(0)) revert InvalidAddress();
        
        accessConditions[cid] = AccessCondition({
            cid: cid,
            tokenContract: tokenContract,
            minBalance: minBalance,
            requiredTokenIds: requiredTokenIds,
            requiresAll: requiresAll
        });
        
        emit AccessConditionSet(cid, tokenContract, minBalance);
    }
    
    /**
     * @notice Update file metadata
     * @param cid File CID
     * @param fileName New file name
     * @param accessLevel New access level
     */
    function updateFileMetadata(
        string calldata cid,
        string calldata fileName,
        AccessLevel accessLevel
    ) external {
        StoredFile storage file = storedFiles[cid];
        if (file.uploadedAt == 0) revert FileNotFound();
        if (msg.sender != file.owner) revert UnauthorizedAccess();
        
        if (bytes(fileName).length > 0) {
            file.fileName = fileName;
        }
        file.accessLevel = accessLevel;
        
        emit FileMetadataUpdated(cid);
    }
    
    /**
     * @notice Delete file registration
     * @param cid File CID
     */
    function deleteFile(string calldata cid) external {
        StoredFile storage file = storedFiles[cid];
        if (file.uploadedAt == 0) revert FileNotFound();
        if (msg.sender != file.owner && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        
        delete storedFiles[cid];
        totalFilesStored--;
        
        emit FileDeleted(cid, msg.sender);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Verify if user has access to file
     * @param cid File CID
     * @param user User address
     * @return hasAccess Whether user has access
     * @return canDownload Whether user can download
     */
    function verifyAccess(string calldata cid, address user) external view returns (
        bool hasAccess,
        bool canDownload
    ) {
        StoredFile storage file = storedFiles[cid];
        if (file.uploadedAt == 0) return (false, false);
        
        // Owner always has access
        if (file.owner == user) return (true, true);
        
        // Check access level
        if (file.accessLevel == AccessLevel.Public) {
            return (true, true);
        }
        
        if (file.accessLevel == AccessLevel.Private) {
            return (false, false);
        }
        
        // Check explicit permission
        AccessPermission storage permission = accessPermissions[cid][user];
        if (permission.grantedAt > 0) {
            // Check expiration
            if (!permission.isPermanent && permission.expiresAt > 0 && block.timestamp > permission.expiresAt) {
                return (false, false);
            }
            return (true, permission.canDownload);
        }
        
        // Check token-gated access
        if (file.accessLevel == AccessLevel.TokenGated) {
            AccessCondition storage condition = accessConditions[cid];
            if (condition.tokenContract != address(0)) {
                // In production, check token balance/ownership
                // For now, return false
                return (false, false);
            }
        }
        
        return (false, false);
    }
    
    /**
     * @notice Get file metadata
     * @param cid File CID
     * @return File metadata
     */
    function getFileMetadata(string calldata cid) external view returns (StoredFile memory) {
        return storedFiles[cid];
    }
    
    /**
     * @notice Get file CID for project milestone
     * @param projectId Project identifier
     * @param milestoneId Milestone identifier
     * @return File CID
     */
    function getFileCID(uint256 projectId, uint256 milestoneId) external view returns (string memory) {
        // This would integrate with WorkEscrow to retrieve stored CID
        // For now, return empty string
        return "";
    }
    
    /**
     * @notice Get access permission details
     * @param cid File CID
     * @param user User address
     * @return Permission details
     */
    function getAccessPermission(string calldata cid, address user) external view returns (AccessPermission memory) {
        return accessPermissions[cid][user];
    }
    
    /**
     * @notice Get access condition for file
     * @param cid File CID
     * @return Access condition
     */
    function getAccessCondition(string calldata cid) external view returns (AccessCondition memory) {
        return accessConditions[cid];
    }
    
    /**
     * @notice Get all files owned by address
     * @param owner Owner address
     * @return Array of CIDs
     */
    function getOwnerFiles(address owner) external view returns (string[] memory) {
        return ownerFiles[owner];
    }
    
    /**
     * @notice Get all files accessible by user
     * @param user User address
     * @return Array of CIDs
     */
    function getUserAccessibleFiles(address user) external view returns (string[] memory) {
        return userAccessibleFiles[user];
    }
    
    /**
     * @notice Calculate storage fee for file size
     * @param fileSize File size in bytes
     * @return fee Storage fee in wei
     */
    function calculateStorageFee(uint256 fileSize) external view returns (uint256 fee) {
        uint256 fileSizeGB = (fileSize + 1e9 - 1) / 1e9;
        return fileSizeGB * storageFeePerGB;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set Lighthouse endpoint
     * @param newEndpoint New endpoint URL
     */
    function setLighthouseEndpoint(string calldata newEndpoint) external onlyRole(ADMIN_ROLE) {
        lighthouseEndpoint = newEndpoint;
    }
    
    /**
     * @notice Set DataCoin factory address
     * @param newFactory New factory address
     */
    function setDataCoinFactory(address newFactory) external onlyRole(ADMIN_ROLE) {
        if (newFactory == address(0)) revert InvalidAddress();
        dataCoinFactory = newFactory;
    }
    
    /**
     * @notice Set storage fee per GB
     * @param newFee New fee in wei
     */
    function setStorageFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        storageFeePerGB = newFee;
    }
    
    /**
     * @notice Withdraw collected fees
     */
    function withdrawFees() external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");
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
