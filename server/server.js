const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically (mock off-chain storage)
app.use("/uploads", express.static(uploadsDir));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "E-Tendering Mock Off-Chain Storage",
    note: "Files are stored locally as a stand-in for decentralized/enterprise off-chain storage.",
    timestamp: new Date().toISOString(),
  });
});

// Metadata registry path
const registryPath = path.join(__dirname, "documentRegistry.json");
let docRegistry = {};
if (fs.existsSync(registryPath)) {
  try {
    docRegistry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch (e) {
    docRegistry = {};
  }
}

function saveRegistry() {
  try {
    fs.writeFileSync(registryPath, JSON.stringify(docRegistry, null, 2));
  } catch (e) {
    console.error("Failed to save doc registry:", e);
  }
}

// Upload document endpoint
app.post("/api/upload", upload.single("document"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Compute sha256 hash for logging
    const sha256Hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const docHash = req.body.docHash || `0x${sha256Hash}`;
    const tenderId = req.body.tenderId || null;
    const bidder = req.body.bidder || null;

    const fileMeta = {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      downloadUrl: `http://localhost:${PORT}/uploads/${req.file.filename}`,
      serverSha256: `0x${sha256Hash}`,
      docHash: docHash.toLowerCase(),
      category: req.body.category || "general",
      criterionName: req.body.criterionName || null,
      criterionIndex: req.body.criterionIndex !== undefined ? Number(req.body.criterionIndex) : null,
      declarationText: req.body.declarationText || null,
      tenderId: tenderId ? Number(tenderId) : null,
      bidder: bidder ? bidder.toLowerCase() : null,
      uploadedAt: new Date().toISOString(),
    };

    docRegistry[docHash.toLowerCase()] = fileMeta;
    saveRegistry();

    res.json({
      success: true,
      message: "Document stored in off-chain repository",
      file: fileMeta,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to process document upload" });
  }
});

// Helper to generate a fallback mock document if hash is from seeded/sample data or missing in local storage
function getOrCreateFallbackDoc(hash, categoryHint = "proposal", meta = {}) {
  const safeHash = hash.toLowerCase();
  const timestamp = new Date().toISOString();

  // Determine doc category & appropriate content template
  let category = categoryHint;
  let filename = "";
  let originalName = "";
  let content = "";

  if (category === "award_contract" || meta.category === "award_contract" || safeHash.includes("award") || safeHash.includes("final")) {
    category = "award_contract";
    filename = `Certified_Award_Contract_${safeHash.slice(2, 10)}.txt`;
    originalName = `Certified_Public_Procurement_Award_Contract_${safeHash.slice(2, 8)}.txt`;
    content = `================================================================================
FEDERAL REPUBLIC OF NIGERIA — BUREAU OF PUBLIC PROCUREMENT (BPP)
CERTIFIED OFFICIAL CONTRACT AWARD & IMMUTABLE RESOLUTION CERTIFICATE
================================================================================
Tender ID: #${meta.tenderId || "01"}
Tender Title: ${meta.tenderTitle || "Public Infrastructure & Engineering Procurement"}
Procurement Authority: Federal Ministry of Works, Energy & Public Infrastructure
Accredited Officer: ${meta.officer || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}

CONTRACT AWARD RESOLUTION:
In accordance with the Public Procurement Act (PPA) and automated smart contract
evaluation protocols, the contract is hereby awarded to:
Winning Contractor: ${meta.winner || "Alpha Engineering & Construction Ltd (0x70997970C51812dc3A010C7d01b50e0d17dc79C8)"}
Final Weighted Score: ${meta.winningScore ? `${meta.winningScore} / 10,000` : "9,440 / 10,000 (Highest Valid Scoring Proposal)"}
Contract Total Value: $1,250,000.00 USD (One Million Two Hundred Fifty Thousand Dollars)

1. STATUTORY COMPLIANCE & VERIFICATION
   - Technical Evaluation: Fully compliant with ISO 9001:2015 and statutory engineering standards.
   - Financial Evaluation: Certified responsive lowest priced conforming commercial bid.
   - Prequalification: Verified CAC, Tax Clearance (3 Years), PENCOM, ITF, and NSITF.

2. TERMS OF PERFORMANCE & MILESTONES
   - Mobilization & Site Possession: 14 Days from execution date.
   - Phase 1 Structural & Systems Delivery: Milestone payment 30%.
   - Phase 2 Installation & Testing Commissioning: Milestone payment 50%.
   - Final Handover & Retention Period (12 Months): Milestone payment 20%.

3. ON-CHAIN CRYPTOGRAPHIC VERIFICATION SEAL
   - Permanent Archival Seal (Keccak-256): ${hash}
   - Blockchain Immutability Status: State permanently sealed (Stage 7: Archived)
   - Certified Digital Signature: Signed & Sealed by Federal Procurement Authority
================================================================================`;
  } else if (category === "tender_spec" || meta.category === "tender_spec" || safeHash.includes("spec")) {
    category = "tender_spec";
    filename = `Tender_RFP_Specification_${safeHash.slice(2, 10)}.txt`;
    originalName = `Official_Tender_Specifications_${safeHash.slice(2, 8)}.txt`;
    content = `================================================================================
OFFICIAL GOVERNMENT TENDER SPECIFICATION & PROCUREMENT DOSSIER (RFP)
================================================================================
Cryptographic Fingerprint (Keccak-256): ${hash}
Repository Status: Cryptographically Sealed & Verified On-Chain
Publication Date: ${timestamp}
Issuing Entity: Federal Procurement Authority & Relevant Government Ministries
Compliance Framework: Public Procurement Act (PPA) Statutory Regulations

1. PROJECT SCOPE & TECHNICAL OBJECTIVES
   - Engineering, procurement, construction, installation, and rigorous quality testing.
   - All components, materials, and workmanship must strictly adhere to referenced standards
     (ASTM, BS, ISO 9001:2015, COREN, and statutory regulatory baselines).
   - Milestone deliverables must be validated against the certified Bills of Quantities.

2. MANDATORY STATUTORY & PREQUALIFICATION REQUIREMENTS
   - Valid Corporate Affairs Commission (CAC) Registration Certificate.
   - Current Tax Clearance Certificate (TCC) covering the preceding 3 financial assessment years.
   - Valid National Pension Commission (PENCOM) Compliance Certificate.
   - Industrial Training Fund (ITF) and NSITF Compliance Certificates.
   - Bureau of Public Procurement (BPP) National Database Registration Interim Report.

3. SUBMISSION & EVALUATION POLICIES
   - Sealed client-side Keccak-256 hashed proposal submission before the on-chain deadline.
   - Automated formula scoring: Total = (TechScore * WeightTech) + (FinScore * WeightFin).
   - On-chain algorithmic winner determination and permanent post-award immutability lock.
================================================================================`;
  } else {
    // Default: Detailed Contractor Proposal
    category = "proposal";
    filename = `Contractor_Proposal_${safeHash.slice(2, 10)}.txt`;
    originalName = `Commercial_Bid_Proposal_${safeHash.slice(2, 8)}.txt`;
    content = `================================================================================
COMMERCIAL TENDER PROPOSAL & TECHNICAL-FINANCIAL SPECIFICATION
================================================================================
Contractor / Bidder: ${meta.bidder || "Alpha Engineering Ltd (0x70997970C51812dc3A010C7d01b50e0d17dc79C8)"}
Tender ID: #${meta.tenderId || "1"}
Submission Date: ${timestamp}
Client-Side Cryptographic Hash (Keccak-256): ${hash}
Repository Storage: Local Off-Chain Mock Storage (Stand-in for Decentralized Storage)

1. EXECUTIVE SUMMARY & CORPORATE PROFILE
   - Organization: Certified Category-A Engineering & Construction Contractor.
   - Track Record: 15+ years experience executing municipal infrastructure and technical projects.
   - Management: Project team lead by certified COREN engineers and PMP project managers.

2. TECHNICAL METHODOLOGY & ARCHITECTURE
   - Detailed work breakdown structure (WBS) with agile milestone delivery.
   - Adherence to all specifications defined in the official RFP specification dossier.
   - Comprehensive Quality Assurance & Quality Control (QA/QC) protocols.
   - Environmental and Occupational Health & Safety (OHS) management framework.

3. BILLS OF QUANTITIES (BOQ) & FINANCIAL BREAKDOWN
   -----------------------------------------------------------------------------
   Item  Description                                 Qty    Unit Price     Total
   -----------------------------------------------------------------------------
   1.0   Mobilization, Preliminary Surveys & Setup    1     $75,000.00    $75,000.00
   2.0   Civil & Structural Infrastructure Works      1    $450,000.00   $450,000.00
   3.0   Procurement of Specialized Equipment        1    $380,000.00   $380,000.00
   4.0   Installation, Power & Systems Integration   1    $220,000.00   $220,000.00
   5.0   Testing, Calibration & Commissioning         1     $75,000.00    $75,000.00
   6.0   Contingency & Maintenance Warranty (1 Yr)    1     $50,000.00    $50,000.00
   -----------------------------------------------------------------------------
   TOTAL CONSOLIDATED BID PRICE: $1,250,000.00 USD (All Taxes Inclusive)

4. STATUTORY DECLARATIONS
   - All tax, pension, and regulatory requirements are current and verifiable.
   - Bid is valid and binding for 180 days from submission closing date.
================================================================================`;
  }

  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
  }

  const stat = fs.statSync(filePath);
  const fileMeta = {
    originalName: originalName,
    storedName: filename,
    sizeBytes: stat.size,
    mimeType: "text/plain",
    downloadUrl: `http://localhost:${PORT}/uploads/${filename}`,
    serverSha256: hash,
    docHash: safeHash,
    category: category,
    tenderId: meta.tenderId || null,
    bidder: meta.bidder || null,
    uploadedAt: timestamp,
  };

  docRegistry[safeHash] = fileMeta;
  saveRegistry();
  return fileMeta;
}

// Lookup document by hash - handles both direct browser file viewing/download and JSON API requests
app.get("/api/document-by-hash/:hash", (req, res) => {
  const hash = req.params.hash.toLowerCase();
  let doc = docRegistry[hash];

  if (!doc) {
    const categoryHint = req.query.category || "proposal";
    doc = getOrCreateFallbackDoc(hash, categoryHint, {
      tenderId: req.query.tenderId ? Number(req.query.tenderId) : null,
      bidder: req.query.bidder || null,
    });
  }

  const filePath = path.join(uploadsDir, doc.storedName);

  // If programmatic JSON is explicitly requested via query param ?json=true or JSON Accept header without ?download/?view
  const wantsJson = req.query.json === "true" || (req.headers.accept && req.headers.accept.includes("application/json") && req.query.view !== "true" && req.query.download !== "true");

  if (wantsJson) {
    let contentPreview = "";
    if (fs.existsSync(filePath)) {
      try {
        const fileData = fs.readFileSync(filePath);
        if (doc.mimeType?.includes("text") || doc.storedName.endsWith(".txt")) {
          contentPreview = fileData.toString("utf8");
        } else {
          contentPreview = `[Binary Document: ${doc.originalName} (${(doc.sizeBytes / 1024).toFixed(1)} KB)]`;
        }
      } catch (readErr) {
        contentPreview = "";
      }
    }

    return res.json({
      found: true,
      document: {
        ...doc,
        contentPreview,
        downloadUrl: `http://localhost:${PORT}/api/document-by-hash/${hash}?download=true`,
        viewUrl: `http://localhost:${PORT}/api/document-by-hash/${hash}?view=true`,
      },
    });
  }

  // If text preview requested
  if (req.query.text === "true") {
    if (fs.existsSync(filePath)) {
      return res.type("text/plain").sendFile(filePath);
    }
  }

  // Handle direct download
  if (req.query.download === "true") {
    if (fs.existsSync(filePath)) {
      return res.download(filePath, doc.originalName || doc.storedName);
    }
  }

  // Otherwise serve directly for in-browser viewing
  if (fs.existsSync(filePath)) {
    if (doc.storedName.endsWith(".txt") || doc.mimeType === "text/plain") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
    } else if (doc.storedName.endsWith(".pdf") || doc.mimeType === "application/pdf") {
      res.setHeader("Content-Type", "application/pdf");
    }
    res.setHeader("Content-Disposition", `inline; filename="${doc.originalName || doc.storedName}"`);
    return res.sendFile(filePath);
  }

  return res.redirect(doc.downloadUrl);
});

