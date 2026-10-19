const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Day 3: Stages 4–5 (Opening, Evaluation)", function () {
  let etendering;
  let officer, bidder1, bidder2, nonOfficer;
  let deadline;
  const tenderId = 1;
  const docHash1 = ethers.keccak256(ethers.toUtf8Bytes("Bidder 1 Proposal"));
  const docHash2 = ethers.keccak256(ethers.toUtf8Bytes("Bidder 2 Proposal"));

  beforeEach(async function () {
    [officer, bidder1, bidder2, nonOfficer] = await ethers.getSigners();
    const ETenderingFactory = await ethers.getContractFactory("ETendering");
    etendering = await ETenderingFactory.deploy();
    await etendering.waitForDeployment();

    const latestTime = await time.latest();
    deadline = latestTime + 3600; // 1 hour

    // Setup Stage 1: Advertised (weights: Technical 70%, Financial 30%)
    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("cloud spec"));
    await etendering.connect(officer).createTender(
      "Cloud Infrastructure Project",
      "Enterprise cloud hosting and compute cluster deployment",
      deadline,
      70,
      30,
      mockSpecHash,
      0
    );

    // Setup Stage 2: Prequalification
    await etendering.connect(officer).openPrequalification(tenderId);
    await etendering.connect(bidder1).registerBidder(tenderId);
    await etendering.connect(bidder2).registerBidder(tenderId);
    await etendering.connect(officer).approvePrequalification(tenderId, bidder1.address);
    await etendering.connect(officer).approvePrequalification(tenderId, bidder2.address);

    // Setup Stage 3: Submission
    await etendering.connect(officer).openSubmission(tenderId);
    await etendering.connect(bidder1).submitBid(tenderId, docHash1);
    await etendering.connect(bidder2).submitBid(tenderId, docHash2);
  });

  describe("Stage 4: Tender Opening", function () {
    it("should revert if officer attempts to open before the deadline", async function () {
      await expect(
        etendering.connect(officer).openTender(tenderId)
      ).to.be.revertedWith("Deadline has not yet passed");
    });

    it("should revert if non-officer attempts to open tender", async function () {
      await time.increaseTo(deadline + 10);
      await expect(
        etendering.connect(nonOfficer).openTender(tenderId)
      ).to.be.revertedWith("Only tender creating officer allowed");
    });

    it("should succeed after deadline, transition to Opened, and emit TenderOpened", async function () {
      await time.increaseTo(deadline + 60);

      const tx = await etendering.connect(officer).openTender(tenderId);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(etendering, "TenderOpened")
        .withArgs(tenderId, block.timestamp);

      const tender = await etendering.getTender(tenderId);
      expect(tender.state).to.equal(3n); // Stage.Opened
      expect(tender.openedTimestamp).to.equal(BigInt(block.timestamp));
    });
  });

  describe("Stage 5: Tender Evaluation", function () {
    it("should revert if evaluating before opening", async function () {
      // Still in Submitted stage
      await expect(
        etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 85, 90)
      ).to.be.revertedWith("Tender must be Opened or in Evaluation stage");
    });

    it("should revert if non-officer attempts to evaluate", async function () {
      await time.increaseTo(deadline + 60);
      await etendering.connect(officer).openTender(tenderId);

      await expect(
        etendering.connect(nonOfficer).submitEvaluation(tenderId, bidder1.address, 85, 90)
      ).to.be.revertedWith("Only tender creating officer allowed");
    });

    it("should revert if evaluating a bidder who did not submit a bid", async function () {
      await time.increaseTo(deadline + 60);
      await etendering.connect(officer).openTender(tenderId);

      await expect(
        etendering.connect(officer).submitEvaluation(tenderId, nonOfficer.address, 85, 90)
      ).to.be.revertedWith("Bidder has not submitted a bid");
    });

    it("should accurately compute weighted score matching hand-calculated expected value", async function () {
      await time.increaseTo(deadline + 60);
      await etendering.connect(officer).openTender(tenderId);

      // Hand Calculation:
      // Weight Tech = 70, Weight Fin = 30
      // Bidder 1: Tech = 85, Fin = 92
      // Expected totalScore = (85 * 70) + (92 * 30) = 5950 + 2760 = 8710
      const techScore = 85n;
      const finScore = 92n;
      const expectedTotalScore = (85n * 70n) + (92n * 30n); // 8710n

      const tx = await etendering.connect(officer).submitEvaluation(
        tenderId,
        bidder1.address,
        techScore,
        finScore
      );

      await expect(tx)
        .to.emit(etendering, "BidEvaluated")
        .withArgs(tenderId, bidder1.address, techScore, finScore, expectedTotalScore);

      const bidderInfo = await etendering.getBidder(tenderId, bidder1.address);
      expect(bidderInfo.evaluated).to.be.true;
      expect(bidderInfo.technicalScore).to.equal(techScore);
      expect(bidderInfo.financialScore).to.equal(finScore);
      expect(bidderInfo.totalScore).to.equal(expectedTotalScore);

      const tender = await etendering.getTender(tenderId);
      expect(tender.state).to.equal(4n); // Stage.Evaluated
    });

    it("should allow evaluating multiple submitted bidders sequentially", async function () {
      await time.increaseTo(deadline + 60);
      await etendering.connect(officer).openTender(tenderId);

      // Bidder 1: 80 * 70 + 70 * 30 = 5600 + 2100 = 7700
      await etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 80, 70);
      // Bidder 2: 90 * 70 + 85 * 30 = 6300 + 2550 = 8850
      await etendering.connect(officer).submitEvaluation(tenderId, bidder2.address, 90, 85);

      const b1 = await etendering.getBidder(tenderId, bidder1.address);
      const b2 = await etendering.getBidder(tenderId, bidder2.address);

      expect(b1.totalScore).to.equal(7700n);
      expect(b2.totalScore).to.equal(8850n);
      expect(b1.evaluated).to.be.true;
      expect(b2.evaluated).to.be.true;
    });

    it("should revert on second evaluation attempt for the same bidder (write-once)", async function () {
      await time.increaseTo(deadline + 60);
      await etendering.connect(officer).openTender(tenderId);

      await etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 80, 80);

      await expect(
        etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 90, 95)
      ).to.be.revertedWith("Bidder has already been evaluated");
    });
  });
});
