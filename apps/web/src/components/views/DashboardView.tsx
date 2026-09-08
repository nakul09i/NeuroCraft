import React, { useEffect, useState } from "react";
import {
  FileSearch,
  Globe,
  Atom,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Plus,
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../api";
import { DashboardStats, UserProfile } from "../../types";

export interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  user: UserProfile | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, user }) => {
  const [stats, setStats] = useState<DashboardStats>({
    total_scans: 0,
    critical_threats: 0,
    recon_targets: 0,
    quantum_simulations: 0,
    average_exposure: 0,
    recent_scans: [],
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
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
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName = user?.display_name || user?.email?.split("@")[0] || "Analyst";

  // Dynamic secondary headline based on live system state
  const getSecondaryHeroLine = () => {
    if (loading) return "Synchronizing security telemetry...";
    if (stats.total_scans === 0) {
      return "Start your first verification to establish a security baseline.";
    }
    if (stats.critical_threats > 0) {
      return `${stats.critical_threats} critical finding${stats.critical_threats === 1 ? "" : "s"} require your immediate review.`;
    }
    if (stats.average_exposure > 50) {
      return "External domain exposure requires defensive configuration.";
    }
    return `All ${stats.total_scans} verified artifact${stats.total_scans === 1 ? "" : "s"} are in optimal security posture.`;
  };

  // Safe posture score calculation (100 is best, 0 is worst)
  // Guaranteed never NaN
  const calculatePostureScore = (): number | null => {
    if (loading) return null;
    if (stats.total_scans === 0) return 100; // Baseline
    const penalty = (stats.critical_threats * 30) + (stats.average_exposure * 0.15);
    return Math.max(15, Math.min(100, Math.round(100 - penalty)));
  };

  const postureScore = calculatePostureScore();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* =========================================================================
          1. HERO & SECURITY POSTURE (Stagger: 0ms / 100ms)
          ========================================================================= */}
      <div className="space-y-6">
        {/* Dynamic Greeting */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeUp"
          style={{ animationDelay: "0ms" }}
        >
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-semibold tracking-wider text-text-muted uppercase mb-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Security Command Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              {getGreeting()}, {displayName}.
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              {getSecondaryHeroLine()}
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <Button
              size="sm"
              onClick={() => onNavigate("scanner")}
              icon={<Plus className="w-4 h-4" />}
            >
              Analyze File
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("recon")}
              icon={<Globe className="w-3.5 h-3.5" />}
            >
              Check Domain
            </Button>
            <button
              onClick={loadData}
              title="Refresh Telemetry"
              className="p-2 rounded-lg bg-surface-1 hover:bg-surface-2 border border-border text-text-muted hover:text-text-primary transition focus-ring"
              aria-label="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>
        </div>

        {/* Security Posture Command Card */}
        <Card
          level={1}
          className="p-6 sm:p-8 relative overflow-hidden border border-border/80 shadow-md animate-fadeUp"
          style={{ animationDelay: "100ms" }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 space-y-3.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <Badge
                  variant={
                    stats.critical_threats > 0
                      ? "high"
                      : stats.total_scans === 0
                      ? "info"
                      : "safe"
                  }
                  size="sm"
                >
                  {stats.critical_threats > 0
                    ? "ELEVATED RISK DETECTED"
                    : stats.total_scans === 0
                    ? "BASELINE READY"
                    : "SECURITY POSTURE STABLE"}
                </Badge>
                <span className="text-xs font-mono text-text-muted">
                  ID: TENANT-PROVENANCE
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                {stats.total_scans === 0
                  ? "Security Posture Baseline Ready"
                  : stats.critical_threats === 0
                  ? "Consolidated Security Posture Stable"
                  : `${stats.critical_threats} Security Anomaly Detected Across Artifacts`}
              </h3>

              <p className="text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed">
                NeuroCraft continuously verifies file authenticity, parses Authenticode certificate chains, monitors passive external exposure, and validates quantum channel non-repudiation.
              </p>

              {/* 3 Real Evidence Indicators */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-text-secondary font-mono">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>
                    {stats.total_scans} artifact{stats.total_scans === 1 ? "" : "s"} analyzed
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${stats.critical_threats > 0 ? "bg-danger" : "bg-theme-success"}`} />
                  <span>
                    {stats.critical_threats} critical finding{stats.critical_threats === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                  <span>
                    {stats.recon_targets > 0
                      ? `${stats.recon_targets} domain${stats.recon_targets === 1 ? "" : "s"} checked`
                      : "Passive exposure checked"}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate("reports")}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition group"
                >
                  <span>View Security Audit Report</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            {/* Score Ring with Count-Up and Safe Rendering */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <ScoreRing
                score={postureScore}
                loading={loading}
                variant="posture"
                size={135}
                strokeWidth={11}
                label={
                  stats.total_scans === 0
                    ? "BASELINE"
                    : stats.critical_threats > 0
                    ? "ATTENTION REQUIRED"
                    : "OPTIMAL POSTURE"
                }
                sublabel="Consolidated Trust Metric"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          2. KEY METRICS (Stagger: 150ms)
          ========================================================================= */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeUp"
        style={{ animationDelay: "150ms" }}
      >
        <Card level={2} className="p-5 hover:border-border-strong transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Scanned Files
            </span>
            <div className="p-2 rounded-lg bg-surface-3 text-primary">
              <FileSearch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-primary">
              {loading ? <Skeleton width={45} height={32} /> : stats.total_scans}
            </span>
            <span className="text-xs font-mono text-text-secondary">
              {stats.total_scans === 0 ? "No scans yet" : "Zero-execution"}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Quarantine Engine</span>
            <Badge variant="safe" size="sm">ISOLATED</Badge>
          </div>
        </Card>

        <Card level={2} className="p-5 hover:border-border-strong transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Critical Threats
            </span>
            <div className="p-2 rounded-lg bg-surface-3 text-danger">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-primary">
              {loading ? <Skeleton width={45} height={32} /> : stats.critical_threats}
            </span>
            <span className="text-xs font-mono text-text-secondary">
              {stats.critical_threats > 0 ? "Review needed" : "Zero alerts"}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Integrity Status</span>
            <Badge variant={stats.critical_threats > 0 ? "high" : "safe"} size="sm">
              {stats.critical_threats > 0 ? "FLAGGED" : "CLEAN"}
            </Badge>
          </div>
        </Card>

        <Card level={2} className="p-5 hover:border-border-strong transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Recon Targets
            </span>
            <div className="p-2 rounded-lg bg-surface-3 text-theme-success">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-primary">
              {loading ? <Skeleton width={45} height={32} /> : stats.recon_targets}
            </span>
            <span className="text-xs font-mono text-text-secondary">
              {stats.recon_targets === 0 ? "No domains yet" : "Public footprint"}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Assessment Mode</span>
            <Badge variant="info" size="sm">DEFENSIVE</Badge>
          </div>
        </Card>

        <Card level={2} className="p-5 hover:border-border-strong transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Quantum Runs
            </span>
            <div className="p-2 rounded-lg bg-surface-3 text-purple-400">
              <Atom className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-primary">
              {loading ? <Skeleton width={45} height={32} /> : stats.quantum_simulations}
            </span>
            <span className="text-xs font-mono text-text-secondary">
              Bell-State EPR
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Entanglement Engine</span>
            <Badge variant="quantum" size="sm">SIMULATED</Badge>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          3. QUICK ACTIONS (Feature Discoverability) (Stagger: 200ms)
          ========================================================================= */}
      <div className="space-y-3 animate-fadeUp" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted font-mono">
            QUICK ACTIONS & CORE CAPABILITIES
          </h3>
          <span className="text-[11px] text-text-muted font-mono">Select a verification workflow</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: File Analysis */}
          <div
            onClick={() => onNavigate("scanner")}
            className="group cursor-pointer p-5 rounded-xl bg-surface-1 border border-border hover:border-primary/50 hover:bg-surface-2 transition-all duration-200 shadow-sm hover:-translate-y-0.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-primary-subtle text-primary group-hover:scale-105 transition-transform">
                <FileSearch className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                Analyze File
              </h4>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Quarantine, extract safe metadata, and verify Authenticode/X.509 chains.
              </p>
            </div>
            <div className="pt-1 flex items-center text-xs font-semibold text-primary">
              <span>Start Scan</span>
              <span className="ml-1">&rarr;</span>
            </div>
          </div>

          {/* Action 2: Passive Recon */}
          <div
            onClick={() => onNavigate("recon")}
            className="group cursor-pointer p-5 rounded-xl bg-surface-1 border border-border hover:border-theme-success/50 hover:bg-surface-2 transition-all duration-200 shadow-sm hover:-translate-y-0.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-theme-success-subtle text-theme-success group-hover:scale-105 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-theme-success group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary group-hover:text-theme-success transition-colors">
                Passive Recon
              </h4>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Inspect public DNS records, TLS certificates, and HTTP defense headers.
              </p>
            </div>
            <div className="pt-1 flex items-center text-xs font-semibold text-theme-success">
              <span>Check Domain</span>
              <span className="ml-1">&rarr;</span>
            </div>
          </div>

          {/* Action 3: Quantum Trust */}
          <div
            onClick={() => onNavigate("quantum")}
            className="group cursor-pointer p-5 rounded-xl bg-surface-1 border border-border hover:border-purple-400/50 hover:bg-surface-2 transition-all duration-200 shadow-sm hover:-translate-y-0.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
                <Atom className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary group-hover:text-purple-400 transition-colors">
                Quantum Trust
              </h4>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Simulate Bell-state channel integrity and verify tamper non-repudiation.
              </p>
            </div>
            <div className="pt-1 flex items-center text-xs font-semibold text-purple-400">
              <span>Run Simulation</span>
              <span className="ml-1">&rarr;</span>
            </div>
          </div>

          {/* Action 4: Security Reports */}
          <div
            onClick={() => onNavigate("reports")}
            className="group cursor-pointer p-5 rounded-xl bg-surface-1 border border-border hover:border-amber-400/50 hover:bg-surface-2 transition-all duration-200 shadow-sm hover:-translate-y-0.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary group-hover:text-amber-500 transition-colors">
                Security Reports
              </h4>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Synthesize observed physical evidence and generate provenance certificates.
              </p>
            </div>
            <div className="pt-1 flex items-center text-xs font-semibold text-amber-500">
              <span>Open Reports</span>
              <span className="ml-1">&rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. RECENT ACTIVITY + ENGINE STATUS (Stagger: 250ms / 300ms)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Timeline */}
        <Card
          level={1}
          className="lg:col-span-2 p-6 space-y-4 animate-fadeUp"
          style={{ animationDelay: "250ms" }}
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-text-muted" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Recent Verification Activity
              </h4>
            </div>
            <button
              onClick={() => onNavigate("history")}
              className="text-xs font-semibold text-primary hover:text-primary-hover transition flex items-center space-x-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.recent_scans.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-8 h-8 text-text-muted" />}
              title="No verification history yet"
              description="Upload a binary, inspect a domain, or run a quantum simulation to establish your tamper-evident log."
              actionLabel="Analyze Your First File"
              onAction={() => onNavigate("scanner")}
            />
          ) : (
            <div className="divide-y divide-border/60">
              {stats.recent_scans.map((scan) => {
                let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "safe";
                if (scan.risk_level === "LOW") badgeVariant = "low";
                else if (scan.risk_level === "MEDIUM") badgeVariant = "medium";
                else if (scan.risk_level === "HIGH" || scan.risk_level === "CRITICAL") badgeVariant = "high";

                return (
                  <div
                    key={scan.scan_id}
                    onClick={() => onNavigate("history")}
                    className="py-3.5 flex items-center justify-between hover:bg-surface-2/60 px-2 rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-surface-2 text-primary group-hover:bg-primary-subtle transition">
                        <FileSearch className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-text-primary truncate group-hover:text-primary transition-colors">
                          {scan.filename}
                        </div>
                        <div className="text-[10px] font-mono text-text-muted flex items-center space-x-2">
                          <span>Static analysis completed</span>
                          <span>•</span>
                          <span>{scan.created_at ? new Date(scan.created_at).toLocaleDateString() : "Recent"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <Badge variant={badgeVariant} size="sm">
                        {scan.risk_level} · {scan.risk_score.toFixed(0)}
                      </Badge>
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Engine Readiness Matrix */}
        <Card
          level={1}
          className="p-6 space-y-4 animate-fadeUp"
          style={{ animationDelay: "300ms" }}
        >
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span>Engine Status</span>
            </h4>
            <span className="text-[10px] font-mono text-theme-success font-semibold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-theme-success animate-pulse" />
              <span>ONLINE</span>
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-0 border border-border/80 hover:border-border-strong transition">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-text-primary flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-theme-success animate-pulse" />
                  <span>Static File Quarantine</span>
                </div>
                <Badge variant="safe" size="sm">Active</Badge>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Zero-execution parsing, hash fingerprinting & entropy bounds.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-0 border border-border/80 hover:border-border-strong transition">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-text-primary flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-theme-success animate-pulse" />
                  <span>Digital Signatures</span>
                </div>
                <Badge variant="safe" size="sm">Active</Badge>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Authenticode PKCS#7 extraction, X.509 chains, self-signed detection.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-0 border border-border/80 hover:border-border-strong transition">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-text-primary flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-theme-success animate-pulse" />
                  <span>Quantum Trust Simulator</span>
                </div>
                <Badge variant="quantum" size="sm">Ready</Badge>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Bell-state $|\Phi^+\rangle$ channels across 5 attack scenarios.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-0 border border-border/80 hover:border-border-strong transition">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-text-primary flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-theme-success animate-pulse" />
                  <span>Defensive Recon</span>
                </div>
                <Badge variant="safe" size="sm">Active</Badge>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Passive DNS hygiene, TLS socket handshakes, HTTP defense headers.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

