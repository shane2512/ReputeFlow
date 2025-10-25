import { expect } from "chai";
import { ethers } from "hardhat";
import { ReputationRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ReputationRegistry", function () {
  let reputationRegistry: ReputationRegistry;
  let owner: SignerWithAddress;
  let validator: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let mockPyth: string;

  beforeEach(async function () {
    [owner, validator, user1, user2] = await ethers.getSigners();

    // Deploy mock Pyth contract (for testing, use zero address or deploy mock)
    mockPyth = ethers.ZeroAddress;

    // Deploy ReputationRegistry
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationRegistry.deploy(mockPyth, owner.address);
    await reputationRegistry.waitForDeployment();

    // Grant validator role
    const VALIDATOR_ROLE = await reputationRegistry.VALIDATOR_ROLE();
    await reputationRegistry.grantRole(VALIDATOR_ROLE, validator.address);
  });

  describe("Deployment", function () {
    it("Should set the correct admin", async function () {
      const ADMIN_ROLE = await reputationRegistry.ADMIN_ROLE();
      expect(await reputationRegistry.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should set the correct Pyth address", async function () {
      expect(await reputationRegistry.pyth()).to.equal(mockPyth);
    });

    it("Should start with nextBadgeId = 1", async function () {
      expect(await reputationRegistry.nextBadgeId()).to.equal(1);
    });
  });

  describe("Reputation Initialization", function () {
    it("Should initialize reputation for a user", async function () {
      const skills = ["Solidity", "React"];
      
      await expect(
        reputationRegistry.connect(validator).initializeReputation(user1.address, skills)
      ).to.emit(reputationRegistry, "ReputationInitialized");

      const reputation = await reputationRegistry.getReputationScore(user1.address);
      expect(reputation.overallScore).to.equal(100); // MIN_ACTIVE_SCORE
      expect(reputation.isActive).to.be.true;
    });

    it("Should revert if non-validator tries to initialize", async function () {
      const skills = ["Solidity"];
      
      await expect(
        reputationRegistry.connect(user1).initializeReputation(user2.address, skills)
      ).to.be.reverted;
    });

    it("Should revert if initializing zero address", async function () {
      const skills = ["Solidity"];
      
      await expect(
        reputationRegistry.connect(validator).initializeReputation(ethers.ZeroAddress, skills)
      ).to.be.revertedWithCustomError(reputationRegistry, "InvalidAddress");
    });
  });

  describe("Skill Badge Minting", function () {
    beforeEach(async function () {
      // Initialize user first
      await reputationRegistry.connect(validator).initializeReputation(user1.address, ["Solidity"]);
    });

    it("Should mint skill badge", async function () {
      await expect(
        reputationRegistry.connect(validator).mintSkillBadge(
          user1.address,
          "Solidity",
          5, // proficiency
          95, // quality score
          ethers.ZeroHash, // no Pyth feed for test
          [] // no Pyth update data
        )
      ).to.emit(reputationRegistry, "SkillBadgeMinted");

      const badges = await reputationRegistry.getUserBadges(user1.address);
      expect(badges.length).to.equal(1);
      expect(badges[0]).to.equal(1);
    });

    it("Should revert if quality score > 100", async function () {
      await expect(
        reputationRegistry.connect(validator).mintSkillBadge(
          user1.address,
          "Solidity",
          5,
          101, // invalid
          ethers.ZeroHash,
          []
        )
      ).to.be.revertedWithCustomError(reputationRegistry, "InvalidScore");
    });

    it("Should revert if proficiency level invalid", async function () {
      await expect(
        reputationRegistry.connect(validator).mintSkillBadge(
          user1.address,
          "Solidity",
          0, // invalid
          95,
          ethers.ZeroHash,
          []
        )
      ).to.be.revertedWithCustomError(reputationRegistry, "InvalidScore");
    });
  });

  describe("Work Completion Recording", function () {
    beforeEach(async function () {
      await reputationRegistry.connect(validator).initializeReputation(user1.address, ["Solidity"]);
    });

    it("Should record work completion", async function () {
      await expect(
        reputationRegistry.connect(validator).recordWorkCompletion(
          user1.address,
          user2.address,
          1, // projectId
          100000000, // payment (1 USD scaled)
          90, // quality score
          ["Solidity"],
          ethers.id("deliverable-hash")
        )
      ).to.emit(reputationRegistry, "WorkCompleted");

      const history = await reputationRegistry.getWorkHistory(user1.address);
      expect(history.length).to.equal(1);
      expect(history[0].projectId).to.equal(1);
    });

    it("Should update reputation metrics after work completion", async function () {
      await reputationRegistry.connect(validator).recordWorkCompletion(
        user1.address,
        user2.address,
        1,
        100000000,
        90,
        ["Solidity"],
        ethers.id("deliverable-hash")
      );

      const reputation = await reputationRegistry.getReputationScore(user1.address);
      expect(reputation.completedProjects).to.equal(1);
      expect(reputation.totalEarnings).to.equal(100000000);
      expect(reputation.averageRating).to.equal(90);
    });
  });

  describe("Reputation Penalties", function () {
    beforeEach(async function () {
      await reputationRegistry.connect(validator).initializeReputation(user1.address, ["Solidity"]);
    });

    it("Should apply penalty to reputation", async function () {
      const initialScore = 100;
      const penalty = 20;

      await expect(
        reputationRegistry.connect(validator).penalizeReputation(
          user1.address,
          penalty,
          "Late delivery"
        )
      ).to.emit(reputationRegistry, "ReputationPenalized");

      const reputation = await reputationRegistry.getReputationScore(user1.address);
      expect(reputation.overallScore).to.equal(initialScore - penalty);
    });

    it("Should not go below zero", async function () {
      await reputationRegistry.connect(validator).penalizeReputation(
        user1.address,
        200, // more than initial score
        "Major violation"
      );

      const reputation = await reputationRegistry.getReputationScore(user1.address);
      expect(reputation.overallScore).to.equal(0);
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to pause", async function () {
      await reputationRegistry.connect(owner).pause();
      expect(await reputationRegistry.paused()).to.be.true;
    });

    it("Should not allow non-admin to pause", async function () {
      await expect(
        reputationRegistry.connect(user1).pause()
      ).to.be.reverted;
    });

    it("Should prevent operations when paused", async function () {
      await reputationRegistry.connect(owner).pause();

      await expect(
        reputationRegistry.connect(validator).initializeReputation(user1.address, ["Solidity"])
      ).to.be.revertedWithCustomError(reputationRegistry, "EnforcedPause");
    });
  });

  describe("Badge Transfers", function () {
    let badgeId: bigint;

    beforeEach(async function () {
      await reputationRegistry.connect(validator).initializeReputation(user1.address, ["Solidity"]);
      
      await reputationRegistry.connect(validator).mintSkillBadge(
        user1.address,
        "Solidity",
        5,
        95,
        ethers.ZeroHash,
        []
      );

      badgeId = 1n;
    });

    it("Should allow badge transfer", async function () {
      await expect(
        reputationRegistry.connect(user1).transferFrom(user1.address, user2.address, badgeId)
      ).to.emit(reputationRegistry, "BadgeTransferred");

      expect(await reputationRegistry.ownerOf(badgeId)).to.equal(user2.address);
    });

    it("Should emit BadgeTransferred event", async function () {
      await expect(
        reputationRegistry.connect(user1).transferFrom(user1.address, user2.address, badgeId)
      ).to.emit(reputationRegistry, "BadgeTransferred")
        .withArgs(badgeId, user1.address, user2.address);
    });
  });
});
