export const STAGES = [
  { id: 0, key: "Advertised", label: "1. Advertised", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: 1, key: "PrequalificationOpen", label: "2. Prequalification", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: 2, key: "Submitted", label: "3. Submission Open", color: "bg-amber-50 text-amber-800 border-amber-300" },
  { id: 3, key: "Opened", label: "4. Tender Opened", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: 4, key: "Evaluated", label: "5. Evaluated", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: 5, key: "Awarded", label: "6. Awarded", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: 6, key: "Archived", label: "7. Archived (Locked)", color: "bg-slate-100 text-slate-700 border-slate-300" },
];

export function getStageInfo(stageId) {
  const num = Number(stageId);
  return STAGES[num] || { id: num, key: "Unknown", label: `Stage ${num}`, color: "bg-slate-100 text-slate-600 border-slate-200" };
}

export function formatAddress(address) {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return "None (0x000...)";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatHash(hash) {
  if (!hash || hash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    return "None";
  }
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export function formatTimestamp(timestampSec) {
  if (!timestampSec || Number(timestampSec) === 0) return "N/A";
  const date = new Date(Number(timestampSec) * 1000);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function getContractorName(address) {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return "None";
  }
  const addr = address.toLowerCase();
  if (addr === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266") return "Officer / Admin (Acc #0)";
  if (addr === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8") return "Alpha Engineering Ltd (Acc #1)";
  if (addr === "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc") return "Beta Solutions Corp (Acc #2)";
  if (addr === "0x90f79bf6eb2c4f870365e785982e1f101e93b906") return "Gamma Infrastructure (Acc #3)";
  if (addr === "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65") return "Dept of Transportation (Acc #4)";
  return formatAddress(address);
}

export function getTimeRemaining(deadlineSec, currentTimestampSec = null) {
  const now = currentTimestampSec ? Number(currentTimestampSec) : Math.floor(Date.now() / 1000);
  const diff = Number(deadlineSec) - now;
  if (diff <= 0) return { passed: true, text: "Deadline Passed (Ready to Open)", totalSecs: 0 };

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = diff % 60;

  if (days > 0) {
    return {
      passed: false,
      text: `${days}d ${hours}h ${mins}m remaining`,
      totalSecs: diff,
    };
  }

  return {
    passed: false,
    text: `${hours}h ${mins}m ${secs}s remaining`,
    totalSecs: diff,
  };
}

export function parseContractError(error) {
  if (!error) return "An unknown error occurred.";
  if (typeof error === "string") return error;
  if (error.reason) return error.reason;
  if (error.data && error.data.message) return error.data.message;
  if (error.message) {
    const match = error.message.match(/reverted with reason string '([^']+)'/);
    if (match && match[1]) return match[1];
    const customMatch = error.message.match(/reverted with custom error '([^']+)'/);
    if (customMatch && customMatch[1]) return customMatch[1];
    if (error.message.includes("user rejected action")) return "Transaction rejected in wallet.";
    return error.message.slice(0, 140);
  }
  return "Transaction reverted on-chain.";
}
