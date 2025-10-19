// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DataCoinFactory
 * @notice Create tradeable reputation and skill data tokens with Lighthouse storage
 * @dev Implements ERC-721 DataCoins with access-controlled data monetization
 * 
 * Key Features:
 * - Lighthouse storage integration for encrypted data
 * - ERC-721 DataCoins representing data ownership
 * - Token-gated access control
 * - Royalty distribution for data creators
 * - Time-based access permissions
 * - Reputation data monetization
 * 
 * Sponsor Integration: Lighthouse Storage
 * - Stores encrypted reputation and skill datasets
 * - Creates tradeable DataCoins with access control
 * - Implements token-gated content access
 */
contract DataCoinFactory is ERC721, AccessControl, ReentrancyGuard, Pausable {
    
    // ============ Type Declarations ============
    
    /// @notice DataCoin types
    enum DataType {
        ReputationData,     // User reputation history
        SkillDataset,       // Skill proficiency data
        WorkPortfolio,      // Project portfolio
        ValidationData,     // Validator assessments
        MarketAnalytics,    // Market trend data
        Custom              // Custom data type
    }
    
    /// @notice Access control rules
    struct AccessControl {
        bool isPublic;              // Public access flag
        uint256 accessPrice;        // Price to access (in wei)
        uint256 accessDuration;     // Access duration (seconds)
        address[] whitelist;        // Whitelisted addresses
        bool requiresOwnership;     // Requires DataCoin ownership
        uint256 maxAccesses;        // Maximum number of accesses
    }
    
    /// @notice DataCoin metadata
    struct DataCoin {
        uint256 coinId;             // Token ID
        address creator;            // Data creator
        DataType dataType;          // Type of data
        string lighthouseCID;       // Lighthouse IPFS CID
        string title;               // DataCoin title
        string description;         // DataCoin description
        AccessControl accessRules;  // Access control rules
        uint256 createdAt;          // Creation timestamp
        uint256 totalRevenue;       // Total revenue earned
        uint256 accessCount;        // Number of accesses
        bool isActive;              // Active status
    }
    
    /// @notice Access grant record
    struct AccessGrant {
        uint256 coinId;             // DataCoin ID
        address user;               // User address
        uint256 grantedAt;          // Grant timestamp
        uint256 expiresAt;          // Expiration timestamp
        bool isPermanent;           // Permanent access flag
        uint256 pricePaid;          // Price paid for access
    }
    
    // ============ State Variables ============
    
    /// @notice Lighthouse storage adapter
    address public lighthouseAdapter;
    
    /// @notice Reputation registry contract
    address public reputationRegistry;
    
    /// @notice Role for data validators
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    
    /// @notice Role for admins
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Mapping of coin IDs to DataCoin metadata
    mapping(uint256 => DataCoin) public dataCoins;
    
    /// @notice Mapping of coin IDs to Lighthouse CIDs
    mapping(uint256 => string) public lighthouseCIDs;
    
    /// @notice Mapping of coin IDs to access grants
    mapping(uint256 => mapping(address => AccessGrant)) public accessGrants;
    
    /// @notice Mapping of creators to their DataCoins
    mapping(address => uint256[]) public creatorDataCoins;
    
    /// @notice Mapping of users to purchased DataCoins
    mapping(address => uint256[]) public userPurchases;
    
    /// @notice DataCoin counter
    uint256 public nextCoinId;
    
    /// @notice Platform fee percentage (basis points)
    uint256 public platformFee = 250; // 2.5%
    
    /// @notice Fee collector address
    address public feeCollector;
    
    // ============ Events ============
    
    event DataCoinCreated(uint256 indexed coinId, address indexed creator, DataType dataType, string lighthouseCID);
    event AccessGranted(uint256 indexed coinId, address indexed user, uint256 duration, uint256 price);
    event AccessRevoked(uint256 indexed coinId, address indexed user);
    event RoyaltiesWithdrawn(uint256 indexed coinId, address indexed creator, uint256 amount);
    event DataCoinTransferred(uint256 indexed coinId, address indexed from, address indexed to);
    event AccessRulesUpdated(uint256 indexed coinId);
    event DataCoinDeactivated(uint256 indexed coinId);
    
    // ============ Errors ============
    
    error InvalidAddress();
    error InvalidCoinId();
    error InvalidPrice();
    error InvalidDuration();
    error UnauthorizedAccess();
    error AccessExpired();
    error InsufficientPayment();
    error MaxAccessesReached();
    error DataCoinInactive();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize DataCoinFactory
     * @param _lighthouseAdapter Lighthouse storage adapter address
     * @param _reputationRegistry Reputation registry address
     * @param _feeCollector Fee collector address
     * @param _admin Admin address
     */
    constructor(
        address _lighthouseAdapter,
        address _reputationRegistry,
        address _feeCollector,
        address _admin
    ) ERC721("ReputeFlow DataCoin", "RFDC") {
        if (_admin == address(0)) revert InvalidAddress();
        
        lighthouseAdapter = _lighthouseAdapter;
        reputationRegistry = _reputationRegistry;
        feeCollector = _feeCollector;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        nextCoinId = 1;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Create a new DataCoin with Lighthouse storage
     * @param dataType Type of data
     * @param lighthouseCID Lighthouse IPFS CID
     * @param title DataCoin title
     * @param description DataCoin description
     * @param accessRules Access control rules
     * @return coinId Created DataCoin ID
     */
    function createDataCoin(
        DataType dataType,
        string calldata lighthouseCID,
        string calldata title,
        string calldata description,
        AccessControl calldata accessRules
    ) external whenNotPaused returns (uint256 coinId) {
        if (bytes(lighthouseCID).length == 0) revert("Invalid CID");
        if (bytes(title).length == 0) revert("Invalid title");
        
        coinId = nextCoinId++;
        
        // Mint DataCoin NFT to creator
        _safeMint(msg.sender, coinId);
        
        // Store metadata
        dataCoins[coinId] = DataCoin({
            coinId: coinId,
            creator: msg.sender,
            dataType: dataType,
            lighthouseCID: lighthouseCID,
            title: title,
            description: description,
            accessRules: accessRules,
            createdAt: block.timestamp,
            totalRevenue: 0,
            accessCount: 0,
            isActive: true
        });
        
        lighthouseCIDs[coinId] = lighthouseCID;
        creatorDataCoins[msg.sender].push(coinId);
        
        emit DataCoinCreated(coinId, msg.sender, dataType, lighthouseCID);
        
        return coinId;
    }
    
    /**
     * @notice Purchase access to a DataCoin
     * @param coinId DataCoin identifier
     */
    function purchaseAccess(uint256 coinId) external payable nonReentrant whenNotPaused {
        DataCoin storage coin = dataCoins[coinId];
        if (coin.coinId == 0) revert InvalidCoinId();
        if (!coin.isActive) revert DataCoinInactive();
        
        AccessControl memory rules = coin.accessRules;
        
        // Check if public or requires payment
        if (!rules.isPublic) {
            if (msg.value < rules.accessPrice) revert InsufficientPayment();
        }
        
        // Check max accesses
        if (rules.maxAccesses > 0 && coin.accessCount >= rules.maxAccesses) {
            revert MaxAccessesReached();
        }
        
        // Check whitelist if applicable
        if (rules.whitelist.length > 0) {
            bool isWhitelisted = false;
            for (uint256 i = 0; i < rules.whitelist.length; i++) {
                if (rules.whitelist[i] == msg.sender) {
                    isWhitelisted = true;
                    break;
                }
            }
            if (!isWhitelisted) revert UnauthorizedAccess();
        }
        
        // Grant access
        uint256 expiresAt = rules.accessDuration > 0 
            ? block.timestamp + rules.accessDuration 
            : type(uint256).max;
        
        accessGrants[coinId][msg.sender] = AccessGrant({
            coinId: coinId,
            user: msg.sender,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            isPermanent: rules.accessDuration == 0,
            pricePaid: msg.value
        });
        
        // Update statistics
        coin.accessCount++;
        coin.totalRevenue += msg.value;
        userPurchases[msg.sender].push(coinId);
        
        // Distribute payment
        if (msg.value > 0) {
            uint256 fee = (msg.value * platformFee) / 10000;
            uint256 creatorAmount = msg.value - fee;
            
            // Transfer to creator
            (bool success1, ) = coin.creator.call{value: creatorAmount}("");
            require(success1, "Creator payment failed");
            
            // Transfer fee
            if (fee > 0 && feeCollector != address(0)) {
                (bool success2, ) = feeCollector.call{value: fee}("");
                require(success2, "Fee payment failed");
            }
        }
        
        emit AccessGranted(coinId, msg.sender, rules.accessDuration, msg.value);
    }
    
    /**
     * @notice Grant free access to a user
     * @param coinId DataCoin identifier
     * @param user User address
     * @param duration Access duration (0 for permanent)
     */
    function grantAccess(
        uint256 coinId,
        address user,
        uint256 duration
    ) external whenNotPaused {
        DataCoin storage coin = dataCoins[coinId];
        if (coin.coinId == 0) revert InvalidCoinId();
        if (user == address(0)) revert InvalidAddress();
        
        // Only creator or admin can grant free access
        if (msg.sender != coin.creator && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        
        uint256 expiresAt = duration > 0 ? block.timestamp + duration : type(uint256).max;
        
        accessGrants[coinId][user] = AccessGrant({
            coinId: coinId,
            user: user,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            isPermanent: duration == 0,
            pricePaid: 0
        });
        
        coin.accessCount++;
        
        emit AccessGranted(coinId, user, duration, 0);
    }
    
    /**
     * @notice Revoke access from a user
     * @param coinId DataCoin identifier
     * @param user User address
     */
    function revokeAccess(uint256 coinId, address user) external {
        DataCoin storage coin = dataCoins[coinId];
        if (coin.coinId == 0) revert InvalidCoinId();
        
        // Only creator or admin can revoke
        if (msg.sender != coin.creator && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        
        delete accessGrants[coinId][user];
        
        emit AccessRevoked(coinId, user);
    }
    
    /**
     * @notice Update access rules for a DataCoin
     * @param coinId DataCoin identifier
     * @param newRules New access control rules
     */
    function updateAccessRules(
        uint256 coinId,
        AccessControl calldata newRules
    ) external whenNotPaused {
        DataCoin storage coin = dataCoins[coinId];
        if (coin.coinId == 0) revert InvalidCoinId();
        if (msg.sender != coin.creator) revert UnauthorizedAccess();
        
        coin.accessRules = newRules;
        
        emit AccessRulesUpdated(coinId);
    }
    
    /**
     * @notice Deactivate a DataCoin
     * @param coinId DataCoin identifier
     */
    function deactivateDataCoin(uint256 coinId) external {
        DataCoin storage coin = dataCoins[coinId];
        if (coin.coinId == 0) revert InvalidCoinId();
        if (msg.sender != coin.creator && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        
        coin.isActive = false;
        
        emit DataCoinDeactivated(coinId);
    }
    
    /**
     * @notice Withdraw accumulated royalties (if any pending)
     * @param coinId DataCoin identifier
     */
    function withdrawRoyalties(uint256 coinId) external nonReentrant {
        DataCoin storage coin = dataCoins[coinId];
        if (coin.coinId == 0) revert InvalidCoinId();
        if (msg.sender != coin.creator) revert UnauthorizedAccess();
        
        // This function is for future royalty mechanisms
        // Current implementation pays creators immediately on purchase
        
        emit RoyaltiesWithdrawn(coinId, msg.sender, 0);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Verify if user has access to DataCoin
     * @param coinId DataCoin identifier
     * @param user User address
     * @return hasAccess Whether user has valid access
     */
    function verifyAccess(uint256 coinId, address user) external view returns (bool hasAccess) {
        DataCoin storage coin = dataCoins[coinId];
        if (coin.coinId == 0 || !coin.isActive) return false;
        
        // Check if user owns the DataCoin NFT
        if (ownerOf(coinId) == user) return true;
        
        // Check if public access
        if (coin.accessRules.isPublic) return true;
        
        // Check access grant
        AccessGrant storage grant = accessGrants[coinId][user];
        if (grant.grantedAt == 0) return false;
        
        // Check expiration
        if (!grant.isPermanent && block.timestamp > grant.expiresAt) return false;
        
        return true;
    }
    
    /**
     * @notice Get DataCoin metadata
     * @param coinId DataCoin identifier
     * @return DataCoin metadata
     */
    function getDataCoinMetadata(uint256 coinId) external view returns (DataCoin memory) {
        return dataCoins[coinId];
    }
    
    /**
     * @notice Get Lighthouse CID for DataCoin
     * @param coinId DataCoin identifier
     * @return Lighthouse IPFS CID
     */
    function getLighthouseCID(uint256 coinId) external view returns (string memory) {
        return lighthouseCIDs[coinId];
    }
    
    /**
     * @notice Get access grant details
     * @param coinId DataCoin identifier
     * @param user User address
     * @return Access grant data
     */
    function getAccessGrant(uint256 coinId, address user) external view returns (AccessGrant memory) {
        return accessGrants[coinId][user];
    }
    
    /**
     * @notice Get all DataCoins created by an address
     * @param creator Creator address
     * @return Array of DataCoin IDs
     */
    function getCreatorDataCoins(address creator) external view returns (uint256[] memory) {
        return creatorDataCoins[creator];
    }
    
    /**
     * @notice Get all DataCoins purchased by a user
     * @param user User address
     * @return Array of DataCoin IDs
     */
    function getUserPurchases(address user) external view returns (uint256[] memory) {
        return userPurchases[user];
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Override transfer to emit custom event
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        address previousOwner = super._update(to, tokenId, auth);
        
        if (from != address(0) && to != address(0)) {
            emit DataCoinTransferred(tokenId, from, to);
        }
        
        return previousOwner;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set Lighthouse adapter address
     * @param newAdapter New adapter address
     */
    function setLighthouseAdapter(address newAdapter) external onlyRole(ADMIN_ROLE) {
        if (newAdapter == address(0)) revert InvalidAddress();
        lighthouseAdapter = newAdapter;
    }
    
    /**
     * @notice Set platform fee
     * @param newFee New fee in basis points
     */
    function setPlatformFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }
    
    /**
     * @notice Set fee collector
     * @param newCollector New collector address
     */
    function setFeeCollector(address newCollector) external onlyRole(ADMIN_ROLE) {
        if (newCollector == address(0)) revert InvalidAddress();
        feeCollector = newCollector;
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
