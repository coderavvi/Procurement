const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Institutional RBAC & Officer Accreditation", function () {
  let etendering;
  let admin, officer2, bidder1, bidder2;
  let deadline;

  beforeEach(async function () {
    [admin, officer2, bidder1, bidder2] = await ethers.getSigners();
    const ETenderingFactory = await ethers.getContractFactory("ETendering");
    etendering = await ETenderingFactory.deploy();
    await etendering.waitForDeployment();

    const latestTime = await time.latest();
    deadline = latestTime + 3600;
  });

  it("should initialize deployer as Admin and Authorized Officer", async function () {
    expect(await etendering.admin()).to.equal(admin.address);
    expect(await etendering.isAuthorizedOfficer(admin.address)).to.be.true;
    expect(await etendering.officerAgency(admin.address)).to.equal(
      "Ministry of Finance & Procurement Authority"
    );
  });

  it("should revert if an unaccredited bidder tries to create a tender", async function () {
    expect(await etendering.isAuthorizedOfficer(bidder1.address)).to.be.false;
    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("fake spec"));

    await expect(
      etendering.connect(bidder1).createTender(
        "Fake Unauthorized Tender",
        "Unauthorized scope",
        deadline,
        70,
        30,
        mockSpecHash,
        0
      )
    ).to.be.revertedWith("Caller is not an accredited procurement officer");
  });

  it("should allow Admin to authorize a new procurement officer with agency name", async function () {
    await expect(
      etendering.connect(admin).authorizeOfficer(officer2.address, "Department of Transportation")
    )
      .to.emit(etendering, "OfficerAuthorized")
      .withArgs(officer2.address, "Department of Transportation");

    expect(await etendering.isAuthorizedOfficer(officer2.address)).to.be.true;
    expect(await etendering.officerAgency(officer2.address)).to.equal(
      "Department of Transportation"
    );

    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("highway spec"));
    // Newly authorized officer can now successfully advertise tenders
    await expect(
      etendering.connect(officer2).createTender(
        "Highway Expansion 2026",
        "Interstate 4-lane expansion and paving",
        deadline,
        60,
        40,
        mockSpecHash,
        0
      )
    ).to.emit(etendering, "TenderAdvertised");
  });

  it("should revert if a non-admin attempts to authorize an officer", async function () {
    await expect(
      etendering.connect(bidder1).authorizeOfficer(bidder2.address, "Rogue Agency")
    ).to.be.revertedWith("Only admin/procurement authority allowed");
  });

  it("should allow Admin to revoke officer accreditation", async function () {
    await etendering.connect(admin).authorizeOfficer(officer2.address, "Ministry of Education");
    expect(await etendering.isAuthorizedOfficer(officer2.address)).to.be.true;

    await expect(etendering.connect(admin).revokeOfficer(officer2.address))
      .to.emit(etendering, "OfficerRevoked")
      .withArgs(officer2.address);

    expect(await etendering.isAuthorizedOfficer(officer2.address)).to.be.false;

    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("school spec"));
    // Revoked officer cannot create tenders
    await expect(
      etendering.connect(officer2).createTender("School Construction", "Building 10 classrooms", deadline, 50, 50, mockSpecHash, 0)
    ).to.be.revertedWith("Caller is not an accredited procurement officer");
  });

  it("should prevent an accredited officer from actioning on tenders created by another officer (Tender Isolation)", async function () {
    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("finance spec"));
    // Admin (Officer 1) creates Tender 1
    await etendering.connect(admin).createTender(
      "Ministry of Finance IT Project",
      "Core server migration and ERP update",
      deadline,
      70,
      30,
      mockSpecHash,
      0
    );

    // Admin accredits Officer 2 for Transportation
    await etendering.connect(admin).authorizeOfficer(officer2.address, "Department of Transportation");

    // Officer 2 attempts to open prequalification on Tender 1 (created by Admin)
    await expect(
      etendering.connect(officer2).openPrequalification(1)
    ).to.be.revertedWith("Only tender creating officer allowed");

    // Officer 2 attempts to skip prequalification on Tender 1
    await expect(
      etendering.connect(officer2).skipPrequalification(1)
    ).to.be.revertedWith("Only tender creating officer allowed");

    // Officer 2 attempts to initiate prequalification on Tender 1
    await expect(
      etendering.connect(officer2).initiatePrequalification(1, [
        { name: "CAC", minimumRequirement: "CAC Cert", requiresUpload: true },
      ])
    ).to.be.revertedWith("Only tender creating officer allowed");

    // Admin opens prequalification on Tender 1
    await etendering.connect(admin).openPrequalification(1);
    await etendering.connect(bidder1).registerBidder(1);

    // Officer 2 attempts to approve prequalification for bidder on Tender 1
    await expect(
      etendering.connect(officer2).approvePrequalification(1, bidder1.address)
    ).to.be.revertedWith("Only tender creating officer allowed");

    // Officer 2 attempts to open submission on Tender 1
    await expect(
      etendering.connect(officer2).openSubmission(1)
    ).to.be.revertedWith("Only tender creating officer allowed");
  });

  it("should prevent bidders from actioning on tenders or other bidders' bids", async function () {
    const mockSpecHash = ethers.keccak256(ethers.toUtf8Bytes("bridge spec"));
    // Admin creates Tender 1 and skips prequalification
    await etendering.connect(admin).createTender(
      "Public Works Bridge Repair",
      "Structural steel and concrete repairs",
      deadline,
      70,
      30,
      mockSpecHash,
      0
    );
    await etendering.connect(admin).skipPrequalification(1);

    // 1. Bidder 1 attempts officer actions on Tender 1
    await expect(
      etendering.connect(bidder1).openTender(1)
    ).to.be.revertedWith("Only tender creating officer allowed");

    await expect(
      etendering.connect(bidder1).submitEvaluation(1, bidder1.address, 90, 90)
    ).to.be.revertedWith("Only tender creating officer allowed");

    await expect(
      etendering.connect(bidder1).awardTender(1)
    ).to.be.revertedWith("Only tender creating officer allowed");

    // 2. Bidder 1 submits a bid
    const docHash1 = ethers.keccak256(ethers.toUtf8Bytes("Bidder1_Doc.pdf"));
    await etendering.connect(bidder1).submitBid(1, docHash1);

    // 3. Bidder 2 attempts to withdraw Bidder 1's bid
    // Bidder 2 has not submitted a bid, calling withdrawBid checks msg.sender
    await expect(
      etendering.connect(bidder2).withdrawBid(1)
    ).to.be.revertedWith("No active submitted bid to withdraw");

    // 4. Bidder 2 attempts to substitute Bidder 1's bid
    const docHash2 = ethers.keccak256(ethers.toUtf8Bytes("Bidder2_Sub.pdf"));
    await expect(
      etendering.connect(bidder2).substituteBid(1, docHash2)
    ).to.be.revertedWith("No active submitted bid to substitute");

    // 5. Procurement officer attempts to register or submit a bid
    await expect(
      etendering.connect(admin).submitBid(1, docHash1)
    ).to.be.revertedWith("Procurement officers cannot submit bids");
  });
});
