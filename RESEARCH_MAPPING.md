# PhD Research Mapping: Blockchain-Enabled E-Tendering System

## 1. Research Overview & Claim
Public procurement systems suffer from central authority vulnerability, post-hoc tampering of bid timestamps, collusion during bid opening, and subjective non-reproducible evaluation scoring.

This proof-of-concept demonstrates how a decentralized Ethereum smart contract (`ETendering.sol`) paired with client-side cryptographic hashing (`ethers.keccak256`) enforces **absolute zero-trust integrity, non-repudiation, and immutability** across all seven canonical stages of a public tender lifecycle.

---

## 2. Seven-Stage Mechanism Enforcement Matrix

| Stage | Process Name | On-Chain Function | Cryptographic / Smart Contract Enforcement Mechanism | Revert & Security Rules Enforced |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **Advertisement & RBAC** | `createTender(title, deadline, weightTech, weightFin)`<br>`authorizeOfficer(officer, agency)`<br>`revokeOfficer(officer)` | • **Institutional Accreditation (RBAC)**: Only whitelisted government officer addresses can advertise tenders.<br>• Initializes immutable tender record on-chain.<br>• Sets state strictly to `Stage.Advertised`.<br>• Emits `TenderAdvertised` with indexed tender ID. | • **Bidder / Public Callers Revert**: `require(isAuthorizedOfficer[msg.sender])` prevents commercial bidders or rogue addresses from advertising fake tenders.<br>• `deadline > block.timestamp` (must be future).<br>• `weightTech + weightFin > 0` (positive evaluation weights).<br>• `bytes(title).length > 0`. |
| **Stage 2** | **Prequalification** | `openPrequalification(tenderId)`<br>`registerBidder(tenderId)`<br>`approvePrequalification(tenderId, bidder)` | • Explicit state gate: `Advertised -> PrequalificationOpen`.<br>• Bidders register cryptographic identity (Ethereum address).<br>• Officer selectively signs approval flag (`prequalified = true`).<br>• Emits `BidderRegistered` and `BidderPrequalified`. | • Non-officer cannot open prequalification or approve bidders (`onlyOfficer`).<br>• Bidders cannot register twice.<br>• Officer cannot register as bidder.<br>• Unregistered address cannot be approved. |
| **Stage 3** | **Tender Submission** | `openSubmission(tenderId)`<br>`submitBid(tenderId, docHash)` | • Explicit state gate: `PrequalificationOpen -> Submitted`.<br>• **Client-Side Document Fingerprinting**: `ethers.keccak256` runs in browser before transmission.<br>• Documents stored in mock off-chain repository; only 32-byte cryptographic hash is written on-chain.<br>• Timestamp sealed at EVM block level.<br>• Emits `BidSubmitted(tenderId, bidder, docHash, timestamp)`. | • Only prequalified bidders can call `submitBid`.<br>• Reverts if `block.timestamp > deadline` (strict time gate).<br>• Reverts if `docHash == bytes32(0)`.<br>• Reverts if bidder attempts double submission (one bid per address). |
| **Stage 4** | **Tender Opening** | `openTender(tenderId)` | • State transition: `Submitted -> Opened`.<br>• EVM block timestamp comparison prevents premature unsealing of bids.<br>• Emits `TenderOpened(tenderId, block.timestamp)`. | • Reverts if called before `deadline` has elapsed (`block.timestamp < deadline`).<br>• Reverts if caller is not the tender officer (`onlyOfficer`).<br>• Reverts if called out of order (state != `Submitted`). |
| **Stage 5** | **Tender Evaluation** | `submitEvaluation(tenderId, bidder, techScore, finScore)` | • State transition: `Opened -> Evaluated`.<br>• **Deterministic Formula**: `TotalScore = (TechScore * Wt_tech) + (FinScore * Wt_fin)`.<br>• **Write-Once Scoring**: Once evaluated, bidder's score cannot be modified.<br>• Emits `BidEvaluated(tenderId, bidder, tech, fin, total)`. | • Reverts if tender is not in `Opened` or `Evaluated` state.<br>• Reverts if bidder did not submit a bid (`!hasSubmitted`).<br>• Reverts if bidder was already evaluated (`evaluated == true`).<br>• Non-officer cannot submit scores. |
| **Stage 6** | **Tender Award** | `awardTender(tenderId)` | • State transition: `Evaluated -> Awarded`.<br>• **On-Chain Winner Selection**: Smart contract loops through submitted bids and algorithmically assigns `winner = argmax(totalScore)`.<br>• Emits `TenderAwarded(tenderId, winner, winningScore)`. | • Reverts if any submitted bidder has not been evaluated.<br>• Reverts if no submitted bids exist.<br>• Reverts if called a second time (`inStage(Stage.Evaluated)`).<br>• Non-officer cannot trigger award. |
| **Stage 7** | **Archiving & Sealing** | `archiveTender(tenderId, finalDocHash)` | • Final State: `Awarded -> Archived`.<br>• Binds final signed contract / audit report Keccak-256 fingerprint.<br>• **Permanent Immutability Lock**: Modifier `notArchived` permanently reverts all subsequent state changes on this tender record.<br>• Emits `TenderArchived(tenderId, finalDocHash, timestamp)`. | • Reverts if final hash is zero.<br>• Reverts if called prior to `Stage.Awarded`.<br>• **ALL subsequent transactions to this tender revert permanently**. |

---

## 3. Cryptographic Proof & Client-Side Privacy
1. **Zero Raw File Exposure to Blockchain**:
   Files are never uploaded to the ledger (avoiding massive gas overhead and confidentiality leakage).
2. **Client-Side Hashing (`ethers.keccak256`)**:
   The browser reads the raw binary array buffer and generates a deterministic 256-bit hash. Any byte change in the file alters the hash completely (avalanche effect).
3. **Public Independent Verification**:
   Any auditor can upload a physical file to the Audit View tool; the tool executes the identical Keccak-256 algorithm and matches it against historic event logs to prove authenticity without third-party trust.

---

## 4. Threat Model & Mitigations Tested in Hardhat

| Threat Vector | Traditional System Vulnerability | Blockchain Smart Contract Mitigation | Hardhat Test File |
| :--- | :--- | :--- | :--- |
| **Unauthorized Tender Creation** | Commercial bidders or rogue actors advertise fake tenders | `isAuthorizedOfficer[msg.sender]` gate prevents unaccredited wallets from creating tenders | `test/06_rbac_officer_accreditation.test.js` |
| **Backdated Bids** | Server timestamp spoofing | EVM block timestamp cannot accept submissions once `block.timestamp > deadline` | `test/02_advertisement_prequal_submission.test.js` |
| **Premature Bid Opening** | Malicious insider opens bids early | `openTender` strictly checks `block.timestamp >= deadline` | `test/03_opening_evaluation.test.js` |
| **Score Tampering** | Scores modified after discovering competitors | `submitEvaluation` is write-once per bidder (`b.evaluated == true` reverts) | `test/03_opening_evaluation.test.js` |
| **Favoritism in Award** | Officer manually selects favored vendor | Smart contract determines winner mathematically based on highest evaluated score | `test/04_award_archiving.test.js` |
| **Post-Award Alterations** | Contract modified or canceled post-award | `archiveTender` permanently blocks all future state mutations (`notArchived`) | `test/04_award_archiving.test.js` |
