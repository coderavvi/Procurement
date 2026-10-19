const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Ensure output directories exist
const docsDir = path.join(__dirname, "../docs");
const sampleDataDir = path.join(__dirname, "../sample_data");
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
if (!fs.existsSync(sampleDataDir)) fs.mkdirSync(sampleDataDir, { recursive: true });

// Color Palette
const COLORS = {
  primary: "#0f172a",    // Slate 900
  secondary: "#0284c7",  // Sky 600
  accent: "#7c3aed",     // Violet 600
  text: "#1e293b",       // Slate 800
  lightText: "#64748b",  // Slate 500
  border: "#cbd5e1",     // Slate 300
  bgLight: "#f8fafc",    // Slate 50
  success: "#059669",    // Emerald 600
  warning: "#d97706",    // Amber 600
};

// Helper: Add standard Header & Footer
function applyDecorations(doc, title, subtitle) {
  let pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);

    // Header bar (pages > 0)
    if (i > 0) {
      doc
        .fontSize(8)
        .fillColor(COLORS.lightText)
        .text(`${title} | ${subtitle}`, 50, 25, { align: "left" });
      doc
        .moveTo(50, 38)
        .lineTo(560, 38)
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .stroke();
    }

    // Footer
    doc
      .moveTo(50, 750)
      .lineTo(560, 750)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();
    
    doc
      .fontSize(8)
      .fillColor(COLORS.lightText)
      .text(`Blockchain-Enabled E-Tendering System (PhD MVP) — Confidential Academic Research`, 50, 758, { align: "left" });
    
    doc
      .fontSize(8)
      .fillColor(COLORS.lightText)
      .text(`Page ${i + 1} of ${pages.count}`, 50, 758, { align: "right" });
  }
}

