const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Feature 8: Tender Dossier Specifications & Tender Buying (Payable Fees)", function () {
  let etendering;
  let officer, officer2, bidder1, bidder2, nonOfficer;
  let deadline;
  const tenderFee = ethers.parseEther("0.05"); // 0.05 ETH / MON
  const specDocHash = ethers.keccak256(ethers.toUtf8Bytes("National Infrastructure RFP Dossier PDF"));
  const tenderId = 1;

  beforeEach(async function () {
    [officer, officer2, bidder1, bidder2, nonOfficer] = await ethers.getSigners();
    const ETenderingFactory = await ethers.getContractFactory("ETendering");
    etendering = await ETenderingFactory.deploy();
    await etendering.waitForDeployment();

    const latestTime = await time.latest();
    deadline = latestTime + 3600; // 1 hour

    await etendering.connect(officer).createTender(
      "National High-Speed Rail Project",
      "Civil engineering, track laying, signaling, and rolling stock procurement",
      deadline,
      70,
      30,
      specDocHash,
      tenderFee
    );
  });

  it("should record specDocHash and tenderFee upon tender creation", async function () {
    const tender = await etendering.getTender(tenderId);
    expect(tender.specDocHash).to.equal(specDocHash);
    expect(tender.tenderFee).to.equal(tenderFee);
    expect(await etendering.hasBidderPurchasedTender(tenderId, bidder1.address)).to.be.false;
  });

  it("should revert if officer tries to purchase tender documents", async function () {
    await expect(
      etendering.connect(officer).purchaseTenderDocument(tenderId, { value: tenderFee })
    ).to.be.revertedWith("Procurement officers cannot purchase tender documents");
  });

  it("should revert if bidder sends insufficient funds to purchase tender document", async function () {
    const insufficientFee = ethers.parseEther("0.02");
    await expect(
      etendering.connect(bidder1).purchaseTenderDocument(tenderId, { value: insufficientFee })
    ).to.be.revertedWith("Insufficient tender document fee sent");
  });

  it("should allow bidder to purchase tender document with exact fee and emit TenderDocumentPurchased", async function () {
    const tx = await etendering.connect(bidder1).purchaseTenderDocument(tenderId, { value: tenderFee });

    await expect(tx)
      .to.emit(etendering, "TenderDocumentPurchased")
      .withArgs(tenderId, bidder1.address, tenderFee);

    expect(await etendering.hasBidderPurchasedTender(tenderId, bidder1.address)).to.be.true;
    expect(await etendering.tenderBalances(tenderId)).to.equal(tenderFee);
  });

  it("should revert if bidder attempts to purchase the same tender document twice", async function () {
    await etendering.connect(bidder1).purchaseTenderDocument(tenderId, { value: tenderFee });

    await expect(
      etendering.connect(bidder1).purchaseTenderDocument(tenderId, { value: tenderFee })
    ).to.be.revertedWith("Tender document already purchased");
  });

  it("should block bid submission if tender has a fee and bidder has not purchased the tender dossier", async function () {
    // Skip prequal to jump directly to Submitted stage
    await etendering.connect(officer).skipPrequalification(tenderId);

    const docHash = ethers.keccak256(ethers.toUtf8Bytes("Bidder 1 Proposal"));

    // Attempting to submit bid without purchasing tender dossier
    await expect(
      etendering.connect(bidder1).submitBid(tenderId, docHash)
    ).to.be.revertedWith("Must purchase tender document before submitting bid");

    // Bidder purchases tender document
    await etendering.connect(bidder1).purchaseTenderDocument(tenderId, { value: tenderFee });

    // Now bid submission succeeds
    await expect(
      etendering.connect(bidder1).submitBid(tenderId, docHash)
    ).to.emit(etendering, "BidSubmitted");
  });

  it("should allow creating officer to withdraw accumulated tender document purchase fees", async function () {
    await etendering.connect(bidder1).purchaseTenderDocument(tenderId, { value: tenderFee });
    await etendering.connect(bidder2).purchaseTenderDocument(tenderId, { value: tenderFee });

    const totalFees = tenderFee * 2n;
    expect(await etendering.tenderBalances(tenderId)).to.equal(totalFees);

    const officerInitialBal = await ethers.provider.getBalance(officer.address);

    const tx = await etendering.connect(officer).withdrawTenderFees(tenderId);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;

    await expect(tx)
      .to.emit(etendering, "TenderFeesWithdrawn")
      .withArgs(tenderId, officer.address, totalFees);

    expect(await etendering.tenderBalances(tenderId)).to.equal(0n);

    const officerFinalBal = await ethers.provider.getBalance(officer.address);
    expect(officerFinalBal).to.equal(officerInitialBal + totalFees - gasUsed);
  });

  it("should revert if a non-creating officer or non-officer attempts to withdraw tender fees", async function () {
    await etendering.connect(bidder1).purchaseTenderDocument(tenderId, { value: tenderFee });

    await expect(
      etendering.connect(nonOfficer).withdrawTenderFees(tenderId)
    ).to.be.revertedWith("Only tender creating officer allowed");
  });
});
