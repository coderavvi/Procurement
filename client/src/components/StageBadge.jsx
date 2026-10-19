import React from "react";
import { getStageInfo } from "../utils/formatting";

export default function StageBadge({ stageId, className = "" }) {
  const stage = getStageInfo(stageId);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${stage.color} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
      {stage.label}
    </span>
  );
}
