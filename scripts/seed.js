const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("====================================================");
  console.log("Seeding ETendering Blockchain with Realistic Data...");
  console.log("====================================================");

  const signers = await ethers.getSigners();
  const officer = signers[0];
  const bidder1 = signers[1];
  const bidder2 = signers[2];
  const bidder3 = signers[3];

  console.log(`Officer Account:   ${officer.address}`);
  console.log(`Bidder 1 (Alpha):  ${bidder1.address}`);
  console.log(`Bidder 2 (Beta):   ${bidder2.address}`);
  console.log(`Bidder 3 (Gamma):  ${bidder3.address}`);

  // Deploy fresh instance if needed
  const ETenderingFactory = await ethers.getContractFactory("ETendering");
  const etendering = await ETenderingFactory.deploy();
  await etendering.waitForDeployment();
  const contractAddress = await etendering.getAddress();

  console.log(`\nDeployed ETendering to: ${contractAddress}`);

  // Save artifact
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/ETendering.sol/ETendering.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const contractData = {
    address: contractAddress,
    abi: artifact.abi,
    deployedAt: new Date().toISOString(),
    network: "localhost",
    chainId: 31337,
  };

  const clientContractsDir = path.join(__dirname, "../client/src/contracts");
  if (!fs.existsSync(clientContractsDir)) {
    fs.mkdirSync(clientContractsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(clientContractsDir, "ETendering.json"),
    JSON.stringify(contractData, null, 2)
  );

  const serverDir = path.join(__dirname, "../server");
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(serverDir, "contractInfo.json"),
    JSON.stringify(contractData, null, 2)
  );
  fs.writeFileSync(
    path.join(__dirname, "deployedAddress.json"),
    JSON.stringify({ address: contractAddress }, null, 2)
  );

  // -------------------------------------------------------------------------
  // TENDER 1: "Metropolitan Smart Traffic Grid Infrastructure 2026"
  // State: Stage 3 (Submitted) -> Ready for Officer to Open, Evaluate, Award & Archive in UI
  // -------------------------------------------------------------------------
  console.log("\n[1/3] Seeding Tender 1: Metropolitan Smart Traffic Grid (Stage: Submitted)");
  const latestTime = await time.latest();
  const deadline1 = latestTime + 600; // 10 mins from now
  const specHash1 = ethers.keccak256(ethers.toUtf8Bytes("Smart_Traffic_RFP_Specifications_v1.pdf"));
  const fee1 = ethers.parseEther("0.05"); // 0.05 ETH

  const tx1 = await etendering.connect(officer).createTender(
    "Metropolitan Smart Traffic Grid Infrastructure 2026",
    "Installation of AI traffic management, adaptive signal controllers, and emergency vehicle preemption corridors across major metropolitan arterials.",
    deadline1,
    70,
    30,
    specHash1,
    fee1
  );
  await tx1.wait();

  // Prequalification
  const criteria1 = [
    { name: "CAC registration", minimumRequirement: "Certificate of Incorporation with Corporate Affairs Commission", requiresUpload: true },
    { name: "Tax Clearance Certificate", minimumRequirement: "TCC for the preceding 3 consecutive years", requiresUpload: true },
    { name: "PENCOM Compliance Certificate", minimumRequirement: "Valid National Pension Commission compliance", requiresUpload: true },
  ];
  await etendering.connect(officer).initiatePrequalification(1, criteria1);
  await etendering.connect(bidder1).registerBidder(1);
  await etendering.connect(bidder2).registerBidder(1);
  await etendering.connect(bidder3).registerBidder(1);

  await etendering.connect(officer).approvePrequalification(1, bidder1.address);
  await etendering.connect(officer).approvePrequalification(1, bidder2.address);
  await etendering.connect(officer).approvePrequalification(1, bidder3.address);

  // Bidders purchase tender dossier
  await etendering.connect(bidder1).purchaseTenderDocument(1, { value: fee1 });
  await etendering.connect(bidder2).purchaseTenderDocument(1, { value: fee1 });
  await etendering.connect(bidder3).purchaseTenderDocument(1, { value: fee1 });

  // Set Evaluation Weights after prequalification
  await etendering.connect(officer).setEvaluationWeights(1, 70, 30);

  // Open submission & submit bids
  await etendering.connect(officer).openSubmission(1);

  const hash1 = ethers.keccak256(ethers.toUtf8Bytes("Alpha_Traffic_AI_Proposal_v1.pdf"));
  const hash2 = ethers.keccak256(ethers.toUtf8Bytes("Beta_SmartGrid_Consortium_Bid_v2.pdf"));
  const hash3 = ethers.keccak256(ethers.toUtf8Bytes("Gamma_Urban_Mobility_Proposal.pdf"));

  await etendering.connect(bidder1).submitBid(1, hash1);
  await etendering.connect(bidder2).submitBid(1, hash2);
  await etendering.connect(bidder3).submitBid(1, hash3);
  console.log("  ✓ Tender 1 seeded with 3 submitted bids (Stage 3).");

  // -------------------------------------------------------------------------
  // TENDER 2: "Renewable Solar Energy Grid Modernization"
  // State: Stage 1 (Advertised) -> Ready for Bidder registration and Prequalification demo
  // -------------------------------------------------------------------------
  console.log("\n[2/3] Seeding Tender 2: Renewable Solar Energy Grid (Stage: Advertised)");
  const deadline2 = latestTime + 86400 * 14; // 14 days
  const specHash2 = ethers.keccak256(ethers.toUtf8Bytes("Solar_Microgrid_Technical_Spec_2026.pdf"));
  const fee2 = ethers.parseEther("0.02"); // 0.02 ETH

  const tx2 = await etendering.connect(officer).createTender(
    "Renewable Solar Energy Grid Modernization",
    "Design, procurement, and deployment of 5MW commercial solar microgrid with battery energy storage system (BESS) and smart inverters.",
    deadline2,
    60,
    40,
    specHash2,
    fee2
  );
  await tx2.wait();
  console.log("  ✓ Tender 2 created in Advertised state (Stage 1).");

  // -------------------------------------------------------------------------
  // TENDER 3: "Hospital Emergency Response System & Data Network"
  // State: Stage 7 (Archived) -> Fully completed with audit trail & immutable proof
  // -------------------------------------------------------------------------
  console.log("\n[3/3] Seeding Tender 3: Hospital Emergency Network (Stage: Archived)");
  const deadline3 = latestTime + 100;
  const specHash3 = ethers.keccak256(ethers.toUtf8Bytes("Hospital_Emergency_Network_Spec.pdf"));

  const tx3 = await etendering.connect(officer).createTender(
    "Hospital Emergency Response System & Data Network",
    "High-availability telemetry, emergency triage data dispatching system, and redundant optical network linking regional medical centers.",
    deadline3,
    80,
    20,
    specHash3,
    0
  );
  await tx3.wait();

  const criteria3 = [
    { name: "CAC registration", minimumRequirement: "Certificate of Incorporation", requiresUpload: true },
    { name: "Tax Clearance Certificate", minimumRequirement: "TCC for past 3 years", requiresUpload: true },
  ];
  await etendering.connect(officer).initiatePrequalification(3, criteria3);
  await etendering.connect(bidder1).registerBidder(3);
  await etendering.connect(bidder2).registerBidder(3);
  await etendering.connect(officer).approvePrequalification(3, bidder1.address);
  await etendering.connect(officer).approvePrequalification(3, bidder2.address);

  await etendering.connect(officer).openSubmission(3);
  const docH1 = ethers.keccak256(ethers.toUtf8Bytes("Alpha_MedTech_Secure_Net.pdf"));
  const docH2 = ethers.keccak256(ethers.toUtf8Bytes("Beta_Health_Cloud_Proposal.pdf"));
  await etendering.connect(bidder1).submitBid(3, docH1);
  await etendering.connect(bidder2).submitBid(3, docH2);

  // Fast forward past deadline for Tender 3
  await time.increaseTo(deadline3 + 50);
  await etendering.connect(officer).openTender(3);

  // Evaluate bidders
  // Bidder 1: 85 * 80 + 90 * 20 = 6800 + 1800 = 8600
  // Bidder 2: 95 * 80 + 92 * 20 = 7600 + 1840 = 9440 (WINNER)
  await etendering.connect(officer).submitEvaluation(3, bidder1.address, 85, 90);
  await etendering.connect(officer).submitEvaluation(3, bidder2.address, 95, 92);

  // Award
  await etendering.connect(officer).awardTender(3);

  // Archive
  const finalDocHash3 = ethers.keccak256(
    ethers.toUtf8Bytes("Final_Certified_Award_Contract_Tender3_Signed.pdf")
  );
  await etendering.connect(officer).archiveTender(3, finalDocHash3);
  console.log("  ✓ Tender 3 completed through all 7 stages and Archived (Stage 7).");

  console.log("\n====================================================");
  console.log("Seeding Completed Successfully!");
  console.log(`Contract Address: ${contractAddress}`);
  console.log("====================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
