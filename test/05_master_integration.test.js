const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Master Integration Test: Complete 7-Stage Lifecycle", function () {
  it("should flawlessly transition a single tender through all 7 stages from Advertisement to Archiving", async function () {
    const [officer, bidderAlpha, bidderBeta, bidderGamma] = await ethers.getSigners();

    // Deploy smart contract
    const ETenderingFactory = await ethers.getContractFactory("ETendering");
    const etendering = await ETenderingFactory.deploy();
    await etendering.waitForDeployment();

    const contractAddress = await etendering.getAddress();
    expect(contractAddress).to.properAddress;

    // -------------------------------------------------------------
    // STAGE 1: ADVERTISEMENT
    // -------------------------------------------------------------
    const latestTime = await time.latest();
    const deadline = latestTime + 3600; // 1 hour duration
    const weightTechnical = 70n;
    const weightFinancial = 30n;

    const description = "Comprehensive water purification, filtration membranes, and pump overhaul";
    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("water plant specs"));
    const createTx = await etendering.connect(officer).createTender(
      "City Water Treatment Facility Upgrade 2026",
      description,
      deadline,
      weightTechnical,
      weightFinancial,
      mockSpecHash,
      0
    );
    await expect(createTx)
      .to.emit(etendering, "TenderAdvertised")
      .withArgs(1, "City Water Treatment Facility Upgrade 2026", description, deadline, weightTechnical, weightFinancial, mockSpecHash, 0, officer.address);

    const tenderId = 1n;
    let tender = await etendering.getTender(tenderId);
    expect(tender.state).to.equal(0n); // Advertised
    expect(tender.description).to.equal(description);
    expect(tender.specDocHash).to.equal(mockSpecHash);
    expect(tender.tenderFee).to.equal(0n);

    // -------------------------------------------------------------
    // STAGE 2: PREQUALIFICATION
    // -------------------------------------------------------------
    // Officer opens prequalification
    await expect(etendering.connect(officer).openPrequalification(tenderId))
      .to.emit(etendering, "PrequalificationOpened")
      .withArgs(tenderId);

    tender = await etendering.getTender(tenderId);
    expect(tender.state).to.equal(1n); // PrequalificationOpen

    // Bidders register
    await expect(etendering.connect(bidderAlpha).registerBidder(tenderId))
      .to.emit(etendering, "BidderRegistered")
      .withArgs(tenderId, bidderAlpha.address);

    await expect(etendering.connect(bidderBeta).registerBidder(tenderId))
      .to.emit(etendering, "BidderRegistered")
      .withArgs(tenderId, bidderBeta.address);

    await expect(etendering.connect(bidderGamma).registerBidder(tenderId))
      .to.emit(etendering, "BidderRegistered")
      .withArgs(tenderId, bidderGamma.address);

    // Officer reviews & prequalifies all 3 bidders
    await expect(etendering.connect(officer).approvePrequalification(tenderId, bidderAlpha.address))
      .to.emit(etendering, "BidderPrequalified")
      .withArgs(tenderId, bidderAlpha.address);

    await expect(etendering.connect(officer).approvePrequalification(tenderId, bidderBeta.address))
      .to.emit(etendering, "BidderPrequalified")
      .withArgs(tenderId, bidderBeta.address);

    await expect(etendering.connect(officer).approvePrequalification(tenderId, bidderGamma.address))
      .to.emit(etendering, "BidderPrequalified")
      .withArgs(tenderId, bidderGamma.address);

    // -------------------------------------------------------------
    // STAGE 3: TENDER SUBMISSION
    // -------------------------------------------------------------
    // Officer opens submission window
    await expect(etendering.connect(officer).openSubmission(tenderId))
      .to.emit(etendering, "SubmissionOpened")
      .withArgs(tenderId);

    tender = await etendering.getTender(tenderId);
    expect(tender.state).to.equal(2n); // Submitted

    // Bidders calculate document hashes client-side and submit on-chain
    const hashAlpha = ethers.keccak256(ethers.toUtf8Bytes("Alpha Engineering Technical & Financial Proposal v1.0"));
    const hashBeta = ethers.keccak256(ethers.toUtf8Bytes("Beta Infrastructure Solutions Bid Packet v2.3"));
    const hashGamma = ethers.keccak256(ethers.toUtf8Bytes("Gamma Waterworks Consortium Proposal Final"));

    const subAlphaTx = await etendering.connect(bidderAlpha).submitBid(tenderId, hashAlpha);
    const subAlphaReceipt = await subAlphaTx.wait();
    const subAlphaBlock = await ethers.provider.getBlock(subAlphaReceipt.blockNumber);
    await expect(subAlphaTx)
      .to.emit(etendering, "BidSubmitted")
      .withArgs(tenderId, bidderAlpha.address, hashAlpha, subAlphaBlock.timestamp);

    const subBetaTx = await etendering.connect(bidderBeta).submitBid(tenderId, hashBeta);
    const subBetaReceipt = await subBetaTx.wait();
    const subBetaBlock = await ethers.provider.getBlock(subBetaReceipt.blockNumber);
    await expect(subBetaTx)
      .to.emit(etendering, "BidSubmitted")
      .withArgs(tenderId, bidderBeta.address, hashBeta, subBetaBlock.timestamp);

    const subGammaTx = await etendering.connect(bidderGamma).submitBid(tenderId, hashGamma);
    const subGammaReceipt = await subGammaTx.wait();
    const subGammaBlock = await ethers.provider.getBlock(subGammaReceipt.blockNumber);
    await expect(subGammaTx)
      .to.emit(etendering, "BidSubmitted")
      .withArgs(tenderId, bidderGamma.address, hashGamma, subGammaBlock.timestamp);

    const submittedBidders = await etendering.getSubmittedBidders(tenderId);
    expect(submittedBidders).to.deep.equal([
      bidderAlpha.address,
      bidderBeta.address,
      bidderGamma.address
    ]);

    // -------------------------------------------------------------
    // STAGE 4: TENDER OPENING
    // -------------------------------------------------------------
    // Fast-forward blockchain timestamp past deadline
    await time.increaseTo(deadline + 100);

    const openTx = await etendering.connect(officer).openTender(tenderId);
    const openReceipt = await openTx.wait();
    const openBlock = await ethers.provider.getBlock(openReceipt.blockNumber);

    await expect(openTx)
      .to.emit(etendering, "TenderOpened")
      .withArgs(tenderId, openBlock.timestamp);

    tender = await etendering.getTender(tenderId);
    expect(tender.state).to.equal(3n); // Opened
    expect(tender.openedTimestamp).to.equal(BigInt(openBlock.timestamp));

    // -------------------------------------------------------------
    // STAGE 5: TENDER EVALUATION
    // -------------------------------------------------------------
    // Officer evaluates all 3 bidders with technical & financial scores:
    // Scores:
    // Alpha: Tech 85, Fin 90 -> Total = (85 * 70) + (90 * 30) = 5950 + 2700 = 8650
    // Beta:  Tech 95, Fin 94 -> Total = (95 * 70) + (94 * 30) = 6650 + 2820 = 9470 (WINNER)
    // Gamma: Tech 75, Fin 80 -> Total = (75 * 70) + (80 * 30) = 5250 + 2400 = 7650

    await expect(etendering.connect(officer).submitEvaluation(tenderId, bidderAlpha.address, 85, 90))
      .to.emit(etendering, "BidEvaluated")
      .withArgs(tenderId, bidderAlpha.address, 85, 90, 8650n);

    await expect(etendering.connect(officer).submitEvaluation(tenderId, bidderBeta.address, 95, 94))
      .to.emit(etendering, "BidEvaluated")
      .withArgs(tenderId, bidderBeta.address, 95, 94, 9470n);

    await expect(etendering.connect(officer).submitEvaluation(tenderId, bidderGamma.address, 75, 80))
      .to.emit(etendering, "BidEvaluated")
      .withArgs(tenderId, bidderGamma.address, 75, 80, 7650n);

    tender = await etendering.getTender(tenderId);
    expect(tender.state).to.equal(4n); // Evaluated

    // -------------------------------------------------------------
    // STAGE 6: TENDER AWARD
    // -------------------------------------------------------------
    const awardTx = await etendering.connect(officer).awardTender(tenderId);
    await expect(awardTx)
      .to.emit(etendering, "TenderAwarded")
      .withArgs(tenderId, bidderBeta.address, 9470n);

    tender = await etendering.getTender(tenderId);
    expect(tender.state).to.equal(5n); // Awarded
    expect(tender.winner).to.equal(bidderBeta.address);
    expect(tender.winningScore).to.equal(9470n);

    // -------------------------------------------------------------
    // STAGE 7: ARCHIVING (PERMANENT IMMUTABILITY)
    // -------------------------------------------------------------
    const finalAuditHash = ethers.keccak256(
      ethers.toUtf8Bytes("Official Tender Award Contract & Evaluation Report Signed 2026")
    );

    const archiveTx = await etendering.connect(officer).archiveTender(tenderId, finalAuditHash);
    const archiveReceipt = await archiveTx.wait();
    const archiveBlock = await ethers.provider.getBlock(archiveReceipt.blockNumber);

    await expect(archiveTx)
      .to.emit(etendering, "TenderArchived")
      .withArgs(tenderId, finalAuditHash, archiveBlock.timestamp);

    tender = await etendering.getTender(tenderId);
    expect(tender.state).to.equal(6n); // Archived
    expect(tender.finalDocHash).to.equal(finalAuditHash);
    expect(tender.archivedTimestamp).to.equal(BigInt(archiveBlock.timestamp));

    // Verify all subsequent state modifications are rejected
    await expect(
      etendering.connect(officer).awardTender(tenderId)
    ).to.be.revertedWith("Tender is archived and read-only");

    await expect(
      etendering.connect(bidderAlpha).submitBid(tenderId, hashAlpha)
    ).to.be.revertedWith("Tender is archived and read-only");
  });
});
