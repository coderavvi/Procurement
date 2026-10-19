import React, { useState } from "react";
import { hashFileClientSide } from "../utils/hashing";
import { Upload, CheckCircle, FileText, Copy, Check, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

export default function FileHasher({
  onHashReady,
  disabled = false,
  label = "Upload Proposal Document",
  tenderId = null,
  bidderAddress = null,
  category = "general",
}) {
  const [file, setFile] = useState(null);
  const [hashResult, setHashResult] = useState(null);
  const [hashing, setHashing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [verifyMatch, setVerifyMatch] = useState(null);

  const processFile = async (selectedFile) => {
    setFile(selectedFile);
    setHashing(true);
    setVerifyMatch(null);
    setUploadStatus(null);

    try {
      // 1. Compute Keccak-256 Hash strictly in browser
      const result = await hashFileClientSide(selectedFile);
      setHashResult(result);

      // 2. Optionally upload to local mock off-chain storage server
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("document", selectedFile);
        formData.append("docHash", result.hash);
        formData.append("category", category);
        if (tenderId) formData.append("tenderId", tenderId);
        if (bidderAddress) formData.append("bidder", bidderAddress);

        const res = await fetch("http://localhost:3001/api/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          setUploadStatus({
            success: true,
            downloadUrl: json.file.downloadUrl,
            message: "Stored in local off-chain repository",
          });
          onHashReady(result.hash, json.file.downloadUrl, selectedFile.name);
        } else {
          setUploadStatus({ success: false, message: "Storage server offline; hash computed locally." });
          onHashReady(result.hash, null, selectedFile.name);
        }
      } catch (uploadErr) {
        console.warn("Storage server not reachable, using local hash only:", uploadErr);
        setUploadStatus({ success: false, message: "Storage server offline; hash computed locally." });
        onHashReady(result.hash, null, selectedFile.name);
      } finally {
        setUploading(false);
      }
    } catch (err) {
      console.error("Hashing error:", err);
    } finally {
      setHashing(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const handleGenerateMockFile = async () => {
    const timestamp = new Date().toISOString();
    let mockContent = "";
    let mockFileName = "";

    if (category === "award_contract") {
      mockContent = `================================================================================
OFFICIAL CERTIFIED PUBLIC PROCUREMENT CONTRACT AWARD & EXECUTION AGREEMENT
================================================================================
Tender ID: #${tenderId || "01"}
Date of Execution: ${timestamp}
Issuing Procurement Authority: Federal Ministry / Public Procurement Agency
Accredited Officer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

1. FORMAL RESOLUTION OF CONTRACT AWARD:
   In accordance with the Public Procurement Act and automated smart contract
   evaluation protocols, this contract is officially awarded to the evaluated contractor.

2. TERMS OF PERFORMANCE & MILESTONES:
   - Mobilization & Site Possession: Within 14 Days of execution.
   - Milestone 1 Deliverables: 30% Progress Payment.
   - Milestone 2 Deliverables: 50% Progress Payment.
   - Final Handover & Retention: 20% Final Payment.

3. STATUTORY VERIFICATION & DIGITALLY SEALED HASH:
   - Authenticated and signed by Government Procurement Officer.
   - Permanent Blockchain Archive Hash to be committed on-chain.
================================================================================`;
      mockFileName = `Signed_Award_Contract_Tender_${tenderId || "1"}_${Date.now().toString().slice(-4)}.txt`;
    } else {
      mockContent = `=== COMMERCIAL TENDER PROPOSAL ===
Organization: Enterprise Engineering Consortium
Submission Date: ${timestamp}
Technical Specifications: Section A-F compliant with municipal guidelines.
Financial Bid: $1,250,000.00 USD
Security Guarantee: Sealed on Hardhat Blockchain
Random Nonce: ${Math.random().toString(36).substring(2)}
===================================`;
      mockFileName = `Proposal_Packet_${Date.now().toString().slice(-4)}.txt`;
    }

    const blob = new Blob([mockContent], { type: "text/plain" });
    const mockFile = new File([blob], mockFileName, {
      type: "text/plain",
    });

    await processFile(mockFile);
  };

  const handleRehash = async () => {
    if (!file || !hashResult) return;
    setHashing(true);
    try {
      const secondHash = await hashFileClientSide(file);
      if (secondHash.hash === hashResult.hash) {
        setVerifyMatch("PASSED");
      } else {
        setVerifyMatch("FAILED");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHashing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600" />
          {label}
        </label>
        <span className="text-[11px] text-slate-500 font-mono font-semibold">
          Client-Side Keccak-256
        </span>
      </div>

      {/* File Dropzone */}
      <div className="relative border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-6 text-center transition-colors bg-slate-50/70">
        <input
          type="file"
          disabled={disabled || hashing}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-sm font-semibold text-slate-800">
            {file ? file.name : "Click or drag & drop document here"}
          </div>
          <p className="text-xs text-slate-500">
            PDF, DOCX, ZIP or any file type (computed client-side before submission)
          </p>
        </div>
      </div>

      {/* 1-Click Mock File Generator Button */}
      {!disabled && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleGenerateMockFile}
            className="text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> {category === "award_contract" ? "Generate Official Award Contract Sample File" : "Generate Sample Test Proposal File"}
          </button>
        </div>
      )}

      {/* Hashing Result Display */}
      {hashing && (
        <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 font-semibold animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Computing client-side Keccak-256 fingerprint in browser...
        </div>
      )}

      {hashResult && !hashing && (
        <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider font-mono">
                On-Chain Document Fingerprint (Keccak-256):
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(hashResult.hash)}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-mono font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="font-mono text-xs text-slate-900 break-all bg-white p-2.5 rounded-lg border border-slate-200 shadow-inner">
              {hashResult.hash}
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-mono">
              <span>Size: {(hashResult.size / 1024).toFixed(1)} KB</span>
              <span>Type: {hashResult.type}</span>
            </div>
          </div>

          {/* Verification / Re-hash Section */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleRehash}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-semibold border border-slate-200"
            >
              <RefreshCw className="w-3 h-3" />
              Re-hash to verify deterministic output
            </button>

            {verifyMatch === "PASSED" && (
              <span className="text-xs text-emerald-700 flex items-center gap-1 font-bold">
                <CheckCircle className="w-3.5 h-3.5" /> Deterministic Match Verified (100%)
              </span>
            )}
            {verifyMatch === "FAILED" && (
              <span className="text-xs text-red-600 flex items-center gap-1 font-bold">
                <AlertCircle className="w-3.5 h-3.5" /> Mismatch Detected
              </span>
            )}
          </div>

          {/* Off-chain Storage status banner */}
          {uploadStatus && (
            <div
              className={`text-xs p-2.5 rounded-xl border flex items-center justify-between ${
                uploadStatus.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium"
                  : "bg-amber-50 border-amber-200 text-amber-800 font-medium"
              }`}
            >
              <span>{uploadStatus.message}</span>
              {uploadStatus.downloadUrl && (
                <a
                  href={uploadStatus.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-emerald-950 font-bold ml-2"
                >
                  View Off-Chain File
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
