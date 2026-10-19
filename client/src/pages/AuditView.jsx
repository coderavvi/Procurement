import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { formatAddress, formatHash, formatTimestamp, STAGES } from "../utils/formatting";
import { hashFileClientSide } from "../utils/hashing";
import {
  History,
  ShieldCheck,
  Search,
  CheckCircle2,
  FileText,
  Clock,
  Award,
  Lock,
  Layers,
  Check,
  Copy,
  ExternalLink,
  Filter,
  RefreshCw,
  Coins,
  RotateCcw,
  Sliders,
  Scale
} from "lucide-react";

export default function AuditView({ selectedTenderId, onSelectTender }) {
  const { contract, tenders, provider } = useWeb3();

  const [activeTenderId, setActiveTenderId] = useState(selectedTenderId || (tenders.length > 0 ? tenders[0].id : 1));
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [copiedHash, setCopiedHash] = useState(null);

  // Independent Auditor Hash Verifier Tool
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyHash, setVerifyHash] = useState("");
  const [matchingEvent, setMatchingEvent] = useState(null);
  const [hasChecked, setHasChecked] = useState(false);

  const fetchTenderEvents = useCallback(async (id) => {
    if (!contract || !provider || !id) return;
    setLoadingEvents(true);
    try {
      const tenderIdNum = Number(id);

      // Query all contract event filters for this tenderId
      const eventDefs = [
        { name: "TenderAdvertised", filter: contract.filters.TenderAdvertised(tenderIdNum), stage: 0 },
        { name: "TenderDocumentPurchased", filter: contract.filters.TenderDocumentPurchased(tenderIdNum), stage: 2 },
        { name: "TenderFeesWithdrawn", filter: contract.filters.TenderFeesWithdrawn(tenderIdNum), stage: 2 },
        { name: "PrequalificationInitiated", filter: contract.filters.PrequalificationInitiated(tenderIdNum), stage: 1 },
        { name: "PrequalificationSkipped", filter: contract.filters.PrequalificationSkipped(tenderIdNum), stage: 1 },
        { name: "PrequalificationOpened", filter: contract.filters.PrequalificationOpened(tenderIdNum), stage: 1 },
        { name: "BidderRegistered", filter: contract.filters.BidderRegistered(tenderIdNum), stage: 1 },
        { name: "BidderPrequalified", filter: contract.filters.BidderPrequalified(tenderIdNum), stage: 1 },
        { name: "EvaluationWeightsSet", filter: contract.filters.EvaluationWeightsSet(tenderIdNum), stage: 2 },
        { name: "SubmissionOpened", filter: contract.filters.SubmissionOpened(tenderIdNum), stage: 2 },
        { name: "BidSubmitted", filter: contract.filters.BidSubmitted(tenderIdNum), stage: 2 },
        { name: "BidWithdrawn", filter: contract.filters.BidWithdrawn(tenderIdNum), stage: 2 },
        { name: "BidSubstituted", filter: contract.filters.BidSubstituted(tenderIdNum), stage: 2 },
        { name: "TenderOpened", filter: contract.filters.TenderOpened(tenderIdNum), stage: 3 },
        { name: "BidEvaluated", filter: contract.filters.BidEvaluated(tenderIdNum), stage: 4 },
        { name: "TenderAwarded", filter: contract.filters.TenderAwarded(tenderIdNum), stage: 5 },
        { name: "TenderArchived", filter: contract.filters.TenderArchived(tenderIdNum), stage: 6 },
      ];

      const allLogs = [];

      for (const def of eventDefs) {
        try {
          const logs = await contract.queryFilter(def.filter, 0, "latest");
          for (const log of logs) {
            const block = await provider.getBlock(log.blockNumber);
            allLogs.push({
              eventName: def.name,
              stageId: def.stage,
              blockNumber: log.blockNumber,
              timestamp: block ? block.timestamp : 0,
              txHash: log.transactionHash,
              args: log.args,
            });
          }
        } catch (filterErr) {
          console.warn(`Filter error for ${def.name}:`, filterErr);
        }
      }

      // Sort chronologically by block number and log index
      allLogs.sort((a, b) => a.blockNumber - b.blockNumber || a.timestamp - b.timestamp);
      setEvents(allLogs);
    } catch (err) {
      console.error("Error fetching audit events:", err);
    } finally {
      setLoadingEvents(false);
    }
  }, [contract, provider]);

  useEffect(() => {
    if (activeTenderId) {
      fetchTenderEvents(activeTenderId);
    }
  }, [activeTenderId, fetchTenderEvents]);

  const selectedTender = tenders.find((t) => t.id === Number(activeTenderId));

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(key);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Independent Auditor Hash Verification
  const handleVerifyFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVerifyFile(file);
    setHasChecked(true);

    try {
      const res = await hashFileClientSide(file);
      setVerifyHash(res.hash);

      const match = events.find((ev) => {
        if (ev.eventName === "TenderAdvertised" && ev.args.specDocHash && ev.args.specDocHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" && ev.args.specDocHash.toLowerCase() === res.hash.toLowerCase()) {
          return true;
        }
        if (ev.eventName === "BidSubmitted" && ev.args.docHash?.toLowerCase() === res.hash.toLowerCase()) {
          return true;
        }
        if (ev.eventName === "BidSubstituted" && (ev.args.newDocHash?.toLowerCase() === res.hash.toLowerCase() || ev.args.oldDocHash?.toLowerCase() === res.hash.toLowerCase())) {
          return true;
        }
        if (ev.eventName === "TenderArchived" && ev.args.finalDocHash?.toLowerCase() === res.hash.toLowerCase()) {
          return true;
        }
        return false;
      });

      setMatchingEvent(match || null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner - Quantity Surveying Minimal Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              <History className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-bold text-slate-900">Cryptographic Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Immutable, zero-trust event log queried directly from the smart contract logs across all 7 lifecycle stages.
          </p>
        </div>

        <button
          onClick={() => fetchTenderEvents(activeTenderId)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-2 transition-colors border border-slate-300 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? "animate-spin" : ""}`} /> Refresh Logs
        </button>
      </div>

      {/* Tender Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
          Select Tender to Inspect Audit Trail:
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
              Tender #{t.id}: {t.title} ({STAGES[t.state]?.label})
            </option>
          ))}
        </select>
      </div>

      {/* AUDIT TIMELINE & VERIFICATION TOOL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Chronological Event Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> On-Chain State Machine Logs
            </h3>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {events.length} Cryptographic Events
            </span>
          </div>

          {loadingEvents ? (
            <div className="text-center py-16 text-slate-500 text-xs animate-pulse">
              Querying event filters from local blockchain node...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <p className="text-slate-500 text-sm">No on-chain events found for Tender #{activeTenderId}.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-8 my-4">
              {events.map((ev, idx) => {
                const stage = STAGES[ev.stageId] || { label: "State", color: "" };

                return (
                  <div key={`${ev.txHash}-${idx}`} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-900 ring-4 ring-white border-2 border-slate-300 group-hover:scale-125 transition-transform" />

                    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition-all shadow-sm">
                      {/* Event Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {ev.eventName}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${stage.color}`}>
                            {stage.label}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{formatTimestamp(ev.timestamp)}</span>
                        </div>
                      </div>

                      {/* Event Content & Details */}
                      <div className="mt-3 space-y-2 text-xs font-mono">
                        {ev.eventName === "TenderAdvertised" && (
                          <div className="space-y-2 text-slate-700">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>Title: <span className="font-sans text-slate-900 font-bold">{ev.args.title}</span></div>
                              <div>Officer: <span className="text-slate-900 font-bold">{formatAddress(ev.args.officer)}</span></div>
                              <div>Initial Weights: <span className="text-slate-900 font-bold">{ev.args.weightTechnical?.toString()}% Tech / {ev.args.weightFinancial?.toString()}% Fin</span></div>
                              <div>Deadline: <span className="text-amber-800 font-bold">{formatTimestamp(ev.args.deadline)}</span></div>
                            </div>
                            {ev.args.specDocHash && ev.args.specDocHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
                              <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <div><span className="text-slate-500 font-semibold">RFP Specification Hash: </span><span className="font-mono text-slate-900 font-bold break-all">{ev.args.specDocHash}</span></div>
                                {ev.args.tenderFee !== undefined && (
                                  <div><span className="text-slate-500 font-semibold">Dossier Purchase Fee: </span><span className="font-mono text-slate-900 font-bold">{ev.args.tenderFee > 0n ? `${ethers.formatEther(ev.args.tenderFee)} ETH` : "Free"}</span></div>
                                )}
                              </div>
                            )}
                            {ev.args.description && (
                              <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <span className="text-slate-500 font-semibold block mb-0.5">Description / Scope:</span>
                                <span className="font-sans text-slate-800">{ev.args.description}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {ev.eventName === "EvaluationWeightsSet" && (
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <Scale className="w-4 h-4 text-amber-700" /> Bidding Evaluation Weights Configured
                            </div>
                            <div className="text-xs">
                              Technical: <strong className="text-blue-800">{ev.args.weightTechnical?.toString()}%</strong> | Financial: <strong className="text-purple-800">{ev.args.weightFinancial?.toString()}%</strong>
                            </div>
                            <div className="text-[11px] text-amber-800">
                              Established by procurement officer following prequalification for Stage 3 bidding.
                            </div>
                          </div>
                        )}

                        {ev.eventName === "TenderDocumentPurchased" && (
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Coins className="w-4 h-4 text-amber-700" /> Tender Document Purchased On-Chain
                            </div>
                            <div>Contractor: <span className="text-slate-900 font-bold">{ev.args.bidder}</span></div>
                            <div>Participation Fee Paid: <strong className="text-slate-900">{ev.args.feePaid ? `${ethers.formatEther(ev.args.feePaid)} ETH` : "0 ETH"}</strong></div>
                          </div>
                        )}

                        {ev.eventName === "TenderFeesWithdrawn" && (
                          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Coins className="w-4 h-4 text-emerald-600" /> Accumulated Tender Purchase Fees Withdrawn
                            </div>
                            <div>Officer: <span className="text-slate-900 font-bold">{ev.args.officer}</span></div>
                            <div>Amount Withdrawn: <strong className="text-slate-900">{ev.args.amount ? `${ethers.formatEther(ev.args.amount)} ETH` : "0 ETH"}</strong></div>
                          </div>
                        )}

                        {ev.eventName === "PrequalificationInitiated" && (
                          <div className="text-blue-900 bg-blue-50 p-3 rounded-xl border border-blue-200">
                            <div>Institutional Prequalification Initiated with <strong className="text-slate-900">{ev.args.criteriaCount?.toString()} criteria</strong> stored on-chain.</div>
                          </div>
                        )}

                        {ev.eventName === "PrequalificationSkipped" && (
                          <div className="text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200">
                            <div>Prequalification stage skipped on-chain. Advanced directly to Open Submission with 0 criteria.</div>
                          </div>
                        )}

                        {ev.eventName === "BidderRegistered" && (
                          <div className="text-slate-700">
                            Registered Bidder: <span className="text-slate-900 font-bold">{ev.args.bidder}</span>
                          </div>
                        )}

                        {ev.eventName === "BidderPrequalified" && (
                          <div className="text-emerald-800 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Prequalification Approved: <span className="font-bold text-slate-900">{ev.args.bidder}</span>
                          </div>
                        )}

                        {ev.eventName === "BidSubmitted" && (
                          <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="text-slate-600">Bidder: <span className="text-slate-900 font-bold">{ev.args.bidder}</span></div>
                            <div className="text-slate-600">
                              Document Fingerprint (Keccak-256):
                              <span className="text-slate-900 font-bold block break-all text-[11px] mt-0.5">{ev.args.docHash}</span>
                            </div>
                          </div>
                        )}

                        {ev.eventName === "BidWithdrawn" && (
                          <div className="space-y-1 bg-red-50 p-3 rounded-xl border border-red-200 text-red-900">
                            <div>Bidder <strong className="text-slate-900">{ev.args.bidder}</strong> withdrew their sealed bid proposal.</div>
                            <div className="text-[11px] text-red-700">Status: Excluded from opening, evaluation, and award.</div>
                          </div>
                        )}

                        {ev.eventName === "BidSubstituted" && (
                          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            <div className="text-slate-900 font-bold flex items-center gap-1.5">
                              <RotateCcw className="w-3.5 h-3.5 text-blue-600" /> Bid Proposal Substituted by {ev.args.bidder}
                            </div>
                            <div className="text-slate-600 text-[11px] space-y-1 font-mono">
                              <div>
                                <span className="text-slate-500 font-bold">Prior Hash (Archived in Log):</span>
                                <span className="block text-slate-700 break-all text-[10px] bg-white p-1.5 rounded border border-slate-200 mt-0.5">
                                  {ev.args.oldDocHash}
                                </span>
                              </div>
                              <div>
                                <span className="text-emerald-700 font-bold">New Active Hash (Current):</span>
                                <span className="block text-slate-900 font-bold break-all text-[10px] bg-white p-1.5 rounded border border-emerald-300 mt-0.5">
                                  {ev.args.newDocHash}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {ev.eventName === "TenderOpened" && (
                          <div className="text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-bold">
                            Bids unsealed and opened at timestamp {ev.args.timestamp?.toString()}
                          </div>
                        )}

                        {ev.eventName === "BidEvaluated" && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-slate-700">
                            <div>Evaluated Bidder: <span className="text-slate-900 font-bold">{ev.args.bidder}</span></div>
                            <div className="flex items-center gap-4 text-xs">
                              <span>Tech Score: <strong className="text-slate-900">{ev.args.technicalScore?.toString()}/100</strong></span>
                              <span>Fin Score: <strong className="text-slate-900">{ev.args.financialScore?.toString()}/100</strong></span>
                              <span className="text-emerald-700 font-bold">Total Weighted Score: {ev.args.totalScore?.toString()}</span>
                            </div>
                          </div>
                        )}

                        {ev.eventName === "TenderAwarded" && (
                          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900">
                            <div className="font-bold flex items-center gap-1.5 text-sm">
                              <Award className="w-4 h-4 text-emerald-600" /> Winner Awarded On-Chain
                            </div>
                            <div className="mt-1">Winning Address: <strong className="text-slate-900">{ev.args.winner}</strong></div>
                            <div>Final Winning Score: <strong className="text-emerald-800">{ev.args.winningScore?.toString()} / 10,000</strong></div>
                          </div>
                        )}

                        {ev.eventName === "TenderArchived" && (
                          <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 text-slate-700 space-y-1">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Lock className="w-4 h-4 text-slate-600" /> Tender Permanently Archived & Sealed
                            </div>
                            <div>Final Document Hash: <span className="text-slate-900 font-bold block break-all text-[11px]">{ev.args.finalDocHash}</span></div>
                          </div>
                        )}

                        {/* Transaction Metadata Footer */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 border-t border-slate-100">
                          <span>Block #{ev.blockNumber}</span>
                          <div className="flex items-center gap-1">
                            <span>Tx: {formatHash(ev.txHash)}</span>
                            <button
                              onClick={() => copyToClipboard(ev.txHash, `tx-${idx}`)}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              {copiedHash === `tx-${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Independent Document Verifier Tool */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-24">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900">Independent Document Verifier</h4>
                <p className="text-[11px] text-slate-500">
                  Zero-trust cryptographic proof test
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Upload any local proposal file or award certificate to compute its Keccak-256 hash in your browser and verify if it matches an immutable record in the audit log.
            </p>

            <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-5 text-center transition-colors bg-slate-50">
              <input
                type="file"
                onChange={handleVerifyFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                <FileText className="w-8 h-8 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  {verifyFile ? verifyFile.name : "Select Document to Verify"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Computed locally using ethers.keccak256
                </span>
              </div>
            </div>

            {hasChecked && verifyHash && (
              <div className="mt-4 space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase text-slate-500 font-mono font-bold block mb-1">
                    Computed Keccak-256:
                  </span>
                  <div className="font-mono text-slate-900 break-all text-[11px] font-bold">
                    {verifyHash}
                  </div>
                </div>

                {matchingEvent ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% Cryptographic Match Found
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-tight">
                      This file exactly matches on-chain event <strong>{matchingEvent.eventName}</strong> at Block #{matchingEvent.blockNumber}.
                    </p>
                    <div className="text-[10px] text-slate-600 font-mono pt-1">
                      Tx: {formatHash(matchingEvent.txHash)}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <span className="font-bold block mb-1">No Matching On-Chain Hash</span>
                    <p className="text-[11px] text-amber-800">
                      The computed fingerprint does not match any sealed bid or archive document in Tender #{activeTenderId}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
