import React from "react";
import { CheckCircle2, AlertTriangle, Loader2, X, ExternalLink } from "lucide-react";

export default function TransactionModal({ isOpen, onClose, status, txHash, error, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          {/* Status Icons */}
          {status === "pending" && (
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          {status === "success" && (
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          )}

          {status === "error" && (
            <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
          )}

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {title || (status === "pending" ? "Transaction Pending" : status === "success" ? "Transaction Confirmed" : "Transaction Failed")}
          </h3>

          <p className="text-sm text-slate-600 mb-4">
            {message || (status === "pending" ? "Submitting state transition to Hardhat blockchain..." : status === "success" ? "State updated and event emitted on-chain." : "Smart contract reverted or rejected action.")}
          </p>

          {/* Transaction Hash */}
          {txHash && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left mb-4">
              <span className="text-[10px] uppercase text-slate-500 font-mono font-semibold block mb-1">
                Transaction Hash:
              </span>
              <div className="text-xs font-mono text-slate-800 break-all">
                {txHash}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-left mb-4">
              <span className="text-[10px] uppercase text-red-700 font-mono font-semibold block mb-1">
                Revert Reason / Error:
              </span>
              <div className="text-xs text-red-700 font-mono break-words">
                {error}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-colors bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
