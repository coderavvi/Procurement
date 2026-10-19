import React from "react";
import { STAGES } from "../utils/formatting";
import { CheckCircle2, Clock, Lock } from "lucide-react";

export default function StageProgressBar({ currentStage }) {
  const stageNum = Number(currentStage);

  return (
    <div className="w-full py-3">
      {/* Mobile view: Simple badge + step indicator */}
      <div className="md:hidden flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200">
        <span className="text-xs text-slate-600 font-medium">Stage {stageNum + 1} of 7</span>
        <span className="text-xs font-bold text-amber-700">{STAGES[stageNum]?.label}</span>
      </div>

      {/* Desktop 7-Stage Horizontal Step Tracker */}
      <div className="hidden md:grid grid-cols-7 gap-2 relative">
        {STAGES.map((s, idx) => {
          const isPassed = stageNum > s.id;
          const isCurrent = stageNum === s.id;
          const isFuture = stageNum < s.id;

          let cardBg = "bg-slate-50/80 border-slate-200 text-slate-400";
          let icon = <Clock className="w-4 h-4 text-slate-300" />;

          if (isPassed) {
            cardBg = "bg-emerald-50/90 border-emerald-200 text-emerald-800";
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
          } else if (isCurrent) {
            if (s.id === 6) {
              cardBg = "bg-slate-100 border-slate-400 text-slate-800 font-bold ring-2 ring-slate-300";
              icon = <Lock className="w-4 h-4 text-slate-700" />;
            } else {
              cardBg = "bg-amber-50 border-amber-400 text-amber-900 font-bold ring-2 ring-amber-300 shadow-sm";
              icon = <div className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping" />;
            }
          }

          return (
            <div
              key={s.id}
              className={`flex flex-col items-center p-2.5 rounded-xl border transition-all text-center ${cardBg}`}
            >
              <div className="mb-1.5 flex items-center justify-center h-5">{icon}</div>
              <span className="text-[11px] font-bold tracking-tight leading-tight line-clamp-2">
                {s.label}
              </span>
              <span className="text-[9px] mt-1 uppercase tracking-wider text-slate-500 font-mono font-medium">
                {isPassed ? "Complete" : isCurrent ? "Active" : "Pending"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
