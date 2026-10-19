# 🏛️ Blockchain-Enabled E-Tendering System: Complete System Documentation & Architectural Master Guide

**Document Classification:** Comprehensive Academic Research, Security Architecture, Testing Manual & Technical Reference  
**Project:** Local Proof-of-Concept & Production Specification for Decentralized Public Procurement  
**Author:** PhD Research Team  
**Smart Contract:** [`contracts/ETendering.sol`](file:///C:/Users/coderavvi/Desktop/Procurement/contracts/ETendering.sol)  
**Primary Guides Consolidated:**
* [**README.md**](file:///C:/Users/coderavvi/Desktop/Procurement/README.md)
* [**RESEARCH_MAPPING.md**](file:///C:/Users/coderavvi/Desktop/Procurement/RESEARCH_MAPPING.md)
* [**docs/REAL_WORLD_ARCHITECTURE_AND_SECURITY.md**](file:///C:/Users/coderavvi/Desktop/Procurement/docs/REAL_WORLD_ARCHITECTURE_AND_SECURITY.md) ([PDF](file:///C:/Users/coderavvi/Desktop/Procurement/docs/REAL_WORLD_ARCHITECTURE_AND_SECURITY.pdf))
* [**docs/MANUAL_TESTING_GUIDE.md**](file:///C:/Users/coderavvi/Desktop/Procurement/docs/MANUAL_TESTING_GUIDE.md) ([PDF](file:///C:/Users/coderavvi/Desktop/Procurement/docs/MANUAL_TESTING_GUIDE.pdf))
* [**docs/SAMPLE_TENDERS_AND_DATA.md**](file:///C:/Users/coderavvi/Desktop/Procurement/docs/SAMPLE_TENDERS_AND_DATA.md)
* [**sample_data/Sample_Proposal_Alpha_Buildtech.txt**](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/Sample_Proposal_Alpha_Buildtech.txt) ([PDF](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf))

---

## 📑 Table of Contents

1. [Executive Summary & Core Research Thesis](#1-executive-summary--core-research-thesis)
2. [The 7-Stage Procurement Lifecycle State Machine](#2-the-7-stage-procurement-lifecycle-state-machine)
3. [PhD Research Mapping & Enforcement Matrix](#3-phd-research-mapping--enforcement-matrix)
4. [Real-World Enterprise Architecture & Security Model](#4-real-world-enterprise-architecture--security-model)
5. [Smart Contract Technical Reference (`ETendering.sol`)](#5-smart-contract-technical-reference-etenderingsol)
6. [Step-by-Step Manual Testing & Verification Guide](#6-step-by-step-manual-testing--verification-guide)
7. [Mathematical Scoring Rubric & Grading Criteria](#7-mathematical-scoring-rubric--grading-criteria)
8. [Sample Bid Proposal Dossier & Cryptographic Binding](#8-sample-bid-proposal-dossier--cryptographic-binding)
9. [Automated Test Suite & Verification Matrix](#9-automated-test-suite--verification-matrix)
10. [Developer Operations & Quick Start Manual](#10-developer-operations--quick-start-manual)

---

## 1. Executive Summary & Core Research Thesis

Public sector procurement accounts for approximately **12% to 15% of global GDP**, representing trillions of dollars in annual public expenditures. Traditional electronic procurement (e-tendering) systems universally rely on centralized database architectures (e.g., Oracle, Microsoft SQL Server, PostgreSQL) administered by governmental ministries or contracted IT vendors. 

While centralized systems provide basic digital record-keeping, they possess fundamental structural vulnerabilities that undermine trust and integrity:

```
        TRADITIONAL CENTRALIZED E-PROCUREMENT               BLOCKCHAIN IMMUTABLE STATE MACHINE
┌──────────────────────────────────────────────────┐   ┌──────────────────────────────────────────────────┐
│  • Relational DB with superuser read/write access│   │  • Cryptographic Consensus (EVM / Solidity)      │
│  • Bid timestamps can be backdated in SQL tables │   │  • Strict on-chain time-locks (block.timestamp) │
│  • Insider leaks: bids opened before deadline    │   │  • Mathematical lock: unsealing blocked by EVM   │
│  • Scores editable retroactively after review    │   │  • Write-once score protection in contract state │
│  • Central audit logs can be cleared or altered  │   │  • Non-repudiable public event logs & hashes     │
│  • Citizens & bidders must trust agency admins   │   │  • Zero-trust verification by any auditor        │
└──────────────────────────────────────────────────┘   └──────────────────────────────────────────────────┘
```

### Core Research Claim
By implementing an immutable **Ethereum Virtual Machine (EVM) smart contract state machine** coupled with **client-side cryptographic document fingerprinting (`Keccak-256`)** and **Institutional Role-Based Access Control (RBAC)**, we eliminate trusted intermediaries. The system guarantees **zero-trust integrity, non-repudiation, strict chronological enforcement, and mathematical auditability** across every stage of the procurement lifecycle.

---

## 2. The 7-Stage Procurement Lifecycle State Machine

The procurement lifecycle is modeled as a deterministic, finite state machine implemented in [`contracts/ETendering.sol`](file:///C:/Users/coderavvi/Desktop/Procurement/contracts/ETendering.sol#L13-L21). The state machine enforces strict linear progression with no skips or regressions:

```
┌─────────────────┐     ┌───────────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. Advertised   │ ──> │ 2. Prequalification   │ ──> │ 3. Submitted    │ ──> │ 4. Opened       │
└─────────────────┘     └───────────────────────┘     └─────────────────┘     └─────────────────┘
                                                                                       │
┌─────────────────┐     ┌───────────────────────┐     ┌─────────────────┐              ▼
│ 7. Archived     │ <── │ 6. Awarded            │ <── │ 5. Evaluated    │ <────────────┘
│ (Locked-Forever)│     └───────────────────────┘     └─────────────────┘
└─────────────────┘
```

### Detailed Breakdown by Stage

#### Stage 1: Advertisement (`Stage.Advertised`)
* **Purpose:** An accredited procurement officer publishes a tender notice specifying the title, submission deadline, technical evaluation weight ($W_{\text{tech}}$), and financial evaluation weight ($W_{\text{fin}}$).
* **Solidity Function:** `createTender(string _title, uint256 _deadline, uint256 _weightTechnical, uint256 _weightFinancial)`
* **Enforcements & Constraints:**
  * Only whitelisted government officers can execute (`onlyAccreditedOfficer`).
  * Deadline must be strictly in the future (`_deadline > block.timestamp`).
  * Weights must be positive numbers (`_weightTechnical + _weightFinancial > 0`).
  * Tender title cannot be empty (`bytes(_title).length > 0`).
* **State Event:** Emits `TenderAdvertised(tenderId, title, deadline, weightTech, weightFin, officer)`.

#### Stage 2: Prequalification (`Stage.PrequalificationOpen`)
* **Purpose:** Contractors register their cryptographic identity (Ethereum wallet address) to declare intent to bid. The procurement officer reviews company credentials and approves qualified contractors.
* **Solidity Functions:**
  * `openPrequalification(uint256 _tenderId)` (Officer only, transitions from `Advertised`)
  * `registerBidder(uint256 _tenderId)` (Called by bidder wallet)
  * `approvePrequalification(uint256 _tenderId, address _bidder)` (Officer only)
* **Enforcements & Constraints:**
  * Non-officers cannot open prequalification or approve bidders (`onlyOfficer`).
  * Bidders cannot register multiple times for the same tender.
  * The tender officer is strictly blocked from registering as a bidder (preventing conflict of interest).
  * Unregistered addresses cannot be approved.
* **State Events:** Emits `PrequalificationOpened`, `BidderRegistered`, and `BidderPrequalified`.

#### Stage 3: Tender Submission (`Stage.Submitted`)
* **Purpose:** Prequalified contractors upload their technical and commercial dossiers. The browser computes the 32-byte Keccak-256 hash client-side before sending the file to off-chain storage; only the cryptographic fingerprint is committed on-chain.
* **Solidity Functions:**
  * `openSubmission(uint256 _tenderId)` (Officer only, transitions from `PrequalificationOpen`)
  * `submitBid(uint256 _tenderId, bytes32 _docHash)` (Prequalified bidder only)
* **Enforcements & Constraints:**
  * Only bidders with `prequalified == true` can submit.
  * Reverts if EVM clock exceeds deadline (`block.timestamp <= deadline`).
  * Document hash cannot be empty (`_docHash != bytes32(0)`).
  * Single-bid enforcement: bidders cannot overwrite or resubmit bids (`!hasSubmitted`).
* **State Events:** Emits `SubmissionOpened` and `BidSubmitted(tenderId, bidder, docHash, timestamp)`.

#### Stage 4: Tender Opening (`Stage.Opened`)
* **Purpose:** After the deadline has elapsed, the officer unseals the tender, permanently stamping the opening time and making all submitted document hashes available for evaluation.
* **Solidity Function:** `openTender(uint256 _tenderId)`
* **Enforcements & Constraints:**
  * Strict EVM temporal gate: Reverts if called before deadline (`block.timestamp >= deadline`).
  * Only the designated tender officer can execute (`onlyOfficer`).
  * Must be in `Submitted` stage.
* **State Event:** Emits `TenderOpened(tenderId, openedTimestamp)`.

#### Stage 5: Tender Evaluation (`Stage.Evaluated`)
* **Purpose:** The procurement committee assesses technical compliance and commercial pricing, entering scores on a scale of 0 to 100 for each contractor.
* **Solidity Function:** `submitEvaluation(uint256 _tenderId, address _bidder, uint256 _technicalScore, uint256 _financialScore)`
* **Mathematical Formula:**
  $$\text{Total Score} = (\text{Technical Score} \times W_{\text{tech}}) + (\text{Financial Score} \times W_{\text{fin}})$$
* **Enforcements & Constraints:**
  * Only the designated officer can submit scores.
  * Bidder must have submitted a valid bid (`bidders[_tenderId][_bidder].hasSubmitted == true`).
  * **Write-Once Scoring Guarantee:** Reverts if the bidder has already been evaluated (`!bidders[_tenderId][_bidder].evaluated`). Scores cannot be edited after submission.
* **State Event:** Emits `BidEvaluated(tenderId, bidder, techScore, finScore, totalScore)`.

#### Stage 6: Tender Award (`Stage.Awarded`)
* **Purpose:** The smart contract algorithmically evaluates all submitted bids and awards the contract to the highest-scoring contractor without manual intervention.
* **Solidity Function:** `awardTender(uint256 _tenderId)`
* **Enforcements & Constraints:**
  * Reverts if any submitted bidder remains unevaluated (prevents biased partial evaluations).
  * Reverts if zero bids were submitted.
  * Winner is determined on-chain: `winner = argmax(totalScore)`.
  * Cannot be called multiple times.
* **State Event:** Emits `TenderAwarded(tenderId, winner, winningScore)`.

#### Stage 7: Archiving & Permanent Seal (`Stage.Archived`)
* **Purpose:** The officer records the cryptographic hash of the final signed contract / audit dossier and locks the tender record permanently.
* **Solidity Function:** `archiveTender(uint256 _tenderId, bytes32 _finalDocHash)`
* **Enforcements & Constraints:**
  * Final document hash cannot be zero (`_finalDocHash != bytes32(0)`).
  * Must be in `Awarded` stage.
  * **Permanent Immutability Lock:** The `notArchived` modifier permanently reverts any subsequent state-changing transaction on this tender record.
* **State Event:** Emits `TenderArchived(tenderId, finalDocHash, timestamp)`.

---

## 3. PhD Research Mapping & Enforcement Matrix

This matrix correlates each stage with its smart contract functions, cryptographic mechanisms, security rules, and formal defense properties.

| Stage | Process Name | On-Chain Function | Cryptographic / Smart Contract Mechanism | Revert & Security Rules Enforced |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Advertisement & RBAC** | `createTender`<br>`authorizeOfficer`<br>`revokeOfficer` | • **Institutional RBAC:** Only accredited officer addresses can create tenders.<br>• Initializes immutable record on EVM.<br>• State set strictly to `Stage.Advertised`. | • Non-officers revert: `require(isAuthorizedOfficer[msg.sender])`.<br>• Future deadline: `deadline > block.timestamp`.<br>• Positive weights: `weightTech + weightFin > 0`. |
| **2** | **Prequalification** | `openPrequalification`<br>`registerBidder`<br>`approvePrequalification` | • State gate: `Advertised ➔ PrequalificationOpen`.<br>• Bidders bind wallet address.<br>• Officer signs approval flag (`prequalified = true`). | • Non-officer cannot approve (`onlyOfficer`).<br>• Duplicate registration reverts.<br>• Officer cannot register as bidder. |
| **3** | **Submission** | `openSubmission`<br>`submitBid` | • State gate: `PrequalificationOpen ➔ Submitted`.<br>• **Client-Side Hashing:** `Keccak-256` computed in browser.<br>• Off-chain document storage; only 32-byte hash written on-chain.<br>• EVM block timestamp binding. | • Unprequalified callers revert.<br>• Deadline gate: `block.timestamp <= deadline`.<br>• Zero-hash rejected.<br>• Double submission rejected. |
| **4** | **Opening** | `openTender` | • State transition: `Submitted ➔ Opened`.<br>• EVM block clock comparison prevents premature unsealing. | • Reverts if called before deadline (`block.timestamp < deadline`).<br>• Non-officer reverts (`onlyOfficer`). |
| **5** | **Evaluation** | `submitEvaluation` | • State transition: `Opened ➔ Evaluated`.<br>• **Deterministic Formula:** $(\text{Tech} \times W_{\text{tech}}) + (\text{Fin} \times W_{\text{fin}})$.<br>• **Write-Once Scoring:** Score locked upon first write. | • Reverts if bidder did not submit.<br>• Reverts if bidder already evaluated.<br>• Non-officer reverts. |
| **6** | **Award** | `awardTender` | • State transition: `Evaluated ➔ Awarded`.<br>• **On-Chain Winner Selection:** Smart contract programmatically iterates and selects `winner = argmax(totalScore)`. | • Reverts if any bidder is unevaluated.<br>• Reverts if no submitted bids.<br>• Non-officer reverts. |
| **7** | **Archiving** | `archiveTender` | • Final state: `Awarded ➔ Archived`.<br>• Binds final contract Keccak-256 fingerprint.<br>• **Permanent Immutability Lock:** All future state mutations revert. | • Reverts if final hash is zero.<br>• Reverts if called prior to `Awarded`.<br>• **All future transactions revert.** |

### Threat Model & Mitigations Tested in Hardhat

```
┌───────────────────────────────┬───────────────────────────────────┬───────────────────────────────────────────┐
│ Threat Vector                 │ Traditional Centralized Weakness  │ Smart Contract Mitigation (Verified)      │
├───────────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Unauthorized Tender Creation  │ Rogue actors create fake tenders  │ isAuthorizedOfficer[msg.sender] gate      │
│ Backdated Bids                │ DB admins alter timestamps        │ block.timestamp > deadline reverts        │
│ Premature Bid Opening         │ Insiders leak prices early        │ block.timestamp < deadline reverts        │
│ Score Tampering               │ Scores changed after unsealing    │ b.evaluated == true write-once lock       │
│ Favoritism in Award           │ Discretionary manual award        │ argmax(totalScore) calculated in contract │
│ Post-Award Alterations        │ Contract modified post-award      │ notArchived modifier locks contract       │
└───────────────────────────────┴───────────────────────────────────┴───────────────────────────────────────────┘
```

---

## 4. Real-World Enterprise Architecture & Security Model

### 4.1 Cryptographic Authentication via PKI (ECDSA secp256k1)
In this decentralized architecture, standard Web2 authentication (usernames, passwords, session tokens) is replaced by **Public Key Infrastructure (PKI)** using Elliptic Curve Digital Signatures:
* Every user interaction is an ECDSA-signed Ethereum transaction.
* The EVM recovers the public key and determines the caller address (`msg.sender`) automatically.
* **Non-Repudiation:** Once mined into a block, an actor cannot deny their action. An officer cannot claim they did not approve a vendor, and an evaluator cannot claim they entered different scores.

### 4.2 Multi-Signature Governance in Production
In a live government deployment, administrative authority is not held in a single wallet. It is governed by a **Multi-Signature Smart Contract** (e.g., Gnosis Safe) requiring $M$-of-$N$ threshold approvals (e.g., 3-of-5 ministry officials using Hardware Security Modules):

```
┌────────────────────────────────────────────────────────┐
│             Central Procurement Authority              │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐│
│ │ Director Gen.  │ │ Chief Auditor  │ │ Legal Counsel  ││
│ │ (Hardware Key) │ │ (Hardware Key) │ │ (Hardware Key) ││
│ └───────┬────────┘ └───────┬────────┘ └───────┬────────┘│
└─────────┼──────────────────┼──────────────────┼────────┘
          ▼                  ▼                  ▼
    ┌─────────────────────────────────────────────────┐
    │       Multi-Sig Smart Contract (3-of-5)         │
    │   • Proposes: "Accredit Officer 0x15d3..."      │
    │   • Threshold Met (3 Approvals Received)        │
    │   • Calls ETendering.authorizeOfficer(...)      │
    └────────────────────────┬────────────────────────┘
                             ▼
    ┌─────────────────────────────────────────────────┐
    │             ETendering Smart Contract           │
    │   • Officer permanently accredited on-chain     │
    │   • Emits event OfficerAuthorized               │
    └─────────────────────────────────────────────────┘
```

### 4.3 Dual-Tier Off-Chain Storage Architecture

Public procurement documents (blueprints, detailed BOQs, engineering certifications) often range from tens to hundreds of megabytes. Storing raw binary files directly on the Ethereum blockchain is computationally impractical and exposes commercial secrets publicly.

The system implements a **dual-tier storage model**:
1. **Encrypted Off-Chain Tier:** The full PDF/CAD document is stored in an encrypted off-chain repository (e.g., Private IPFS Cluster, Enterprise Cloud Storage, or AWS GovCloud).
2. **On-Chain Cryptographic Tier:** The client-side browser reads the file buffer and calculates the 32-byte **Keccak-256 hash** before transmitting the file. Only this 32-byte hash and block timestamp are committed to the blockchain.

$$\text{Document Hash} = \text{Keccak-256}(\text{Raw File Bytes})$$

```
┌────────────────────────────────────────┐
│             Bidder Browser             │
│  1. Selects Proposal PDF               │
│  2. Calculates Keccak-256 Hash locally │
└───────┬────────────────────────┬───────┘
        │ Raw PDF                │ 32-Byte Hash
        ▼                        ▼
┌─────────────────┐    ┌──────────────────────────────────┐
│ Off-Chain Store │    │     Ethereum Smart Contract      │
│ (IPFS / Cloud)  │    │  submitBid(tenderId, docHash)    │
└─────────────────┘    └──────────────────────────────────┘
```

#### Mathematical Tamper Detection (Avalanche Effect)
The Keccak-256 cryptographic hash function guarantees that changing even a single byte or character in the off-chain PDF produces a completely different 256-bit hash. 

If any participant (including database administrators or cloud providers) modifies a document after submission:
$$\text{Keccak-256}(\text{Modified Document}) \neq \text{Stored On-Chain Hash}$$
The mismatch provides **irrefutable mathematical proof of tampering**.

### 4.4 Architectural Topology Comparison

| Dimension | PhD Research MVP (`localhost`) | National Enterprise Deployment |
| :--- | :--- | :--- |
| **Blockchain Network** | Hardhat Local EVM (Node.js) | Consortium L2 (Polygon Besu / Hyperledger Besu) |
| **Consensus Mechanism** | Instant Automine | Proof of Authority (PoA) / IBFT 2.0 |
| **Admin Identity** | Hardhat Account #0 | Multi-Sig Smart Contract (3-of-5 HSMs) |
| **Bidder Identity** | Simulated Test Accounts | National Corporate e-ID / Decentralized Identifiers (DID) |
| **Off-Chain Storage** | Local Express Static Storage (Port 3001) | Private IPFS Cluster / S3 GovCloud |
| **Gas Economics** | Free Local Test Ether | Gas-Free Meta-Transactions / Subsidized Relay |

---

## 5. Smart Contract Technical Reference (`ETendering.sol`)

The complete Solidity contract is located at [`contracts/ETendering.sol`](file:///C:/Users/coderavvi/Desktop/Procurement/contracts/ETendering.sol).

### 5.1 Data Structures & Enums

```solidity
enum Stage {
    Advertised,          // Stage 1
    PrequalificationOpen,// Stage 2
    Submitted,           // Stage 3
    Opened,              // Stage 4
    Evaluated,           // Stage 5
    Awarded,             // Stage 6
    Archived             // Stage 7
}

struct Tender {
    uint256 id;
    string title;
    uint256 deadline;
    Stage state;
    uint256 weightTechnical;
    uint256 weightFinancial;
    address officer;
    address winner;
    uint256 winningScore;
    bytes32 finalDocHash;
    uint256 openedTimestamp;
    uint256 archivedTimestamp;
}

struct Bidder {
    address bidderAddress;
    bool registered;
    bool prequalified;
    bool hasSubmitted;
    bytes32 docHash;
    uint256 submissionTimestamp;
    uint256 technicalScore;
    uint256 financialScore;
    uint256 totalScore;
    bool evaluated;
}
```

### 5.2 Modifiers

* `modifier onlyAdmin()`: Restricts execution to the contract administrator.
* `modifier onlyAccreditedOfficer()`: Restricts execution to whitelisted procurement officers (`isAuthorizedOfficer[msg.sender] == true`).
* `modifier onlyOfficer(uint256 _tenderId)`: Restricts execution to the specific officer who created the tender.
* `modifier tenderExists(uint256 _tenderId)`: Validates that `_tenderId > 0 && _tenderId <= tenderCount`.
* `modifier inStage(uint256 _tenderId, Stage _expectedStage)`: Enforces that the tender is in the exact expected stage.
* `modifier notArchived(uint256 _tenderId)`: Reverts if `state == Stage.Archived`, creating a permanent read-only lock.

### 5.3 Complete Event Catalog

```solidity
event OfficerAuthorized(address indexed officer, string agency);
event OfficerRevoked(address indexed officer);
event TenderAdvertised(uint256 indexed tenderId, string title, uint256 deadline, uint256 weightTechnical, uint256 weightFinancial, address officer);
event PrequalificationOpened(uint256 indexed tenderId);
event BidderRegistered(uint256 indexed tenderId, address indexed bidder);
event BidderPrequalified(uint256 indexed tenderId, address indexed bidder);
event SubmissionOpened(uint256 indexed tenderId);
event BidSubmitted(uint256 indexed tenderId, address indexed bidder, bytes32 docHash, uint256 timestamp);
event TenderOpened(uint256 indexed tenderId, uint256 timestamp);
event BidEvaluated(uint256 indexed tenderId, address indexed bidder, uint256 technicalScore, uint256 financialScore, uint256 totalScore);
event TenderAwarded(uint256 indexed tenderId, address indexed winner, uint256 winningScore);
event TenderArchived(uint256 indexed tenderId, bytes32 finalDocHash, uint256 timestamp);
```

---

## 6. Step-by-Step Manual Testing & Verification Guide

This walkthrough guides testers through executing a complete 7-stage procurement lifecycle in the web application ([`http://localhost:5173`](http://localhost:5173)).

### Case Study Scenario
* **Tender Title:** *Procurement of High-Grade Structural Steel & Reinforced Concrete (TND-2026-ENG-001)*
* **Procuring Authority:** Ministry of Higher Education & Infrastructure Works
* **Officer in Charge:** Hardhat Account #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)
* **Evaluation Weights:** Technical `70%`, Financial `30%`
* **Competing Contractors:**
  1. **Bidder 1 (Alpha Engineering Ltd):** Hardhat Account #1 (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
  2. **Bidder 2 (Beta Solutions Corp):** Hardhat Account #2 (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`)

```
========================================================================================================
                                 7-STAGE DEMONSTRATION WORKFLOW
========================================================================================================
 1. ADVERTISE       ➔  Officer creates Tender #1 (60 min deadline, 70/30 weight)
 2. PREQUALIFY      ➔  Officer opens prequalification; Bidders 1 & 2 register; Officer approves both
 3. SUBMIT          ➔  Officer opens submission; Bidders submit client-hashed proposal documents
 4. TIME-TRAVEL     ➔  Officer advances EVM clock past 60 min deadline; Officer opens tender
 5. EVALUATE        ➔  Officer grades Bidder 1 (Tech: 92, Fin: 88) and Bidder 2 (Tech: 84, Fin: 90)
 6. AWARD           ➔  Officer clicks Award; Smart contract awards Bidder 1 on-chain (Score: 90.80)
 7. ARCHIVE         ➔  Officer uploads signed agreement; Tender permanently locked in Stage 7
========================================================================================================
```

### Detailed Execution Steps

#### Step 1: Tender Creation (Stage 1)
1. Open [http://localhost:5173](http://localhost:5173).
2. In the top-right account dropdown, select **"Procurement Officer / Admin (Acc #0)"**.
3. Click the **"Officer Dashboard"** tab.
4. Click **"Advertise New Tender"** and enter:
   * Title: `Procurement of High-Grade Structural Steel & Concrete (TND-2026-ENG-001)`
   * Submission Deadline Window: `60` minutes
   * Technical Weight (%): `70`
   * Financial Weight (%): `30`
5. Click **"Advertise Tender On-Chain"**. Status badge updates to `Advertised`.

#### Step 2: Prequalification Window & Approval (Stage 2)
1. On the **Officer Dashboard**, click **"Open Prequalification Window"**. Status updates to `PrequalificationOpen`.
2. **Register Bidder 1:** Switch top-right dropdown to **"Bidder 1: Alpha Engineering Ltd (Acc #1)"**. Navigate to **"Bidder Portal"** and click **"Register for Prequalification"**.
3. **Register Bidder 2:** Switch dropdown to **"Bidder 2: Beta Solutions Corp (Acc #2)"** and click **"Register for Prequalification"**.
4. **Approve Bidders:** Switch back to **Officer Account #0** on the **Officer Dashboard**. Under Stage 2 Registered Bidders, click **"Approve"** for Alpha Engineering and Beta Solutions. Status updates to `Prequalified & Authorized`.

#### Step 3: Tender Submission (Stage 3)
1. On the **Officer Dashboard**, click **"Open Submission Window"**. State transitions to `Submitted`.
2. **Submit as Bidder 1:** Switch dropdown to **Bidder 1 (Acc #1)**. Go to **"Bidder Portal"**. Click **"Generate Sample Proposal File"** (or upload [`sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf`](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf)). Click **"Submit Hashed Bid On-Chain"**.
3. **Submit as Bidder 2:** Switch dropdown to **Bidder 2 (Acc #2)**. Go to **"Bidder Portal"**. Click **"Generate Sample Proposal File"** and click **"Submit Hashed Bid On-Chain"**.

#### Step 4: Fast-Forward Time & Opening (Stage 4)
1. Switch back to **Officer Account #0** on the **Officer Dashboard**.
2. **Negative Test (Early Opening):** Note that clicking *Open Tender Bids* reverts if the 60-minute window has not elapsed.
3. **Advance Blockchain Clock:** Click the amber button **"Fast-Forward Blockchain Time Past Deadline"** (triggers `evm_increaseTime`).
4. Click **"Open Tender Bids"**. Status transitions to `Opened`.

#### Step 5: Scoring & Evaluation (Stage 5)
1. Under Stage 5 on the **Officer Dashboard**:
   * **Bidder 1 (Alpha Engineering):** Enter **Technical: 92**, **Financial: 88**. Click **"Submit Evaluation"**.
   * **Bidder 2 (Beta Solutions):** Enter **Technical: 84**, **Financial: 90**. Click **"Submit Evaluation"**.
2. **Write-Once Verification:** Note that scores for each bidder immediately become read-only and cannot be changed.

#### Step 6: Automated Award (Stage 6)
1. On the **Officer Dashboard**, click **"Award Tender"**.
2. The smart contract programmatically iterates over all bidders and selects **Alpha Engineering Ltd** (Score: `90.80`). Status transitions to `Awarded`.

#### Step 7: Archiving & Sealing (Stage 7)
1. Under Stage 7 on the **Officer Dashboard**, click **"Generate Sample Final Contract File"** (or upload a PDF).
2. Click **"Seal & Archive Tender Record On-Chain"**. Status transitions to `Archived`.
3. **Immutability Verification:** All action buttons are permanently disabled. Any raw transaction sent to modify this tender will revert on-chain.

#### Step 8: Public Cryptographic Audit Trail
1. Click the **"Audit Trail"** tab.
2. Select Tender #1 from the dropdown.
3. Inspect the chronological timeline, block numbers, transaction hashes, and Keccak-256 fingerprints.
4. Test the **Independent Document Verifier**: drag and drop [`sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf`](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf) into the verification box to observe the instant 100% cryptographic hash match.

---

## 7. Mathematical Scoring Rubric & Grading Criteria

The smart contract deterministically evaluates final scores using the exact weighted formula:

$$\text{Total Score} = \frac{(\text{Technical Score} \times W_{\text{tech}}) + (\text{Financial Score} \times W_{\text{fin}})}{100}$$

### Evaluation Rubric (Building Materials Procurement)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ TECHNICAL EVALUATION RUBRIC (Weight: 70% | Scale: 0 - 100)                    │
├───────────────────────────────────────────────────────────────────────────────┤
│ 1. Material Specification Compliance (ASTM A992, BS 4449 Grade 60 Rebar)     │ 40 pts │
│ 2. Quality Certifications (ISO 9001:2015, ISO 14001:2015, Mill Test Certs)    │ 25 pts │
│ 3. Delivery Schedule & Logistics Staging Plan (under 45 calendar days)       │ 20 pts │
│ 4. Past Performance Track Record on Large-Scale Infrastructure               │ 15 pts │
├───────────────────────────────────────────────────────────────────────────────┤
│ FINANCIAL EVALUATION RUBRIC (Weight: 30% | Scale: 0 - 100)                    │
├───────────────────────────────────────────────────────────────────────────────┤
│ 1. Price Competitiveness ($1.25M Bid vs Agency Benchmark)                    │ 60 pts │
│ 2. Payment Terms & Advance Guarantee Structure                               │ 25 pts │
│ 3. Price Validity Period (90 Days Fixed Rate Guarantee)                      │ 15 pts │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Case Study Score Calculations

#### Bidder 1: Alpha Engineering Ltd
$$\text{Technical Score} = 92, \quad \text{Financial Score} = 88$$
$$\text{Total Score} = \frac{(92 \times 70) + (88 \times 30)}{100} = \frac{6440 + 2640}{100} = \mathbf{90.80}$$

#### Bidder 2: Beta Solutions Corp
$$\text{Technical Score} = 84, \quad \text{Financial Score} = 90$$
$$\text{Total Score} = \frac{(84 \times 70) + (90 \times 30)}{100} = \frac{5880 + 2700}{100} = \mathbf{85.80}$$

$$\mathbf{90.80} > \mathbf{85.80} \implies \text{Winner: Alpha Engineering Ltd}$$

---

## 8. Sample Bid Proposal Dossier & Cryptographic Binding

A complete sample proposal document is available in [`sample_data/Sample_Proposal_Alpha_Buildtech.txt`](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/Sample_Proposal_Alpha_Buildtech.txt) and [`sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf`](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf).

### Bill of Quantities (BOQ) Summary ($1,250,000.00 USD)

| Item | Material Description & Standards | Quantity | Unit Price | Total Amount |
| :--- | :--- | :--- | :--- | :--- |
| **01** | High-Yield Deformed Rebar (Grade 60, BS 4449) | 500 MT | $950 / MT | $475,000.00 |
| **02** | Portland Cement (CEM II 42.5N, 50kg bags) | 15,000 Bags | $11 / Bag | $165,000.00 |
| **03** | Structural Steel Beams (ASTM A992 / UB) | 350 MT | $1,200 / MT | $420,000.00 |
| **04** | Washed Crushed Granite Aggregates (20mm) | 4,000 Tons | $25 / Ton | $100,000.00 |
| **05** | Clean River Sand for Concrete Mortar | 3,500 Tons | $18 / Ton | $63,000.00 |
| **06** | Quality Assurance Testing & Mill Certificates | Lump Sum | Lump Sum | $27,000.00 |
| **TOTAL** | **Fixed Bid Proposal Price (USD):** | | | **$1,250,000.00** |

---

## 9. Automated Test Suite & Verification Matrix

The codebase includes an exhaustive **78-test suite** executing against the local Hardhat EVM:

```bash
npx hardhat test
```

### Test File Breakdown

1. [`test/01_skeleton_statemachine.test.js`](file:///C:/Users/coderavvi/Desktop/Procurement/test/01_skeleton_statemachine.test.js)
   * Initial state validation upon deployment.
   * State jump prevention (cannot jump from Advertised to Opened or Awarded).
   * Modifiers enforcement (`onlyAdmin`, `onlyAccreditedOfficer`).
2. [`test/02_advertisement_prequal_submission.test.js`](file:///C:/Users/coderavvi/Desktop/Procurement/test/02_advertisement_prequal_submission.test.js)
   * Tender creation with positive weights and future deadlines.
   * Bidder prequalification registration and officer approval.
   * Double registration prevention.
   * Client-side Keccak-256 submission and timestamp validation.
   * Past-deadline submission rejection.
3. [`test/03_opening_evaluation.test.js`](file:///C:/Users/coderavvi/Desktop/Procurement/test/03_opening_evaluation.test.js)
   * Pre-deadline opening rejection.
   * Post-deadline opening success.
   * Mathematical scoring formula validation.
   * **Write-once evaluation score lock.**
   * Rejection of scores for non-submitted addresses.
4. [`test/04_award_archiving.test.js`](file:///C:/Users/coderavvi/Desktop/Procurement/test/04_award_archiving.test.js)
   * Automated winner selection by highest calculated score.
   * Unevaluated bidder check before awarding.
   * Final document hash binding during archiving.
   * **Permanent immutability lock:** verification that all state-changing functions revert on archived tenders.
5. [`test/05_master_integration.test.js`](file:///C:/Users/coderavvi/Desktop/Procurement/test/05_master_integration.test.js)
   * Master end-to-end integration test running a single tender across all 7 stages in a single continuous transaction execution.
6. [`test/06_rbac_officer_accreditation.test.js`](file:///C:/Users/coderavvi/Desktop/Procurement/test/06_rbac_officer_accreditation.test.js)
   * Verification that commercial bidder addresses are blocked from creating fake tenders.
   * Dynamic officer accreditation and revocation by the contract admin.
7. [`test/07_prequalification_criteria_and_withdrawal_substitution.test.js`](file:///C:/Users/coderavvi/Desktop/Procurement/test/07_prequalification_criteria_and_withdrawal_substitution.test.js)
   * Verification of on-chain statutory criteria builder and prequalification bypass (`skipPrequalification`).
   * Pre-opening bid withdrawal (`withdrawBid`) and bidder exclusion from evaluation.
   * Pre-opening bid substitution (`substituteBid`) and cryptographic log archiving.
8. [`test/08_tender_buying_and_spec_upload.test.js`](file:///C:/Users/coderavvi/Desktop/Procurement/test/08_tender_buying_and_spec_upload.test.js)
   * Verification of official RFP specification document hashing (`specDocHash`).
   * Payable crypto fee requirement and contract participation gating (`purchaseTenderDocument`).
   * Accumulated tender fee escrow balance tracking and officer withdrawal (`withdrawTenderFees`).

---

## 10. Developer Operations & Quick Start Manual

### 10.1 Prerequisites
* **Node.js**: v18+ (tested on Node v20/v24 LTS)
* **NPM**: v9+
* **Browser**: Chrome, Brave, Edge, or Firefox

### 10.2 Installation Commands

```bash
# 1. Install root dependencies (Hardhat, Ethers.js v6)
npm install

# 2. Install storage server dependencies
cd server && npm install && cd ..

# 3. Install React frontend dependencies
cd client && npm install && cd ..
```

### 10.3 Running the Complete System (3 Terminals)

```bash
# Terminal 1: Local Hardhat Node
npx hardhat node

# Terminal 2: Seed Blockchain Data & Start Mock Storage Server
npx hardhat run scripts/seed.js --network localhost
npm run server

# Terminal 3: Start Vite + React Frontend
npm run client
```

### 10.4 Hardhat Test Accounts & Roles

| Account | Role | Address | Description |
| :--- | :--- | :--- | :--- |
| **Account #0** | **Procurement Officer** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Contract Admin & Accredited Officer. Creates tenders, approves bidders, enters evaluation scores, awards, and archives. |
| **Account #1** | **Bidder 1 (Alpha Ltd)** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Pre-registered contractor submitting high-specification proposals. |
| **Account #2** | **Bidder 2 (Beta Corp)** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Competitor contractor submitting independent hashed proposals. |
| **Account #3** | **Bidder 3 (Gamma Systems)**| `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | Competitor contractor for multi-party bidding demonstrations. |

---

## 🏁 Summary & Defense Talking Points

1. **State Machine Rigor:** Every stage transition is cryptographically enforced in Solidity bytecode; out-of-order calls, duplicate submissions, and early unsealing are physically rejected by the EVM.
2. **True Off-Chain Scalability & Privacy:** Zero sensitive files are stored on-chain, preventing gas bloating and corporate intelligence leaks while preserving 100% mathematical tamper-proofing via client-side Keccak-256 fingerprinting.
3. **Impartial Evaluation & Award:** Scoring is governed by transparent write-once weighting formulas, and winning contractors are determined algorithmically on-chain.
4. **Permanent Immutability:** Once archived, the tender state is sealed permanently, providing an immutable audit trail for citizens, auditors, and oversight agencies.
