# 📋 Sample Tenders & Test Datasets Specification

**Document Classification:** Academic Research Reference & Demonstration Datasets  
**System:** Blockchain-Enabled E-Tendering System  
**Seed Script:** [`scripts/seed.js`](file:///C:/Users/coderavvi/Desktop/Procurement/scripts/seed.js)  
**Sample Document:** [`sample_data/Sample_Proposal_Alpha_Buildtech.txt`](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/Sample_Proposal_Alpha_Buildtech.txt) · [`sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf`](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf)

---

## 🎯 Overview of Available Sample Tenders

When you execute `npx hardhat run scripts/seed.js --network localhost`, the local blockchain is pre-populated with **three distinct tenders in different lifecycle stages** to facilitate instant, zero-setup testing of any stage without having to run through the entire 7-stage workflow from scratch:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                PRE-SEEDED TENDERS SUMMARY MATRIX                                  │
├───────────┬─────────────────────────────────────────────────┬──────────────────────┬──────────────┤
│ Tender ID │ Tender Title                                    │ Lifecycle Stage      │ Primary Demo │
├───────────┼─────────────────────────────────────────────────┼──────────────────────┼──────────────┤
│ Tender #1 │ Metropolitan Smart Traffic Grid Infrastructure  │ Stage 3: Submitted   │ Officer Flow │
│ Tender #2 │ Renewable Solar Energy Grid Modernization       │ Stage 1: Advertised  │ Bidder Flow  │
│ Tender #3 │ Hospital Emergency Response System & Data Net   │ Stage 7: Archived    │ Audit Trail  │
├───────────┼─────────────────────────────────────────────────┼──────────────────────┼──────────────┤
│ CaseStudy │ Procurement of High-Grade Structural Steel & BOQ│ Manual 7-Stage Flow  │ Full Rubric  │
└───────────┴─────────────────────────────────────────────────┴──────────────────────┴──────────────┘
```

---

## 🚦 Tender #1: Metropolitan Smart Traffic Grid Infrastructure 2026

* **Tender ID:** `#1`
* **Current Stage:** `Stage 3: Submitted`
* **Deadline:** 10 minutes from deployment
* **Evaluation Weights:** Technical `70%`, Financial `30%`
* **Procuring Entity:** Municipal Transportation Authority
* **Officer in Charge:** Hardhat Account #0 (`0xf39Fd...`)

### Purpose in Demonstration
Tender #1 allows you to test the **Officer Evaluation & Award workflow (Stages 4–7)** immediately without needing to create a tender or submit bids first.

### Participating Bidders & Pre-Submitted Fingerprints

| Contractor | Wallet Address | Status | Submitted Proposal File | On-Chain Keccak-256 Hash |
| :--- | :--- | :--- | :--- | :--- |
| **Alpha Engineering Ltd** | `0x7099...` (Acc #1) | `Submitted` | `Alpha_Traffic_AI_Proposal_v1.pdf` | `0xb512...` |
| **Beta Solutions Corp** | `0x3C44...` (Acc #2) | `Submitted` | `Beta_SmartGrid_Consortium_Bid_v2.pdf`| `0x78a1...` |
| **Gamma Systems** | `0x90F7...` (Acc #3) | `Submitted` | `Gamma_Urban_Mobility_Proposal.pdf` | `0x3f4c...` |

### How to Test with Tender #1:
1. Select **"Procurement Officer / Admin (Acc #0)"** in the top navigation.
2. Navigate to **"Officer Dashboard"** $\rightarrow$ select **Tender #1**.
3. Click **"Fast-Forward Blockchain Time Past Deadline"** $\rightarrow$ click **"Open Tender Bids (Stage 4)"**.
4. In Stage 5, enter technical and financial scores for all 3 bidders (e.g., Alpha: 90/85, Beta: 95/92, Gamma: 80/80).
5. Click **"Determine Winner & Award (Stage 6)"** $\rightarrow$ observe the smart contract algorithmically select Beta Solutions Corp.
6. Upload an audit document and click **"Seal & Archive (Stage 7)"**.

---

## ☀️ Tender #2: Renewable Solar Energy Grid Modernization

* **Tender ID:** `#2`
* **Current Stage:** `Stage 1: Advertised`
* **Deadline:** 24 hours from deployment
* **Evaluation Weights:** Technical `60%`, Financial `40%`
* **Procuring Entity:** Department of Energy & Clean Infrastructure
* **Officer in Charge:** Hardhat Account #0 (`0xf39Fd...`)

### Purpose in Demonstration
Tender #2 allows you to test the **Bidder Prequalification & Document Submission workflow (Stages 1–3)** from the perspective of an external contractor.

### Participating Bidders
* **Bidder 1 (Alpha Engineering Ltd - Acc #1):** Ready to register for prequalification.
* **Bidder 2 (Beta Solutions Corp - Acc #2):** Ready to register for prequalification.

### How to Test with Tender #2:
1. Switch account to **"Bidder 1: Alpha Engineering Ltd (Acc #1)"**.
2. Go to **"Bidder Portal"** $\rightarrow$ select **Tender #2**.
3. Click **"Register for Prequalification"** $\rightarrow$ transaction is mined.
4. Switch to **Officer Account #0** $\rightarrow$ **Officer Dashboard** $\rightarrow$ click **"Open Prequalification Window"** $\rightarrow$ click **"Approve"** next to Bidder 1 $\rightarrow$ click **"Open Submission Window"**.
5. Switch back to **Bidder 1** $\rightarrow$ drag & drop a proposal file (or use built-in generator) $\rightarrow$ inspect the deterministic **Keccak-256 fingerprint** $\rightarrow$ click **"Submit Sealed Bid to Blockchain"**.

---

## 🏥 Tender #3: Hospital Emergency Response System & Data Network

* **Tender ID:** `#3`
* **Current Stage:** `Stage 7: Archived` (Permanently Sealed)
* **Evaluation Weights:** Technical `80%`, Financial `20%`
* **Officer in Charge:** Hardhat Account #0 (`0xf39Fd...`)
* **Winner Awarded On-Chain:** **Beta Solutions Corp (`0x3C44...`)** (Winning Score: `94.40`)

### Pre-Executed Evaluation & Scoring Matrix

$$\text{Total Score} = (\text{Technical Score} \times 0.80) + (\text{Financial Score} \times 0.20)$$

| Contractor | Technical Score (80%) | Financial Score (20%) | On-Chain Computed Total Score | Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Alpha Engineering Ltd** | `85` ($85 \times 0.80 = 68.0$) | `90` ($90 \times 0.20 = 18.0$) | **86.00** | Runner-up |
| **Beta Solutions Corp** | `95` ($95 \times 0.80 = 76.0$) | `92` ($92 \times 0.20 = 18.4$) | **94.40** | **Winner Awarded** |

### Purpose in Demonstration
Tender #3 demonstrates **Public Cryptographic Auditing & Verification (Stage 8)**:
1. Go to the **"Audit Trail"** tab.
2. Select **Tender #3**.
3. View the complete, unbroken cryptographic timeline from `TenderAdvertised` to `TenderArchived`.
4. Inspect the exact block timestamps, calling addresses, transaction hashes, and final sealed contract hash (`Final_Certified_Award_Contract_Tender3_Signed.pdf`).
5. Attempt any state modification on Tender #3 $\rightarrow$ observe that the smart contract rejects all mutations (`notArchived` modifier).

---

## 🏗️ Comprehensive Case Study: Building Materials & BOQ Proposal

* **Reference ID:** `TND-2026-ENG-001`
* **Title:** *Procurement of High-Grade Structural Steel & Reinforced Concrete for the New Engineering Faculty Complex*
* **Procuring Authority:** Ministry of Higher Education & Infrastructure Works
* **Sample Proposal Files:**
  * [`sample_data/Sample_Proposal_Alpha_Buildtech.txt`](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/Sample_Proposal_Alpha_Buildtech.txt) (Plaintext specification)
  * [`sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf`](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf) (Formatted PDF dossier)

### Itemized Bill of Quantities (BOQ) — $1,250,000.00 USD

```
+----+-----------------------------------------------+-------------+--------------+-----------------+
| No | Material Description & Standards              | Quantity    | Unit Price   | Total Amount    |
+----+-----------------------------------------------+-------------+--------------+-----------------+
| 01 | High-Yield Deformed Rebar (Grade 60, BS 4449) | 500 MT      | $950 / MT    | $475,000.00     |
| 02 | Portland Cement (CEM II 42.5N, 50kg bags)     | 15,000 Bags | $11 / Bag    | $165,000.00     |
| 03 | Structural Steel Beams (ASTM A992 / UB)       | 350 MT      | $1,200 / MT  | $420,000.00     |
| 04 | Washed Crushed Granite Aggregates (20mm)      | 4,000 Tons  | $25 / Ton    | $100,000.00     |
| 05 | Clean River Sand for Concrete Mortar          | 3,500 Tons  | $18 / Ton    | $63,000.00      |
| 06 | Quality Assurance Testing & Mill Certificates | Lump Sum    | Lump Sum     | $27,000.00      |
+----+-----------------------------------------------+-------------+--------------+-----------------+
|    | TOTAL FIXED PROPOSAL PRICE (USD):             |             |              | $1,250,000.00   |
+----+-----------------------------------------------+-------------+--------------+-----------------+
```

### Technical & Quality Certifications Included:
* **ISO 9001:2015** (Quality Management System Certification)
* **ISO 14001:2015** (Environmental Management Compliance)
* **Delivery Schedule:** 14-day mobilization, 45-day total project delivery completion.
* **Price Validity Guarantee:** 90 calendar days fixed-rate commitment.
