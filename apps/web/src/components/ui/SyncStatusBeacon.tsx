import React, { useState, useRef, useEffect } from "react";
import { useConnectivity } from "../../context/ConnectivityContext";
import { RefreshCw, Wifi, WifiOff, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

export const SyncStatusBeacon: React.FC = () => {
  const { isOnline, syncState, summary, isFlushing, flushSync, retryAll } = useConnectivity();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const pendingCount = summary?.pending_count ?? 0;
  const failedCount = summary?.failed_count ?? 0;
  const syncedCount = summary?.synced_count ?? 0;

  // Render badge content
  let badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  let dotColor = "bg-emerald-400";
  let label = "Online";
  let Icon = Wifi;

  if (!isOnline) {
    badgeColor = "bg-amber-500/10 text-amber-300 border-amber-500/30";
    dotColor = "bg-amber-400";
    label = "Offline";
    Icon = WifiOff;
  } else if (isFlushing || syncState === "syncing") {
    badgeColor = "bg-cyan-500/10 text-cyan-300 border-cyan-500/30";
    dotColor = "bg-cyan-400 animate-ping";
    label = "Syncing";
    Icon = RefreshCw;
  } else if (failedCount > 0) {
    badgeColor = "bg-rose-500/10 text-rose-300 border-rose-500/30";
    dotColor = "bg-rose-400";
    label = `${failedCount} Failed`;
    Icon = AlertTriangle;
  } else if (pendingCount > 0) {
    badgeColor = "bg-sky-500/10 text-sky-300 border-sky-500/30";
    dotColor = "bg-sky-400";
    label = `${pendingCount} Pending`;
    Icon = Clock;
  } else {
    badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    dotColor = "bg-emerald-400";
    label = "Synced";
    Icon = CheckCircle2;
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all hover:bg-slate-800/80 ${badgeColor}`}
        title="Offline-First Sync Status. Click for details."
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <Icon className={`w-3.5 h-3.5 ${isFlushing ? "animate-spin" : ""}`} />
        <span>{label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 p-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Sync Engine Status
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono ${
                isOnline ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-300"
              }`}
            >
              {isOnline ? "● Cloud Connected" : "● Offline Local Mode"}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between items-center py-1">
              <span>Local Database</span>
              <span className="font-mono text-slate-200">SQLite (Source of Truth)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Replication Layer</span>
              <span className="font-mono text-slate-200">Firestore (Asynchronous)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Pending Queue</span>
              <span className={`font-mono ${pendingCount > 0 ? "text-amber-400 font-bold" : "text-slate-300"}`}>
                {pendingCount}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Synced Items</span>
              <span className="font-mono text-emerald-400">{syncedCount}</span>
            </div>
            {failedCount > 0 && (
              <div className="flex justify-between items-center py-1">
                <span>Failed Attempts</span>
                <span className="font-mono text-rose-400 font-bold">{failedCount}</span>
              </div>
            )}
            {summary?.last_synced_at && (
              <div className="flex justify-between items-center py-1 text-[11px] text-slate-500">
                <span>Last Synced</span>
                <span>{new Date(summary.last_synced_at).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
            <button
              onClick={() => flushSync()}
              disabled={isFlushing || !isOnline}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFlushing ? "animate-spin" : ""}`} />
              {isFlushing ? "Syncing..." : "Sync Now"}
            </button>

            {failedCount > 0 && (
              <button
                onClick={() => retryAll()}
                disabled={isFlushing}
                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium transition"
              >
                Retry Failed
              </button>
            )}
          </div>

          {!isOnline && (
            <p className="mt-2 text-[11px] text-slate-500 text-center leading-relaxed">
              All scans, history, and exports run offline with zero cloud dependency.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
