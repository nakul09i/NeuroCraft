import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  FileSearch,
  Globe,
  Atom,
  ArrowUpRight,
  RefreshCw,
  Lock,
  Cpu,
  Fingerprint,
} from "lucide-react";
import { api } from "../api";
import { DashboardStats } from "../types";

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats>({
    total_scans: 0,
    critical_threats: 0,
    recon_targets: 0,
    quantum_simulations: 0,
    average_exposure: 0,
    recent_scans: [],
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch {
      // Keep defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Hero */}
      <div className="relative rounded-2xl p-8 overflow-hidden bg-gradient-to-r from-slate-900 via-[#0b1329] to-slate-900 border border-slate-800 shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold mb-4">
            <Fingerprint className="w-3.5 h-3.5" />
            <span>QUANTUM-INSPIRED CYBER THREAT DETECTION</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Know what you can <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">trust</span>.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Multi-engine zero-execution binary analysis, passive exposure reconnaissance, and simulated quantum-entangled Bell-state signature verification.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("scanner")}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide shadow-cyan-glow transition"
            >
              <FileSearch className="w-4 h-4" />
              <span>Analyze Untrusted File</span>
            </button>
            <button
              onClick={() => onNavigate("quantum")}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-xs tracking-wide transition"
            >
              <Atom className="w-4 h-4 text-cyan-400" />
              <span>Simulate Quantum Channel</span>
            </button>
            <button
              onClick={() => onNavigate("recon")}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-xs tracking-wide transition"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Passive Reconnaissance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="cyber-glow-card rounded-2xl p-5 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Scans
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <FileSearch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-white font-mono">
              {loading ? "..." : stats.total_scans}
            </div>
            <span className="text-[11px] text-cyan-400 font-medium">Safe Quarantine</span>
          </div>
        </div>

        <div className="cyber-glow-card rounded-2xl p-5 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Critical Threats
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-white font-mono">
              {loading ? "..." : stats.critical_threats}
            </div>
            <span className="text-[11px] text-rose-400 font-medium">Flagged Artifacts</span>
          </div>
        </div>

        <div className="cyber-glow-card rounded-2xl p-5 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recon Targets
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-white font-mono">
              {loading ? "..." : stats.recon_targets}
            </div>
            <span className="text-[11px] text-emerald-400 font-medium">Passive DNS & TLS</span>
          </div>
        </div>

        <div className="cyber-glow-card rounded-2xl p-5 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quantum Runs
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Atom className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-white font-mono">
              {loading ? "..." : stats.quantum_simulations}
            </div>
            <span className="text-[11px] text-purple-400 font-medium">Bell-State Proofs</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Engine Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Architecture Capabilities */}
        <div className="lg:col-span-1 cyber-glow-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Core Engines</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              ALL ACTIVE
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Safe Static Scanner</div>
                <div className="text-[11px] text-slate-400">Entropy, PE/PDF/ELF/APK Parsers</div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                COMPLETED
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Digital Signatures & X.509</div>
                <div className="text-[11px] text-slate-400">Authenticode & PKCS#7 Extractors</div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                COMPLETED
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Quantum Trust Simulator</div>
                <div className="text-[11px] text-slate-400">Bell-State TVD Channel Eavesdropping</div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                COMPLETED
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Passive Reconnaissance</div>
                <div className="text-[11px] text-slate-400">DNS Records, TLS Handshake, Headers</div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                COMPLETED
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Multi-User Tenant Isolation</div>
                <div className="text-[11px] text-slate-400">PBKDF2-HMAC + PyJWT + Database RLS</div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                COMPLETED
              </span>
            </div>
          </div>
        </div>

        {/* Recent Scans Feed */}
        <div className="lg:col-span-2 cyber-glow-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Recent Scan Activity
              </h3>
            </div>
            <button
              onClick={loadStats}
              className="p-1 rounded text-slate-400 hover:text-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.recent_scans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <FileSearch className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p>No recent scans found for your session.</p>
              <button
                onClick={() => onNavigate("scanner")}
                className="mt-3 text-cyan-400 hover:underline font-semibold"
              >
                Scan your first file &rarr;
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {stats.recent_scans.map((scan) => (
                <div
                  key={scan.scan_id}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-lg transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400">
                      <FileSearch className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {scan.filename}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {scan.scan_id.substring(0, 16)}...
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                          scan.risk_level === "SAFE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : scan.risk_level === "LOW"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            : scan.risk_level === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {scan.risk_level} ({scan.risk_score})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