// --------------------------------------------------------------------------
// 1. PDF: REAL-WORLD ARCHITECTURE & SECURITY GUIDE
// --------------------------------------------------------------------------
function generateArchitecturePDF() {
  const filePath = path.join(docsDir, "REAL_WORLD_ARCHITECTURE_AND_SECURITY.pdf");
  const doc = new PDFDocument({ margin: 50, bufferPages: true, autoFirstPage: true });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Title Banner
  doc.rect(50, 45, 510, 85).fill(COLORS.primary);
  doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text("Blockchain-Enabled E-Tendering System", 65, 58);
  doc.fillColor("#38bdf8").fontSize(12).font("Helvetica-Bold").text("Real-World Architecture, Security Model & Production Deployment Guide", 65, 82);
  doc.fillColor("#94a3b8").fontSize(9).font("Helvetica").text("Author: PhD Research Team | Smart Contract State Machine Paradigm", 65, 102);

  doc.moveDown(4.5);

  // Section 1: Executive Summary
  doc.fillColor(COLORS.secondary).fontSize(14).font("Helvetica-Bold").text("1. Paradigm Shift: Traditional vs Blockchain Procurement");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1.5).stroke();
  doc.moveDown(0.6);

  doc.fillColor(COLORS.text).fontSize(9.5).font("Helvetica").text(
    "Traditional government procurement systems rely on centralized databases (SQL/Oracle) administered by trusted intermediaries or IT personnel. This architecture suffers from critical vulnerabilities:\n" +
    "• Post-hoc record modification: Database administrators or compromised accounts can alter timestamps, bid values, or scoring matrices.\n" +
    "• Premature bid leaks: Insider threats can open sealed bids before the official submission window expires, enabling bid-rigging and corruption.\n" +
    "• Lack of transparent auditability: Competing contractors and citizens cannot independently verify the integrity of the evaluation process without trusting the agency's internal reporting.\n\n" +
    "This research prototype introduces an immutable, decentralized state machine (Ethereum Virtual Machine / Solidity) where every stage transition—from Advertisement to Award—is cryptographically sealed and publicly verifiable."
  );

  doc.moveDown(1.2);

  // Section 2: Real-World PKI & Authentication
  doc.fillColor(COLORS.secondary).fontSize(14).font("Helvetica-Bold").text("2. Cryptographic Authentication vs Web2 Passwords");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1.5).stroke();
  doc.moveDown(0.6);

  doc.fillColor(COLORS.text).fontSize(9.5).font("Helvetica").text(
    "In Web3, user identity and authentication are built on Elliptic Curve Cryptography (ECDSA secp256k1) rather than passwords, JWT tokens, or session cookies.\n\n" +
    "• Cryptographic Signatures: Every action (e.g., creating a tender, accrediting an officer, submitting a proposal) requires a digitally signed transaction verified by consensus nodes.\n" +
    "• Non-Repudiation: Once a transaction is mined, the author's public address is permanently recorded in the immutable ledger. An officer cannot deny approving a bidder, and an evaluator cannot deny submitting a score.\n" +
    "• Smart Contract Enforcement: Permissions are enforced at the smart contract bytecode level, not by frontend UI buttons. An unauthorized wallet attempting an admin or officer function is rejected by the EVM consensus rules."
  );

  doc.addPage();

  // Section 3: Governance & Multi-Signature Security
  doc.fillColor(COLORS.secondary).fontSize(14).font("Helvetica-Bold").text("3. Production Governance: Securing the Admin Role");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1.5).stroke();
  doc.moveDown(0.6);

  // Callout Box
  doc.rect(50, doc.y, 510, 80).fill(COLORS.bgLight);
  doc.rect(50, doc.y - 80, 5, 80).fill(COLORS.accent);
  doc.fillColor(COLORS.accent).fontSize(10).font("Helvetica-Bold").text("Key Security Principle: Why Bidders Cannot Accredit Themselves", 65, doc.y - 72);
  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "In the local PhD research demo, a 1-click account switcher is provided solely for single-laptop testing. " +
    "In a production deployment, the Admin private key is strictly isolated. No bidder or unauthorized user possesses the Admin's private key, making unauthorized self-accreditation cryptographically impossible on-chain.",
    65, doc.y + 3, { width: 480 }
  );

  doc.y += 20;
  doc.moveDown(0.5);

  doc.fillColor(COLORS.text).fontSize(9.5).font("Helvetica").text(
    "In a live national procurement deployment, single-key administration is replaced by institutional governance:\n\n" +
    "1. Multi-Signature (Multi-Sig) Contracts: The `admin` role is assigned to a decentralized governance contract (such as Gnosis Safe / OpenZeppelin Governor) requiring M-of-N threshold signatures (e.g. 3 out of 5 designated ministry directors) before an officer is accredited.\n" +
    "2. Hardware Security Modules (HSM): Key material is stored inside FIPS 140-2 Level 3 certified hardware security modules or physical air-gapped hardware wallets (Ledger/Trezor).\n" +
    "3. Revocation & Accreditation Auditing: Every officer accreditation and revocation emits an on-chain event (`OfficerAuthorized` / `OfficerRevoked`), enabling public oversight of institutional authority."
  );

  doc.moveDown(1.2);

  // Section 4: Dual-Tier Architecture & File Hashing
  doc.fillColor(COLORS.secondary).fontSize(14).font("Helvetica-Bold").text("4. Off-Chain Storage & On-Chain Cryptographic Fingerprints");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1.5).stroke();
  doc.moveDown(0.6);

  doc.fillColor(COLORS.text).fontSize(9.5).font("Helvetica").text(
    "Government tender proposals frequently contain architectural drawings, structural engineering calculations, and financial spreadsheets spanning hundreds of megabytes. Storing such data on-chain is cost-prohibitive and violates confidentiality.\n\n" +
    "Dual-Tier Architecture Solution:\n" +
    "• Off-Chain Document Storage: Full PDF dossiers and engineering documents are stored in an encrypted off-chain repository (e.g. IPFS, Arweave, or Enterprise Cloud Object Storage).\n" +
    "• On-Chain Keccak-256 Fingerprinting: Before any document leaves the contractor's browser, the client computes the 32-byte Keccak-256 hash (`0x...`). Only this cryptographic fingerprint is written to the blockchain.\n" +
    "• Tamper Detection: If a contractor or corrupt insider alters a single comma, digit, or drawing in the PDF post-submission, the recomputed Keccak-256 hash immediately differs from the on-chain hash, providing instantaneous, mathematical proof of tampering."
  );

  doc.addPage();

  // Section 5: Production Deployment Roadmap
  doc.fillColor(COLORS.secondary).fontSize(14).font("Helvetica-Bold").text("5. Deployment Topology: Research MVP vs National Production");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1.5).stroke();
  doc.moveDown(0.8);

  // Comparison Table
  const tableTop = doc.y;
  const col1 = 50, col2 = 180, col3 = 370;
  
  // Header Row
  doc.rect(col1, tableTop, 510, 22).fill(COLORS.primary);
  doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
  doc.text("Dimension", col1 + 8, tableTop + 6);
  doc.text("Local PhD Research MVP", col2 + 8, tableTop + 6);
  doc.text("National Production Deployment", col3 + 8, tableTop + 6);

  const rows = [
    ["Consensus Layer", "Local Hardhat Node (Automine)", "Consortium L2 (Polygon Supernet / Besu)"],
    ["Admin Key Storage", "React State / Local Hardhat Keys", "Air-gapped Multi-Sig (3-of-5 HSMs)"],
    ["Bidder Identity", "Simulated Hardhat Wallets / MetaMask", "National e-ID / DID / Verified MetaMask"],
    ["File Repository", "Local Express Static Server", "Encrypted IPFS / Filecoin / AWS GovCloud"],
    ["Account Switching", "1-Click Switcher for rapid demo", "MetaMask / Institutional WalletConnect"],
    ["Transaction Costs", "Zero (Simulated ETH)", "Sub-cent Gas Fees (Consortium Tokens)"]
  ];

  let currentY = tableTop + 22;
  rows.forEach((r, idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.bgLight : "#ffffff";
    doc.rect(col1, currentY, 510, 20).fill(rowBg);
    doc.fillColor(COLORS.text).fontSize(8.5).font("Helvetica");
    doc.text(r[0], col1 + 8, currentY + 5, { width: 120 });
    doc.text(r[1], col2 + 8, currentY + 5, { width: 180 });
    doc.text(r[2], col3 + 8, currentY + 5, { width: 180 });
    currentY += 20;
  });

  doc.y = currentY + 25;

  // Section 6: Thesis Contributions
  doc.fillColor(COLORS.secondary).fontSize(14).font("Helvetica-Bold").text("6. Research Contributions for Thesis Write-Up");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1.5).stroke();
  doc.moveDown(0.6);

  doc.fillColor(COLORS.text).fontSize(9.5).font("Helvetica").text(
    "1. Deterministic State Machine Progression: Eliminates discretionary stage skipping or retroactive timeline alterations.\n" +
    "2. Strict Temporal Deadlines: Enforced directly through EVM block timestamps (`block.timestamp >= deadline`).\n" +
    "3. Write-Once Scoring Integrity: Prevents retroactive score manipulation after bids are unsealed.\n" +
    "4. Public Verifiable Accountability: Allows any citizen or auditor to inspect the full timeline and event signatures without relying on agency assurances."
  );

  applyDecorations(doc, "Real-World Architecture & Security Guide", "PhD Research");
  doc.end();
  return filePath;
}

