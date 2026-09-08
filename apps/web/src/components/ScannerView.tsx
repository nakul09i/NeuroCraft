import React, { useState } from "react";
import {
  Upload,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Key,
  Calendar,
  Hash,
  FileCode,
  ArrowRight,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { api } from "../api";
import { ScanResponse, VerdictLevel } from "../types";

interface ScannerViewProps {
  onScanComplete?: (scan: ScanResponse) => void;
  onGenerateReport?: (scanId: string) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onScanComplete,
  onGenerateReport,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setCurrentFile(file);
    setError(null);
    setScanning(true);
    setScanResult(null);

    try {
      const res = await api.uploadAndScan(file);
      setScanResult(res);
      if (onScanComplete) onScanComplete(res);
    } catch (err: any) {
      setError(err.message || "Failed to analyze file");
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
          Safe Static File & Signature Analysis
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Zero dynamic code execution. Extracts deep metadata, calculates SHA-256 fingerprints, parses PE/PDF/APK headers, and verifies cryptographic X.509 certificates.
        </p>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          dragOver
            ? "border-cyan-400 bg-cyan-500/5 shadow-cyan-glow"
            : "border-slate-800 bg-[#0a0f1d]/80 hover:border-slate-700"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          onChange={handleFileInput}
          className="hidden"
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400 shadow-sm">
            {scanning ? (
              <RefreshCw className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
          <p className="text-base font-bold text-white tracking-wide">
            {scanning ? "Analyzing File in Isolated Quarantine..." : "Drop file here or browse"}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Supports PE binaries (.exe, .dll), PDF documents, Android APKs, scripts, and archives. Maximum file limit: 100 MB.
          </p>
        </label>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-400 text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results View */}
      {scanResult && (
        <div className="space-y-6">
          {/* Top Score & Summary Card */}
          <div className="cyber-glow-card rounded-2xl p-6 border border-slate-800 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-bold text-white">{scanResult.file.name}</h3>
                  <span
                    className={`text-xs font-bold px-3 py-0.5 rounded-full border font-mono uppercase ${getVerdictBadge(
                      scanResult.verdict.level
                    )}`}
                  >
                    {scanResult.verdict.level}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-2 break-all">
                  SHA-256: {scanResult.file.sha256}
                </p>
                <div className="flex items-center space-x-4 mt-3 text-xs text-slate-400 font-mono">
                  <span>Size: {(scanResult.file.size / 1024).toFixed(1)} KB</span>
                  <span>Type: {scanResult.file.type}</span>
                  <span>MIME: {scanResult.file.mime}</span>
                </div>
              </div>

              <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                <div className="text-center">
                  <div className="text-4xl font-extrabold text-white font-mono">
                    {scanResult.verdict.score.toFixed(1)}
                  </div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">
                    Risk Score (0–100)
                  </div>
                </div>

                {onGenerateReport && (
                  <button
                    onClick={() => onGenerateReport(scanResult.scan_id)}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition shadow-sm"
                  >
                    <span>Generate Audit Report</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Digital Signature Card */}
          <div className="cyber-glow-card rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Digital Signature & Certificate Authenticity
                </h4>
              </div>
              {scanResult.signature_info ? (
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border uppercase ${
                    scanResult.signature_info.status === "VALID"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : scanResult.signature_info.status === "SELF_SIGNED"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : scanResult.signature_info.status === "UNSIGNED"
                      ? "bg-slate-800 text-slate-400 border-slate-700"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  }`}
                >
                  {scanResult.signature_info.status}
                </span>
              ) : (
                <span className="text-xs font-mono text-slate-400">NOT APPLICABLE</span>
              )}
            </div>

            {scanResult.signature_info?.is_signed ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-medium">Signer Identity (CN)</div>
                  <div className="text-slate-200 font-mono break-all">
                    {scanResult.signature_info.signer_name || "Unknown Signer"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-medium">Issuer CA</div>
                  <div className="text-slate-200 font-mono break-all">
                    {scanResult.signature_info.issuer_name || "Self-Signed or Direct"}
                  </div>
                </div>

                {scanResult.signature_info.digest_algorithm && (
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                    <div className="text-slate-400 font-medium">Signature Digest Algorithm</div>
                    <div className="text-slate-200 font-mono">
                      {scanResult.signature_info.digest_algorithm}
                    </div>
                  </div>
                )}

                {scanResult.signature_info.certificates.length > 0 && (
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                    <div className="text-slate-400 font-medium">Serial Number</div>
                    <div className="text-slate-200 font-mono">
                      {scanResult.signature_info.certificates[0].serial_number}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                <p>
                  No embedded Authenticode or PKCS#7 digital signature was identified. Binary origin cannot be cryptographically established.
                </p>
                <p className="mt-1 text-slate-400 italic">
                  Note: In modern cybersecurity, "Unsigned" does not inherently mean malicious, but requires rigorous static analysis.
                </p>
              </div>
            )}
          </div>

          {/* Security Findings */}
          <div className="cyber-glow-card rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Evidence-Based Findings ({scanResult.findings.length})</span>
            </h4>

            {scanResult.findings.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                No suspicious static indicators detected in this file.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {scanResult.findings.map((f) => (
                  <div key={f.id} className="py-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                            f.severity === "CRITICAL" || f.severity === "HIGH"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : f.severity === "MEDIUM"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {f.severity}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">{f.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Source: {f.source_engine}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 pl-1">{f.description}</p>
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
