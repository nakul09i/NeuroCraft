import React, { useState } from "react";
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  Server,
  Lock,
  FileCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { api } from "../api";
import { ReconScanResponse, VerdictLevel } from "../types";

export const ReconView: React.FC = () => {
  const [target, setTarget] = useState("");
  const [scanning, setScanning] = useState(false);
  const [reconData, setReconData] = useState<ReconScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    setScanning(true);
    setError(null);
    try {
      const res = await api.runRecon(target.trim());
      setReconData(res);
    } catch (err: any) {
      setError(err.message || "Failed to execute reconnaissance");
    } finally {
      setScanning(false);
    }
  };

  const getVerdictBadge = (level: VerdictLevel) => {
    switch (level) {
      case "SAFE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "LOW":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "MEDIUM":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "HIGH":
      case "CRITICAL":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Defensive Passive Reconnaissance
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Inspects public exposure without aggressive port scanning or exploitation. Evaluates DNS hygiene, TLS certificate validity, and defense-in-depth HTTP security headers.
        </p>
      </div>

      {/* Target Search Form */}
      <form onSubmit={handleScan} className="flex gap-3">
        <div className="relative flex-1">
          <Globe className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            required
            placeholder="e.g. google.com, github.com, or internal-domain.net"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition shadow-inner font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={scanning}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs tracking-wide shadow-emerald-glow transition disabled:opacity-50"
        >
          {scanning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>{scanning ? "Inspecting..." : "Scan Target"}</span>
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-400 text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reconnaissance Results */}
      {reconData && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="cyber-glow-card rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold text-white font-mono">{reconData.target}</h3>
                <span
                  className={`text-xs font-bold px-3 py-0.5 rounded-full border font-mono uppercase ${getVerdictBadge(
                    reconData.exposure_level
                  )}`}
                >
                  {reconData.exposure_level} EXPOSURE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Passive inspection completed with zero offensive probing.
              </p>
            </div>

            <div className="text-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
              <div className="text-4xl font-extrabold text-white font-mono">
                {reconData.exposure_score.toFixed(1)}
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">
                Exposure Score (0–100)
              </div>
            </div>
          </div>

          {/* Infrastructure Assets and DNS Records */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DNS Records */}
            <div className="cyber-glow-card rounded-2xl p-5 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>DNS Configuration Records ({reconData.dns_records.length})</span>
              </h4>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {reconData.dns_records.map((r, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between font-mono"
                  >
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">
                      {r.record_type}
                    </span>
                    <span className="text-slate-300 truncate max-w-[240px]" title={r.value}>
                      {r.value}
                    </span>
                    <span className="text-[10px] text-slate-400">TTL {r.ttl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TLS Handshake */}
            <div className="cyber-glow-card rounded-2xl p-5 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>TLS Certificate & Cipher Suite</span>
              </h4>

              {reconData.tls_info ? (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[11px]">Subject Common Name</div>
                    <div className="font-mono text-slate-200">{reconData.tls_info.subject}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[11px]">Issuer Authority</div>
                    <div className="font-mono text-slate-200">{reconData.tls_info.issuer}</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">Protocol</div>
                      <div className="font-mono text-emerald-400 font-bold">
                        {reconData.tls_info.tls_version}
                      </div>
                    </div>
                    <div className="flex-1 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">Cipher Suite</div>
                      <div className="font-mono text-slate-200 text-[11px] truncate">
                        {reconData.tls_info.cipher_suite}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No TLS handshake response captured on port 443.
                </div>
              )}
            </div>
          </div>

          {/* Security Headers Checklist */}
          <div className="cyber-glow-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-purple-400" />
              <span>HTTP Defense-in-Depth Security Headers</span>
            </h4>

            {reconData.security_headers ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">HSTS</div>
                    <div className="text-[10px] text-slate-400">Transport Security</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      reconData.security_headers.hsts
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {reconData.security_headers.hsts ? "PRESENT" : "MISSING"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">CSP</div>
                    <div className="text-[10px] text-slate-400">Content Security</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      reconData.security_headers.csp
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {reconData.security_headers.csp ? "PRESENT" : "MISSING"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">X-Frame-Options</div>
                    <div className="text-[10px] text-slate-400">Clickjacking Guard</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      reconData.security_headers.x_frame_options
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {reconData.security_headers.x_frame_options ? "PRESENT" : "MISSING"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">nosniff</div>
                    <div className="text-[10px] text-slate-400">MIME Sniffing</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      reconData.security_headers.x_content_type_options
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {reconData.security_headers.x_content_type_options ? "PRESENT" : "MISSING"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                Target did not respond to HTTPS header inspection.
              </div>
            )}
          </div>

          {/* Actionable Recommendations */}
          <div className="cyber-glow-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Remediation Advice ({reconData.findings.length})</span>
            </h4>

            {reconData.findings.length === 0 ? (
              <div className="py-4 text-center text-emerald-400 text-xs">
                No active exposure risks identified for this target.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {reconData.findings.map((f) => (
                  <div key={f.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{f.title}</div>
                      <div className="text-slate-400 mt-0.5">{f.recommendation}</div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                        f.severity === "HIGH"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
