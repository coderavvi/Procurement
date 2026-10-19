const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Feature 3 & 4: Prequalification Criteria Builder, Skip, Bid Withdrawal & Substitution", function () {
  let etendering;
  let officer, bidder1, bidder2, bidder3, nonOfficer;
  let deadline;
  const tenderId = 1;

  beforeEach(async function () {
    [officer, bidder1, bidder2, bidder3, nonOfficer] = await ethers.getSigners();
    const ETenderingFactory = await ethers.getContractFactory("ETendering");
    etendering = await ETenderingFactory.deploy();
    await etendering.waitForDeployment();

    const latestTime = await time.latest();
    deadline = latestTime + 3600; // 1 hour

    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("highway rfp"));
    await etendering.connect(officer).createTender(
      "Federal Highway Rehabilitation Project",
      "Bridge reinforcement, asphalt paving, and safety barrier installation",
      deadline,
      70,
      30,
      mockSpecHash,
      0
    );
  });

  describe("Feature 3: Prequalification Builder (initiatePrequalification)", function () {
    const sampleCriteria = [
      {
        name: "CAC Registration",
        minimumRequirement: "Valid Certificate of Incorporation with Corporate Affairs Commission",
        requiresUpload: true,
      },
      {
        name: "Tax Clearance Certificate",
        minimumRequirement: "Valid TCC for past 3 consecutive assessment years",
        requiresUpload: true,
      },
      {
        name: "PENCOM Compliance Certificate",
        minimumRequirement: "Valid National Pension Commission clearance certificate",
        requiresUpload: true,
      },
      {
        name: "Minimum Annual Turnover",
        minimumRequirement: "Minimum annual turnover of 50,000,000 NGN in audited accounts",
        requiresUpload: false,
      },
    ];

    it("should store finalized criteria array of structs on-chain and move tender to PrequalificationOpen", async function () {
      const tx = await etendering.connect(officer).initiatePrequalification(tenderId, sampleCriteria);

      await expect(tx)
        .to.emit(etendering, "PrequalificationOpened")
        .withArgs(tenderId);

      await expect(tx)
        .to.emit(etendering, "PrequalificationInitiated")
        .withArgs(tenderId, sampleCriteria.length);

      const tender = await etendering.getTender(tenderId);
      expect(tender.state).to.equal(1n); // PrequalificationOpen
      expect(tender.prequalificationSkipped).to.be.false;

      const storedCriteria = await etendering.getTenderCriteria(tenderId);
      expect(storedCriteria.length).to.equal(4);
      expect(storedCriteria[0].name).to.equal("CAC Registration");
      expect(storedCriteria[0].minimumRequirement).to.equal(
        "Valid Certificate of Incorporation with Corporate Affairs Commission"
      );
      expect(storedCriteria[0].requiresUpload).to.be.true;

      expect(storedCriteria[1].name).to.equal("Tax Clearance Certificate");
      expect(storedCriteria[1].requiresUpload).to.be.true;

      expect(storedCriteria[3].name).to.equal("Minimum Annual Turnover");
      expect(storedCriteria[3].minimumRequirement).to.equal(
        "Minimum annual turnover of 50,000,000 NGN in audited accounts"
      );
      expect(storedCriteria[3].requiresUpload).to.be.false;
    });

    it("should revert if officer submits an empty criteria array without choosing skip", async function () {
      await expect(
        etendering.connect(officer).initiatePrequalification(tenderId, [])
      ).to.be.revertedWith("Criteria cannot be empty; use skipPrequalification instead");
    });

    it("should revert if any criterion has an empty name", async function () {
      const invalidCriteria = [
        {
          name: "",
          minimumRequirement: "Some requirement",
          requiresUpload: false,
        },
      ];
      await expect(
        etendering.connect(officer).initiatePrequalification(tenderId, invalidCriteria)
      ).to.be.revertedWith("Criterion name cannot be empty");
    });

    it("should revert if a non-officer attempts to initiate prequalification", async function () {
      await expect(
        etendering.connect(nonOfficer).initiatePrequalification(tenderId, sampleCriteria)
      ).to.be.revertedWith("Only tender creating officer allowed");
    });

    it("should revert if initiatePrequalification is called outside Advertised stage", async function () {
      await etendering.connect(officer).initiatePrequalification(tenderId, sampleCriteria);

      // Now in PrequalificationOpen stage, calling initiate again must revert
      await expect(
        etendering.connect(officer).initiatePrequalification(tenderId, sampleCriteria)
      ).to.be.revertedWith("Invalid stage for this action");
    });
  });

  describe("Feature 3: Skip Prequalification (skipPrequalification)", function () {
    it("should move tender directly to Submitted stage with zero criteria stored and prequalificationSkipped = true", async function () {
      const tx = await etendering.connect(officer).skipPrequalification(tenderId);

      await expect(tx)
        .to.emit(etendering, "PrequalificationSkipped")
        .withArgs(tenderId);

      await expect(tx)
        .to.emit(etendering, "SubmissionOpened")
        .withArgs(tenderId);

      const tender = await etendering.getTender(tenderId);
      expect(tender.state).to.equal(2n); // Stage.Submitted
      expect(tender.prequalificationSkipped).to.be.true;

      const storedCriteria = await etendering.getTenderCriteria(tenderId);
      expect(storedCriteria.length).to.equal(0);
    });

    it("should allow any bidder to directly submit bids without prior prequalification approval when skipped", async function () {
      await etendering.connect(officer).skipPrequalification(tenderId);

      const docHash = ethers.keccak256(ethers.toUtf8Bytes("Direct Bidder 1 Proposal"));
      const tx = await etendering.connect(bidder1).submitBid(tenderId, docHash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(etendering, "BidSubmitted")
        .withArgs(tenderId, bidder1.address, docHash, block.timestamp);

      const submitted = await etendering.getSubmittedBidders(tenderId);
      expect(submitted).to.deep.equal([bidder1.address]);

      const bidderInfo = await etendering.getBidder(tenderId, bidder1.address);
      expect(bidderInfo.hasSubmitted).to.be.true;
      expect(bidderInfo.docHash).to.equal(docHash);
    });

    it("should revert if a non-officer calls skipPrequalification", async function () {
      await expect(
        etendering.connect(nonOfficer).skipPrequalification(tenderId)
      ).to.be.revertedWith("Only tender creating officer allowed");
    });

    it("should revert if skipPrequalification is called outside Advertised stage", async function () {
      await etendering.connect(officer).skipPrequalification(tenderId);

      // Tender is now in Submitted stage
      await expect(
        etendering.connect(officer).skipPrequalification(tenderId)
      ).to.be.revertedWith("Invalid stage for this action");
    });
  });

  describe("Feature 4: Bid Withdrawal (withdrawBid)", function () {
    const docHash1 = ethers.keccak256(ethers.toUtf8Bytes("Bid Proposal 1"));
    const docHash2 = ethers.keccak256(ethers.toUtf8Bytes("Bid Proposal 2"));

    beforeEach(async function () {
      // Initiate prequalification, register and approve bidder1 & bidder2, open submission
      const criteria = [
        { name: "CAC Registration", minimumRequirement: "Certificate", requiresUpload: true },
      ];
      await etendering.connect(officer).initiatePrequalification(tenderId, criteria);
      await etendering.connect(bidder1).registerBidder(tenderId);
      await etendering.connect(bidder2).registerBidder(tenderId);
      await etendering.connect(officer).approvePrequalification(tenderId, bidder1.address);
      await etendering.connect(officer).approvePrequalification(tenderId, bidder2.address);
      await etendering.connect(officer).openSubmission(tenderId);

      await etendering.connect(bidder1).submitBid(tenderId, docHash1);
      await etendering.connect(bidder2).submitBid(tenderId, docHash2);
    });

    it("should allow bidder to withdraw submitted bid before deadline and emit BidWithdrawn", async function () {
      const tx = await etendering.connect(bidder1).withdrawBid(tenderId);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(etendering, "BidWithdrawn")
        .withArgs(tenderId, bidder1.address, block.timestamp);

      const bidderInfo = await etendering.getBidder(tenderId, bidder1.address);
      expect(bidderInfo.withdrawn).to.be.true;
      expect(bidderInfo.hasSubmitted).to.be.false;

      // Bidder 1 must NOT appear in submitted bidders list
      const submitted = await etendering.getSubmittedBidders(tenderId);
      expect(submitted).to.deep.equal([bidder2.address]);
    });

    it("should exclude withdrawn bid from officer evaluation and tender award set", async function () {
      // Bidder 1 withdraws
      await etendering.connect(bidder1).withdrawBid(tenderId);

      // Fast forward past deadline and open tender
      await time.increaseTo(deadline + 60);
      await etendering.connect(officer).openTender(tenderId);

      // Attempting to evaluate withdrawn bidder1 must revert
      await expect(
        etendering.connect(officer).submitEvaluation(tenderId, bidder1.address, 90, 90)
      ).to.be.revertedWith("Bidder has not submitted a bid");

      // Evaluating active bidder2 succeeds
      await etendering.connect(officer).submitEvaluation(tenderId, bidder2.address, 85, 90);

      // Awarding tender awards bidder2 without error
      const awardTx = await etendering.connect(officer).awardTender(tenderId);
      await expect(awardTx)
        .to.emit(etendering, "TenderAwarded")
        .withArgs(tenderId, bidder2.address, (85n * 70n) + (90n * 30n));

      const tender = await etendering.getTender(tenderId);
      expect(tender.winner).to.equal(bidder2.address);
    });

    it("should revert if bidder tries to withdraw a bid twice", async function () {
      await etendering.connect(bidder1).withdrawBid(tenderId);

      await expect(
        etendering.connect(bidder1).withdrawBid(tenderId)
      ).to.be.revertedWith("No active submitted bid to withdraw");
    });

    it("should revert if a non-submitted bidder calls withdrawBid", async function () {
      await expect(
        etendering.connect(bidder3).withdrawBid(tenderId)
      ).to.be.revertedWith("No active submitted bid to withdraw");
    });

    it("should revert if withdrawBid is attempted after the deadline has passed", async function () {
      await time.increaseTo(deadline + 10);

      await expect(
        etendering.connect(bidder1).withdrawBid(tenderId)
      ).to.be.revertedWith("Submission deadline passed");
    });

    it("should revert if withdrawBid is attempted after the tender has been opened", async function () {
      await time.increaseTo(deadline + 10);
      await etendering.connect(officer).openTender(tenderId);

      await expect(
        etendering.connect(bidder1).withdrawBid(tenderId)
      ).to.be.revertedWith("Invalid stage for this action");
    });
  });

  describe("Feature 4: Bid Substitution (substituteBid)", function () {
    const originalDocHash = ethers.keccak256(ethers.toUtf8Bytes("Original Bidder 1 Proposal v1.0"));
    const updatedDocHash = ethers.keccak256(ethers.toUtf8Bytes("Replacement Bidder 1 Proposal v2.0"));

    beforeEach(async function () {
      const criteria = [
        { name: "CAC Registration", minimumRequirement: "Certificate", requiresUpload: true },
      ];
      await etendering.connect(officer).initiatePrequalification(tenderId, criteria);
      await etendering.connect(bidder1).registerBidder(tenderId);
      await etendering.connect(officer).approvePrequalification(tenderId, bidder1.address);
      await etendering.connect(officer).openSubmission(tenderId);

      await etendering.connect(bidder1).submitBid(tenderId, originalDocHash);
    });

    it("should overwrite docHash and timestamp, emitting BidSubstituted with old and new doc hashes", async function () {
      const tx = await etendering.connect(bidder1).substituteBid(tenderId, updatedDocHash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(etendering, "BidSubstituted")
        .withArgs(tenderId, bidder1.address, originalDocHash, updatedDocHash);

      const bidderInfo = await etendering.getBidder(tenderId, bidder1.address);
      expect(bidderInfo.hasSubmitted).to.be.true;
      expect(bidderInfo.withdrawn).to.be.false;
      expect(bidderInfo.docHash).to.equal(updatedDocHash);
      expect(bidderInfo.submissionTimestamp).to.equal(BigInt(block.timestamp));
    });

    it("should revert substituteBid if doc hash is empty", async function () {
      await expect(
        etendering.connect(bidder1).substituteBid(tenderId, ethers.ZeroHash)
      ).to.be.revertedWith("Document hash cannot be empty");
    });

    it("should revert substituteBid if new hash is identical to current hash", async function () {
      await expect(
        etendering.connect(bidder1).substituteBid(tenderId, originalDocHash)
      ).to.be.revertedWith("New hash must be different from current hash");
    });

    it("should revert substituteBid if caller has not submitted a bid", async function () {
      await expect(
        etendering.connect(bidder2).substituteBid(tenderId, updatedDocHash)
      ).to.be.revertedWith("No active submitted bid to substitute");
    });

    it("should revert substituteBid if bid was already withdrawn", async function () {
      await etendering.connect(bidder1).withdrawBid(tenderId);

      await expect(
        etendering.connect(bidder1).substituteBid(tenderId, updatedDocHash)
      ).to.be.revertedWith("No active submitted bid to substitute");
    });

    it("should revert substituteBid if attempted after the submission deadline", async function () {
      await time.increaseTo(deadline + 10);

      await expect(
        etendering.connect(bidder1).substituteBid(tenderId, updatedDocHash)
      ).to.be.revertedWith("Submission deadline passed");
    });

    it("should revert substituteBid if attempted after tender opening", async function () {
      await time.increaseTo(deadline + 10);
      await etendering.connect(officer).openTender(tenderId);

      await expect(
        etendering.connect(bidder1).substituteBid(tenderId, updatedDocHash)
      ).to.be.revertedWith("Invalid stage for this action");
    });
  });
});
