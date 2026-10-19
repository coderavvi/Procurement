const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Feature 9: Delayed Evaluation Weights Allotment", function () {
  let etendering;
  let officer, bidder1, bidder2, nonOfficer;
  let deadline;
  const tenderId = 1;

  beforeEach(async function () {
    [officer, bidder1, bidder2, nonOfficer] = await ethers.getSigners();
    const ETenderingFactory = await ethers.getContractFactory("ETendering");
    etendering = await ETenderingFactory.deploy();
    await etendering.waitForDeployment();

    const latestTime = await time.latest();
    deadline = latestTime + 7200;

    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("spec doc"));
    await etendering.connect(officer).createTender(
      "Civic Infrastructure Overhaul",
      "Bridge structural rehabilitation and drainage works",
      deadline,
      50,
      50,
      mockSpecHash,
      0
    );
  });

  it("should allow creating officer to set evaluation weights in Stage 1 & 2 before opening", async function () {
    await expect(
      etendering.connect(officer).setEvaluationWeights(tenderId, 70, 30)
    )
      .to.emit(etendering, "EvaluationWeightsSet")
      .withArgs(tenderId, 70, 30);

    const tender = await etendering.getTender(tenderId);
    expect(tender.weightTechnical).to.equal(70n);
    expect(tender.weightFinancial).to.equal(30n);
  });

  it("should revert if weights do not sum to 100", async function () {
    await expect(
      etendering.connect(officer).setEvaluationWeights(tenderId, 60, 30)
    ).to.be.revertedWith("Weights must sum to 100%");
  });

  it("should revert if non-officer attempts to set weights", async function () {
    await expect(
      etendering.connect(nonOfficer).setEvaluationWeights(tenderId, 70, 30)
    ).to.be.revertedWith("Only tender creating officer allowed");
  });

  it("should revert if attempting to change weights after tender opening", async function () {
    await etendering.connect(officer).openPrequalification(tenderId);
    await etendering.connect(bidder1).registerBidder(tenderId);
    await etendering.connect(officer).approvePrequalification(tenderId, bidder1.address);
    await etendering.connect(officer).openSubmission(tenderId);

    const docHash = ethers.keccak256(ethers.toUtf8Bytes("proposal"));
    await etendering.connect(bidder1).submitBid(tenderId, docHash);

    // Fast forward past deadline and open
    await time.increaseTo(deadline + 10);
    await etendering.connect(officer).openTender(tenderId);

    // Now tender is in Stage.Opened
    await expect(
      etendering.connect(officer).setEvaluationWeights(tenderId, 80, 20)
    ).to.be.revertedWith("Cannot set weights after tender is opened");
  });
});
