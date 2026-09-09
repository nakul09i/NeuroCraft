import React, { useEffect, useState } from "react";
import {
  FileSearch,
  Globe2,
  Atom,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Clock,
  ChevronRight,
  CheckCircle2,
  Lock,
  Search,
  Info,
  Layers,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { ScoreRing, getScoreState } from "../ui/ScoreRing";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../api";
import { DashboardStats, UserProfile } from "../../types";
import { safeNumber } from "../../utils/error";
import { useCountUp } from "../../hooks/useCountUp";

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
  const [hasError, setHasError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("Just now");

  const loadData = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Smooth count-up animated metrics
  const animatedScans = useCountUp(safeNumber(stats.total_scans, 0));
  const animatedThreats = useCountUp(safeNumber(stats.critical_threats, 0));
  const animatedRecon = useCountUp(safeNumber(stats.recon_targets, 0));
  const animatedQuantum = useCountUp(safeNumber(stats.quantum_simulations, 0));

  // Dynamic Greeting based on local time
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const userName = user?.display_name || user?.email?.split("@")[0] || "Analyst";
  const greeting = `Good ${timeOfDay}, ${userName}.`;

  // Safe posture calculation (0 to 100) — Returns null if no evaluations have run
  const calculateSafetyScore = (): number | null => {
    if (loading || hasError) return null;
    const totalScans = safeNumber(stats.total_scans, 0);
    const reconTargets = safeNumber(stats.recon_targets, 0);
    if (totalScans === 0 && reconTargets === 0) return null;
    const threats = safeNumber(stats.critical_threats, 0);
    const exposure = safeNumber(stats.average_exposure, 0);
    const penalty = threats * 30 + exposure * 0.15;
    const raw = Math.max(0, Math.min(100, Math.round(100 - penalty)));
    return Number.isFinite(raw) ? raw : 0;
  };

  const safetyScore = calculateSafetyScore();

  // Dynamic Posture Headline
  let postureHeadline = "Your systems are protected.";
  if (stats.critical_threats > 0) {
    postureHeadline = `${stats.critical_threats} item${stats.critical_threats > 1 ? "s" : ""} need attention.`;
  } else if (safetyScore !== null && safetyScore < 70) {
    postureHeadline = "A few items are worth reviewing.";
  } else if (safetyScore === null) {
    postureHeadline = "Awaiting your first analysis.";
  }

  // Chart data formatting for Safety Trend
  const chartData = (stats.recent_scans || [])
    .map((scan, idx) => {
      const timeLabel = scan.created_at
        ? new Date(scan.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : `#${idx + 1}`;
      const rawRisk = safeNumber(scan.risk_score, 0);
      const numericRisk = Math.max(0, Math.min(100, Math.round(rawRisk)));
      return {
        name:
          (scan.filename || "file").length > 14
            ? `${(scan.filename || "file").substring(0, 12)}…`
            : scan.filename || "file",
        safety: 100 - numericRisk,
        time: timeLabel,
        level: scan.risk_level || "SAFE",
      };
    })
    .reverse();

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-xl bg-surface-elevated border border-border shadow-lg text-xs">
          <div className="font-bold text-text-primary">{data.name}</div>
          <div className="text-text-muted text-[11px] mt-0.5">{data.time}</div>
          <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-1.5 font-mono">
            <span className="text-text-secondary">Safety:</span>
            <span className="font-bold text-primary">{data.safety} / 100</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "Just now";
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 page-enter max-w-6xl mx-auto pb-16">
      {/* =========================================================================
          BLOCK 1: HERO & SECURITY STATUS (Clear Hierarchy, Single Primary Action)
          ========================================================================= */}
      <Card surface="raised" className="p-7 sm:p-9 relative overflow-hidden border border-border">
        {/* Subtle Ambient Mesh Orb (15s gentle float) */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-ambient-mesh" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Column: Greeting, Headline, Subtitle, Actions */}
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-surface-1 border border-border text-xs font-semibold animate-fadeIn stagger-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 status-dot-safe" />
              <span className="text-text-secondary">{greeting}</span>
            </div>

            <div className="animate-fadeIn stagger-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary tracking-tight leading-tight">
                {postureHeadline}
              </h1>
              <p className="text-sm sm:text-base text-text-secondary mt-2 max-w-2xl leading-relaxed font-normal">
                NeuroCraft analyzes files, verifies trust signals, and identifies meaningful security risks before execution.
              </p>
            </div>

            {/* Primary & Secondary Actions (Clean, Not Crowded) */}
            <div className="flex flex-wrap items-center gap-3 pt-2 animate-fadeIn stagger-3">
              <Button
                size="lg"
                variant="primary"
                onClick={() => onNavigate("scanner")}
                className="px-6 py-3 text-sm sm:text-base font-semibold shadow-xs"
                icon={<FileSearch className="w-4 h-4" />}
              >
                <span>Analyze a File</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <Button
                size="lg"
                variant="secondary"
                onClick={() => onNavigate("reports")}
                className="px-5 py-3 text-sm font-medium"
                icon={<FileText className="w-4 h-4" />}
              >
                View Reports
              </Button>
            </div>

            {/* Concise 4-Pill Metric Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-border animate-fadeIn stagger-4">
              <div className="p-2.5 rounded-xl bg-surface-1 border border-border/60">
                <div className="text-[11px] font-medium text-text-muted">Files Checked</div>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">{animatedScans}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-1 border border-border/60">
                <div className="text-[11px] font-medium text-text-muted">Threats Caught</div>
                <div className={`text-lg font-bold font-mono mt-0.5 ${stats.critical_threats > 0 ? "text-danger" : "text-emerald-500"}`}>
                  {animatedThreats}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-1 border border-border/60">
                <div className="text-[11px] font-medium text-text-muted">Web Recon</div>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">{animatedRecon}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-1 border border-border/60">
                <div className="text-[11px] font-medium text-text-muted">Trust Tests</div>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">{animatedQuantum}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Central Security Score Gauge */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-surface-1/70 border border-border">
            <ScoreRing
              score={safetyScore}
              size={152}
              strokeWidth={11}
              label="Security Posture"
              sublabel={safetyScore !== null ? "Evaluated across active checks" : undefined}
            />

            <div className="mt-4 pt-3 border-t border-border w-full flex items-center justify-between text-xs text-text-muted px-2">
              <span>Updated: {lastUpdated}</span>
              <button
                onClick={loadData}
                disabled={loading}
                className="hover:text-text-primary flex items-center space-x-1 transition-colors"
                title="Refresh posture"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          BLOCK 2: RECENT ANALYSIS & SAFETY TREND (2 Cohesive Panels)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left (7 cols): Recent Analyses */}
        <Card surface="raised" className="lg:col-span-7 p-6 sm:p-7 border border-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-surface-1 text-primary">
                  <FileSearch className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary tracking-tight">Recent Analysis</h2>
                  <p className="text-xs text-text-muted">Recently inspected files and integrity checks</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate("history")}
                className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center space-x-1 transition-colors"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="py-6 space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (stats.recent_scans || []).length > 0 ? (
              <div className="divide-y divide-border mt-1">
                {(stats.recent_scans || []).slice(0, 4).map((scan) => {
                  const score = typeof scan.risk_score === "number" ? Math.max(0, 100 - scan.risk_score) : 100;
                  const isSafe = scan.risk_level === "SAFE" || scan.risk_level === "LOW";
                  return (
                    <div
                      key={scan.scan_id}
                      onClick={() => onNavigate("scanner")}
                      className="py-3 sm:py-3.5 flex items-center justify-between group hover:bg-surface-1/60 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSafe ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-danger/10 text-danger border-danger/20"
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-text-primary truncate group-hover:text-primary transition-colors">
                            {scan.filename || "Uploaded File"}
                          </div>
                          <div className="text-[11px] text-text-muted flex items-center space-x-2 mt-0.5">
                            <span>{formatTimeAgo(scan.created_at)}</span>
                            <span>·</span>
                            <span className="font-mono">{score}/100</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center space-x-2">
                        <Badge
                          variant={scan.risk_level === "CRITICAL" ? "critical" : scan.risk_level === "HIGH" ? "high" : scan.risk_level === "MEDIUM" ? "medium" : "safe"}
                          size="sm"
                        >
                          {scan.risk_level || "SAFE"}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-1 border border-border flex items-center justify-center mx-auto text-text-muted">
                  <FileSearch className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">No files analyzed yet</div>
                  <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                    Upload your first file to see genuine security findings, digital signatures, and entropy analysis.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onNavigate("scanner")}
                  className="mt-2"
                >
                  Analyze a File
                </Button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border text-xs text-text-muted flex items-center justify-between">
            <span>Zero-Execution Sandbox</span>
            <span className="text-emerald-500 font-semibold">● 100% Out-of-Process</span>
          </div>
        </Card>

        {/* Right (5 cols): Safety Score Trend Chart */}
        <Card surface="raised" className="lg:col-span-5 p-6 sm:p-7 border border-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-surface-1 text-primary">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary tracking-tight">Safety Trend</h2>
                  <p className="text-xs text-text-muted">7-day security posture history</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-primary">
                {safetyScore !== null ? `${safetyScore}/100` : "—"}
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="w-full h-44 pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="safetyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="safety"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#safetyGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-text-muted space-y-2">
                <div className="font-semibold text-text-secondary">Trend Awaiting Data</div>
                <p className="max-w-xs mx-auto">
                  As you inspect files, website domains, and quantum channels, your safety trajectory will graph here.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>Historical Integrity</span>
            <span className="text-emerald-500 font-semibold">● Verified Baseline</span>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          BLOCK 3: SYSTEM CAPABILITIES & ACTIVITY (Concise, Aerospace / Linear Precision)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left (6 cols): Active Verification Engines */}
        <Card surface="raised" className="lg:col-span-6 p-6 border border-border space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-border">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-text-primary tracking-tight">Active Trust Engines</h3>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-1/60 border border-border/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="text-xs font-semibold text-text-primary">Static Binary Inspection</div>
                  <div className="text-[11px] text-text-muted">Zero-execution PE, ELF, PDF, and archive parser</div>
                </div>
              </div>
              <Badge variant="safe" size="sm">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-1/60 border border-border/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="text-xs font-semibold text-text-primary">Digital Signatures & Authenticode</div>
                  <div className="text-[11px] text-text-muted">Certificate chain, issuer, and countersignature validation</div>
                </div>
              </div>
              <Badge variant="safe" size="sm">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-1/60 border border-border/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="text-xs font-semibold text-text-primary">Defensive Network Reconnaissance</div>
                  <div className="text-[11px] text-text-muted">Public DNS, SSL/TLS certificate, and HSTS/CSP header audit</div>
                </div>
              </div>
              <Badge variant="safe" size="sm">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-1/60 border border-border/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <div>
                  <div className="text-xs font-semibold text-text-primary">Post-Quantum Cryptography Simulation</div>
                  <div className="text-[11px] text-text-muted">NIST lattice verification and quantum channel noise tests</div>
                </div>
              </div>
              <Badge variant="quantum" size="sm">PQC Ready</Badge>
            </div>
          </div>
        </Card>

        {/* Right (6 cols): Fast Navigation to Core Modules */}
        <Card surface="raised" className="lg:col-span-6 p-6 border border-border space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-border">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-text-primary tracking-tight">Security Modules</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => onNavigate("scanner")}
              className="p-3.5 rounded-xl bg-surface-1 hover:bg-surface-1/80 border border-border hover:border-primary/40 transition-all cursor-pointer group"
            >
              <FileSearch className="w-5 h-5 text-primary mb-2" />
              <div className="font-bold text-xs text-text-primary group-hover:text-primary transition-colors">
                Analyze a File
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Check any file for hidden indicators and signatures
              </p>
            </div>

            <div
              onClick={() => onNavigate("recon")}
              className="p-3.5 rounded-xl bg-surface-1 hover:bg-surface-1/80 border border-border hover:border-emerald-500/40 transition-all cursor-pointer group"
            >
              <Globe2 className="w-5 h-5 text-emerald-500 mb-2" />
              <div className="font-bold text-xs text-text-primary group-hover:text-emerald-500 transition-colors">
                Passive Recon
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Inspect public domains, SSL certs, and security headers
              </p>
            </div>

            <div
              onClick={() => onNavigate("quantum")}
              className="p-3.5 rounded-xl bg-surface-1 hover:bg-surface-1/80 border border-border hover:border-purple-500/40 transition-all cursor-pointer group"
            >
              <Atom className="w-5 h-5 text-purple-500 mb-2" />
              <div className="font-bold text-xs text-text-primary group-hover:text-purple-500 transition-colors">
                Trust Verification
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Simulate post-quantum channel tamper resistance
              </p>
            </div>

            <div
              onClick={() => onNavigate("reports")}
              className="p-3.5 rounded-xl bg-surface-1 hover:bg-surface-1/80 border border-border hover:border-border-strong transition-all cursor-pointer group"
            >
              <FileText className="w-5 h-5 text-text-secondary mb-2" />
              <div className="font-bold text-xs text-text-primary group-hover:text-primary transition-colors">
                Security Reports
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Generate signed JSON and Markdown assessment records
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
