# E-Tendering System: Manual Testing Guide & Scoring Rubric

**Document Classification:** Step-by-Step Testing Manual & Demonstration Script  
**Corresponding PDF:** [`docs/MANUAL_TESTING_GUIDE.pdf`](file:///C:/Users/coderavvi/Desktop/Procurement/docs/MANUAL_TESTING_GUIDE.pdf)  
**Sample Test Document:** [`sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf`](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf)

---

## 🏗️ Case Study Scenario

**Tender Title:** *Procurement of High-Grade Structural Steel & Reinforced Concrete for the New Engineering Faculty Complex*  
**Tender Reference:** `TND-2026-ENG-001`  
**Procuring Entity:** Ministry of Higher Education & Infrastructure Works  
**Officer In Charge:** Hardhat Account #0 (`0xf39Fd...`)  
**Evaluation Criteria Weights:**
* **Technical Evaluation Weight:** `70%`
* **Financial Evaluation Weight:** `30%`

**Participating Bidders:**
1. **Bidder 1 (Alpha Engineering Ltd / Alpha Buildtech):** Account #1 (`0x7099...`)
2. **Bidder 2 (Beta Solutions Corp):** Account #2 (`0x3C44...`)

---

## 📋 Seven-Stage Step-by-Step Walkthrough

```
 Stage 1: Advertised ➔ Stage 2: Prequalification ➔ Stage 3: Submitted ➔ Stage 4: Opened
        ➔ Stage 5: Evaluated ➔ Stage 6: Awarded ➔ Stage 7: Archived
```

---

### Step 1: Tender Creation & Advertisement (Stage 1)

1. Open the application at [**http://localhost:5173/**](http://localhost:5173/).
2. In the top-right account dropdown, ensure **"Procurement Officer / Admin (Acc #0)"** is selected.
3. Click the **"Officer Dashboard"** tab in the navigation bar.
4. Click the blue **"Advertise New Tender"** button at the top right of the officer console.
5. Fill out the advertisement modal:
   * **Tender Title:** `Procurement of High-Grade Structural Steel & Concrete (TND-2026-ENG-001)`
   * **Submission Deadline Window:** `60` minutes
   * **Technical Weight (%):** `70`
   * **Financial Weight (%):** `30` *(Note: Weights must strictly sum to 100%)*
6. Click **"Advertise Tender On-Chain"**.
7. **Verification:**
   * Transaction modal confirms mining on Hardhat.
   * Tender appears in the active tender list with status badge `Advertised`.
   * Public Tenders page displays the newly advertised tender.

---

### Step 2: Prequalification Window & Officer Vetting (Stage 2)

1. On the **Officer Dashboard**, under the Stage Progression section for Stage 2, click:
   * **"Open Prequalification Window"**
   * State updates to `PrequalificationOpen`.
2. **Register Bidder 1:**
   * Open the top-right account dropdown and select **"Bidder 1: Alpha Engineering Ltd (Acc #1)"**.
   * Navigate to the **"Bidder Portal"** tab.
   * Click **"Register for Prequalification"**.
   * State badge confirms *Registration Pending Approval*.
3. **Register Bidder 2 (Optional for competitive testing):**
   * Switch account to **"Bidder 2: Beta Solutions Corp (Acc #2)"**.
   * In Bidder Portal, click **"Register for Prequalification"**.
4. **Approve Prequalification as Officer:**
   * Switch account back to **"Procurement Officer / Admin (Acc #0)"** and go to **Officer Dashboard**.
   * In the *Registered Bidders* table under Stage 2, click **"Approve"** next to Alpha Engineering and Beta Solutions.
   * **Verification:** The badge updates to green: `Prequalified & Authorized`.

---

### Step 3: Tender Submission & Document Fingerprinting (Stage 3)

1. On the **Officer Dashboard**, click **"Open Submission Window"**.
   * State transitions to `Submitted`. Prequalified contractors are now permitted to submit sealed bids.
2. **Submit Proposal as Bidder 1 (Alpha Buildtech):**
   * Switch account to **"Bidder 1: Alpha Engineering Ltd (Acc #1)"** in the top-right dropdown.
   * Navigate to the **"Bidder Portal"** tab.
   * In the *Upload & Submit Sealed Bid Proposal* box:
     * Either click **"Generate Sample Proposal File"** (creates a realistic proposal in memory) OR upload the test file from [`sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf`](file:///C:/Users/coderavvi/Desktop/Procurement/sample_data/SAMPLE_BID_PROPOSAL_BUILDING_MATERIALS.pdf).
     * Note that the browser immediately computes the 32-byte Keccak-256 fingerprint (e.g., `0x8a4b...`).
     * Click **"Submit Hashed Bid On-Chain"**.
   * **Verification:** The Bidder Portal renders a **Submission Receipt** with the exact timestamp and immutable document hash.
3. **Submit Proposal as Bidder 2 (Beta Solutions):**
   * Switch account to **"Bidder 2: Beta Solutions Corp (Acc #2)"**.
   * In the Bidder Portal, click **"Generate Sample Proposal File"** and submit.

---

### Step 4: Tender Opening & Fast-Forward Clock (Stage 4)

1. Switch back to **"Procurement Officer / Admin (Acc #0)"** on the **Officer Dashboard**.
2. **Attempt Early Opening (Negative Test):**
   * Notice that the *Open Tender Bids* button is disabled or will be rejected by the smart contract if the deadline has not expired.
3. **Advance Blockchain Time (Hardhat Time-Travel):**
   * Click the amber button: **"Fast-Forward Blockchain Time Past Deadline"**.
   * This calls `evm_increaseTime` to push the EVM clock past the 60-minute deadline.
4. Click **"Open Tender Bids"**.
   * State transitions to `Opened`.
   * The smart contract permanently timestamps the opening event (`openedTimestamp`).

---

### Step 5: Tender Evaluation & Scoring Criteria Explained (Stage 5)

Under Stage 5, the procurement committee inputs technical and financial evaluation scores for all submitted contractors.

#### 🧮 Mathematical Scoring Formula

The smart contract computes the final weighted score automatically:

$$\text{Total Score} = \frac{(\text{Technical Score} \times W_{\text{tech}}) + (\text{Financial Score} \times W_{\text{fin}})}{100}$$

#### 📊 Grading Criteria Rubric (Building Materials Case Study)

```
+-------------------------------------------------------------------------------+
| TECHNICAL EVALUATION (Weight: 70% | Scale: 0 - 100)                          |
+-------------------------------------------------------------------------------+
| Criteria 1: Material Specification Compliance (ASTM A992, Rebar Grade 60)   | 40 pts |
| Criteria 2: Quality Certifications (ISO 9001:2015 & Metallurgical Mill Tests) | 25 pts |
| Criteria 3: Logistics, Delivery Schedule & Staging Plan (under 45 days)      | 20 pts |
| Criteria 4: Past Performance & Structural Project Track Record                | 15 pts |
+-------------------------------------------------------------------------------+
| FINANCIAL EVALUATION (Weight: 30% | Scale: 0 - 100)                          |
+-------------------------------------------------------------------------------+
| Criteria 1: Price Competitiveness ($1.25M Bid vs Government Benchmark)       | 60 pts |
| Criteria 2: Payment Milestone Structure & Advance Guarantee Terms             | 25 pts |
| Criteria 3: Price Validity Period (90 Days Guaranteed Fixed Rate)             | 15 pts |
+-------------------------------------------------------------------------------+
```

#### Executing Evaluation in the Dashboard:
1. Under Stage 5 on the **Officer Dashboard**:
   * **Bidder 1 (Alpha Engineering):** Enter **Technical: 92**, **Financial: 88**
     $$\text{Calculated Total} = \frac{(92 \times 70) + (88 \times 30)}{100} = \frac{6440 + 2640}{100} = 90.80$$
     Click **"Submit Evaluation"** for Bidder 1.
   * **Bidder 2 (Beta Solutions):** Enter **Technical: 84**, **Financial: 90**
     $$\text{Calculated Total} = \frac{(84 \times 70) + (90 \times 30)}{100} = \frac{5880 + 2700}{100} = 85.80$$
     Click **"Submit Evaluation"** for Bidder 2.
2. **Write-Once Security Feature:** Notice that once submitted, scores for that bidder are locked. The smart contract prevents modifying scores to prevent post-opening manipulation.

---

### Step 6: Automated Tender Award (Stage 6)

1. On the **Officer Dashboard**, click **"Award Tender"**.
2. **On-Chain Execution:**
   * The smart contract programmatically iterates over all bidders.
   * It checks that zero bidders remain unevaluated.
   * It compares `totalScore` on-chain and awards the contract to **Alpha Engineering Ltd** (Score: `90.80`).
3. State transitions to `Awarded`, and the winning banner is displayed.

---

### Step 7: Archiving & Permanent Seal (Stage 7)

1. Under Stage 7 on the **Officer Dashboard**:
   * Upload the final signed Contract Agreement or click **"Generate Sample Final Contract File"**.
2. Click **"Seal & Archive Tender Record On-Chain"**.
3. **State Locked:**
   * State transitions to `Archived`.
   * All state-modifying functions on this tender are permanently disabled in smart contract bytecode.

---

### Step 8: Public Audit Trail Verification

1. Click the **"Audit Trail"** tab in the main navigation.
2. Select your Tender ID (`#1`) from the dropdown.
3. **Verify Integrity:**
   * View the complete chronological timeline from `TenderAdvertised` to `TenderArchived`.
   * Inspect the exact block timestamps, calling addresses, transaction hashes, and document Keccak-256 fingerprints.
   * Confirm that the mathematical winning score on-chain corresponds to the evaluation rubric.
