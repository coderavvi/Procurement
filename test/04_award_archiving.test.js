const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Day 4: Stages 6–7 (Award, Archiving & Immutability)", function () {
  let etendering;
  let officer, bidder1, bidder2, bidder3, nonOfficer;
  let deadline;
  const tenderId = 1;
  const docHash1 = ethers.keccak256(ethers.toUtf8Bytes("Bidder 1 Tender Proposal"));
  const docHash2 = ethers.keccak256(ethers.toUtf8Bytes("Bidder 2 Tender Proposal"));
  const docHash3 = ethers.keccak256(ethers.toUtf8Bytes("Bidder 3 Tender Proposal"));
  const finalAuditHash = ethers.keccak256(ethers.toUtf8Bytes("Final Contract Audit Package"));

  beforeEach(async function () {
    [officer, bidder1, bidder2, bidder3, nonOfficer] = await ethers.getSigners();
    const ETenderingFactory = await ethers.getContractFactory("ETendering");
    etendering = await ETenderingFactory.deploy();
    await etendering.waitForDeployment();

    const latestTime = await time.latest();
    deadline = latestTime + 3600;

    // Stage 1: Advertised (60% Tech, 40% Fin)
    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("fiber spec"));
    await etendering.connect(officer).createTender(
      "National High-Speed Fiber Network",
      "Nationwide fiber-optic trunk line and metropolitan rings",
      deadline,
      60,
      40,
      mockSpecHash,
      0
    );

    // Stage 2: Prequalification
    await etendering.connect(officer).openPrequalification(tenderId);
    await etendering.connect(bidder1).registerBidder(tenderId);
    await etendering.connect(bidder2).registerBidder(tenderId);
    await etendering.connect(bidder3).registerBidder(tenderId);
    await etendering.connect(officer).approvePrequalification(tenderId, bidder1.address);
    await etendering.connect(officer).approvePrequalification(tenderId, bidder2.address);
    await etendering.connect(officer).approvePrequalification(tenderId, bidder3.address);

    // Stage 3: Submission
    await etendering.connect(officer).openSubmission(tenderId);
    await etendering.connect(bidder1).submitBid(tenderId, docHash1);
    await etendering.connect(bidder2).submitBid(tenderId, docHash2);
    await etendering.connect(bidder3).submitBid(tenderId, docHash3);

    // Stage 4: Opening
    await time.increaseTo(deadline + 60);
    await etendering.connect(officer).openTender(tenderId);
  });

  describe("Stage 6: Tender Award", function () {
    it("should revert award if any submitted bidder has not been evaluated", async function () {
      // Evaluate bidder1 only
      await etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 80, 85);

      // Attempting to award while bidder2 and bidder3 are not yet evaluated
      await expect(
        etendering.connect(officer).awardTender(tenderId)
      ).to.be.revertedWith("Not all submitted bidders have been evaluated");
    });

    it("should revert if non-officer attempts to award tender", async function () {
      await etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 80, 85);
      await etendering.connect(officer).submitEvaluation(tenderId, bidder2.address, 95, 90);
      await etendering.connect(officer).submitEvaluation(tenderId, bidder3.address, 70, 75);

      await expect(
        etendering.connect(nonOfficer).awardTender(tenderId)
      ).to.be.revertedWith("Only tender creating officer allowed");
    });

    it("should accurately select highest scoring bidder and emit TenderAwarded", async function () {
      // Hand Calculation:
      // Weight Tech = 60, Weight Fin = 40
      // Bidder 1: Tech = 80, Fin = 85 -> Score = (80 * 60) + (85 * 40) = 4800 + 3400 = 8200
      // Bidder 2: Tech = 95, Fin = 90 -> Score = (95 * 60) + (90 * 40) = 5700 + 3600 = 9300 (WINNER)
      // Bidder 3: Tech = 70, Fin = 75 -> Score = (70 * 60) + (75 * 40) = 4200 + 3000 = 7200
      await etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 80, 85);
      await etendering.connect(officer).submitEvaluation(tenderId, bidder2.address, 95, 90);
      await etendering.connect(officer).submitEvaluation(tenderId, bidder3.address, 70, 75);

      const tx = await etendering.connect(officer).awardTender(tenderId);

      await expect(tx)
        .to.emit(etendering, "TenderAwarded")
        .withArgs(tenderId, bidder2.address, 9300n);

      const tender = await etendering.getTender(tenderId);
      expect(tender.state).to.equal(5n); // Stage.Awarded
      expect(tender.winner).to.equal(bidder2.address);
      expect(tender.winningScore).to.equal(9300n);
    });

    it("should revert if awardTender is called a second time", async function () {
      await etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 80, 85);
      await etendering.connect(officer).submitEvaluation(tenderId, bidder2.address, 95, 90);
      await etendering.connect(officer).submitEvaluation(tenderId, bidder3.address, 70, 75);

      await etendering.connect(officer).awardTender(tenderId);

      // Attempting to award again
      await expect(
        etendering.connect(officer).awardTender(tenderId)
      ).to.be.revertedWith("Invalid stage for this action");
    });
  });

  describe("Stage 7: Archiving & Permanent Immutability", function () {
    beforeEach(async function () {
      await etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 80, 85);
      await etendering.connect(officer).submitEvaluation(tenderId, bidder2.address, 95, 90);
      await etendering.connect(officer).submitEvaluation(tenderId, bidder3.address, 70, 75);
      await etendering.connect(officer).awardTender(tenderId);
    });

    it("should revert archiving if final doc hash is empty", async function () {
      await expect(
        etendering.connect(officer).archiveTender(tenderId, ethers.ZeroHash)
      ).to.be.revertedWith("Final document hash cannot be empty");
    });

    it("should revert archiving if called by non-officer", async function () {
      await expect(
        etendering.connect(nonOfficer).archiveTender(tenderId, finalAuditHash)
      ).to.be.revertedWith("Only tender creating officer allowed");
    });

    it("should archive tender, store final audit hash, and emit TenderArchived", async function () {
      const tx = await etendering.connect(officer).archiveTender(tenderId, finalAuditHash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(etendering, "TenderArchived")
        .withArgs(tenderId, finalAuditHash, block.timestamp);

      const tender = await etendering.getTender(tenderId);
      expect(tender.state).to.equal(6n); // Stage.Archived
      expect(tender.finalDocHash).to.equal(finalAuditHash);
      expect(tender.archivedTimestamp).to.equal(BigInt(block.timestamp));
    });

    it("should strictly revert EVERY state-changing function once tender is archived (permanent immutability)", async function () {
      await etendering.connect(officer).archiveTender(tenderId, finalAuditHash);

      const tender = await etendering.getTender(tenderId);
      expect(tender.state).to.equal(6n); // Stage.Archived

      // 1. openPrequalification
      await expect(
        etendering.connect(officer).openPrequalification(tenderId)
      ).to.be.revertedWith("Tender is archived and read-only");

      // 2. registerBidder
      await expect(
        etendering.connect(bidder1).registerBidder(tenderId)
      ).to.be.revertedWith("Tender is archived and read-only");

      // 3. approvePrequalification
      await expect(
        etendering.connect(officer).approvePrequalification(tenderId, bidder1.address)
      ).to.be.revertedWith("Tender is archived and read-only");

      // 4. openSubmission
      await expect(
        etendering.connect(officer).openSubmission(tenderId)
      ).to.be.revertedWith("Tender is archived and read-only");

      // 5. submitBid
      await expect(
        etendering.connect(bidder1).submitBid(tenderId, docHash1)
      ).to.be.revertedWith("Tender is archived and read-only");

      // 6. openTender
      await expect(
        etendering.connect(officer).openTender(tenderId)
      ).to.be.revertedWith("Tender is archived and read-only");

      // 7. submitEvaluation
      await expect(
        etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 100, 100)
      ).to.be.revertedWith("Tender is archived and read-only");

      // 8. awardTender
      await expect(
        etendering.connect(officer).awardTender(tenderId)
      ).to.be.revertedWith("Tender is archived and read-only");

      // 9. archiveTender (cannot re-archive)
      await expect(
        etendering.connect(officer).archiveTender(tenderId, finalAuditHash)
      ).to.be.revertedWith("Tender is archived and read-only");
    });
  });
});
