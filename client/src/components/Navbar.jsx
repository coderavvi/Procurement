import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { formatAddress } from "../utils/formatting";
import {
  Scale,
  ShieldCheck,
  User,
  Layers,
  FileCheck,
  History,
  ChevronDown,
  Wallet,
  Activity,
  Award,
  LogOut
} from "lucide-react";

export default function Navbar({ activeTab, setActiveTab }) {
  const {
    account,
    balance,
    connectionMode,
    selectedHardhatIndex,
    switchAccount,
    connectMetaMask,
    disconnectWallet,
    hardhatAccounts,
    contractAddress,
    isAuthorizedOfficer,
  } = useWeb3();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentAccountInfo = hardhatAccounts[selectedHardhatIndex];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Research Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  QS E-Tendering
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PhD Prototype
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Trust & Verification for Quantity Surveying & Public Procurement
              </p>
            </div>
          </div>

          {/* Role-Separated Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("tenders")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "tenders"
                  ? "bg-amber-500 text-slate-950 shadow-sm font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Public Tenders
            </button>

            {/* ONLY Procurement Officers see the Officer Dashboard */}
            {isAuthorizedOfficer && (
              <button
                onClick={() => setActiveTab("officer")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "officer"
                    ? "bg-amber-500 text-slate-950 shadow-sm font-bold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Officer Dashboard
              </button>
            )}

            {/* ONLY Commercial Contractors / Bidders see the Bidder Portal */}
            {!isAuthorizedOfficer && (
              <button
                onClick={() => setActiveTab("bidder")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "bidder"
                    ? "bg-amber-500 text-slate-950 shadow-sm font-bold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                Bidder Portal
              </button>
            )}

            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "audit"
                  ? "bg-amber-500 text-slate-950 shadow-sm font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Audit Trail
            </button>
          </nav>

          {/* Account & Role Switcher */}
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl transition-all shadow-sm"
            >
              <div className="flex flex-col text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-xs font-bold text-slate-100">
                    {connectionMode === "metamask" ? "MetaMask" : currentAccountInfo?.name.split(":")[0]}
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 font-mono">
                  {formatAddress(account)} ({Number(balance).toFixed(2)} ETH)
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Direct Quick Disconnect Button */}
            <button
              onClick={disconnectWallet}
              title="Disconnect Wallet & Return to Access Portal"
              className="p-2 rounded-xl bg-slate-800/90 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Simulate Hardhat Accounts:
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Switch roles instantly on local Hardhat blockchain.
                  </p>
                </div>

                <div className="py-1 space-y-1">
                  {hardhatAccounts.map((acc, idx) => (
                    <button
                      key={acc.index}
                      onClick={() => {
                        switchAccount(idx);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                        selectedHardhatIndex === idx && connectionMode === "hardhat_wallet"
                          ? "bg-amber-50 border border-amber-300 text-amber-900"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-2">
                          {acc.name}
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                              acc.role === "Officer"
                                ? "bg-slate-100 text-slate-800 border border-slate-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {acc.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {formatAddress(acc.address)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <button
                    onClick={() => {
                      connectMetaMask();
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2 text-xs font-semibold"
                  >
                    <Wallet className="w-4 h-4 text-amber-600" />
                    Connect via MetaMask Extension
                  </button>

                  <button
                    onClick={() => {
                      disconnectWallet();
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-700 flex items-center gap-2 text-xs font-semibold transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    Disconnect Wallet & Exit
                  </button>
                </div>

                {contractAddress && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-600 font-mono break-all">
                    <span className="text-slate-800 font-semibold">Contract:</span> {contractAddress}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("tenders")}
            className={`px-2 py-1 rounded font-semibold ${activeTab === "tenders" ? "text-amber-400 font-bold" : "text-slate-300"}`}
          >
            Tenders
          </button>
          {isAuthorizedOfficer ? (
            <button
              onClick={() => setActiveTab("officer")}
              className={`px-2 py-1 rounded font-semibold ${activeTab === "officer" ? "text-amber-400 font-bold" : "text-slate-300"}`}
            >
              Officer Console
            </button>
          ) : (
            <button
              onClick={() => setActiveTab("bidder")}
              className={`px-2 py-1 rounded font-semibold ${activeTab === "bidder" ? "text-amber-400 font-bold" : "text-slate-300"}`}
            >
              Bidder Portal
            </button>
          )}
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-2 py-1 rounded font-semibold ${activeTab === "audit" ? "text-amber-400 font-bold" : "text-slate-300"}`}
          >
            Audit
          </button>
        </div>
      </div>
    </header>
  );
}
