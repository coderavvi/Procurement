# 🏛️ Blockchain-Enabled E-Tendering System (PhD Research MVP)

A local, working proof-of-concept of a blockchain-enabled e-tendering system demonstrating verifiable trust, non-repudiation, and immutability across all seven stages of a public procurement lifecycle:

```
[1. Advertised] ➔ [2. Prequalification] ➔ [3. Submitted] ➔ [4. Opened] ➔ [5. Evaluated] ➔ [6. Awarded] ➔ [7. Archived (Locked)]
```

---

## 📚 Project Documentation & Manuals

| Document | Format | Description |
| :--- | :--- | :--- |
| **Complete System Documentation (All Docs Master)** | [**Markdown**](file:///C:/Users/coderavvi/Desktop/Procurement/COMPLETE_SYSTEM_DOCUMENTATION.md) · [**Docs MD**](file:///C:/Users/coderavvi/Desktop/Procurement/docs/COMPLETE_SYSTEM_DOCUMENTATION.md) | **Master unified guide** consolidating all architecture, state machines, research mappings, security models, scoring rubrics, testing guides, and contract specs with detailed explanations. |
| **Real-World Architecture & Security Guide** | [**PDF**](file:///C:/Users/coderavvi/Desktop/Procurement/docs/REAL_WORLD_ARCHITECTURE_AND_SECURITY.pdf) · [**Markdown**](file:///C:/Users/coderavvi/Desktop/Procurement/docs/REAL_WORLD_ARCHITECTURE_AND_SECURITY.md) | Explains production PKI, Multi-Sig governance, hardware keys, off-chain storage, and anti-tampering. |
| **Manual Testing Guide & Scoring Rubric** | [**PDF**](file:///C:/Users/coderavvi/Desktop/Procurement/docs/MANUAL_TESTING_GUIDE.pdf) · [**Markdown**](file:///C:/Users/coderavvi/Desktop/Procurement/docs/MANUAL_TESTING_GUIDE.md) | Step-by-step test manual using the Building Materials Procurement case study with scoring formulas. |
| **Sample Bid Proposal Document** | [**PDF**](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf) · [**Text**](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/Sample_Proposal_Alpha_Buildtech.txt) | Complete, ready-to-upload proposal with Bills of Quantities ($1.25M) and specifications for upload testing. |
| **Sample Tenders & Test Datasets** | [**Markdown**](file:///C:/Users/coderavvi/Desktop/Procurement/docs/SAMPLE_TENDERS_AND_DATA.md) | Specification of all pre-seeded tenders (#1, #2, #3) across different lifecycle stages and case study BOQ. |
| **Research Mapping Document** | [**Markdown**](file:///C:/Users/coderavvi/Desktop/Procurement/RESEARCH_MAPPING.md) | Formal mapping of all 7 stages to smart contract enforcement mechanisms for PhD thesis write-up. |

---

## 🚀 Quick Start Guide (< 10 Minutes)

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24 LTS)
- **NPM**: v9+
- **MetaMask browser extension** (optional; built-in account switcher available directly in the UI for instant role testing).

---

### 2. Installation
Clone the repository and install dependencies for the root, server, and client:

```bash
# 1. Install root dependencies (Hardhat, Ethers.js v6)
npm install

# 2. Install storage server dependencies
cd server && npm install && cd ..

# 3. Install React frontend dependencies
cd client && npm install && cd ..
```

---

### 3. Run the Complete System in 3 Terminals

#### **Terminal 1: Start Local Hardhat Blockchain Node**
```bash
npx hardhat node
```
*Starts local RPC at `http://127.0.0.1:8545` with 20 pre-funded test accounts.*

#### **Terminal 2: Deploy & Seed Contract Data + Start Storage Server**
```bash
# Deploy contract and seed 3 realistic sample tenders
npx hardhat run scripts/seed.js --network localhost

# Start mock off-chain file storage server (Port 3001)
npm run server
```

#### **Terminal 3: Start Vite + React Frontend**
```bash
npm run client
```
*Frontend opens at `http://localhost:5173`.*

---

## 🧪 Automated Testing Suite

Execute the comprehensive 78-test Hardhat suite verifying all stages, failure paths, score calculations, Institutional RBAC, prequalification criteria, bid withdrawal/substitution, tender dossier purchase fees, and the Master 7-Stage Integration Test:

```bash
npx hardhat test
```

### Test Coverage Highlights:
- **`01_skeleton_statemachine.test.js`**: Verifies initial state, out-of-order rejection, and role-based access modifiers.
- **`02_advertisement_prequal_submission.test.js`**: Verifies tender creation, prequalification registration, officer approval, and on-time client-hashed bid submissions.
- **`03_opening_evaluation.test.js`**: Verifies strict post-deadline opening, evaluation score formula `(Tech * Wt_tech) + (Fin * Wt_fin)`, and write-once score protection.
- **`04_award_archiving.test.js`**: Verifies on-chain winner selection by highest score, unevaluated bidder prevention, and permanent post-archiving immutability locking.
- **`05_master_integration.test.js`**: Runs a single tender through all 7 stages end-to-end in one master transaction flow.
- **`06_rbac_officer_accreditation.test.js`**: Verifies that commercial bidders are blocked from creating fake tenders, and only accredited government agency officers can advertise tenders.
- **`07_prequalification_criteria_and_withdrawal_substitution.test.js`**: Verifies statutory criteria builder, prequalification bypass, bid withdrawal, and bid substitution before opening.
- **`08_tender_buying_and_spec_upload.test.js`**: Verifies tender specification dossier hashing, crypto fee purchases, balance accounting, and officer fee withdrawal.

---

## 👥 Roles & Hardhat Test Accounts

The UI includes a **built-in 1-click Role Switcher** in the top navigation bar. You can switch between roles instantly without needing MetaMask, or connect via MetaMask:

| Account | Role | Address | Description |
| :--- | :--- | :--- | :--- |
| **Account #0** | **Procurement Officer** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Creates tenders, approves prequalifications, opens bids, enters evaluation scores, awards, and archives. |
| **Account #1** | **Bidder 1 (Alpha Ltd)** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Registers prequalification, hashes proposals client-side, and submits bids. |
| **Account #2** | **Bidder 2 (Beta Corp)** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Competitor bidder submitting independent hashed proposals. |
| **Account #3** | **Bidder 3 (Gamma Systems)** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | Competitor bidder submitting independent hashed proposals. |

---

## 📋 Manual QA Verification Script

### 1. Bidder-Facing Flow (Day 5 Verification)
1. In the top-right account dropdown, select **"Bidder 1: Alpha Engineering Ltd"**.
2. Navigate to the **"Bidder Portal"** tab.
3. Select **Tender #2: Renewable Solar Energy Grid Modernization** (Stage 1: Advertised).
4. Click **"Register for Prequalification"** ➔ confirm transaction receipt appears on screen.
5. Switch to **Officer Account #0** in the dropdown ➔ go to **Officer Dashboard** ➔ approve Bidder 1's prequalification ➔ click **"Open Submission Window"**.
6. Switch back to **Bidder 1** in the dropdown ➔ choose a local test document (e.g. PDF).
7. Notice the **Keccak-256 hash** generated in the browser. Click **"Re-hash to verify deterministic output"** (confirms 100% deterministic match).
8. Click **"Submit Sealed Bid to Blockchain"** ➔ on-chain transaction hash and confirmation appear.

### 2. Officer-Facing Flow (Day 6 Verification)
1. Select **Officer Account #0** from the dropdown ➔ navigate to **"Officer Dashboard"**.
2. Click **"Advertise New Tender"** ➔ enter title: `"National High-Speed Transit 2026"`, duration: `60` mins, Tech: `70%`, Fin: `30%` ➔ click Submit.
3. Click **"Open Prequalification (Stage 2)"**.
4. Switch to Bidder accounts #1, #2, #3 to register ➔ as Officer, approve their prequalifications.
5. Click **"Close Prequalification & Open Submission (Stage 3)"**.
6. After bidders submit bids, click **"Open Tender Bids (Stage 4)"**.
7. Enter Technical (0-100) and Financial (0-100) scores for each bidder ➔ click **"Submit Score"**. Notice scores are locked immediately (write-once guarantee).
8. Click **"Determine Winner & Award Tender (Stage 6)"** ➔ smart contract determines the winner on-chain based on highest total score.
9. Upload a final signed award contract ➔ click **"Seal & Permanently Archive Tender (Stage 7)"**. Notice all state buttons are now permanently disabled.

### 3. Public Cryptographic Audit Trail (Day 6 Verification)
1. Navigate to the **"Audit Trail"** tab.
2. Select any tender (e.g., **Tender #3**).
3. Inspect the full chronological timeline from `TenderAdvertised` to `TenderArchived`, with block numbers, exact timestamps, and transaction hashes.
4. Test the **Independent Document Verifier**: drag & drop a file into the verifier box ➔ verify it detects matching on-chain hashes.

---

## 🛠️ Project Structure

```
Procurement/
├── contracts/
│   └── ETendering.sol             # Single Solidity contract with 7-stage state machine
├── scripts/
│   ├── deploy.js                  # Deployment script saving ABI and contract address
│   └── seed.js                    # Comprehensive seed script (1 tender with 3 bidders + test tenders)
├── test/
│   ├── 01_skeleton_statemachine.test.js
│   ├── 02_advertisement_prequal_submission.test.js
│   ├── 03_opening_evaluation.test.js
│   ├── 04_award_archiving.test.js
│   └── 05_master_integration.test.js # Master 7-stage end-to-end integration test
├── server/
│   ├── server.js                  # Local Express static file storage + upload API (Port 3001)
│   └── uploads/                   # Stand-in mock off-chain storage directory
├── client/
│   ├── src/
│   │   ├── components/            # Navbar, StageBadge, StageProgressBar, FileHasher, TransactionModal
│   │   ├── context/               # Web3Context (Ethers.js v6 provider, Hardhat account switcher)
│   │   ├── pages/                 # PublicTenders, OfficerDashboard, BidderPortal, AuditView
│   │   └── utils/                 # Client-side keccak256 file hashing, formatting
│   └── vite.config.js             # Vite config (Port 5173)
├── RESEARCH_MAPPING.md            # PhD thesis mapping of all 7 stages to enforcement mechanisms
├── package.json                   # Root package configuration
└── hardhat.config.js              # Hardhat configuration
```

---

## 📜 Research Enforcement Summary

1. **Advertisement**: Smart contract initializes tender parameters and weights on-chain.
2. **Prequalification**: State gate ensures only vetted identities can participate.
3. **Submission**: Proposals are hashed client-side with `keccak256` before submission; time gate prevents post-deadline submissions.
4. **Opening**: EVM timestamp gate prevents premature unsealing of bids.
5. **Evaluation**: Weighted scoring is computed deterministically; scores are write-once per bidder.
6. **Award**: Highest scoring bidder is selected algorithmically on-chain.
7. **Archiving**: Record is sealed permanently; all subsequent state mutations revert.