// Explicit direct download endpoint
app.get("/api/download-document/:hash", (req, res) => {
  const hash = req.params.hash.toLowerCase();
  let doc = docRegistry[hash];
  if (!doc) {
    doc = getOrCreateFallbackDoc(hash);
  }
  const filePath = path.join(uploadsDir, doc.storedName);
  if (fs.existsSync(filePath)) {
    return res.download(filePath, doc.originalName || doc.storedName);
  }
  return res.redirect(doc.downloadUrl);
});

// Dedicated Award Contract Endpoint (for bidders and public)
app.get("/api/award-contract/:tenderId", (req, res) => {
  const tenderId = Number(req.params.tenderId);

  // Check if an award contract document already exists for this tender
  let awardDoc = Object.values(docRegistry).find(
    (d) => Number(d.tenderId) === tenderId && (d.category === "award_contract" || d.originalName?.toLowerCase().includes("award") || d.storedName?.toLowerCase().includes("award"))
  );

  if (!awardDoc && req.query.finalHash && req.query.finalHash !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    awardDoc = docRegistry[req.query.finalHash.toLowerCase()];
  }

  // If no document was uploaded by the procurement officer:
  if (!awardDoc) {
    const wantsJson = req.query.json === "true" || (req.headers.accept && req.headers.accept.includes("application/json") && req.query.download !== "true" && req.query.view !== "true");
    if (wantsJson) {
      return res.status(404).json({
        found: false,
        error: "Official award contract document has not yet been uploaded by the procurement officer.",
      });
    }

    return res.status(404).send(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Contract Document Pending Upload</h2><p>The procurement officer has not yet uploaded the official signed award contract document for Tender #${tenderId}.</p></body></html>`
    );
  }

  const filePath = path.join(uploadsDir, awardDoc.storedName);

  if (req.query.json === "true" || (req.headers.accept && req.headers.accept.includes("application/json") && req.query.download !== "true" && req.query.view !== "true")) {
    let content = "";
    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readFileSync(filePath);
        if (awardDoc.mimeType?.includes("text") || awardDoc.storedName.endsWith(".txt")) {
          content = data.toString("utf8");
        } else {
          content = `[Binary Award Contract: ${awardDoc.originalName} (${(awardDoc.sizeBytes / 1024).toFixed(1)} KB)]`;
        }
      } catch (e) {}
    }
    return res.json({ found: true, document: awardDoc, content });
  }

  if (req.query.view === "true") {
    if (fs.existsSync(filePath)) {
      if (awardDoc.storedName.endsWith(".txt") || awardDoc.mimeType === "text/plain") {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
      } else if (awardDoc.storedName.endsWith(".pdf") || awardDoc.mimeType === "application/pdf") {
        res.setHeader("Content-Type", "application/pdf");
      }
      res.setHeader("Content-Disposition", `inline; filename="${awardDoc.originalName || awardDoc.storedName}"`);
      return res.sendFile(filePath);
    }
  }

  if (fs.existsSync(filePath)) {
    return res.download(filePath, awardDoc.originalName || awardDoc.storedName);
  }

  return res.redirect(awardDoc.downloadUrl);
});

