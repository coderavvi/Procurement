const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Day 2: Stages 1–3 (Advertisement, Prequalification, Submission)", function () {
  let etendering;
  let officer, bidder1, bidder2, bidder3, unregisteredUser;
  let deadline;
  const tenderId = 1;

  beforeEach(async function () {
    [officer, bidder1, bidder2, bidder3, unregisteredUser] = await ethers.getSigners();
    const ETenderingFactory = await ethers.getContractFactory("ETendering");
    etendering = await ETenderingFactory.deploy();
    await etendering.waitForDeployment();

    const latestTime = await time.latest();
    deadline = latestTime + 7200; // 2 hours
  });

  describe("Stage 1: Advertisement", function () {
    it("should successfully create tender and emit TenderAdvertised event", async function () {
      const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("solar rfp dossier"));
      await expect(
        etendering.connect(officer).createTender(
          "Solar Panel Installation Project",
          "Installation of 500kW rooftop solar array and inverters",
          deadline,
          70,
          30,
          mockSpecHash,
          0
        )
      )
        .to.emit(etendering, "TenderAdvertised")
        .withArgs(1, "Solar Panel Installation Project", "Installation of 500kW rooftop solar array and inverters", deadline, 70, 30, mockSpecHash, 0, officer.address);

      const tender = await etendering.getTender(1);
      expect(tender.state).to.equal(0n); // Advertised
      expect(tender.title).to.equal("Solar Panel Installation Project");
      expect(tender.description).to.equal("Installation of 500kW rooftop solar array and inverters");
      expect(tender.officer).to.equal(officer.address);
      expect(tender.specDocHash).to.equal(mockSpecHash);
      expect(tender.tenderFee).to.equal(0n);
    });

    it("should revert if title is empty", async function () {
      const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("solar rfp dossier"));
      await expect(
        etendering.connect(officer).createTender("", "Valid description", deadline, 70, 30, mockSpecHash, 0)
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("should revert if description is empty", async function () {
      const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("solar rfp dossier"));
      await expect(
        etendering.connect(officer).createTender("Valid Title", "", deadline, 70, 30, mockSpecHash, 0)
      ).to.be.revertedWith("Description cannot be empty");
    });

    it("should revert if deadline is in the past", async function () {
      const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("solar rfp dossier"));
      const pastDeadline = (await time.latest()) - 100;
      await expect(
        etendering.connect(officer).createTender("Past Tender", "Some description", pastDeadline, 70, 30, mockSpecHash, 0)
      ).to.be.revertedWith("Deadline must be in the future");
    });

    it("should revert if weights are 0", async function () {
      const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("solar rfp dossier"));
      await expect(
        etendering.connect(officer).createTender("Zero Weight Tender", "Some description", deadline, 0, 0, mockSpecHash, 0)
      ).to.be.revertedWith("Weights must be positive");
    });
  });

  describe("Stage 2: Prequalification", function () {
    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("solar rfp dossier"));
    beforeEach(async function () {
      await etendering.connect(officer).createTender(
        "Solar Panel Installation Project",
        "Installation of 500kW rooftop solar array and inverters",
        deadline,
        70,
        30,
        mockSpecHash,
        0
      );
    });

    it("should allow officer to open prequalification and emit PrequalificationOpened", async function () {
      await expect(etendering.connect(officer).openPrequalification(tenderId))
        .to.emit(etendering, "PrequalificationOpened")
        .withArgs(tenderId);

      const tender = await etendering.getTender(tenderId);
      expect(tender.state).to.equal(1n); // Stage.PrequalificationOpen
    });

    it("should revert if non-officer attempts to open prequalification", async function () {
      await expect(
        etendering.connect(bidder1).openPrequalification(tenderId)
      ).to.be.revertedWith("Only tender creating officer allowed");
    });

    it("should allow bidder to register and emit BidderRegistered", async function () {
      await etendering.connect(officer).openPrequalification(tenderId);

      await expect(etendering.connect(bidder1).registerBidder(tenderId))
        .to.emit(etendering, "BidderRegistered")
        .withArgs(tenderId, bidder1.address);

      const bidderInfo = await etendering.getBidder(tenderId, bidder1.address);
      expect(bidderInfo.registered).to.be.true;
      expect(bidderInfo.prequalified).to.be.false;

      const registeredList = await etendering.getRegisteredBidders(tenderId);
      expect(registeredList).to.deep.equal([bidder1.address]);
    });

    it("should revert if bidder registers twice", async function () {
      await etendering.connect(officer).openPrequalification(tenderId);
      await etendering.connect(bidder1).registerBidder(tenderId);

      await expect(
        etendering.connect(bidder1).registerBidder(tenderId)
      ).to.be.revertedWith("Bidder already registered");
    });

    it("should revert if officer tries to register as a bidder", async function () {
      await etendering.connect(officer).openPrequalification(tenderId);
      await expect(
        etendering.connect(officer).registerBidder(tenderId)
      ).to.be.revertedWith("Procurement officers cannot participate as bidders");
    });

    it("should allow officer to approve prequalification and emit BidderPrequalified", async function () {
      await etendering.connect(officer).openPrequalification(tenderId);
      await etendering.connect(bidder1).registerBidder(tenderId);

      await expect(
        etendering.connect(officer).approvePrequalification(tenderId, bidder1.address)
      )
        .to.emit(etendering, "BidderPrequalified")
        .withArgs(tenderId, bidder1.address);

      const bidderInfo = await etendering.getBidder(tenderId, bidder1.address);
      expect(bidderInfo.prequalified).to.be.true;
    });

    it("should revert if officer approves an unregistered address", async function () {
      await etendering.connect(officer).openPrequalification(tenderId);
      await expect(
        etendering.connect(officer).approvePrequalification(tenderId, unregisteredUser.address)
      ).to.be.revertedWith("Bidder is not registered");
    });

    it("should revert if officer approves an already prequalified bidder", async function () {
      await etendering.connect(officer).openPrequalification(tenderId);
      await etendering.connect(bidder1).registerBidder(tenderId);
      await etendering.connect(officer).approvePrequalification(tenderId, bidder1.address);

      await expect(
        etendering.connect(officer).approvePrequalification(tenderId, bidder1.address)
      ).to.be.revertedWith("Bidder already prequalified");
    });
  });

  describe("Stage 3: Submission", function () {
    const docHash1 = ethers.keccak256(ethers.toUtf8Bytes("Bidder 1 Proposal Content"));
    const docHash2 = ethers.keccak256(ethers.toUtf8Bytes("Bidder 2 Proposal Content"));

    beforeEach(async function () {
      const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("solar rfp dossier"));
      await etendering.connect(officer).createTender(
        "Solar Panel Installation Project",
        "Installation of 500kW rooftop solar array and inverters",
        deadline,
        70,
        30,
        mockSpecHash,
        0
      );
      await etendering.connect(officer).openPrequalification(tenderId);

      // Register bidder1 and bidder2
      await etendering.connect(bidder1).registerBidder(tenderId);
      await etendering.connect(bidder2).registerBidder(tenderId);

      // Approve only bidder1 and bidder2
      await etendering.connect(officer).approvePrequalification(tenderId, bidder1.address);
      await etendering.connect(officer).approvePrequalification(tenderId, bidder2.address);

      // Transition to Submitted stage
      await etendering.connect(officer).openSubmission(tenderId);
    });

    it("should allow prequalified bidder to submit bid on-time and emit BidSubmitted", async function () {
      const tx = await etendering.connect(bidder1).submitBid(tenderId, docHash1);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(etendering, "BidSubmitted")
        .withArgs(tenderId, bidder1.address, docHash1, block.timestamp);

      const bidderInfo = await etendering.getBidder(tenderId, bidder1.address);
      expect(bidderInfo.hasSubmitted).to.be.true;
      expect(bidderInfo.docHash).to.equal(docHash1);
      expect(bidderInfo.submissionTimestamp).to.equal(BigInt(block.timestamp));

      const submittedList = await etendering.getSubmittedBidders(tenderId);
      expect(submittedList).to.deep.equal([bidder1.address]);
    });

    it("should revert if an unregistered bidder calls submitBid", async function () {
      await expect(
        etendering.connect(unregisteredUser).submitBid(tenderId, docHash1)
      ).to.be.revertedWith("Bidder not prequalified");
    });

    it("should revert if a registered but not prequalified bidder calls submitBid", async function () {
      // bidder3 is not prequalified
      await expect(
        etendering.connect(bidder3).submitBid(tenderId, docHash1)
      ).to.be.revertedWith("Bidder not prequalified");
    });

    it("should revert if submitBid is called with empty hash", async function () {
      await expect(
        etendering.connect(bidder1).submitBid(tenderId, ethers.ZeroHash)
      ).to.be.revertedWith("Document hash cannot be empty");
    });

    it("should revert if a bidder submits twice", async function () {
      await etendering.connect(bidder1).submitBid(tenderId, docHash1);

      await expect(
        etendering.connect(bidder1).submitBid(tenderId, docHash2)
      ).to.be.revertedWith("Bid already submitted");
    });

    it("should revert if submitBid is called after the deadline", async function () {
      // Advance time beyond deadline
      await time.increaseTo(deadline + 10);

      await expect(
        etendering.connect(bidder1).submitBid(tenderId, docHash1)
      ).to.be.revertedWith("Submission deadline passed");
    });
  });
});