// --------------------------------------------------------------------------
// 2. PDF: MANUAL TESTING GUIDE & SCORING RUBRIC
// --------------------------------------------------------------------------
function generateManualTestingGuidePDF() {
  const filePath = path.join(docsDir, "MANUAL_TESTING_GUIDE.pdf");
  const doc = new PDFDocument({ margin: 50, bufferPages: true, autoFirstPage: true });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Title Banner
  doc.rect(50, 45, 510, 85).fill(COLORS.primary);
  doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text("E-Tendering System: Manual Testing Guide", 65, 58);
  doc.fillColor("#38bdf8").fontSize(12).font("Helvetica-Bold").text("Step-by-Step Walkthrough, Scoring Rubric & Verification Case Study", 65, 82);
  doc.fillColor("#94a3b8").fontSize(9).font("Helvetica").text("Case Study: Procurement of Building Materials for New Engineering Complex", 65, 102);

  doc.moveDown(4.5);

  // Case Study Overview Box
  doc.rect(50, doc.y, 510, 68).fill(COLORS.bgLight);
  doc.rect(50, doc.y - 68, 5, 68).fill(COLORS.secondary);
  doc.fillColor(COLORS.secondary).fontSize(10).font("Helvetica-Bold").text("Research Demonstration Case Study", 65, doc.y - 60);
  doc.fillColor(COLORS.text).fontSize(8.5).font("Helvetica").text(
    "Tender Title: Procurement of High-Grade Structural Steel & Reinforced Concrete for University Engineering Complex\n" +
    "Procuring Entity: Ministry of Higher Education & Infrastructure Works\n" +
    "Evaluation Weights: Technical Evaluation = 70% | Financial Evaluation = 30%\n" +
    "Competing Contractors: Alpha Buildtech Ltd (Bidder 1) vs Beta Construction Corp (Bidder 2)",
    65, doc.y + 2, { width: 480 }
  );

  doc.y += 15;
  doc.moveDown(0.8);

  // Stage 1
  doc.fillColor(COLORS.accent).fontSize(12).font("Helvetica-Bold").text("Stage 1: Tender Advertisement (Procurement Officer)");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.moveDown(0.4);
  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "1. In the top-right account dropdown, select 'Procurement Officer / Admin (Acc #0)'.\n" +
    "2. Navigate to the 'Officer Dashboard' tab.\n" +
    "3. Click 'Advertise New Tender' button.\n" +
    "4. Enter Title: 'Procurement of High-Grade Structural Steel & Concrete (TND-2026-ENG-001)'.\n" +
    "5. Set Submission Window: '60 minutes', Technical Weight: '70%', Financial Weight: '30%'.\n" +
    "6. Click 'Advertise Tender On-Chain'. The smart contract initializes the tender in state 'Advertised' and records weights."
  );

  doc.moveDown(0.8);

  // Stage 2
  doc.fillColor(COLORS.accent).fontSize(12).font("Helvetica-Bold").text("Stage 2: Prequalification Window & Officer Approval");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.moveDown(0.4);
  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "1. In Officer Dashboard, click 'Open Prequalification Window'. State transitions to 'PrequalificationOpen'.\n" +
    "2. Switch to 'Bidder 1: Alpha Engineering Ltd (Acc #1)' in the account dropdown.\n" +
    "3. Navigate to the 'Bidder Portal' tab and click 'Register for Prequalification'.\n" +
    "4. Switch back to Officer (Acc #0) in Officer Dashboard. Locate Alpha Engineering under Registered Bidders and click 'Approve Prequalification'.\n" +
    "5. (Optional) Repeat for Bidder 2 (Beta Solutions Corp) to create competitive scoring."
  );

  doc.moveDown(0.8);

  // Stage 3
  doc.fillColor(COLORS.accent).fontSize(12).font("Helvetica-Bold").text("Stage 3: Proposal Submission & Cryptographic Hashing");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.moveDown(0.4);
  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "1. As Officer (Acc #0), click 'Open Submission Window'. State transitions to 'Submitted'.\n" +
    "2. Switch to Bidder 1 (Acc #1) and go to 'Bidder Portal'.\n" +
    "3. Under 'Upload & Submit Sealed Bid Proposal', select the sample proposal document (or click 'Generate Sample Proposal File').\n" +
    "4. Observe that the client computes the Keccak-256 hash in browser memory before uploading.\n" +
    "5. Click 'Submit Hashed Bid On-Chain'. The smart contract records the document hash and timestamp."
  );

  doc.addPage();

  // Stage 4
  doc.fillColor(COLORS.accent).fontSize(12).font("Helvetica-Bold").text("Stage 4: Tender Opening & Blockchain Fast-Forward");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.moveDown(0.4);
  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "1. Switch to Officer (Acc #0) on the Officer Dashboard.\n" +
    "2. Notice that if you attempt to open the tender before the deadline, the contract blocks the transaction.\n" +
    "3. Click the amber button: 'Fast-Forward Blockchain Time Past Deadline' (advances the local EVM clock).\n" +
    "4. Click 'Open Tender Bids'. State transitions to 'Opened'. Bids are now officially unsealed for grading."
  );

  doc.moveDown(1);

  // Stage 5: Grading Criteria & Formula Deep-Dive
  doc.fillColor(COLORS.secondary).fontSize(13).font("Helvetica-Bold").text("Stage 5: Evaluation & Mathematical Scoring Criteria");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1.5).stroke();
  doc.moveDown(0.6);

  // Formula Callout
  doc.rect(50, doc.y, 510, 50).fill(COLORS.bgLight);
  doc.rect(50, doc.y - 50, 5, 50).fill(COLORS.success);
  doc.fillColor(COLORS.success).fontSize(10).font("Helvetica-Bold").text("Smart Contract Weighted Scoring Formula", 65, doc.y - 42);
  doc.fillColor(COLORS.primary).fontSize(10).font("Helvetica-Bold").text(
    "Total Score = ( Technical Score × Weight_tech ) + ( Financial Score × Weight_fin ) / 100",
    65, doc.y + 3
  );

  doc.y += 15;
  doc.moveDown(0.5);

  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "Grading Criteria Rubric for Building Materials Procurement:\n" +
    "• Technical Evaluation (0 - 100 pts / Weight: 70%):\n" +
    "   - Compliance with Material Specifications (ASTM A992 Steel, Grade 60 Rebar, Portland Type I): 40 pts\n" +
    "   - Quality Assurance Certifications (ISO 9001:2015, Mill Test Certificates): 25 pts\n" +
    "   - Delivery Logistics, Staging Plan & Factory Lead Time (under 45 days): 20 pts\n" +
    "   - Contractor Track Record in Major Civil Infrastructure: 15 pts\n\n" +
    "• Financial Evaluation (0 - 100 pts / Weight: 30%):\n" +
    "   - Competitive Total Bid Price relative to Government Baseline Estimate: 60 pts\n" +
    "   - Payment Milestones & Retainage Terms: 25 pts\n" +
    "   - Price Validity Guarantee (90 days fixed): 15 pts\n\n" +
    "Example Evaluation Execution:\n" +
    "• Enter Technical Score: 92 | Financial Score: 88 for Alpha Buildtech.\n" +
    "• Smart Contract Calculation: (92 × 70 + 88 × 30) / 100 = 6440 + 2640 = 90.80 Total Score.\n" +
    "• Click 'Submit Evaluation On-Chain'. Note: Scores are write-once; re-evaluations revert to prevent tampering."
  );

  doc.addPage();

  // Stage 6 & 7
  doc.fillColor(COLORS.accent).fontSize(12).font("Helvetica-Bold").text("Stage 6: Automated On-Chain Tender Award");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.moveDown(0.4);
  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "1. As Officer (Acc #0), click 'Award Tender'.\n" +
    "2. The smart contract iterates over all submitted bidders, verifies that all bids have been graded, and automatically sets the winner to the contractor with the highest total score.\n" +
    "3. The winning address and score are emitted in event 'TenderAwarded'."
  );

  doc.moveDown(0.8);

  // Stage 7
  doc.fillColor(COLORS.accent).fontSize(12).font("Helvetica-Bold").text("Stage 7: Final Contract Archiving & Permanent Seal");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.moveDown(0.4);
  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "1. Under Stage 7, upload the executed Final Contract Agreement or click 'Generate Sample Final Contract File'.\n" +
    "2. Click 'Seal & Archive Tender Record On-Chain'.\n" +
    "3. The tender is now permanently locked in state 'Archived'. All subsequent write operations are rejected by the smart contract."
  );

  doc.moveDown(0.8);

  // Stage 8
  doc.fillColor(COLORS.secondary).fontSize(13).font("Helvetica-Bold").text("Public Audit Trail Verification (All Roles)");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1.5).stroke();
  doc.moveDown(0.4);
  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "1. Navigate to the 'Audit Trail' tab in the main navigation.\n" +
    "2. Select the Tender ID from the selector.\n" +
    "3. Review the complete chronological timeline from 'Advertised' to 'Archived'.\n" +
    "4. Verify that each event displays its exact block timestamp, calling wallet address, transaction hash, and document fingerprints.\n" +
    "5. Confirm that the winner and winning score match the on-chain evaluation calculation."
  );

  applyDecorations(doc, "Manual Testing Guide & Scoring Rubric", "PhD Research MVP");
  doc.end();
  return filePath;
}

