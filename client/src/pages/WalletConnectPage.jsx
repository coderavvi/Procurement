import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { formatAddress } from "../utils/formatting";
import {
  Scale,
  Wallet,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export default function WalletConnectPage({ onConnect }) {
  const {
    connectHardhatAccount,
    connectMetaMask,
    hardhatAccounts,
    error: contextError,
  } = useWeb3();

  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const hasMetaMask = typeof window !== "undefined" && Boolean(window.ethereum);

  const handleConnectSelected = async () => {
    try {
      setConnecting(true);
      setLocalError(null);
      setStatusMsg("Connecting and querying address role on-chain...");

      const res = await connectHardhatAccount(Number(selectedAccountIndex));
      if (res && res.success) {
        const roleLabel = res.isOfficer ? "Procurement Officer" : "Commercial Bidder";
        setStatusMsg(`Role identified: ${roleLabel}. Redirecting...`);
        setTimeout(() => {
          if (onConnect) {
            onConnect(res.isOfficer ? "officer" : "bidder");
          }
        }, 500);
      } else {
        setLocalError(res?.error || "Failed to connect wallet.");
        setStatusMsg(null);
      }
    } catch (err) {
      setLocalError(err.message || "Failed to connect wallet.");
      setStatusMsg(null);
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectMetaMask = async () => {
    try {
      setConnecting(true);
      setLocalError(null);
      setStatusMsg("Connecting MetaMask and verifying address on-chain...");

      if (!hasMetaMask) {
        throw new Error("MetaMask not detected in browser. Please install MetaMask or select a local test address.");
      }

      const res = await connectMetaMask();
      if (res && res.success) {
        const roleLabel = res.isOfficer ? "Procurement Officer" : "Commercial Bidder";
        setStatusMsg(`Role identified: ${roleLabel} (${formatAddress(res.account)}). Redirecting...`);
        setTimeout(() => {
          if (onConnect) {
            onConnect(res.isOfficer ? "officer" : "bidder");
          }
        }, 500);
      } else {
        setLocalError(res?.error || "MetaMask connection was rejected.");
        setStatusMsg(null);
      }
    } catch (err) {
      setLocalError(err.message || "MetaMask connection failed.");
      setStatusMsg(null);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-amber-600 selection:text-white">
      {/* Header matching main app theme */}
      <header className="bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
        </div>
      </header>

      {/* Main Container with Centered Minimal Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center mx-auto shadow-xs">
              <Wallet className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Connect Wallet</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Connect your Ethereum wallet to access the platform. Access privileges are determined automatically on-chain based on your connected address.
            </p>
          </div>

          {/* Feedback / Error Alerts */}
          {(localError || contextError) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{localError || contextError}</p>
                <p className="text-[10px] text-rose-600 mt-0.5">
                  Ensure Hardhat node is running at http://127.0.0.1:8545.
                </p>
              </div>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{statusMsg}</span>
            </div>
          )}

          {/* Single Connection Panel */}
          <div className="space-y-4">
            {/* Primary Browser Extension Option */}
            <button
              type="button"
              disabled={connecting}
              onClick={handleConnectMetaMask}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Browser Wallet (MetaMask)</span>
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-slate-400 bg-white px-2 font-mono">
                or select test address
              </div>
            </div>

            {/* Local Test Address Selector */}
            <div className="space-y-2 text-left">
              <label htmlFor="accountSelect" className="block text-xs font-semibold text-slate-700">
                Local Wallet Address
              </label>
              <select
                id="accountSelect"
                value={selectedAccountIndex}
                disabled={connecting}
                onChange={(e) => setSelectedAccountIndex(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              >
                {hardhatAccounts.map((acc) => (
                  <option key={acc.index} value={acc.index}>
                    {acc.address} ({acc.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button for Selected Address */}
            <button
              type="button"
              disabled={connecting}
              onClick={handleConnectSelected}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying on-chain...</span>
                </>
              ) : (
                <>
                  <span>Connect Selected Address</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>On-chain RBAC resolves privileges based on address</span>
          </div>
        </div>
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