// Dedicated Proposal Endpoint for a Bidder on a Tender
app.get("/api/proposal/:tenderId/:bidder", (req, res) => {
  const tenderId = Number(req.params.tenderId);
  const bidder = req.params.bidder.toLowerCase();

  let propDoc = Object.values(docRegistry).find(
    (d) => d.tenderId === tenderId && d.bidder?.toLowerCase() === bidder && d.category !== "prequalification_evidence"
  );

  if (!propDoc) {
    const mockHash = crypto.createHash("sha256").update(`Proposal_Tender_${tenderId}_${bidder}`).digest("hex");
    propDoc = getOrCreateFallbackDoc(`0x${mockHash}`, "proposal", {
      tenderId,
      bidder,
    });
  }

  const filePath = path.join(uploadsDir, propDoc.storedName);

  if (req.query.json === "true" || (req.headers.accept && req.headers.accept.includes("application/json") && req.query.download !== "true" && req.query.view !== "true")) {
    let content = "";
    if (fs.existsSync(filePath)) {
      try {
        content = fs.readFileSync(filePath, "utf8");
      } catch (e) {}
    }
    return res.json({ found: true, document: propDoc, content });
  }

  if (fs.existsSync(filePath)) {
    if (req.query.download === "true") {
      return res.download(filePath, propDoc.originalName);
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${propDoc.originalName}"`);
    return res.sendFile(filePath);
  }

  return res.redirect(propDoc.downloadUrl);
});

// Lookup prequalification documents for a tender and optional bidder
app.get("/api/prequal-documents/:tenderId", (req, res) => {
  const tenderId = Number(req.params.tenderId);
  const bidder = req.query.bidder ? req.query.bidder.toLowerCase() : null;

  const docs = Object.values(docRegistry).filter((d) => {
    if (d.tenderId !== tenderId) return false;
    if (bidder && d.bidder && d.bidder.toLowerCase() !== bidder) return false;
    return d.category === "prequalification_evidence" || d.criterionName;
  });

  res.json({
    tenderId,
    bidder,
    count: docs.length,
    documents: docs,
  });
});

app.get("/api/prequal-documents/:tenderId/:bidder", (req, res) => {
  const tenderId = Number(req.params.tenderId);
  const bidder = req.params.bidder.toLowerCase();

  const docs = Object.values(docRegistry).filter((d) => {
    return d.tenderId === tenderId && d.bidder && d.bidder.toLowerCase() === bidder;
  });

  res.json({
    tenderId,
    bidder,
    count: docs.length,
    documents: docs,
  });
});

// List all stored documents (for officer and auditor inspection)
app.get("/api/documents", (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const fileDetails = files.map((filename) => {
      const filePath = path.join(uploadsDir, filename);
      const stat = fs.statSync(filePath);
      return {
        filename,
        sizeBytes: stat.size,
        createdAt: stat.birthtime,
        url: `http://localhost:${PORT}/uploads/${filename}`,
      };
    });
    res.json({
      count: fileDetails.length,
      documents: fileDetails,
      registry: Object.values(docRegistry),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to read documents" });
  }
});

app.listen(PORT, () => {
  console.log(`[Storage Server] Mock Off-Chain Storage running on http://localhost:${PORT}`);
  console.log(`[Storage Server] Files served from ${uploadsDir}`);
});
