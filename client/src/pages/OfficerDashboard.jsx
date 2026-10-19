import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import StageBadge from "../components/StageBadge";
import StageProgressBar from "../components/StageProgressBar";
import FileHasher from "../components/FileHasher";
import TransactionModal from "../components/TransactionModal";
import {
  formatAddress,
  formatHash,
  formatTimestamp,
  getTimeRemaining,
  getContractorName,
  parseContractError
} from "../utils/formatting";
import { hashFileClientSide } from "../utils/hashing";
import {
  Award,
  PlusCircle,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  Send,
  Users,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Zap,
  UserPlus,
  Building2,
  UserX,
  Search,
  Trash2,
  ExternalLink,
  FileText,
  Download,
  Check,
  Plus,
  SkipForward,
  Eye,
  ListChecks,
  Sparkles,
  XCircle,
  UploadCloud,
  X,
  AlertCircle,
  Coins,
  RefreshCw,
  RotateCcw,
  Sliders,
  Scale,
  Shield
} from "lucide-react";

const NIGERIAN_PROCUREMENT_CRITERIA_REFERENCE = [
  {
    name: "CAC registration",
    defaultMin: "Certificate of Incorporation with Corporate Affairs Commission (CAC)",
    requiresUpload: true,
    category: "Legal & Regulatory",
  },
  {
    name: "Tax Clearance Certificate",
    defaultMin: "Valid Tax Clearance Certificate for the preceding 3 consecutive years",
    requiresUpload: true,
    category: "Fiscal Compliance",
  },
  {
    name: "Evidence of current compliance certificate (PENCOM)",
    defaultMin: "Valid National Pension Commission compliance certificate",
    requiresUpload: true,
    category: "Statutory Compliance",
  },
  {
    name: "Evidence of current compliance certificate (ITF)",
    defaultMin: "Valid Industrial Training Fund compliance certificate",
    requiresUpload: true,
    category: "Statutory Compliance",
  },
  {
    name: "Evidence of current compliance certificate (NSITF)",
    defaultMin: "Valid Nigeria Social Insurance Trust Fund compliance certificate",
    requiresUpload: true,
    category: "Statutory Compliance",
  },
  {
    name: "Current registration with BPP",
    defaultMin: "Interim Registration Report (IRR) on Bureau of Public Procurement Database",
    requiresUpload: true,
    category: "Procurement Bureau",
  },
  {
    name: "Audit report (3 years)",
    defaultMin: "Audited financial accounts for the past 3 consecutive years",
    requiresUpload: true,
    category: "Financial Capability",
  },
  {
    name: "Bank reference letter",
    defaultMin: "Bank reference letter with credit facility commitment from a commercial bank",
    requiresUpload: true,
    category: "Financial Capability",
  },
  {
    name: "List of company personnel deployed for the job (CV, academic & professional certification)",
    defaultMin: "Minimum 10 technical staff with certified qualifications (COREN/ARCON/CORBON)",
    requiresUpload: true,
    category: "Technical Capacity",
  },
  {
    name: "Evidence of 3 verifiable similar projects executed in the last 5 years",
    defaultMin: "Minimum 3 successfully completed projects with letters of award and job completion certs",
    requiresUpload: true,
    category: "Technical Experience",
  },
  {
    name: "Sworn affidavit",
    defaultMin: "Sworn affidavit on anti-corruption, no director bankruptcy, and no conflict of interest",
    requiresUpload: true,
    category: "Legal Declaration",
  },
  {
    name: "List of equipment",
    defaultMin: "List of essential construction/operational equipment owned or leased with proof of ownership",
    requiresUpload: true,
    category: "Operational Capacity",
  },
];

