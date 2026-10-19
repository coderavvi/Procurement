import React, { useState } from "react";
import { Web3Provider, useWeb3 } from "./context/Web3Context";
import Navbar from "./components/Navbar";
import PublicTenders from "./pages/PublicTenders";
import OfficerDashboard from "./pages/OfficerDashboard";
import BidderPortal from "./pages/BidderPortal";
import AuditView from "./pages/AuditView";
import WalletConnectPage from "./pages/WalletConnectPage";
import { ShieldCheck, Scale, Database, Layers, CheckCircle2 } from "lucide-react";

function MainContent() {
  const {
    isAuthorizedOfficer,
    account,
    isConnected,
    loading,
    officerAgency,
    hardhatAccounts,
    selectedHardhatIndex,
    connectionMode
  } = useWeb3();

  const [activeTab, setActiveTab] = useState(isAuthorizedOfficer ? "officer" : "bidder");
  const [selectedTenderId, setSelectedTenderId] = useState(1);

  // Automatically update tab when switching account roles if current tab is restricted
  React.useEffect(() => {
    if (isConnected) {
      if (isAuthorizedOfficer && activeTab === "bidder") {
        setActiveTab("officer");
      } else if (!isAuthorizedOfficer && activeTab === "officer") {
        setActiveTab("bidder");
      }
    }
  }, [isAuthorizedOfficer, isConnected]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-4">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-semibold text-xs">Connecting to Ethereum network...</p>
      </div>
    );
  }

  // Gate the entire interface behind wallet connection
  if (!isConnected) {
    return (
      <WalletConnectPage
        onConnect={(targetTab) => {
          setActiveTab(targetTab);
        }}
      />
    );
  }

  const currentAccount = connectionMode === "metamask" ? null : hardhatAccounts[selectedHardhatIndex];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-amber-600 selection:text-white">
      {/* Global Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Privileges & Identity Banner */}
        <div className="mb-6 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs shrink-0 ${
                isAuthorizedOfficer
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              {isAuthorizedOfficer ? <Scale className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-900">
                  {currentAccount ? currentAccount.name : "MetaMask Wallet"}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded border ${
                    isAuthorizedOfficer
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-blue-100 text-blue-900 border-blue-300"
                  }`}
                >
                  {isAuthorizedOfficer ? "Procurement Officer Privileges" : "Commercial Contractor Privileges"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAuthorizedOfficer
                  ? (officerAgency || "Accredited Regulatory Authority • Permitted to advertise, open, score, and award tenders.")
                  : "Accredited Commercial Bidder • Permitted to purchase dossiers, prequalify, and submit hashed bids."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cryptographic Session Active</span>
          </div>
        </div>

        {activeTab === "tenders" && (
          <PublicTenders
            onSelectTender={(id) => setSelectedTenderId(id)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* Officer Dashboard - strictly restricted to Procurement Officers */}
        {activeTab === "officer" && (
          isAuthorizedOfficer ? (
            <OfficerDashboard
              selectedTenderId={selectedTenderId}
              onSelectTender={(id) => setSelectedTenderId(id)}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm space-y-4 my-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Procurement Officer Console</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                This console is strictly restricted to accredited Government Procurement Officers.
                Commercial contractors and bidders access tender participation through the Bidder Portal.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab("bidder")}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm"
                >
                  Go to Contractor & Bidder Portal ➔
                </button>
              </div>
            </div>
          )
        )}

        {/* Bidder Portal - strictly for Commercial Contractors */}
        {activeTab === "bidder" && (
          !isAuthorizedOfficer ? (
            <BidderPortal
              selectedTenderId={selectedTenderId}
              onSelectTender={(id) => setSelectedTenderId(id)}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm space-y-4 my-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Commercial Contractor Portal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are currently connected with an accredited Procurement Officer wallet ({account?.slice(0, 6)}...{account?.slice(-4)}).
                In compliance with public procurement integrity rules, procurement officers manage tenders from the Officer Dashboard.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab("officer")}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm"
                >
                  Go to Procurement Officer Console ➔
                </button>
              </div>
            </div>
          )
        )}

        {activeTab === "audit" && (
          <AuditView
            selectedTenderId={selectedTenderId}
            onSelectTender={(id) => setSelectedTenderId(id)}
          />
        )}
      </main>

      {/* Institutional Research Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-slate-700">
              Quantity Surveying & Public Procurement E-Tendering System (PhD Research)
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Hardhat Localhost:8545
            </span>
            <span>Ethers.js v6</span>
            <span>Solidity ^0.8.24</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <MainContent />
    </Web3Provider>
  );
}