// --------------------------------------------------------------------------
// 3. PDF: SAMPLE BID PROPOSAL DOCUMENT
// --------------------------------------------------------------------------
function generateSampleBidProposalPDF() {
  const filePath = path.join(sampleDataDir, "SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf");
  const doc = new PDFDocument({ margin: 50, bufferPages: true, autoFirstPage: true });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Header Banner
  doc.rect(50, 45, 510, 80).fill("#1e293b");
  doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold").text("FORMAL BID PROPOSAL & TECHNICAL DOSSIER", 65, 58);
  doc.fillColor("#38bdf8").fontSize(11).font("Helvetica-Bold").text("Contractor: Alpha Buildtech & Infrastructure Supplies Ltd", 65, 80);
  doc.fillColor("#cbd5e1").fontSize(9).font("Helvetica").text("Tender Ref: TND-2026-ENG-001 | Date: August 2026", 65, 98);

  doc.moveDown(4.2);

  // Contractor Information Table
  doc.fillColor(COLORS.secondary).fontSize(12).font("Helvetica-Bold").text("1. Bidder Profile & Corporate Accreditation");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1).stroke();
  doc.moveDown(0.4);

  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "Company Name: Alpha Buildtech & Infrastructure Supplies Ltd\n" +
    "Registration No: RC-894210-GOV | Tax ID: TIN-99201488\n" +
    "Corporate Address: Plot 14, Industrial Layout, Sector 4, Capital Territory\n" +
    "Accredited Ethereum Wallet: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Hardhat Bidder #1)\n" +
    "Quality Certifications: ISO 9001:2015 (Quality Management) & ISO 14001:2015 (Environmental)"
  );

  doc.moveDown(0.8);

  // Technical Scope & BOQ
  doc.fillColor(COLORS.secondary).fontSize(12).font("Helvetica-Bold").text("2. Technical Specifications & Bill of Quantities (BOQ)");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1).stroke();
  doc.moveDown(0.6);

  // Table
  const tableTop = doc.y;
  const c1 = 50, c2 = 90, c3 = 300, c4 = 380, c5 = 460;
  doc.rect(c1, tableTop, 510, 20).fill("#334155");
  doc.fillColor("#ffffff").fontSize(8.5).font("Helvetica-Bold");
  doc.text("Item", c1 + 5, tableTop + 5);
  doc.text("Material Description & Standards", c2 + 5, tableTop + 5);
  doc.text("Quantity", c3 + 5, tableTop + 5);
  doc.text("Unit Price", c4 + 5, tableTop + 5);
  doc.text("Total ($)", c5 + 5, tableTop + 5);

  const boq = [
    ["1", "High-Yield Deformed Rebar (Grade 60, BS 4449)", "500 MT", "$950 / MT", "$475,000"],
    ["2", "Portland Composite Cement (CEM II 42.5N, 50kg bags)", "15,000 Bags", "$11 / Bag", "$165,000"],
    ["3", "Wide Flange Structural Steel Beams (ASTM A992 / UB)", "350 MT", "$1,200 / MT", "$420,000"],
    ["4", "Washed Crushed Granite Aggregates (20mm)", "4,000 Tons", "$25 / Ton", "$100,000"],
    ["5", "Clean River Sand for Concrete Mortar", "3,500 Tons", "$18 / Ton", "$63,000"],
    ["6", "On-Site Quality Assurance Testing & Mill Certificates", "Lump Sum", "-", "$27,000"]
  ];

  let currY = tableTop + 20;
  boq.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? COLORS.bgLight : "#ffffff";
    doc.rect(c1, currY, 510, 18).fill(bg);
    doc.fillColor(COLORS.text).fontSize(8).font("Helvetica");
    doc.text(item[0], c1 + 5, currY + 4);
    doc.text(item[1], c2 + 5, currY + 4, { width: 200 });
    doc.text(item[2], c3 + 5, currY + 4);
    doc.text(item[3], c4 + 5, currY + 4);
    doc.text(item[4], c5 + 5, currY + 4);
    currY += 18;
  });

  // Total Row
  doc.rect(c1, currY, 510, 20).fill("#f1f5f9");
  doc.fillColor(COLORS.primary).fontSize(9).font("Helvetica-Bold");
  doc.text("TOTAL FIXED BID PROPOSAL PRICE:", c2 + 5, currY + 5);
  doc.text("$1,250,000 USD", c5 + 5, currY + 5);

  doc.y = currY + 28;

  // Section 3: Delivery Timeline & Warranty
  doc.fillColor(COLORS.secondary).fontSize(12).font("Helvetica-Bold").text("3. Delivery Schedule & Quality Commitments");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1).stroke();
  doc.moveDown(0.4);

  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "• Mobilization & Initial Delivery: 14 Calendar Days from Contract Award.\n" +
    "• Full Material Supply Completion: 45 Calendar Days.\n" +
    "• Staging & Storage: Covered warehouse facilities provided with moisture control for cement.\n" +
    "• Testing & Mill Certificates: Original metallurgical mill test certificates supplied per batch.\n" +
    "• Bid Price Validity: Guaranteed fixed for 90 calendar days from opening date."
  );

  doc.moveDown(0.8);

  // Signature Block
  doc.fillColor(COLORS.secondary).fontSize(12).font("Helvetica-Bold").text("4. Contractor Cryptographic Binding & Execution");
  doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor(COLORS.secondary).lineWidth(1).stroke();
  doc.moveDown(0.4);

  doc.fillColor(COLORS.text).fontSize(9).font("Helvetica").text(
    "I hereby certify that the specifications, pricing, and compliance representations contained in this proposal are binding, accurate, and submitted in accordance with the E-Tendering smart contract regulations.\n\n" +
    "Authorized Signatory: Engr. Marcus Vance, Managing Director\n" +
    "Digital Fingerprint (Keccak-256): Client computes hash upon file selection before on-chain submission."
  );

  applyDecorations(doc, "Bid Proposal Dossier: TND-2026-ENG-001", "Alpha Buildtech Ltd");
  doc.end();
  return filePath;
}

// Execute Generation
console.log("Generating documentation PDF files...");
generateArchitecturePDF();
generateManualTestingGuidePDF();
generateSampleBidProposalPDF();
console.log("All PDF files successfully generated in /docs and /sample_data directories.");
