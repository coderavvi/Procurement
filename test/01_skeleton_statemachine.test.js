const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Day 1: ETendering Skeleton & State Machine", function () {
  let etendering;
  let officer, bidder1, bidder2, nonOfficer;

  beforeEach(async function () {
    [officer, bidder1, bidder2, nonOfficer] = await ethers.getSigners();
    const ETenderingFactory = await ethers.getContractFactory("ETendering");
    etendering = await ETenderingFactory.deploy();
    await etendering.waitForDeployment();
  });

  it("should deploy with initial tenderCount of 0", async function () {
    expect(await etendering.tenderCount()).to.equal(0n);
  });

  it("(a) a new tender starts in the Advertised state (Stage 0)", async function () {
    const latestTime = await time.latest();
    const deadline = latestTime + 3600; // 1 hour in future

    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("spec doc"));
    const tx = await etendering.connect(officer).createTender(
      "Supply of IT Equipment",
      "Procurement of enterprise laptops and network switches",
      deadline,
      70,
      30,
      mockSpecHash,
      0
    );
    await tx.wait();

    expect(await etendering.tenderCount()).to.equal(1n);

    const tender = await etendering.getTender(1);
    expect(tender.id).to.equal(1n);
    expect(tender.title).to.equal("Supply of IT Equipment");
    expect(tender.description).to.equal("Procurement of enterprise laptops and network switches");
    expect(tender.deadline).to.equal(BigInt(deadline));
    expect(tender.state).to.equal(0n); // Stage.Advertised
    expect(tender.weightTechnical).to.equal(70n);
    expect(tender.weightFinancial).to.equal(30n);
    expect(tender.officer).to.equal(officer.address);
    expect(tender.specDocHash).to.equal(mockSpecHash);
    expect(tender.tenderFee).to.equal(0n);
  });

  it("(b) calling a later-stage function before its prerequisite state reverts", async function () {
    const latestTime = await time.latest();
    const deadline = latestTime + 3600;
    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("spec doc"));

    await etendering.connect(officer).createTender(
      "Supply of Medical Devices",
      "Supply and installation of ICU diagnostic equipment",
      deadline,
      60,
      40,
      mockSpecHash,
      0
    );

    // Calling submitBid in Advertised state (requires Submitted state)
    const mockHash = ethers.keccak256(ethers.toUtf8Bytes("bid proposal doc"));
    await expect(
      etendering.connect(bidder1).submitBid(1, mockHash)
    ).to.be.revertedWith("Invalid stage for this action");

    // Calling openTender in Advertised state (requires Submitted state)
    await expect(
      etendering.connect(officer).openTender(1)
    ).to.be.revertedWith("Invalid stage for this action");

    // Calling submitEvaluation in Advertised state (requires Opened/Evaluated state)
    await expect(
      etendering.connect(officer).submitEvaluation(1, bidder1.address, 85, 90)
    ).to.be.revertedWith("Tender must be Opened or in Evaluation stage");

    // Calling awardTender in Advertised state (requires Evaluated state)
    await expect(
      etendering.connect(officer).awardTender(1)
    ).to.be.revertedWith("Invalid stage for this action");

    // Calling archiveTender in Advertised state (requires Awarded state)
    await expect(
      etendering.connect(officer).archiveTender(1, mockHash)
    ).to.be.revertedWith("Invalid stage for this action");
  });

  it("(c) a non-officer calling an officer-only function reverts", async function () {
    const latestTime = await time.latest();
    const deadline = latestTime + 3600;
    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("spec doc"));

    await etendering.connect(officer).createTender(
      "Road Construction Project",
      "Asphalt overlay and drainage construction for highway",
      deadline,
      80,
      20,
      mockSpecHash,
      0
    );

    // Non-officer attempting to open prequalification
    await expect(
      etendering.connect(nonOfficer).openPrequalification(1)
    ).to.be.revertedWith("Only tender creating officer allowed");

    // Non-officer attempting to approve prequalification
    await expect(
      etendering.connect(nonOfficer).approvePrequalification(1, bidder1.address)
    ).to.be.revertedWith("Only tender creating officer allowed");

    // Non-officer attempting to open submission
    await expect(
      etendering.connect(nonOfficer).openSubmission(1)
    ).to.be.revertedWith("Only tender creating officer allowed");

    // Non-officer attempting to open tender
    await expect(
      etendering.connect(nonOfficer).openTender(1)
    ).to.be.revertedWith("Only tender creating officer allowed");

    // Non-officer attempting to submit evaluation
    await expect(
      etendering.connect(nonOfficer).submitEvaluation(1, bidder1.address, 80, 80)
    ).to.be.revertedWith("Only tender creating officer allowed");

    // Non-officer attempting to award tender
    await expect(
      etendering.connect(nonOfficer).awardTender(1)
    ).to.be.revertedWith("Only tender creating officer allowed");

    // Non-officer attempting to archive tender
    const mockHash = ethers.keccak256(ethers.toUtf8Bytes("final"));
    await expect(
      etendering.connect(nonOfficer).archiveTender(1, mockHash)
    ).to.be.revertedWith("Only tender creating officer allowed");
  });
});
