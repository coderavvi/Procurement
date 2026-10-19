import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import StageBadge from "../components/StageBadge";
import StageProgressBar from "../components/StageProgressBar";
import { formatAddress, formatHash, formatTimestamp, getTimeRemaining } from "../utils/formatting";
import {
  Layers,
  Clock,
  Award,
  CheckCircle2,
  Lock,
  ArrowRight,
  Search,
  Scale,
  Calendar,
  UserCheck,
  Download,
  Send,
  FileText,
  Filter,
  CheckCircle,
  FolderOpen,
  Archive,
  PlayCircle
} from "lucide-react";

export default function PublicTenders({ onSelectTender, onNavigateTab }) {
  const { tenders, loading, error, refreshTenders, isAuthorizedOfficer, account, blockchainTimestamp } = useWeb3();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all", "open", "ongoing", "closed"
  const [awardDocsMap, setAwardDocsMap] = useState({});

  // Check which awarded/archived tenders have an uploaded contract document
  React.useEffect(() => {
    let isMounted = true;
    const fetchAwardDocs = async () => {
      const awardedTenders = tenders.filter((t) => t.state >= 5);
      if (awardedTenders.length === 0) return;
      const results = {};
      await Promise.all(
        awardedTenders.map(async (t) => {
          try {
            const finalHashParam = t.finalDocHash ? `&finalHash=${t.finalDocHash}` : "";
            const res = await fetch(`http://localhost:3001/api/award-contract/${t.id}?json=true${finalHashParam}`);
            if (res.ok) {
              const data = await res.json();
              results[t.id] = data.document || true;
            } else {
              results[t.id] = false;
            }
          } catch (e) {
            results[t.id] = false;
          }
        })
      );
      if (isMounted) setAwardDocsMap(results);
    };
    fetchAwardDocs();
  }, [tenders]);

  // Counts for each category
  const totalCount = tenders.length;
  const openCount = tenders.filter((t) => t.state === 0).length;
  const ongoingCount = tenders.filter((t) => t.state >= 1 && t.state <= 5).length;
  const closedCount = tenders.filter((t) => t.state === 6).length;

  // Filter logic:
  // open: advertisement stage (state === 0)
  // ongoing: already in motion (state >= 1 && state <= 5)
  // closed: archived (state === 6)
  const filteredTenders = tenders.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toString().includes(search) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      t.officer.toLowerCase().includes(search.toLowerCase());

    let matchesFilter = true;
    if (filterType === "open") {
      matchesFilter = t.state === 0;
    } else if (filterType === "ongoing") {
      matchesFilter = t.state >= 1 && t.state <= 5;
    } else if (filterType === "closed") {
      matchesFilter = t.state === 6;
    }

    return matchesSearch && matchesFilter;
  });

  // Sorting logic:
  // Default: Tenders being advertised at the top (priority 0), followed by ongoing (priority 1), followed by closed/archived (priority 2)
  const getSortPriority = (state) => {
    if (state === 0) return 0; // Open / Advertised at top
    if (state >= 1 && state <= 5) return 1; // Ongoing in middle
    return 2; // Closed / Archived at bottom
  };

  const sortedTenders = [...filteredTenders].sort((a, b) => {
    const priorityA = getSortPriority(a.state);
    const priorityB = getSortPriority(b.state);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return b.id - a.id; // Within same stage group, newest ID first
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner - Quantity Surveying Clean Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold mb-3">
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            Quantity Surveying & Public Procurement Repository
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Official Public Tenders
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
            Decentralized procurement ledger ensuring mathematical verification and state immutability across all 7 lifecycle stages: Advertisement, Prequalification, Submission, Opening, Evaluation, Award, and Archiving.
          </p>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider font-mono">
            Total Tenders
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalCount}</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="text-blue-700 text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span> Open (Advertised)
          </div>
          <div className="text-2xl font-extrabold text-blue-900 mt-1">{openCount}</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="text-amber-700 text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Ongoing in Motion
          </div>
          <div className="text-2xl font-extrabold text-amber-900 mt-1">{ongoingCount}</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="text-slate-600 text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span> Closed (Archived)
          </div>
          <div className="text-2xl font-extrabold text-slate-700 mt-1">{closedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tender title, ID, or officer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-medium"
          />
        </div>

        {/* Filter Buttons: Open, Ongoing, Closed, All */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1 whitespace-nowrap">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            All ({totalCount})
          </button>

          <button
            onClick={() => setFilterType("open")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === "open"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" /> Open ({openCount})
          </button>

          <button
            onClick={() => setFilterType("ongoing")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === "ongoing"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" /> Ongoing ({ongoingCount})
          </button>

          <button
            onClick={() => setFilterType("closed")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === "closed"
                ? "bg-slate-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Archive className="w-3.5 h-3.5" /> Closed ({closedCount})
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="text-center py-16 text-slate-500 font-medium animate-pulse text-sm">
          Loading tenders from local blockchain...
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Tender Cards */}
      {!loading && sortedTenders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 shadow-sm">
          <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Tenders Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filterType !== "all"
              ? `No tenders match the "${filterType}" filter. Try selecting "All" or switching search keywords.`
              : "Switch to the Officer Dashboard to advertise your first tender or run the seed script."}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {sortedTenders.map((tender) => {
          const timeInfo = getTimeRemaining(tender.deadline, blockchainTimestamp);
          const bidsSubmittedCount = tender.submittedBidders?.length || 0;
          const weightsAssigned = (tender.weightTechnical + tender.weightFinancial) > 0;

          return (
            <div
              key={tender.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-6 transition-all shadow-sm hover:shadow-md"
            >
              {/* Header: ID, Badge, Bids Submitted count, Time */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      Tender #{tender.id}
                    </span>
                    <StageBadge stageId={tender.state} />

                    {/* PROMINENT REQUIREMENT 1: NUMBER OF BIDS SUBMITTED ON EVERY TENDER */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                      <Send className="w-3 h-3 text-amber-600" />
                      {bidsSubmittedCount} {bidsSubmittedCount === 1 ? "Bid Submitted" : "Bids Submitted"}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {tender.title}
                  </h3>
                </div>

                {/* Deadline & Weight info */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-slate-600">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-semibold text-slate-700">{timeInfo.text}</span>
                  </div>

                  <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    {weightsAssigned ? (
                      <span>
                        <strong className="text-blue-700">{tender.weightTechnical}%</strong> Tech /{" "}
                        <strong className="text-purple-700">{tender.weightFinancial}%</strong> Fin
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Weights: Pending Bidding Stage</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scope Description if available */}
              {tender.description && (
                <p className="text-xs text-slate-600 my-3 line-clamp-2 leading-relaxed">
                  {tender.description}
                </p>
              )}

              {/* 7-Stage Visual Progress Bar */}
              <StageProgressBar currentStage={tender.state} />

              {/* Status Summary & Bidders Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-mono block text-[11px]">Registered Contractors</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {tender.registeredBidders?.length || 0} Registered
                  </span>
                </div>

                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                  <span className="text-amber-700 font-mono block text-[11px] font-semibold">Proposals on Blockchain</span>
                  <span className="font-bold text-amber-900 text-sm mt-0.5 block flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-amber-600" />
                    {bidsSubmittedCount} {bidsSubmittedCount === 1 ? "Bid Sealed On-Chain" : "Bids Sealed On-Chain"}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-mono block text-[11px]">Procurement Officer</span>
                  <span className="font-mono text-slate-700 text-xs mt-0.5 block truncate">
                    {formatAddress(tender.officer)}
                  </span>
                </div>
              </div>

              {/* Winner & Archival Banner (if awarded / archived) */}
              {tender.state >= 5 && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-emerald-900">
                        Awarded Contractor: {formatAddress(tender.winner)}
                      </div>
                      <div className="text-emerald-700 font-mono text-[11px]">
                        Winning Weighted Score: {tender.winningScore} / 10,000
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {tender.state === 6 && (
                      <div className="text-right font-mono text-[11px] text-slate-500">
                        <span className="text-slate-700 font-semibold flex items-center gap-1 sm:justify-end">
                          <Lock className="w-3 h-3 text-slate-500" /> Archival Seal:
                        </span>
                        <span className="text-slate-800 font-bold">{formatHash(tender.finalDocHash)}</span>
                      </div>
                    )}

                    {isAuthorizedOfficer || (account && tender.winner.toLowerCase() === account.toLowerCase()) ? (
                      awardDocsMap[tender.id] ? (
                        <a
                          href={`http://localhost:3001/api/award-contract/${tender.id}?download=true`}
                          download
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" /> Official Award Contract
                        </a>
                      ) : (
                        <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-mono flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3 text-amber-600" /> Contract Upload Pending
                        </span>
                      )
                    ) : (
                      <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono flex items-center gap-1 whitespace-nowrap">
                        <Lock className="w-3 h-3 text-slate-400" /> Contract Restricted
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Role-Specific Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    onSelectTender(tender.id);
                    onNavigateTab("audit");
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
                >
                  Inspect Audit Trail
                </button>

                {isAuthorizedOfficer ? (
                  <button
                    onClick={() => {
                      onSelectTender(tender.id);
                      onNavigateTab("officer");
                    }}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    Manage Tender <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onSelectTender(tender.id);
                      onNavigateTab("bidder");
                    }}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    Participate & Bid <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