export default function OfficerDashboard({ selectedTenderId, onSelectTender }) {
  const {
    contract,
    tenders,
    refreshTenders,
    account,
    selectedHardhatIndex,
    switchAccount,
    isAuthorizedOfficer,
    officerAgency,
    isAdmin,
    fastForwardTime,
    blockchainTimestamp,
  } = useWeb3();

  const [activeTenderId, setActiveTenderId] = useState(selectedTenderId || (tenders.length > 0 ? tenders[0].id : null));

  // Form State: Create Tender
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    durationDays: "14",
    specDocHash: "",
    specDocName: "",
    tenderFee: "0.05",
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State: Authorize New Officer (Admin tool)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authForm, setAuthForm] = useState({
    address: "",
    agency: "",
  });

  // Prequalification Criteria Builder Modal State
  const [showPrequalModal, setShowPrequalModal] = useState(false);
  const [criteriaList, setCriteriaList] = useState([]);
  const [criteriaSearch, setCriteriaSearch] = useState("");
  const [customCriterionName, setCustomCriterionName] = useState("");
  const [customCriterionMin, setCustomCriterionMin] = useState("");
  const [customRequiresUpload, setCustomRequiresUpload] = useState(true);

  // Evaluation Weights Modal State (Delayed allotment till after prequalification / bidding stage)
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [weightsForm, setWeightsForm] = useState({
    tech: 70,
    fin: 30,
    actionAfter: null, // "openSubmission", "skipPrequal", or "justSave"
  });

  // Officer Document Viewer State
  const [showDocViewerModal, setShowDocViewerModal] = useState(false);
  const [selectedDocDetails, setSelectedDocDetails] = useState(null);
  const [offChainDocuments, setOffChainDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Officer Prequalification Evidence Review Modal State
  const [showPrequalInspectModal, setShowPrequalInspectModal] = useState(false);
  const [inspectingBidderAddress, setInspectingBidderAddress] = useState("");
  const [bidderPrequalDocs, setBidderPrequalDocs] = useState([]);
  const [loadingPrequalDocs, setLoadingPrequalDocs] = useState(false);

  // Scores State for Stage 5: Evaluation
  const [evalScores, setEvalScores] = useState({});

  // Archive Final Hash & Uploaded Contract Meta
  const [archiveHash, setArchiveHash] = useState("");
  const [uploadedContractMeta, setUploadedContractMeta] = useState(null);

  // Transaction Modal State
  const [txModal, setTxModal] = useState({
    isOpen: false,
    status: "idle",
    txHash: null,
    error: null,
    title: "",
    message: "",
  });

  const selectedTender = tenders.find((t) => t.id === Number(activeTenderId));
  const timeRemaining = selectedTender ? getTimeRemaining(selectedTender.deadline, blockchainTimestamp) : null;
  const isCurrentTenderCreator = selectedTender && account && selectedTender.officer.toLowerCase() === account.toLowerCase();

  // Load uploaded award contract document if in Stage 6 or 7
  useEffect(() => {
    let isMounted = true;
    const fetchAwardDoc = async () => {
      if (!selectedTender || selectedTender.state < 5) {
        if (isMounted) setUploadedContractMeta(null);
        return;
      }
      try {
        const finalHashParam = selectedTender.finalDocHash ? `&finalHash=${selectedTender.finalDocHash}` : "";
        const res = await fetch(`http://localhost:3001/api/award-contract/${selectedTender.id}?json=true${finalHashParam}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUploadedContractMeta(data.document || null);
            if (data.document?.docHash && !archiveHash) {
              setArchiveHash(data.document.docHash);
            }
          }
        } else {
          if (isMounted) setUploadedContractMeta(null);
        }
      } catch (e) {
        if (isMounted) setUploadedContractMeta(null);
      }
    };
    fetchAwardDoc();
  }, [selectedTender?.id, selectedTender?.state, selectedTender?.finalDocHash]);

  // Generic Transaction Handler
  const executeTx = async (actionTitle, actionPromise, successMessage) => {
    setTxModal({
      isOpen: true,
      status: "pending",
      title: actionTitle,
      message: "Sending state transition transaction to Hardhat blockchain...",
      txHash: null,
      error: null,
    });

    try {
      const tx = await actionPromise();
      const receipt = await tx.wait();
      setTxModal({
        isOpen: true,
        status: "success",
        title: `${actionTitle} Confirmed`,
        message: successMessage,
        txHash: receipt.hash,
        error: null,
      });
      await refreshTenders();
    } catch (err) {
      console.error(err);
      setTxModal({
        isOpen: true,
        status: "error",
        title: `${actionTitle} Failed`,
        message: "Smart contract reverted the transaction.",
        txHash: null,
        error: parseContractError(err),
      });
    }
  };

  // 1. Create Tender (Advertisement Stage - weights delayed till after prequalification)
  const handleCreateTender = async (e) => {
    e.preventDefault();
    if (!contract) return;

    const trimmedTitle = createForm.title.trim();
    const trimmedDesc = createForm.description.trim();

    if (!trimmedTitle) {
      alert("Please enter a tender title.");
      return;
    }

    if (!trimmedDesc) {
      alert("Please enter a tender description.");
      return;
    }

    const durationDaysNum = Number(createForm.durationDays);
    if (isNaN(durationDaysNum) || durationDaysNum <= 0) {
      alert("Duration must be a positive number of days.");
      return;
    }

    const durationSec = Math.floor(durationDaysNum * 86400);
    const deadline = Math.floor(Date.now() / 1000) + durationSec;

    // Default fallback hash if no file uploaded
    const finalSpecHash = createForm.specDocHash || ethers.keccak256(ethers.toUtf8Bytes(trimmedTitle + "_Specification_Dossier"));
    const feeWei = ethers.parseEther(createForm.tenderFee || "0");

    setShowCreateModal(false);

    // Initial placeholder weights 50/50 in contract, to be finalized during Bidding Stage via setEvaluationWeights modal
    await executeTx(
      "Create Tender (Advertisement)",
      () => contract.createTender(trimmedTitle, trimmedDesc, deadline, 50, 50, finalSpecHash, feeWei),
      "Tender successfully created and advertised on-chain. Technical and financial evaluation weights will be finalized after prequalification when bidding begins."
    );

    setCreateForm({
      title: "",
      description: "",
      durationDays: "14",
      specDocHash: "",
      specDocName: "",
      tenderFee: "0.05",
    });
  };

  const [uploadingSpec, setUploadingSpec] = useState(false);

  const handleSpecFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSpec(true);
    try {
      const res = await hashFileClientSide(file);
      setCreateForm((prev) => ({
        ...prev,
        specDocHash: res.hash,
        specDocName: file.name,
      }));

      // Upload off-chain in background
      try {
        const formData = new FormData();
        formData.append("document", file);
        formData.append("docHash", res.hash);
        formData.append("category", "tender_spec");
        await fetch("http://localhost:3001/api/upload", {
          method: "POST",
          body: formData,
        });
      } catch (upErr) {
        console.warn("Storage upload warn:", upErr);
      }
    } catch (err) {
      console.error("Spec file hash error:", err);
    } finally {
      setUploadingSpec(false);
    }
  };

  const handleGenerateSampleSpec = async () => {
    setUploadingSpec(true);
    try {
      const timestamp = new Date().toISOString();
      const mockContent = `=== OFFICIAL GOVERNMENT TENDER SPECIFICATION DOSSIER ===
Issued By: ${officerAgency || "Federal Procurement Authority"}
Publication Date: ${timestamp}
Project Scope: Comprehensive Engineering, Procurement & Construction (EPC)
Mandatory Compliance: Standard PPA and Public Procurement Act Guidelines
Fingerprint: Cryptographically Sealed On-Chain
============================================================`;
      const blob = new Blob([mockContent], { type: "text/plain" });
      const mockFile = new File([blob], `Official_Tender_RFP_Dossier_${Date.now().toString().slice(-4)}.txt`, {
        type: "text/plain",
      });
      const res = await hashFileClientSide(mockFile);
      setCreateForm((prev) => ({
        ...prev,
        specDocHash: res.hash,
        specDocName: mockFile.name,
      }));
    } catch (err) {
      console.error("Sample spec gen error:", err);
    } finally {
      setUploadingSpec(false);
    }
  };

  // Withdraw collected tender document purchase fees
  const handleWithdrawTenderFees = async () => {
    if (!contract || !selectedTender) return;
    await executeTx(
      "Withdraw Tender Fees",
      () => contract.withdrawTenderFees(selectedTender.id),
      `Successfully withdrawn ${selectedTender.tenderBalance} ETH in collected tender participation fees to your officer wallet.`
    );
  };

  // Authorize New Officer (Admin)
  const handleAuthorizeOfficer = async (e) => {
    e.preventDefault();
    if (!contract) return;
    setShowAuthModal(false);

    await executeTx(
      "Accredit Officer",
      () => contract.authorizeOfficer(authForm.address, authForm.agency),
      `Wallet ${formatAddress(authForm.address)} successfully accredited as a Procurement Officer for ${authForm.agency}.`
    );

    setAuthForm({ address: "", agency: "" });
  };

  // Open Prequalification Criteria Builder Modal
  const handleOpenPrequalModal = () => {
    setCriteriaList([
      { ...NIGERIAN_PROCUREMENT_CRITERIA_REFERENCE[0], minReq: NIGERIAN_PROCUREMENT_CRITERIA_REFERENCE[0].defaultMin },
      { ...NIGERIAN_PROCUREMENT_CRITERIA_REFERENCE[1], minReq: NIGERIAN_PROCUREMENT_CRITERIA_REFERENCE[1].defaultMin },
      { ...NIGERIAN_PROCUREMENT_CRITERIA_REFERENCE[2], minReq: NIGERIAN_PROCUREMENT_CRITERIA_REFERENCE[2].defaultMin },
    ]);
    setShowPrequalModal(true);
  };

  const handleAddCriterionFromLibrary = (crit) => {
    if (criteriaList.some((c) => c.name.toLowerCase() === crit.name.toLowerCase())) return;
    setCriteriaList([
      ...criteriaList,
      {
        name: crit.name,
        minReq: crit.defaultMin,
        requiresUpload: crit.requiresUpload,
        category: crit.category,
      },
    ]);
  };

  const handleAddCustomCriterion = () => {
    if (!customCriterionName.trim()) return;
    setCriteriaList([
      ...criteriaList,
      {
        name: customCriterionName.trim(),
        minReq: customCriterionMin.trim() || "Compliance verification as mandated",
        requiresUpload: customRequiresUpload,
        category: "Custom Statutory Criteria",
      },
    ]);
    setCustomCriterionName("");
    setCustomCriterionMin("");
    setCustomRequiresUpload(true);
  };

  const handleRemoveCriterion = (index) => {
    setCriteriaList(criteriaList.filter((_, i) => i !== index));
  };

  // Save criteria & Initiate Prequalification
  const handleInitiatePrequalification = async () => {
    if (!contract || !selectedTender) return;
    if (criteriaList.length === 0) {
      alert("Please add at least one criterion, or select Skip Prequalification.");
      return;
    }

    const payload = criteriaList.map((c) => ({
      name: c.name,
      minimumRequirement: c.minReq || "",
      requiresUpload: Boolean(c.requiresUpload),
    }));

    setShowPrequalModal(false);

    await executeTx(
      "Initiate Prequalification",
      () => contract.initiatePrequalification(selectedTender.id, payload),
      `Prequalification stage opened with ${payload.length} statutory criteria permanently registered on-chain.`
    );
  };

  // Skip Prequalification -> Prompts Weights Modal
  const handleSkipPrequalification = () => {
    if (!contract || !selectedTender) return;
    setShowPrequalModal(false);
    // Prompt evaluation weights modal before transitioning to Bidding stage
    setWeightsForm({
      tech: selectedTender.weightTechnical > 0 ? selectedTender.weightTechnical : 70,
      fin: selectedTender.weightFinancial > 0 ? selectedTender.weightFinancial : 30,
      actionAfter: "skipPrequal",
    });
    setShowWeightsModal(true);
  };

  // Prompt Weights Modal when closing prequalification and opening bidding/submission window
  const handlePromptWeightsBeforeBidding = () => {
    if (!contract || !selectedTender) return;
    setWeightsForm({
      tech: selectedTender.weightTechnical > 0 ? selectedTender.weightTechnical : 70,
      fin: selectedTender.weightFinancial > 0 ? selectedTender.weightFinancial : 30,
      actionAfter: "openSubmission",
    });
    setShowWeightsModal(true);
  };

  // Direct weight adjustment modal
  const handleOpenWeightsModalOnly = () => {
    if (!contract || !selectedTender) return;
    setWeightsForm({
      tech: selectedTender.weightTechnical > 0 ? selectedTender.weightTechnical : 70,
      fin: selectedTender.weightFinancial > 0 ? selectedTender.weightFinancial : 30,
      actionAfter: "justSave",
    });
    setShowWeightsModal(true);
  };

  // Submit weights and execute corresponding stage transition
  const handleSaveWeightsModalSubmit = async (e) => {
    e.preventDefault();
    if (!contract || !selectedTender) return;

    const tech = Number(weightsForm.tech);
    const fin = Number(weightsForm.fin);

    if (tech + fin !== 100) {
      alert("Technical and Financial weights must sum to exactly 100%.");
      return;
    }
    if (tech <= 0 || fin <= 0) {
      alert("Weights must be positive numbers.");
      return;
    }

    setShowWeightsModal(false);

    try {
      // 1. Set weights on-chain
      await executeTx(
        "Set Evaluation Weights",
        () => contract.setEvaluationWeights(selectedTender.id, tech, fin),
        `Evaluation weights configured to ${tech}% Technical / ${fin}% Financial.`
      );

      // 2. Perform transition if queued
      if (weightsForm.actionAfter === "openSubmission") {
        await executeTx(
          "Open Submission Window (Stage 3)",
          () => contract.openSubmission(selectedTender.id),
          "Prequalification closed and Bidding Stage (Stage 3) opened with finalized evaluation weights."
        );
      } else if (weightsForm.actionAfter === "skipPrequal") {
        await executeTx(
          "Skip Prequalification & Open Submission",
          () => contract.skipPrequalification(selectedTender.id),
          "Prequalification bypassed and Bidding Stage (Stage 3) opened with finalized evaluation weights."
        );
      }
    } catch (err) {
      console.error("Error setting weights & transitioning:", err);
    }
  };

  // Inspect Contractor Prequalification Evidence
  const handleInspectBidderPrequal = async (bidderAddress) => {
    setInspectingBidderAddress(bidderAddress);
    setShowPrequalInspectModal(true);
    setLoadingPrequalDocs(true);
    try {
      const res = await fetch(`http://localhost:3001/api/prequal-documents/${selectedTender?.id}?bidder=${bidderAddress}`);
      if (res.ok) {
        const data = await res.json();
        setBidderPrequalDocs(data.documents || []);
      } else {
        setBidderPrequalDocs([]);
      }
    } catch (e) {
      console.warn("Error fetching bidder prequal docs:", e);
      setBidderPrequalDocs([]);
    } finally {
      setLoadingPrequalDocs(false);
    }
  };

  // Approve Prequalification
  const handleApprovePrequalification = async (bidderAddress) => {
    if (!contract || !selectedTender) return;
    await executeTx(
      "Approve Prequalification",
      () => contract.approvePrequalification(selectedTender.id, bidderAddress),
      `Bidder ${formatAddress(bidderAddress)} prequalified and authorized to submit sealed bids.`
    );
  };

  // Fast forward Hardhat Time past deadline
  const handleFastForward = async () => {
    if (!selectedTender) return;
    const success = await fastForwardTime(selectedTender.deadline);
    if (success) {
      // Time is now past deadline
    }
  };

  // Open Tender Bids (Stage 4)
  const handleOpenTender = async () => {
    if (!contract || !selectedTender) return;

    // Check if deadline has passed on blockchain; if not, fast-forward automatically past deadline
    if (timeRemaining && !timeRemaining.passed) {
      await fastForwardTime(selectedTender.deadline);
    }

    await executeTx(
      "Open Tender Bids (Stage 4)",
      () => contract.openTender(selectedTender.id),
      "Tender bids officially opened on-chain. Proposal documents are now unsealed for evaluation."
    );
  };

  // Fetch off-chain documents for opened stages
  const fetchOffChainDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch("http://localhost:3001/api/documents");
      if (res.ok) {
        const data = await res.json();
        setOffChainDocuments(data.documents || []);
      }
    } catch (e) {
      console.warn("Could not fetch off-chain documents:", e);
    } finally {
      setLoadingDocs(false);
    }
  };

  // View Document in Off-Chain Store
  const handleViewDocument = async (bidder) => {
    try {
      const hash = bidder.docHash.toLowerCase();
      const res = await fetch(`http://localhost:3001/api/document-by-hash/${hash}?json=true&tenderId=${selectedTender?.id}&bidder=${bidder.address}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedDocDetails({
          ...data.document,
          bidder: bidder.address,
          docHash: bidder.docHash,
          submissionTimestamp: bidder.submissionTimestamp,
          downloadUrl: `http://localhost:3001/api/document-by-hash/${hash}?download=true`,
          viewUrl: `http://localhost:3001/api/document-by-hash/${hash}?view=true`,
          contentPreview: data.document?.contentPreview || "",
        });
      } else {
        setSelectedDocDetails({
          originalName: `Proposal_${formatAddress(bidder.address)}.txt`,
          storedName: null,
          downloadUrl: `http://localhost:3001/api/document-by-hash/${hash}?download=true`,
          viewUrl: `http://localhost:3001/api/document-by-hash/${hash}?view=true`,
          bidder: bidder.address,
          docHash: bidder.docHash,
          submissionTimestamp: bidder.submissionTimestamp,
          contentPreview: "",
        });
      }
      setShowDocViewerModal(true);
    } catch (e) {
      const hash = bidder.docHash.toLowerCase();
      setSelectedDocDetails({
        originalName: `Proposal_${formatAddress(bidder.address)}.txt`,
        storedName: null,
        downloadUrl: `http://localhost:3001/api/document-by-hash/${hash}?download=true`,
        viewUrl: `http://localhost:3001/api/document-by-hash/${hash}?view=true`,
        bidder: bidder.address,
        docHash: bidder.docHash,
        submissionTimestamp: bidder.submissionTimestamp,
        contentPreview: "",
      });
      setShowDocViewerModal(true);
    }
  };

  // Submit Evaluation for a Bidder
  const handleSubmitEvaluation = async (bidderAddress) => {
    if (!contract || !selectedTender) return;
    const scores = evalScores[bidderAddress] || { tech: 85, fin: 85 };
    const tech = Number(scores.tech);
    const fin = Number(scores.fin);

    await executeTx(
      `Evaluate Bidder ${formatAddress(bidderAddress)}`,
      () => contract.submitEvaluation(selectedTender.id, bidderAddress, tech, fin),
      `Scores recorded permanently on-chain (Tech: ${tech}, Fin: ${fin}).`
    );
  };

  // Award Tender
  const handleAwardTender = async () => {
    if (!contract || !selectedTender) return;
    await executeTx(
      "Award Tender (Stage 6)",
      () => contract.awardTender(selectedTender.id),
      "Smart contract verified all scores and algorithmically awarded the contract to the highest-scoring evaluated bidder!"
    );
  };

  // Archive Tender
  const handleArchiveTender = async () => {
    if (!contract || !selectedTender || !archiveHash) return;
    await executeTx(
      "Archive Tender Record (Stage 7)",
      () => contract.archiveTender(selectedTender.id, archiveHash),
      "Tender permanently archived with cryptographic seal. All state-changing functions are now locked on-chain."
    );
  };

  const weightsSet = selectedTender && (selectedTender.weightTechnical + selectedTender.weightFinancial) > 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner - Quantity Surveying Minimal Styling */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-bold text-slate-900">Procurement Officer Console</h2>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {isAuthorizedOfficer ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Accredited Officer: {officerAgency || "Public Procurement Authority"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Unaccredited Wallet (Bidder Role)
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Officer Switch */}
          <button
            onClick={() => switchAccount(0)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
              selectedHardhatIndex === 0
                ? "bg-slate-900 border-slate-800 text-white shadow-sm"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-500" />
            {selectedHardhatIndex === 0 ? "Officer Connected (Acc #0)" : "Switch to Officer Acc #0"}
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 flex items-center gap-1.5 border border-slate-300 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" /> Accredit Officer
            </button>
          )}

          <button
            disabled={!isAuthorizedOfficer}
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Advertise New Tender
          </button>
        </div>
      </div>

      {/* Non-Officer Warning Box (if connected as Bidder) */}
      {!isAuthorizedOfficer && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-950">Access Restricted: Role-Based Access Control Active</h4>
            <p className="text-amber-800 leading-relaxed">
              Your connected wallet (<strong>{formatAddress(account)}</strong>) is not accredited as a Government Procurement Officer.
              In this blockchain architecture, commercial contractors and unauthorized public addresses cannot create tenders or modify officer stages.
            </p>
            <button
              onClick={() => switchAccount(0)}
              className="mt-1.5 text-xs font-bold text-amber-900 underline hover:text-amber-950"
            >
              Switch to Officer Account #0 to manage tenders ➔
            </button>
          </div>
        </div>
      )}

      {/* Tender Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
          Active Managing Tender:
        </label>
        <select
          value={activeTenderId || ""}
          onChange={(e) => {
            const id = Number(e.target.value);
            setActiveTenderId(id);
            if (onSelectTender) onSelectTender(id);
          }}
          className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 font-mono"
        >
          {tenders.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.id} - {t.title} (Stage {t.state + 1}: {t.state === 0 ? "Advertised" : t.state === 1 ? "Prequalification Open" : t.state === 2 ? "Submission Open" : t.state === 3 ? "Opened" : t.state === 4 ? "Evaluated" : t.state === 5 ? "Awarded" : "Archived"})
            </option>
          ))}
        </select>
      </div>

      {!selectedTender ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm">No tenders found. Click "Advertise New Tender" above to create one.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected Tender Overview Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Tender #{selectedTender.id}
                  </span>
                  <StageBadge stageId={selectedTender.state} />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">{selectedTender.title}</h3>
                {selectedTender.description && (
                  <p className="text-xs text-slate-600 mt-2 max-w-4xl leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] block mb-0.5 font-mono">
                      Project Scope & Description:
                    </span>
                    {selectedTender.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
                <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-slate-700">{timeRemaining.text}</span>
                </div>

                <div className="bg-blue-50/60 px-3.5 py-2 rounded-xl border border-blue-200 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-700" />
                  <span className="text-slate-800">
                    Weights: <strong className="text-blue-700">{selectedTender.weightTechnical}% Tech</strong> /{" "}
                    <strong className="text-purple-700">{selectedTender.weightFinancial}% Fin</strong>
                  </span>
                  {selectedTender.state <= 2 && isCurrentTenderCreator && (
                    <button
                      onClick={handleOpenWeightsModalOnly}
                      className="ml-1.5 text-[10px] bg-white border border-blue-300 text-blue-800 hover:text-blue-950 font-bold px-2 py-0.5 rounded shadow-2xs hover:bg-blue-50"
                    >
                      Adjust Weights
                    </button>
                  )}
                </div>

                <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-bold">
                  Dossier Fee: {selectedTender.tenderFee > 0 ? `${selectedTender.tenderFee} ETH` : "Free"}
                </div>
              </div>
            </div>

            {/* Tender Dossier & Fee info */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-slate-900">Official Tender Specification Dossier (RFP):</span>
                  <span className="font-mono text-slate-700 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-300">
                    {formatHash(selectedTender.specDocHash)}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Cryptographically sealed on-chain at tender publication. Commercial bidders must purchase the dossier to participate.
                </p>
              </div>

              {Number(selectedTender.tenderBalance) > 0 && isCurrentTenderCreator && (
                <button
                  onClick={handleWithdrawTenderFees}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                >
                  <Award className="w-4 h-4" /> Withdraw Collected Fees ({selectedTender.tenderBalance} ETH)
                </button>
              )}
            </div>

            <StageProgressBar currentStage={selectedTender.state} />

            {/* Officer Stage Action Controller */}
            <div className="mt-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" /> Stage Transition Control Center
                </h4>

                {/* Fast Forward Blockchain Clock (Time Travel) Helper */}
                {selectedTender.state === 2 && !timeRemaining.passed && isCurrentTenderCreator && (
                  <button
                    onClick={handleFastForward}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600" /> Fast-Forward Blockchain Time Past Deadline (Hardhat)
                  </button>
                )}
              </div>

              {/* Tender Creator Isolation Banner */}
              {!isCurrentTenderCreator && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-amber-950 block">Tender Creator Isolation Enforced (Read-Only View)</span>
                    <p className="text-amber-800 leading-relaxed text-[11px]">
                      This tender was created by Officer <strong className="font-mono text-slate-900">{formatAddress(selectedTender.officer)}</strong>.
                      In compliance with public procurement regulations and smart contract access control, only the creating officer can advance stages, approve prequalifications, set weights, open bids, score proposals, award, or archive this tender.
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE 1: ADVERTISED -> DEFINE CRITERIA OR SKIP */}
              {selectedTender.state === 0 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The tender is currently in the <strong>Advertisement Stage</strong>. Configure mandatory statutory prequalification criteria, or skip prequalification to allocate evaluation weights and open the bidding stage.
                  </p>
                  {isCurrentTenderCreator ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleOpenPrequalModal}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-all shadow-sm"
                      >
                        <ListChecks className="w-4 h-4" /> Define Criteria & Open Prequalification (Stage 2)
                      </button>
                      <button
                        onClick={handleSkipPrequalification}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-colors border border-slate-300 shadow-sm"
                      >
                        <SkipForward className="w-4 h-4 text-amber-600" /> Skip Prequalification & Allocate Weights (Stage 3)
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Awaiting creating officer ({formatAddress(selectedTender.officer)}) to configure criteria or skip prequalification.
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 2: PREQUALIFICATION OPEN */}
              {selectedTender.state === 1 && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl">
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-amber-700" /> Conclude Prequalification & Set Bidding Weights
                      </h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Review submitted compliance evidence below. When ready, allocate the technical & financial evaluation weights and open the Stage 3 bidding window.
                      </p>
                    </div>
                    {isCurrentTenderCreator ? (
                      <button
                        onClick={handlePromptWeightsBeforeBidding}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 transition-all shadow-sm whitespace-nowrap"
                      >
                        <Sliders className="w-4 h-4" /> Allocate Weights & Open Bid Submission (Stage 3)
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        Creating officer ({formatAddress(selectedTender.officer)}) only
                      </span>
                    )}
                  </div>

                  {/* Stored On-Chain Criteria Checklist */}
                  {selectedTender.criteria?.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider flex items-center gap-1.5">
                          <ListChecks className="w-4 h-4 text-blue-600" /> Finalized On-Chain Prequalification Criteria ({selectedTender.criteria.length})
                        </h5>
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono font-bold">
                          Immutably Stored in Contract
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {selectedTender.criteria.map((crit, idx) => (
                          <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> {crit.name}
                              </span>
                              {crit.requiresUpload ? (
                                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold">
                                  Upload Required
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                                  Declaration Only
                                </span>
                              )}
                            </div>
                            {crit.minimumRequirement && (
                              <p className="text-[11px] text-slate-600 mt-1.5 font-mono leading-relaxed pl-5">
                                Min Requirement: <span className="text-slate-800 font-semibold">{crit.minimumRequirement}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Registered Bidders Table */}
                  <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-mono">
                        <tr>
                          <th className="p-3 rounded-l-lg">Bidder Address</th>
                          <th className="p-3">Prequalification Status</th>
                          <th className="p-3 text-right rounded-r-lg">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTender.bidders?.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="p-4 text-center text-slate-500">
                              No contractors registered yet. Switch to a Bidder Account in the top navigation to register and upload compliance certificates.
                            </td>
                          </tr>
                        ) : (
                          selectedTender.bidders?.map((b) => (
                            <tr key={b.address} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-slate-800 font-bold">{b.address}</td>
                              <td className="p-3">
                                {b.prequalified ? (
                                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-semibold flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Approval
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleInspectBidderPrequal(b.address)}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-600" /> Inspect Evidence
                                  </button>
                                  {!b.prequalified && isCurrentTenderCreator && (
                                    <button
                                      onClick={() => handleApprovePrequalification(b.address)}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Approve
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STAGE 3: SUBMITTED (BIDDING OPEN) -> REQUIREMENT 4: SEALED VAULT (OFFICERS CANNOT VIEW BIDS) */}
              {selectedTender.state === 2 && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">Stage 3: Sealed Bid Submission Window Active</h5>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Prequalified contractors are submitting sealed cryptographic document hashes. Opening is cryptographically locked until the deadline expires.
                      </p>
                    </div>

                    {isCurrentTenderCreator ? (
                      <div className="flex items-center gap-2">
                        {!timeRemaining.passed && (
                          <button
                            onClick={handleFastForward}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 transition-all shadow-2xs"
                            title="Fast-forward blockchain time past the tender deadline on Hardhat"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-600" /> Fast-Forward Past Deadline
                          </button>
                        )}
                        <button
                          onClick={handleOpenTender}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 transition-all shadow-sm"
                        >
                          <Unlock className="w-4 h-4" /> Open Tender Bids (Stage 4)
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        Creating officer ({formatAddress(selectedTender.officer)}) only
                      </span>
                    )}
                  </div>

                  {/* PROMINENT REQUIREMENT 4: SEALED BIDDING VAULT RESTRICTION NOTICE */}
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-slate-900 space-y-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-amber-950">
                            Sealed Bidding Protocol Enforced (Public Procurement Standard)
                          </h5>
                          <span className="text-[10px] uppercase font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                            Restricted Access
                          </span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          In accordance with statutory Public Procurement Regulations and Quantity Surveying Sealed Bid protocols, <strong>submitted proposal documents are cryptographically sealed in the on-chain vault</strong>.
                          Procurement officers and auditors can view submitted contractor addresses, timestamps, and on-chain hash commitments below, but are <strong>strictly restricted from inspecting, downloading, or viewing submitted contractor proposal documents</strong> until the submission deadline expires and the tender is officially opened in <strong>Stage 4 (Opening Stage)</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200 text-xs font-mono">
                      <div className="bg-white/80 p-3 rounded-xl border border-amber-200">
                        <span className="text-slate-500 block text-[11px]">Vault Status:</span>
                        <span className="text-amber-900 font-bold text-sm block mt-0.5">
                          {selectedTender.submittedBidders?.length || 0} Sealed Proposals Locked
                        </span>
                      </div>

                      <div className="bg-white/80 p-3 rounded-xl border border-amber-200">
                        <span className="text-slate-500 block text-[11px]">Submission Deadline:</span>
                        <span className={`font-bold text-sm block mt-0.5 ${timeRemaining.passed ? "text-emerald-700 font-bold" : "text-amber-800"}`}>
                          {timeRemaining.text}
                        </span>
                      </div>

                      <div className="bg-white/80 p-3 rounded-xl border border-amber-200 flex flex-col justify-between">
                        <span className="text-slate-500 block text-[11px]">Allocated Weights:</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-bold text-slate-900 text-xs">
                            <strong className="text-blue-700">{selectedTender.weightTechnical}% Tech</strong> / <strong className="text-purple-700">{selectedTender.weightFinancial}% Fin</strong>
                          </span>
                          {isCurrentTenderCreator && (
                            <button
                              onClick={handleOpenWeightsModalOnly}
                              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-300 shadow-2xs"
                            >
                              Adjust
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {!timeRemaining.passed && (
                      <p className="text-[11px] text-amber-800 italic">
                        Tip for Testing: Click the "Fast-Forward Past Deadline" button above to immediately simulate deadline expiration on the blockchain, or click "Open Tender Bids (Stage 4)" which will auto-advance past the deadline.
                      </p>
                    )}
                  </div>

                  {/* SEALED SUBMISSIONS LEDGER TABLE (SHOWS SUBMITTED BIDS, FORBIDS DOCUMENT ACCESS) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-amber-600" /> Sealed Submitted Bids Vault Ledger ({selectedTender.bidders?.filter((b) => b.hasSubmitted && !b.withdrawn).length || 0})
                      </h5>
                      <span className="text-[10px] uppercase font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-700" /> Documents Cryptographically Sealed
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-mono">
                          <tr>
                            <th className="p-3 rounded-l-lg">Contractor / Bidder</th>
                            <th className="p-3">Sealed Document Hash (Keccak-256)</th>
                            <th className="p-3">Submission Timestamp</th>
                            <th className="p-3">Vault Status</th>
                            <th className="p-3 text-right rounded-r-lg">Proposal Document Access</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedTender.bidders?.filter((b) => b.hasSubmitted && !b.withdrawn).length === 0 ? (
                            <tr>
                              <td colSpan="5" className="p-4 text-center text-slate-500">
                                No contractor proposals submitted yet. Switch to a Commercial Bidder account in the top navigation (e.g. Account #1, #2, or #3) to upload and seal a proposal hash on-chain.
                              </td>
                            </tr>
                          ) : (
                            selectedTender.bidders
                              ?.filter((b) => b.hasSubmitted && !b.withdrawn)
                              .map((b) => (
                                <tr key={b.address} className="hover:bg-slate-50">
                                  <td className="p-3">
                                    <div className="font-bold text-slate-900">{getContractorName(b.address)}</div>
                                    <div className="font-mono text-[11px] text-slate-500">{b.address}</div>
                                  </td>
                                  <td className="p-3 font-mono text-slate-700 text-[11px] max-w-xs truncate" title={b.docHash}>
                                    {formatHash(b.docHash)}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600 text-[11px]">
                                    {formatTimestamp(b.submissionTimestamp)}
                                  </td>
                                  <td className="p-3">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                      <Lock className="w-3 h-3 text-amber-600" /> Sealed On-Chain
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-mono font-semibold cursor-not-allowed select-none"
                                      title="Proposal document files remain sealed and cannot be viewed or downloaded until Stage 4 (Opening)"
                                    >
                                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Document Sealed (Locked)</span>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 4 & 5: OPENED & EVALUATED -> UNSEALED PROPOSALS INSPECTION & SCORING */}
              {(selectedTender.state === 3 || selectedTender.state === 4) && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">
                        {selectedTender.state === 3 ? "Stage 4: Tender Opened — Bids Unsealed" : "Stage 5: Evaluation & Scoring (Write-Once Guarantee)"}
                      </h5>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Weighted Evaluation Formula: <strong className="text-slate-800 font-mono">Total = (Tech * {selectedTender.weightTechnical}%) + (Fin * {selectedTender.weightFinancial}%)</strong>
                      </p>
                    </div>

                    {selectedTender.state === 4 && (
                      isCurrentTenderCreator ? (
                        <button
                          onClick={handleAwardTender}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-all shadow-sm"
                        >
                          <Award className="w-4 h-4" /> Determine Winner & Award Tender (Stage 6)
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          Creating officer ({formatAddress(selectedTender.officer)}) only
                        </span>
                      )
                    )}
                  </div>

                  {/* UNSEALED PROPOSALS INSPECTION TABLE (Accessible in Stage 4 & 5) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" /> Unsealed Submitted Proposals ({selectedTender.submittedBidders?.length || 0})
                      </h5>
                      <button
                        onClick={fetchOffChainDocs}
                        className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-mono font-semibold"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-600" /> Refresh Docs
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-mono">
                          <tr>
                            <th className="p-3 rounded-l-lg">Contractor</th>
                            <th className="p-3">Sealed Document Hash</th>
                            <th className="p-3">Submission Timestamp</th>
                            <th className="p-3 text-right rounded-r-lg">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedTender.bidders?.filter((b) => b.hasSubmitted && !b.withdrawn).length === 0 ? (
                            <tr>
                              <td colSpan="4" className="p-4 text-center text-slate-500">
                                No active proposal documents found.
                              </td>
                            </tr>
                          ) : (
                            selectedTender.bidders
                              ?.filter((b) => b.hasSubmitted && !b.withdrawn)
                              .map((b) => (
                                <tr key={b.address} className="hover:bg-slate-50">
                                  <td className="p-3 font-mono font-bold text-slate-900">
                                    {formatAddress(b.address)}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600 text-[11px] max-w-xs truncate">
                                    {b.docHash}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600">
                                    {formatTimestamp(b.submissionTimestamp)}
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => handleViewDocument(b)}
                                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold border border-blue-200 inline-flex items-center gap-1.5 transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-blue-600" /> Inspect Proposal
                                      </button>
                                      <a
                                        href={`http://localhost:3001/api/document-by-hash/${b.docHash}?download=true`}
                                        download
                                        title="Download Proposal Document"
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 inline-flex items-center gap-1 transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bidders Evaluation & Scoring Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTender.bidders?.filter((b) => b.hasSubmitted && !b.withdrawn).map((b) => {
                      const currentScores = evalScores[b.address] || { tech: 85, fin: 85 };
                      const liveTotal = (Number(currentScores.tech) * selectedTender.weightTechnical) +
                                        (Number(currentScores.fin) * selectedTender.weightFinancial);

                      return (
                        <div
                          key={b.address}
                          className={`p-4 rounded-2xl border transition-all ${
                            b.evaluated
                              ? "bg-slate-50 border-slate-200"
                              : "bg-white border-amber-300 shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                            <span className="font-mono font-bold text-slate-900 truncate">
                              {formatAddress(b.address)}
                            </span>
                            {b.evaluated ? (
                              <span className="text-emerald-700 font-mono text-[11px] font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Evaluated (Locked)
                              </span>
                            ) : (
                              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono font-bold text-[11px]">
                                Awaiting Score
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2">
                            <span className="truncate max-w-[200px]">Doc: {formatHash(b.docHash)}</span>
                            <button
                              type="button"
                              onClick={() => handleViewDocument(b)}
                              className="text-blue-700 hover:text-blue-900 flex items-center gap-1 text-[11px] font-sans font-bold bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                            >
                              <Eye className="w-3 h-3" /> View Proposal
                            </button>
                          </div>

                          {b.evaluated ? (
                            <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs font-mono">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Technical Score ({selectedTender.weightTechnical}%):</span>
                                <span className="font-bold text-slate-800">{b.technicalScore} / 100</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Financial Score ({selectedTender.weightFinancial}%):</span>
                                <span className="font-bold text-slate-800">{b.financialScore} / 100</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-100 text-sm">
                                <span className="font-bold text-slate-700">Total Weighted Score:</span>
                                <span className="font-extrabold text-emerald-700">{b.totalScore} / 10,000</span>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 space-y-3 text-xs">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-slate-700 font-semibold block mb-1">
                                    Tech Score (0-100):
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={currentScores.tech}
                                    onChange={(e) =>
                                      setEvalScores({
                                        ...evalScores,
                                        [b.address]: {
                                          ...currentScores,
                                          tech: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-slate-700 font-semibold block mb-1">
                                    Fin Score (0-100):
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={currentScores.fin}
                                    onChange={(e) =>
                                      setEvalScores({
                                        ...evalScores,
                                        [b.address]: {
                                          ...currentScores,
                                          fin: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                                <span className="text-slate-600">Calculated Total:</span>
                                <span className="font-bold text-amber-900">{liveTotal} / 10,000</span>
                              </div>

                              {isCurrentTenderCreator && (
                                <button
                                  type="button"
                                  onClick={() => handleSubmitEvaluation(b.address)}
                                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-sm"
                                >
                                  Submit Permanent Score (Write-Once)
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STAGE 6: AWARDED -> ARCHIVE TENDER */}
              {selectedTender.state === 5 && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <Award className="w-8 h-8 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900">
                        Winner Formally Awarded On-Chain: {getContractorName(selectedTender.winner)} ({formatAddress(selectedTender.winner)})
                      </div>
                      <div className="text-xs text-emerald-700 font-mono">
                        Winning Score: {selectedTender.winningScore} / 10,000
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <h5 className="font-bold text-xs text-slate-800 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" /> Official Signed Contract Upload & Archival Seal
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Upload the official signed contract document with Bills of Quantities and performance milestones.
                      <strong> The winning bidder will only be able to view and download this contract once you upload it here.</strong>
                    </p>

                    {uploadedContractMeta ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Official Award Contract Uploaded:
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                            Active Award Document
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-700 space-y-0.5 bg-white p-2.5 rounded-lg border border-emerald-200">
                          <div>File: <strong className="text-slate-900">{uploadedContractMeta.originalName || uploadedContractMeta.storedName}</strong></div>
                          <div>Hash (Keccak-256): <span className="text-slate-900 break-all">{uploadedContractMeta.docHash}</span></div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`http://localhost:3001/api/award-contract/${selectedTender.id}?view=true`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-800 inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" /> View Contract
                          </a>
                          <a
                            href={`http://localhost:3001/api/award-contract/${selectedTender.id}?download=true`}
                            download
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Contract
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Award contract document not yet uploaded. Winning contractor cannot download the contract until you upload it below.</span>
                      </div>
                    )}

                    {isCurrentTenderCreator && (
                      <div className="space-y-3 pt-2">
                        <FileHasher
                          label="Upload Official Signed Award Contract Document"
                          category="award_contract"
                          onHashReady={(hash, url, fileName) => {
                            setArchiveHash(hash);
                            setUploadedContractMeta({
                              docHash: hash,
                              downloadUrl: url,
                              originalName: fileName,
                              storedName: fileName,
                              uploadedAt: new Date().toISOString(),
                            });
                          }}
                          tenderId={selectedTender.id}
                        />

                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            disabled={!archiveHash}
                            onClick={handleArchiveTender}
                            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                          >
                            <Lock className="w-4 h-4 text-amber-400" /> Seal & Permanently Archive Tender Record (Stage 7)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STAGE 7: ARCHIVED (PERMANENTLY SEALED) */}
              {selectedTender.state === 6 && (
                <div className="p-5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-700 text-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 block text-sm">Tender Record Sealed & Archived Permanently</span>
                      <p className="text-slate-600 text-[11px] font-mono">
                        Audit Hash Seal: <strong className="text-slate-800 break-all">{selectedTender.finalDocHash}</strong> (All state-changing functions permanently locked on-chain).
                      </p>
                    </div>
                  </div>

                  {uploadedContractMeta && (
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-700 font-semibold">
                        Archived Contract: {uploadedContractMeta.originalName || uploadedContractMeta.storedName}
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`http://localhost:3001/api/award-contract/${selectedTender.id}?view=true`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-800 inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> View
                        </a>
                        <a
                          href={`http://localhost:3001/api/award-contract/${selectedTender.id}?download=true`}
                          download
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADVERTISE NEW TENDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-600" />
                <h3 className="text-xl font-bold text-slate-900">Advertise New Tender</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTender} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-800 font-bold block mb-1">Tender Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Construction of 10km Dual-Carriageway Highway"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="text-slate-800 font-bold block mb-1">Project Scope & Description:</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Detailed engineering scope, technical deliverables, and statutory compliance framework..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-800 font-bold block mb-1">Bidding Duration (Days):</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.durationDays}
                    onChange={(e) => setCreateForm({ ...createForm, durationDays: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-bold block mb-1">Tender Dossier Fee (ETH):</label>
                  <input
                    type="text"
                    placeholder="0.05"
                    value={createForm.tenderFee}
                    onChange={(e) => setCreateForm({ ...createForm, tenderFee: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* QS Guidance Note on Weights */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-[11px]">
                  <Scale className="w-3.5 h-3.5 text-blue-700" /> Quantity Surveying Evaluation Note
                </span>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  In accordance with standard quantity surveying practices, <strong>Technical and Financial evaluation weights will be configured after contractor prequalification concludes and the bidding stage begins</strong>.
                </p>
              </div>

              {/* RFP Specification Document Upload */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-slate-800 font-bold block">
                  Official RFP Specification Dossier:
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs">
                    <UploadCloud className="w-4 h-4 text-amber-600" /> Select RFP Dossier (PDF/TXT)
                    <input type="file" onChange={handleSpecFileUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSampleSpec}
                    className="w-full sm:w-auto px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-xl border border-amber-200 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" /> 1-Click Sample Spec
                  </button>
                </div>
                {createForm.specDocName && (
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700">
                    Selected: <strong>{createForm.specDocName}</strong>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">Hash: {createForm.specDocHash}</div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-sm"
                >
                  Publish & Advertise Tender On-Chain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUIREMENT 2: MODAL TO ALLOW PROCUREMENT OFFICER TO SET EVALUATION WEIGHTS */}
      {showWeightsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Allocate Evaluation Weights</h3>
                  <p className="text-xs text-slate-500">
                    Stage 3: Bid Submission Window — Tender #{selectedTender?.id}: {selectedTender?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWeightsModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-4 leading-relaxed">
              <span className="font-bold flex items-center gap-1 mb-0.5">
                <Scale className="w-3.5 h-3.5 text-amber-700" /> Quantity Surveying & Public Procurement Standard:
              </span>
              Technical and financial evaluation weights are officially established upon conclusion of contractor prequalification when official bidding documents are issued.
            </div>

            <form onSubmit={handleSaveWeightsModalSubmit} className="space-y-4 text-xs">
              {/* Presets */}
              <div>
                <label className="text-slate-700 font-bold block mb-2 font-mono uppercase text-[11px]">
                  Standard Procurement Weighting Presets:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWeightsForm({ ...weightsForm, tech: 70, fin: 30 })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      weightsForm.tech === 70 && weightsForm.fin === 30
                        ? "bg-slate-900 text-white border-slate-800 font-bold shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold">70% Tech / 30% Fin</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Civil Works & Major Projects</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWeightsForm({ ...weightsForm, tech: 80, fin: 20 })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      weightsForm.tech === 80 && weightsForm.fin === 20
                        ? "bg-slate-900 text-white border-slate-800 font-bold shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold">80% Tech / 20% Fin</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Specialized Tech & Consulting</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWeightsForm({ ...weightsForm, tech: 60, fin: 40 })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      weightsForm.tech === 60 && weightsForm.fin === 40
                        ? "bg-slate-900 text-white border-slate-800 font-bold shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold">60% Tech / 40% Fin</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Standard Construction</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWeightsForm({ ...weightsForm, tech: 50, fin: 50 })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      weightsForm.tech === 50 && weightsForm.fin === 50
                        ? "bg-slate-900 text-white border-slate-800 font-bold shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold">50% Tech / 50% Fin</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Equipment & Commercial Supply</div>
                  </button>
                </div>
              </div>

              {/* Custom Sliders / Inputs */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1.5">
                    <span>Technical Evaluation Weight:</span>
                    <span className="text-blue-700 font-mono text-sm">{weightsForm.tech}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={weightsForm.tech}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setWeightsForm({ ...weightsForm, tech: val, fin: 100 - val });
                    }}
                    className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1.5">
                    <span>Financial Evaluation Weight:</span>
                    <span className="text-purple-700 font-mono text-sm">{weightsForm.fin}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={weightsForm.fin}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setWeightsForm({ ...weightsForm, fin: val, tech: 100 - val });
                    }}
                    className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Distribution Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span>Technical ({weightsForm.tech}%)</span>
                    <span>Financial ({weightsForm.fin}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${weightsForm.tech}%` }}
                    />
                    <div
                      className="h-full bg-purple-600 transition-all duration-300"
                      style={{ width: `${weightsForm.fin}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWeightsModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Scale className="w-4 h-4 text-amber-400" />
                  {weightsForm.actionAfter === "openSubmission"
                    ? "Allocate Weights & Open Bid Submission (Stage 3)"
                    : weightsForm.actionAfter === "skipPrequal"
                    ? "Allocate Weights & Open Bid Submission (Stage 3)"
                    : "Save Evaluation Weights On-Chain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREQUALIFICATION CRITERIA BUILDER MODAL */}
      {showPrequalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <ListChecks className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Mandatory Statutory Prequalification Criteria Builder
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bureau of Public Procurement (BPP) Statutory Compliance Framework
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrequalModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-6 text-xs flex-1">
              {/* Selected Criteria List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono uppercase font-bold text-slate-700 tracking-wider text-[11px]">
                    Active Prequalification Criteria ({criteriaList.length}):
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Criteria are immutably stored on the blockchain
                  </span>
                </div>

                {criteriaList.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                    No criteria added yet. Select from statutory library below or add custom criteria.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {criteriaList.map((crit, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {idx + 1}. {crit.name}
                            </span>
                            {crit.requiresUpload ? (
                              <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold">
                                Upload Required
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                                Declaration Only
                              </span>
                            )}
                          </div>
                          {crit.minReq && (
                            <p className="text-[11px] text-slate-500 font-mono">
                              Min Requirement: <span className="text-slate-800">{crit.minReq}</span>
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(idx)}
                          className="text-red-600 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0 self-end sm:self-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Library of Criteria */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="font-mono uppercase font-bold text-slate-700 tracking-wider text-[11px]">
                  Add Statutory Procurement Criteria:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {NIGERIAN_PROCUREMENT_CRITERIA_REFERENCE.map((ref, idx) => {
                    const isAdded = criteriaList.some((c) => c.name.toLowerCase() === ref.name.toLowerCase());
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddCriterionFromLibrary(ref)}
                        className={`p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between ${
                          isAdded
                            ? "bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
                            : "bg-white border-slate-200 hover:border-blue-400 text-slate-800 hover:bg-blue-50/50 shadow-2xs"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-bold truncate">{ref.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{ref.category}</div>
                        </div>
                        {isAdded ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Criterion Input */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="font-mono uppercase font-bold text-slate-700 tracking-wider text-[11px]">
                  Add Custom Project-Specific Criterion:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Criterion Name (e.g. COREN Certification)"
                      value={customCriterionName}
                      onChange={(e) => setCustomCriterionName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Minimum requirement description..."
                      value={customCriterionMin}
                      onChange={(e) => setCustomCriterionMin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customRequiresUpload}
                      onChange={(e) => setCustomRequiresUpload(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    Require contractor evidence document upload
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomCriterion}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                  >
                    Add Custom Criterion
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPrequalModal(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSkipPrequalification}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 flex items-center justify-center gap-1.5"
                >
                  <SkipForward className="w-3.5 h-3.5 text-amber-600" /> Skip Prequalification
                </button>

                <button
                  type="button"
                  disabled={criteriaList.length === 0}
                  onClick={handleInitiatePrequalification}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-1.5"
                >
                  <ListChecks className="w-4 h-4" /> Submit Criteria & Open Stage 2
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICER OFF-CHAIN DOCUMENT VIEWER MODAL */}
      {showDocViewerModal && selectedDocDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submitted Proposal Dossier (Off-Chain)</h3>
                  <p className="text-[11px] text-slate-500">
                    Contractor Proposal Review & Cryptographic Verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDocViewerModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-4 text-xs flex-1">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-500 font-mono">Contractor Address:</span>
                  <span className="font-mono text-slate-900 font-bold">{selectedDocDetails.bidder}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-mono block mb-1">On-Chain Sealed Hash (Keccak-256):</span>
                  <div className="font-mono text-slate-900 break-all text-[11px] bg-white p-2.5 rounded-xl border border-slate-200">
                    {selectedDocDetails.docHash}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between text-slate-500 font-mono text-[11px] pt-1">
                  <span>Timestamp: {formatTimestamp(selectedDocDetails.submissionTimestamp)}</span>
                  {selectedDocDetails.sizeBytes && (
                    <span>Size: {(selectedDocDetails.sizeBytes / 1024).toFixed(1)} KB</span>
                  )}
                  <span>File: {selectedDocDetails.originalName || selectedDocDetails.storedName}</span>
                </div>
              </div>

              {/* In-Modal Text / Content Preview */}
              {selectedDocDetails.contentPreview ? (
                <div className="space-y-1.5">
                  <span className="font-mono uppercase font-bold text-slate-600 tracking-wider text-[10px]">
                    Proposal Content Preview:
                  </span>
                  <pre className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                    {selectedDocDetails.contentPreview}
                  </pre>
                </div>
              ) : null}

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Off-Chain Repository Link Ready
                  </div>
                  <p className="text-[11px] text-emerald-700 font-mono">
                    {selectedDocDetails.originalName || selectedDocDetails.storedName || "Contractor_Proposal.txt"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`http://localhost:3001/api/document-by-hash/${selectedDocDetails.docHash}?view=true`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open File
                  </a>
                  <a
                    href={`http://localhost:3001/api/document-by-hash/${selectedDocDetails.docHash}?download=true`}
                    download
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Proposal
                  </a>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowDocViewerModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN OFFICER ACCREDITATION MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-bold text-slate-900">Accredit Procurement Officer</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Grant institutional accreditation to an Ethereum wallet address, permitting it to advertise and manage tenders.
            </p>

            <form onSubmit={handleAuthorizeOfficer} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-800 font-bold block mb-1">Officer Public Address (0x...):</label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={authForm.address}
                  onChange={(e) => setAuthForm({ ...authForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-800 font-bold block mb-1">Ministry / Agency Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Federal Ministry of Works & Housing"
                  value={authForm.agency}
                  onChange={(e) => setAuthForm({ ...authForm, agency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm"
                >
                  Grant Officer Accreditation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICER PREQUALIFICATION EVIDENCE REVIEW MODAL */}
      {showPrequalInspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <ListChecks className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Inspect Prequalification Evidence Dossier</h3>
                  <p className="text-[11px] text-slate-500">
                    Contractor: <span className="text-slate-900 font-mono font-bold">{inspectingBidderAddress}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrequalInspectModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-4 text-xs flex-1">
              {loadingPrequalDocs ? (
                <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  Loading submitted compliance documents from off-chain storage...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-mono uppercase font-bold text-slate-700 tracking-wider text-[11px]">
                      On-Chain Criteria vs. Submitted Evidence
                    </h4>
                    <span className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-mono font-bold">
                      {bidderPrequalDocs.length} Document(s) Uploaded
                    </span>
                  </div>

                  {selectedTender?.criteria?.map((crit, idx) => {
                    const matchedDoc = bidderPrequalDocs.find(
                      (d) => d.criterionIndex === idx || (d.criterionName && d.criterionName.toLowerCase() === crit.name.toLowerCase())
                    );

                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> {crit.name}
                            </span>
                            {crit.minimumRequirement && (
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5 pl-5">
                                Min Requirement: <span className="text-slate-800 font-semibold">{crit.minimumRequirement}</span>
                              </p>
                            )}
                          </div>
                          {crit.requiresUpload ? (
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold shrink-0">
                              Upload Required
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono shrink-0">
                              Declaration Only
                            </span>
                          )}
                        </div>

                        {matchedDoc ? (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 ml-5">
                            {matchedDoc.declarationText && (
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1">
                                <span className="font-bold text-slate-700 block font-mono text-[10px] uppercase">Contractor Typed Declaration:</span>
                                <span className="font-sans text-slate-800">{matchedDoc.declarationText}</span>
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="font-mono text-slate-900 text-xs font-bold">{matchedDoc.originalName}</span>
                                <span className="text-[10px] text-slate-500">({(matchedDoc.sizeBytes / 1024).toFixed(1)} KB)</span>
                              </div>
                              <a
                                href={matchedDoc.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                              >
                                <Download className="w-3.5 h-3.5 text-amber-600" /> View Off-Chain File
                              </a>
                            </div>
                            <div className="text-[10px] font-mono text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 truncate">
                              Cryptographic Hash: {matchedDoc.docHash}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] ml-5 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            {crit.requiresUpload ? "No evidence document uploaded for this mandatory requirement." : "Self-declared compliant by bidder."}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPrequalInspectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Close Review
              </button>
              {isCurrentTenderCreator && (
                <button
                  type="button"
                  onClick={async () => {
                    setShowPrequalInspectModal(false);
                    await handleApprovePrequalification(inspectingBidderAddress);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Approve Prequalification On-Chain
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txModal.isOpen}
        onClose={() => setTxModal((prev) => ({ ...prev, isOpen: false }))}
        status={txModal.status}
        title={txModal.title}
        message={txModal.message}
        txHash={txModal.txHash}
        error={txModal.error}
      />
    </div>
  );
}
