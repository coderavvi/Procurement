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
  parseContractError
} from "../utils/formatting";
import { hashFileClientSide } from "../utils/hashing";
import {
  FileCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  UserPlus,
  ShieldCheck,
  Award,
  Hash,
  Info,
  RotateCcw,
  XCircle,
  UploadCloud,
  ListChecks,
  RefreshCw,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Coins,
  Download,
  Eye,
  Sparkles,
  Check,
  Upload,
  ExternalLink,
  Users,
  Building2,
  Lock,
  Scale,
  X
} from "lucide-react";

export default function BidderPortal({ selectedTenderId, onSelectTender }) {
  const { account, contract, tenders, refreshTenders, selectedHardhatIndex, switchAccount, isAuthorizedOfficer, isAdmin, blockchainTimestamp } = useWeb3();

  const [activeTenderId, setActiveTenderId] = useState(selectedTenderId || (tenders.length > 0 ? tenders[0].id : null));
  const [computedDocHash, setComputedDocHash] = useState("");
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState("");

  // Substitution state
  const [replacementDocHash, setReplacementDocHash] = useState("");
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);

  // Prequalification Evidence Upload Modal States
  const [showPrequalSubmitModal, setShowPrequalSubmitModal] = useState(false);
  const [prequalEvidenceDocs, setPrequalEvidenceDocs] = useState({});
  const [prequalDeclarations, setPrequalDeclarations] = useState({});
  const [uploadingPrequal, setUploadingPrequal] = useState(false);
  const [showMyEvidenceModal, setShowMyEvidenceModal] = useState(false);
  const [myEvidenceList, setMyEvidenceList] = useState([]);
  const [loadingMyEvidence, setLoadingMyEvidence] = useState(false);

  // RFP Specification Preview Modal State
  const [showSpecPreviewModal, setShowSpecPreviewModal] = useState(false);
  const [specPreviewText, setSpecPreviewText] = useState("");
  const [loadingSpecPreview, setLoadingSpecPreview] = useState(false);

  // Award contract document uploaded by officer
  const [awardContractDoc, setAwardContractDoc] = useState(null);
  const [checkingContractDoc, setCheckingContractDoc] = useState(false);

  // Modal / Transaction States
  const [txModal, setTxModal] = useState({
    isOpen: false,
    status: "idle",
    txHash: null,
    error: null,
    title: "",
    message: "",
  });

  const selectedTender = tenders.find((t) => t.id === Number(activeTenderId));
  const currentBidderInfo = selectedTender?.bidders?.find(
    (b) => b.address.toLowerCase() === account.toLowerCase()
  );

  const timeRemaining = selectedTender ? getTimeRemaining(selectedTender.deadline, blockchainTimestamp) : null;
  const hasPurchasedDossier = selectedTender ? (Number(selectedTender.tenderFee) === 0 || selectedTender.hasPurchased) : false;
  const isSubmissionEligible = (selectedTender?.prequalificationSkipped || currentBidderInfo?.prequalified) && hasPurchasedDossier;

  // Check if official award contract document has been uploaded by the procurement officer
  useEffect(() => {
    let isMounted = true;
    const fetchAwardContractDoc = async () => {
      if (!selectedTender || selectedTender.state < 5) {
        if (isMounted) setAwardContractDoc(null);
        return;
      }
      setCheckingContractDoc(true);
      try {
        const finalHashParam = selectedTender.finalDocHash ? `&finalHash=${selectedTender.finalDocHash}` : "";
        const res = await fetch(`http://localhost:3001/api/award-contract/${selectedTender.id}?json=true${finalHashParam}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setAwardContractDoc(data.document || null);
        } else {
          if (isMounted) setAwardContractDoc(null);
        }
      } catch (e) {
        if (isMounted) setAwardContractDoc(null);
      } finally {
        if (isMounted) setCheckingContractDoc(false);
      }
    };
    fetchAwardContractDoc();
  }, [selectedTender?.id, selectedTender?.state, selectedTender?.finalDocHash]);

  // Handle Tender Document Purchase in Crypto (ETH / MON)
  const handlePurchaseTender = async () => {
    if (!contract || !selectedTender) return;

    setTxModal({
      isOpen: true,
      status: "pending",
      title: "Purchasing Official Tender Dossier",
      message: `Sending payment of ${selectedTender.tenderFee} ETH to unlock tender specifications...`,
      txHash: null,
      error: null,
    });

    try {
      const feeWei = ethers.parseEther(selectedTender.tenderFee);
      const tx = await contract.purchaseTenderDocument(selectedTender.id, { value: feeWei });
      const receipt = await tx.wait();

      setTxModal({
        isOpen: true,
        status: "success",
        title: "Tender Dossier Purchased & Unlocked!",
        message: "Payment confirmed on-chain. Tender specifications downloaded and submission authorized.",
        txHash: receipt.hash,
        error: null,
      });

      await refreshTenders();
    } catch (err) {
      console.error("Purchase error:", err);
      setTxModal({
        isOpen: true,
        status: "error",
        title: "Purchase Failed",
        message: "Transaction reverted by smart contract.",
        txHash: null,
        error: parseContractError(err),
      });
    }
  };

  // Handle attaching individual prequalification criterion document
  const handlePrequalFileSelect = async (criterionIndex, criterionName, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await hashFileClientSide(file);
      setPrequalEvidenceDocs((prev) => ({
        ...prev,
        [criterionIndex]: {
          file,
          hash: res.hash,
          name: file.name,
          size: res.size,
          criterionName,
        },
      }));
    } catch (err) {
      console.error("Hashing prequal doc error:", err);
    }
  };

  // 1-Click Auto-generate all required sample documents
  const handleGenerateAllSampleDocs = async () => {
    if (!selectedTender || !selectedTender.criteria) return;
    setUploadingPrequal(true);
    try {
      const generated = {};
      for (let i = 0; i < selectedTender.criteria.length; i++) {
        const crit = selectedTender.criteria[i];
        const timestamp = new Date().toISOString();
        const content = `=== OFFICIAL COMPLIANCE CERTIFICATE ===
Document Type: ${crit.name}
Contractor / Bidder: ${account}
Tender ID: #${selectedTender.id} - ${selectedTender.title}
Certified Requirement: ${crit.minimumRequirement || "Standard Regulatory Compliance"}
Verification Authority: Federal Republic Statutory Portal
Timestamp: ${timestamp}
Nonce: ${Math.random().toString(36).substring(2)}
=======================================`;
        const safeName = crit.name.replace(/[^a-zA-Z0-9]/g, "_");
        const blob = new Blob([content], { type: "text/plain" });
        const mockFile = new File([blob], `${safeName}_Certificate_${account.slice(2, 6)}.txt`, {
          type: "text/plain",
        });
        const res = await hashFileClientSide(mockFile);
        generated[i] = {
          file: mockFile,
          hash: res.hash,
          name: mockFile.name,
          size: res.size,
          criterionName: crit.name,
        };
      }
      setPrequalEvidenceDocs(generated);
    } catch (err) {
      console.error("Auto generate prequal docs error:", err);
    } finally {
      setUploadingPrequal(false);
    }
  };

  // Submit all prequalification documents to off-chain storage and register on blockchain
  const handleSubmitPrequalificationPackage = async (e) => {
    e.preventDefault();
    if (!contract || !selectedTender) return;

    setShowPrequalSubmitModal(false);

    setTxModal({
      isOpen: true,
      status: "pending",
      title: "Submitting Prequalification Evidence",
      message: "Uploading compliance certificates to off-chain repository and registering on blockchain...",
      txHash: null,
      error: null,
    });

    try {
      for (let idx = 0; idx < (selectedTender.criteria?.length || 0); idx++) {
        const crit = selectedTender.criteria[idx];
        const docObj = prequalEvidenceDocs[idx];
        const declarationText = prequalDeclarations[idx] || "";

        if (docObj && docObj.file) {
          try {
            const formData = new FormData();
            formData.append("document", docObj.file);
            formData.append("docHash", docObj.hash);
            formData.append("category", "prequalification_evidence");
            formData.append("criterionName", crit.name);
            formData.append("criterionIndex", idx);
            formData.append("declarationText", declarationText);
            formData.append("tenderId", selectedTender.id);
            formData.append("bidder", account);

            await fetch("http://localhost:3001/api/upload", {
              method: "POST",
              body: formData,
            });
          } catch (uploadErr) {
            console.warn("Off-chain evidence upload warning:", uploadErr);
          }
        }
      }

      const tx = await contract.registerBidder(selectedTender.id);
      const receipt = await tx.wait();

      setTxModal({
        isOpen: true,
        status: "success",
        title: "Registration & Evidence Logged",
        message: "Your prequalification dossier has been submitted and your address registered on-chain.",
        txHash: receipt.hash,
        error: null,
      });

      await refreshTenders();
    } catch (err) {
      console.error("Prequal submission error:", err);
      setTxModal({
        isOpen: true,
        status: "error",
        title: "Registration Failed",
        message: "Smart contract reverted the transaction.",
        txHash: null,
        error: parseContractError(err),
      });
    }
  };

  // View my submitted evidence
  const handleOpenMySubmittedEvidence = async () => {
    setShowMyEvidenceModal(true);
    setLoadingMyEvidence(true);
    try {
      const res = await fetch(`http://localhost:3001/api/prequal-documents/${selectedTender?.id}?bidder=${account}`);
      if (res.ok) {
        const data = await res.json();
        setMyEvidenceList(data.documents || []);
      } else {
        setMyEvidenceList([]);
      }
    } catch (e) {
      console.warn("Could not fetch bidder evidence list:", e);
      setMyEvidenceList([]);
    } finally {
      setLoadingMyEvidence(false);
    }
  };

  // Submit Bid Proposal Hash
  const handleSubmitBid = async () => {
    if (!contract || !selectedTender || !computedDocHash) return;

    setTxModal({
      isOpen: true,
      status: "pending",
      title: "Submitting Proposal Cryptographic Hash",
      message: "Sealing Keccak-256 document fingerprint on the Hardhat blockchain...",
      txHash: null,
      error: null,
    });

    try {
      const tx = await contract.submitBid(selectedTender.id, computedDocHash);
      const receipt = await tx.wait();

      setTxModal({
        isOpen: true,
        status: "success",
        title: "Proposal Fingerprint Sealed On-Chain!",
        message: `Proposal hash ${formatHash(computedDocHash)} permanently immutabilized on blockchain.`,
        txHash: receipt.hash,
        error: null,
      });

      setComputedDocHash("");
      await refreshTenders();
    } catch (err) {
      console.error(err);
      setTxModal({
        isOpen: true,
        status: "error",
        title: "Submission Failed",
        message: "Smart contract reverted the transaction.",
        txHash: null,
        error: parseContractError(err),
      });
    }
  };

  // Withdraw Bid
  const handleWithdrawBid = async () => {
    if (!contract || !selectedTender) return;
    if (!confirm("Are you sure you want to withdraw your active bid? You can submit a new proposal before the deadline closes.")) {
      return;
    }

    setTxModal({
      isOpen: true,
      status: "pending",
      title: "Withdrawing Active Bid",
      message: "Registering official withdrawal on-chain...",
      txHash: null,
      error: null,
    });

    try {
      const tx = await contract.withdrawBid(selectedTender.id);
      const receipt = await tx.wait();

      setTxModal({
        isOpen: true,
        status: "success",
        title: "Bid Withdrawn",
        message: "Your proposal was successfully withdrawn. You may resubmit before the deadline.",
        txHash: receipt.hash,
        error: null,
      });

      await refreshTenders();
    } catch (err) {
      console.error(err);
      setTxModal({
        isOpen: true,
        status: "error",
        title: "Withdrawal Failed",
        message: "Smart contract reverted the transaction.",
        txHash: null,
        error: parseContractError(err),
      });
    }
  };

  // Substitute Bid
  const handleSubstituteBid = async () => {
    if (!contract || !selectedTender || !replacementDocHash) return;

    setShowSubstituteModal(false);

    setTxModal({
      isOpen: true,
      status: "pending",
      title: "Substituting Proposal Document",
      message: "Updating on-chain proposal hash with replacement document fingerprint...",
      txHash: null,
      error: null,
    });

    try {
      const tx = await contract.substituteBid(selectedTender.id, replacementDocHash);
      const receipt = await tx.wait();

      setTxModal({
        isOpen: true,
        status: "success",
        title: "Proposal Replacement Confirmed",
        message: "On-chain proposal hash updated. Prior hash remains recorded in the immutable audit trail.",
        txHash: receipt.hash,
        error: null,
      });

      setReplacementDocHash("");
      await refreshTenders();
    } catch (err) {
      console.error(err);
      setTxModal({
        isOpen: true,
        status: "error",
        title: "Substitution Failed",
        message: "Smart contract reverted the transaction.",
        txHash: null,
        error: parseContractError(err),
      });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner - QS Clean Minimal Styling */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <FileCheck className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-bold text-slate-900">Commercial Contractor & Bidder Portal</h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Register for prequalification, pay required dossier fees, compute client-side Keccak-256 proposal hashes, and track evaluations.
          </p>
        </div>

        {/* Quick Bidder Account Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 font-mono">Contractor Account:</span>
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            <button
              onClick={() => switchAccount(1)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedHardhatIndex === 1
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Alpha (Acc #1)
            </button>
            <button
              onClick={() => switchAccount(2)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedHardhatIndex === 2
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Beta (Acc #2)
            </button>
            <button
              onClick={() => switchAccount(3)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedHardhatIndex === 3
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Gamma (Acc #3)
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Officer / Admin Warning */}
      {(isAuthorizedOfficer || isAdmin) && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-950">Institutional Role Restriction: Connected as Officer / Administrator</h4>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              Your current wallet (<strong className="font-mono text-slate-900">{formatAddress(account)}</strong>) is an accredited Government Procurement Officer. In compliance with public procurement integrity regulations, procurement officers cannot participate as bidders.
            </p>
            <div className="pt-1 flex items-center gap-2">
              <span className="text-[11px] text-amber-900 font-semibold">Switch to contractor:</span>
              <button
                onClick={() => switchAccount(1)}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-slate-900 font-mono text-[10px] font-bold border border-slate-300 shadow-2xs"
              >
                Bidder #1 (Alpha)
              </button>
              <button
                onClick={() => switchAccount(2)}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-slate-900 font-mono text-[10px] font-bold border border-slate-300 shadow-2xs"
              >
                Bidder #2 (Beta)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tender Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
          Select Tender to Participate:
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
          <p className="text-slate-500 text-sm">No tenders available yet. Create one from the Officer Dashboard.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected Tender Overview Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
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

              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-slate-700">{timeRemaining.text}</span>
                </div>
                <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <strong className="text-blue-700">{selectedTender.weightTechnical}% Tech</strong> /{" "}
                  <strong className="text-purple-700">{selectedTender.weightFinancial}% Fin</strong>
                </div>
              </div>
            </div>

            <StageProgressBar currentStage={selectedTender.state} />

            {/* Bidder Status Banner */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-slate-500 uppercase font-mono tracking-wider font-bold block mb-0.5">
                  Your On-Chain Participation Status:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  {currentBidderInfo?.withdrawn ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 font-bold border border-red-200">
                      <XCircle className="w-3.5 h-3.5" /> Bid Withdrawn
                    </span>
                  ) : !currentBidderInfo?.registered ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-300">
                      Not Registered
                    </span>
                  ) : currentBidderInfo?.registered && !currentBidderInfo?.prequalified && !selectedTender.prequalificationSkipped ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Registered — Awaiting Officer Prequalification
                    </span>
                  ) : (currentBidderInfo?.prequalified || selectedTender.prequalificationSkipped) && !currentBidderInfo?.hasSubmitted ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-300">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Eligible to Submit Sealed Bid
                    </span>
                  ) : currentBidderInfo?.hasSubmitted && !currentBidderInfo?.withdrawn ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Active Bid Sealed On-Chain
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Registration & Evidence Actions */}
              {!currentBidderInfo?.registered && selectedTender.state === 1 && (
                <button
                  disabled={isAuthorizedOfficer || isAdmin}
                  onClick={() => setShowPrequalSubmitModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <ListChecks className="w-4 h-4" /> Register & Submit Prequalification Evidence
                </button>
              )}

              {currentBidderInfo?.registered && selectedTender.state === 1 && (
                <button
                  onClick={handleOpenMySubmittedEvidence}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Eye className="w-4 h-4 text-blue-600" /> View My Submitted Evidence
                </button>
              )}
            </div>

            {/* Official Tender Dossier & Fee Payment Card */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-slate-900">Official Tender Specification Dossier (RFP):</span>
                  {selectedTender.specDocHash && (
                    <span className="font-mono text-slate-700 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-300">
                      {formatHash(selectedTender.specDocHash)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span>Required Participation Fee:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {Number(selectedTender.tenderFee) > 0 ? `${selectedTender.tenderFee} ETH` : "Free Access"}
                  </span>
                  {hasPurchasedDossier ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Purchased & Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                      <AlertCircle className="w-3 h-3 text-amber-600" /> Purchase Required Before Bidding
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!hasPurchasedDossier && Number(selectedTender.tenderFee) > 0 ? (
                  <button
                    disabled={isAuthorizedOfficer || isAdmin}
                    onClick={handlePurchaseTender}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                  >
                    <Coins className="w-4 h-4" /> Purchase Tender Dossier ({selectedTender.tenderFee} ETH)
                  </button>
                ) : (
                  <a
                    href={`http://localhost:3001/api/document-by-hash/${selectedTender.specDocHash}?download=true`}
                    download
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap shadow-2xs"
                  >
                    <Download className="w-4 h-4 text-amber-600" /> Download RFP Specifications
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* STAGE 1: ON-CHAIN PREQUALIFICATION CRITERIA DISPLAY */}
          {selectedTender.state === 1 && selectedTender.criteria?.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-blue-600" /> Mandatory Prequalification Criteria Checklist
                </h4>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-mono font-bold">
                  {selectedTender.criteria.length} Requirements Stored On-Chain
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedTender.criteria.map((c, i) => (
                  <div key={i} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> {c.name}
                      </span>
                      {c.requiresUpload ? (
                        <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold">
                          Upload Required
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                          Declaration Only
                        </span>
                      )}
                    </div>
                    {c.minimumRequirement && (
                      <p className="text-[11px] text-slate-600 font-mono pl-5 leading-relaxed">
                        Min Threshold: <span className="text-slate-800 font-semibold">{c.minimumRequirement}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 3: DOCUMENT HASHING & BID SUBMISSION */}
          {selectedTender.state === 2 && (!currentBidderInfo?.hasSubmitted || currentBidderInfo?.withdrawn) && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Sealed Bid Submission</h4>
                    <p className="text-xs text-slate-500">
                      Compute cryptographic fingerprint client-side using Keccak-256 and seal it on the blockchain.
                    </p>
                  </div>
                </div>

                {!isSubmissionEligible && (
                  <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Requires Prequalification Approval & Purchased Dossier
                  </div>
                )}
                {selectedTender.prequalificationSkipped && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-mono font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Direct Open Submission (Prequalification Skipped)
                  </div>
                )}
              </div>

              {currentBidderInfo?.withdrawn && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Your previous bid was withdrawn. You may submit a new proposal before the deadline closes.</span>
                </div>
              )}

              {/* Evaluation Weights Information Banner */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Scale className="w-5 h-5 text-blue-700 shrink-0" />
                  <div>
                    <span className="font-bold text-blue-950 block text-xs">Official Evaluation Criteria Weights Allocated:</span>
                    <p className="text-blue-800 text-[11px]">
                      Configured on-chain by the procurement officer for this bidding stage.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono font-bold shrink-0">
                  <span className="bg-white text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                    Technical: {selectedTender.weightTechnical}%
                  </span>
                  <span className="bg-white text-purple-800 px-3 py-1.5 rounded-xl border border-purple-200 shadow-2xs">
                    Financial: {selectedTender.weightFinancial}%
                  </span>
                </div>
              </div>

              {/* File Hasher Component */}
              <FileHasher
                disabled={!isSubmissionEligible || timeRemaining.passed}
                label="Select Tender Proposal Document"
                tenderId={selectedTender.id}
                bidderAddress={account}
                onHashReady={(hash, url, name) => {
                  setComputedDocHash(hash);
                  setFileUrl(url);
                  setFileName(name);
                }}
              />

              {/* Submit Bid Button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  {isAuthorizedOfficer || isAdmin ? (
                    <span className="text-amber-800 font-semibold">Procurement officers cannot submit bids.</span>
                  ) : timeRemaining.passed ? (
                    <span className="text-red-700 font-semibold">Deadline has passed. Submissions closed.</span>
                  ) : !isSubmissionEligible ? (
                    <span>You must be approved for prequalification and purchase dossier before submitting.</span>
                  ) : !computedDocHash ? (
                    <span>Select a file above to generate cryptographic hash.</span>
                  ) : (
                    <span className="text-emerald-700 font-mono font-bold">Hash ready for on-chain submission.</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!isSubmissionEligible || !computedDocHash || timeRemaining.passed || isAuthorizedOfficer || isAdmin}
                  onClick={handleSubmitBid}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm"
                >
                  <Send className="w-4 h-4" /> Submit Sealed Bid to Blockchain
                </button>
              </div>
            </div>
          )}

          {/* SUBMITTED RECEIPT / ACTIVE PROOF CARD WITH WITHDRAW & SUBSTITUTE */}
          {currentBidderInfo?.hasSubmitted && !currentBidderInfo?.withdrawn && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Bid Successfully Sealed & Verified</h4>
                    <p className="text-xs text-slate-500">
                      Your proposal fingerprint is permanently immutabilized on the blockchain.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold">
                  Active On-Chain
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-mono block mb-1">Active Document Fingerprint (Keccak-256):</span>
                  <div className="font-mono text-slate-900 break-all text-xs font-bold">
                    {currentBidderInfo.docHash}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div>
                    <span className="text-slate-500 font-mono block">Submission / Update Timestamp:</span>
                    <span className="font-mono text-slate-800 font-bold">
                      {formatTimestamp(currentBidderInfo.submissionTimestamp)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono block">Bidder Address:</span>
                    <span className="font-mono text-slate-700 truncate block">
                      {currentBidderInfo.address}
                    </span>
                  </div>
                </div>
              </div>

              {/* STAGE 3 PRE-OPENING BID ACTIONS: WITHDRAW & SUBSTITUTE */}
              {selectedTender.state === 2 && !timeRemaining.passed && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600" /> Pre-Opening Management Window
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      While the tender is in Stage 3 before deadline closing, you may withdraw your bid or upload a replacement document.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleWithdrawBid}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4 text-red-600" /> Withdraw Bid
                    </button>

                    <button
                      onClick={() => setShowSubstituteModal(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5 transition-colors"
                    >
                      <UploadCloud className="w-4 h-4 text-blue-600" /> Upload Replacement Document
                    </button>
                  </div>
                </div>
              )}

              {/* Evaluation & Scoring Feedback (if evaluated) */}
              {currentBidderInfo.evaluated && (
                <div className="mt-4 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs space-y-2">
                  <div className="font-bold text-blue-950 flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-700" /> Evaluation Results
                  </div>
                  <div className="grid grid-cols-3 gap-3 font-mono">
                    <div className="bg-white p-2.5 rounded-lg border border-blue-200">
                      <span className="text-slate-500 block">Tech Score ({selectedTender.weightTechnical}%):</span>
                      <span className="font-bold text-slate-900 text-sm">{currentBidderInfo.technicalScore} / 100</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-blue-200">
                      <span className="text-slate-500 block">Fin Score ({selectedTender.weightFinancial}%):</span>
                      <span className="font-bold text-slate-900 text-sm">{currentBidderInfo.financialScore} / 100</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-blue-200">
                      <span className="text-blue-700 font-bold block">Total Weighted:</span>
                      <span className="font-extrabold text-blue-950 text-sm">{currentBidderInfo.totalScore} / 10,000</span>
                    </div>
                  </div>

                  {selectedTender.state >= 5 && (
                    <div className="pt-2 text-xs">
                      {selectedTender.winner.toLowerCase() === account.toLowerCase() ? (
                        <div className="text-emerald-800 font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600" /> Congratulations! Your proposal was awarded the contract.
                        </div>
                      ) : (
                        <div className="text-slate-600">
                          Tender awarded to {formatAddress(selectedTender.winner)} with score {selectedTender.winningScore}.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STAGE 6 & 7: OFFICIAL AWARD CONTRACT & RESOLUTION CARD FOR BIDDERS */}
          {selectedTender.state >= 5 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Official Tender Award Contract & Resolution</h4>
                    <p className="text-xs text-slate-500">
                      {selectedTender.state === 6
                        ? "Tender permanently sealed & archived on-chain (Stage 7). Award contract is certified & immutable."
                        : "Winning bidder determined algorithmically on-chain (Stage 6: Awarded)."}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200 font-bold">
                  {selectedTender.state === 6 ? "Stage 7: Sealed & Archived" : "Stage 6: Awarded"}
                </span>
              </div>

              {/* Awarded Winner Banner */}
              <div
                className={`p-4 rounded-2xl border ${
                  selectedTender.winner.toLowerCase() === account.toLowerCase()
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                      Awarded Contractor / Winning Wallet:
                    </span>
                    <span className="font-mono text-slate-900 font-extrabold text-sm sm:text-base break-all">
                      {selectedTender.winner}
                    </span>
                    {selectedTender.winner.toLowerCase() === account.toLowerCase() && (
                      <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> Your proposal was awarded this contract!
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono shrink-0 text-left sm:text-right">
                    <span className="text-[10px] text-slate-500 block">Winning Score:</span>
                    <span className="text-lg font-extrabold text-emerald-700">{selectedTender.winningScore}</span>
                    <span className="text-slate-500 text-xs"> / 10,000</span>
                  </div>
                </div>
              </div>

              {/* Final Document Hash & Download Action Bar (RESTRICTED TO WINNING BIDDER ONLY) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-slate-600 font-mono font-semibold block">
                    Cryptographic Contract Seal (Final Hash):
                  </span>
                  <div className="font-mono text-slate-900 break-all text-[11px] bg-white p-2.5 rounded-xl border border-slate-200">
                    {selectedTender.finalDocHash &&
                    selectedTender.finalDocHash !==
                      "0x0000000000000000000000000000000000000000000000000000000000000000"
                      ? selectedTender.finalDocHash
                      : "Official Contract Sealed On-Chain"}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-slate-900 font-bold block">Official Award Contract Document:</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Execution terms, Bills of Quantities (BOQ), and certified milestones uploaded by procurement officer.
                    </p>
                  </div>

                  {selectedTender.winner.toLowerCase() === account.toLowerCase() ? (
                    awardContractDoc ? (
                      <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Official Signed Contract Available
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                            Officer Uploaded
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-xs font-mono space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">File:</span>
                            <span className="font-bold text-slate-900 truncate max-w-xs">{awardContractDoc.originalName || awardContractDoc.storedName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Size:</span>
                            <span className="text-slate-800">{((awardContractDoc.sizeBytes || 0) / 1024).toFixed(1)} KB</span>
                          </div>
                          <div className="pt-1 border-t border-slate-100 flex flex-col">
                            <span className="text-slate-500 text-[10px]">Hash (Keccak-256):</span>
                            <span className="text-slate-900 font-bold text-[10px] break-all">{awardContractDoc.docHash || selectedTender.finalDocHash}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <a
                            href={`http://localhost:3001/api/award-contract/${selectedTender.id}?view=true`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" /> View Contract Document
                          </a>
                          <a
                            href={`http://localhost:3001/api/award-contract/${selectedTender.id}?download=true`}
                            download
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Award Contract
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-amber-950">
                          <Clock className="w-4 h-4 text-amber-700" />
                          <span>Official Contract Document Pending Officer Upload</span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Your proposal was awarded this contract on-chain. The procurement officer is preparing the official signed contract agreement.
                          <strong> You will be able to view and download the official contract document here once the officer uploads it.</strong>
                        </p>
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-[11px] font-mono font-bold shadow-2xs">
                            <Lock className="w-3.5 h-3.5 text-amber-700" /> Download Locked (Awaiting Officer Document Upload)
                          </span>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-amber-950">Contract Document Access Restricted</strong>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                          In accordance with public procurement data privacy, official signed contract execution documents can only be downloaded by the awarded contractor (<strong>{formatAddress(selectedTender.winner)}</strong>) and accredited procurement officers.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBSTITUTE BID REPLACEMENT MODAL */}
      {showSubstituteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                  <RotateCcw className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Replacement Proposal Document</h3>
                  <p className="text-[11px] text-slate-500">
                    Substitute your active bid hash before deadline closes (Stage 3).
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSubstituteModal(false);
                  setReplacementDocHash("");
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-mono block">Current Active Fingerprint:</span>
              <span className="font-mono text-slate-800 break-all text-[11px] font-bold">{currentBidderInfo?.docHash}</span>
            </div>

            <FileHasher
              label="Select Replacement Tender Document"
              tenderId={selectedTender?.id}
              bidderAddress={account}
              onHashReady={(hash) => {
                setReplacementDocHash(hash);
              }}
            />

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 text-[11px]">
                Note: The prior document hash will remain immutably visible in the audit event trail.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubstituteModal(false);
                    setReplacementDocHash("");
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!replacementDocHash || replacementDocHash.toLowerCase() === currentBidderInfo?.docHash.toLowerCase()}
                  onClick={handleSubstituteBid}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Replacement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREQUALIFICATION EVIDENCE SUBMISSION MODAL */}
      {showPrequalSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <ListChecks className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Prequalification Evidence Submission</h3>
                  <p className="text-[11px] text-slate-500">
                    Attach required statutory and technical compliance documents for <span className="text-slate-900 font-bold">Tender #{selectedTender?.id}</span>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrequalSubmitModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPrequalificationPackage} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto px-6 py-4 space-y-4 text-xs flex-1">
                {/* 1-Click Sample Generator Banner */}
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Fast-Track Testing
                    </h5>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Auto-generate valid sample compliance certificates for every requested criterion with 1 click.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={uploadingPrequal}
                    onClick={handleGenerateAllSampleDocs}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> {uploadingPrequal ? "Generating..." : "Auto-Fill All Files"}
                  </button>
                </div>

                {/* Criteria Checklist & File Attachment Rows */}
                <div className="space-y-3">
                  <h4 className="font-mono uppercase font-bold text-slate-700 tracking-wider text-[11px]">
                    Procurement Specified Requirements ({selectedTender?.criteria?.length || 0})
                  </h4>

                  {selectedTender?.criteria?.map((crit, idx) => {
                    const attachedDoc = prequalEvidenceDocs[idx];
                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> {crit.name}
                            </span>
                            {crit.minimumRequirement && (
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5 pl-5">
                                Requirement: <span className="text-slate-800 font-semibold">{crit.minimumRequirement}</span>
                              </p>
                            )}
                          </div>
                          {crit.requiresUpload ? (
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold shrink-0">
                              Upload Mandatory
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono shrink-0">
                              Declaration / Optional Upload
                            </span>
                          )}
                        </div>

                        {/* Contractor Text Input */}
                        <div className="pl-5 space-y-1">
                          <label className="text-[10px] text-slate-500 font-mono block font-semibold">
                            {crit.requiresUpload ? "Contractor Certificate Ref / Notes (Optional):" : "Contractor Text Declaration / Value (Input Field):"}
                          </label>
                          <input
                            type="text"
                            placeholder={crit.requiresUpload ? "e.g. Certificate Registration Number, Reference ID..." : "Type declaration, certificate number, or specification compliance value..."}
                            value={prequalDeclarations[idx] || ""}
                            onChange={(e) => setPrequalDeclarations({ ...prequalDeclarations, [idx]: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>

                        {/* File Selector & Hash Status */}
                        <div className="flex flex-wrap items-center gap-2 pl-5">
                          <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs">
                            <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                            <span>{attachedDoc ? "Replace Document" : "Attach Document"}</span>
                            <input
                              type="file"
                              onChange={(e) => handlePrequalFileSelect(idx, crit.name, e)}
                              className="hidden"
                            />
                          </label>

                          <span className="text-[11px] text-slate-500 truncate max-w-[220px]">
                            {attachedDoc?.name || (crit.requiresUpload ? "No document attached yet" : "Self-declared compliant")}
                          </span>

                          {attachedDoc?.hash && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] shrink-0 font-bold">
                              <Check className="w-3 h-3 text-emerald-600" /> Attached & Hashed
                            </span>
                          )}
                        </div>

                        {attachedDoc?.hash && (
                          <div className="text-[10px] font-mono text-slate-600 bg-white p-1.5 rounded border border-slate-200 truncate ml-5">
                            Hash: {attachedDoc.hash}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                <span className="text-[11px] text-slate-500">
                  {Object.keys(prequalEvidenceDocs).length} of {selectedTender?.criteria?.length || 0} documents attached
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPrequalSubmitModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Evidence & Register on Blockchain
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BIDDER'S SUBMITTED EVIDENCE VIEWER MODAL */}
      {showMyEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <FileCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Your Submitted Prequalification Evidence</h3>
                  <p className="text-[11px] text-slate-500">
                    Off-chain repository documents submitted for <span className="text-slate-900 font-bold">Tender #{selectedTender?.id}</span>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMyEvidenceModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-3 text-xs flex-1">
              {loadingMyEvidence ? (
                <div className="py-8 text-center text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  Loading submitted documents from off-chain storage...
                </div>
              ) : myEvidenceList.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  No documents found in storage for this bidder.
                </div>
              ) : (
                myEvidenceList.map((doc, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" /> {doc.criterionName || `Criterion #${idx + 1}`}
                      </span>
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-600" /> View Off-Chain File
                      </a>
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                      <span>File: <strong className="text-slate-800 font-mono">{doc.originalName}</strong></span>
                      <span>Size: {(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span>Uploaded: {formatTimestamp(Math.floor(new Date(doc.uploadedAt).getTime() / 1000))}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 bg-white p-1.5 rounded border border-slate-200 truncate">
                      Cryptographic Hash: {doc.docHash}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowMyEvidenceModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
              >
                Close
              </button>
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
