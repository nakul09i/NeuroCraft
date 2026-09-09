import React, { useEffect, useState } from "react";
import {
  FileSearch,
  Globe2,
  Atom,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Plus,
  Cpu,
  Clock,
  ChevronRight,
  Activity,
  Zap,
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
  const [hasError, setHasError] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch {
      setHasError(true);
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

  // Safe posture calculation (0 to 100) — Guaranteed never NaN / null / undefined / Infinity
  const calculatePostureScore = (): number | null => {
    if (loading || hasError) return null;
    if (stats.total_scans === 0) return 100;
    const penalty = (stats.critical_threats * 30) + (stats.average_exposure * 0.15);
    const raw = Math.max(15, Math.min(100, Math.round(100 - penalty)));
    return Number.isFinite(raw) ? raw : 100;
  };

  const postureScore = calculatePostureScore();

  const getPostureVerdict = (score: number | null) => {
    if (score === null) return "Unavailable";
    if (score >= 80) return "OPTIMAL";
    if (score >= 60) return "MEDIUM";
    return "ELEVATED";
  };

  const postureVerdict = getPostureVerdict(postureScore);

  // SVG Radial Gauge Geometry
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = postureScore !== null
    ? circumference - (postureScore / 100) * circumference
    : circumference;

  // Chart data formatting
  const chartData = (stats.recent_scans || []).map((scan, idx) => {
    const timeLabel = scan.created_at
      ? new Date(scan.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : `#${idx + 1}`;
    const numericRisk = typeof scan.risk_score === "number" && Number.isFinite(scan.risk_score)
      ? Math.round(scan.risk_score)
      : 0;
    return {
      name: scan.filename.length > 14 ? `${scan.filename.substring(0, 12)}…` : scan.filename,
      risk: numericRisk,
      time: timeLabel,
      level: scan.risk_level || "SAFE",
    };
  }).reverse();

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-2xl neu-raised-md bg-surface-0 text-xs">
          <div className="font-bold text-text-primary">{data.name}</div>
          <div className="text-text-muted text-[11px] mt-0.5">{data.time}</div>
          <div className="mt-2 flex items-center justify-between gap-4 border-t border-border/60 pt-1.5 font-mono">
            <span className="text-text-secondary">Risk Score:</span>
            <span className="font-bold text-primary">{data.risk} / 100</span>
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
      return `${Math.round(diffHours / 24)}d ago`;
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-8 max-w-[1360px] mx-auto pb-14">
      {/* =========================================================================
          HERO BANNER: AWS-STYLE USABILITY + APPLE-STYLE POLISH
          ========================================================================= */}
      <Card surface="raised" className="p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Security Command Center · NeuroCraft</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary tracking-tight">
              {getGreeting()}, {displayName}.
            </h1>

            <p className="text-base sm:text-lg text-text-secondary leading-relaxed font-normal">
              Your security command center is ready.
            </p>
          </div>

          {/* Action CTAs (Primary & Secondary) */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => onNavigate("scanner")}
              className="text-base font-semibold shadow-md px-6 py-3.5"
              icon={<Plus className="w-5 h-5 text-text-secondary" />}
            >
              Analyze File
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => onNavigate("recon")}
              className="neu-button text-base font-semibold px-6 py-3.5"
              icon={<Globe2 className="w-5 h-5 text-text-secondary" />}
            >
              Check Exposure
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={() => onNavigate("quantum")}
              className="neu-button text-sm font-semibold"
              icon={<Atom className="w-4 h-4 text-purple-500" />}
            >
              Quantum Trust
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={() => onNavigate("reports")}
              className="neu-button text-sm font-semibold"
              icon={<FileText className="w-4 h-4 text-primary" />}
            >
              Generate Report
            </Button>
            <button
              onClick={loadData}
              title="Refresh Telemetry"
              className="p-3 rounded-2xl neu-button text-text-secondary hover:text-text-primary transition focus-ring"
              aria-label="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          SECURITY POSTURE SECTION (COMPACT & PROMINENT)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Security Posture Radial Card (8 cols) */}
        <Card surface="raised" className="lg:col-span-8 p-7 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Security Posture
              </span>
              <Badge
                variant={
                  postureVerdict === "OPTIMAL"
                    ? "safe"
                    : postureVerdict === "MEDIUM"
                    ? "medium"
                    : postureVerdict === "ELEVATED"
                    ? "high"
                    : "neutral"
                }
                size="md"
              >
                {postureVerdict}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              {/* Radial SVG Gauge */}
              <div className="relative flex items-center justify-center shrink-0 w-36 h-36">
                <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 120 120">
                  {/* Inset background ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    className="stroke-surface-2"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Dynamic indicator ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke={
                      postureScore !== null && postureScore >= 80
                        ? "#10b981"
                        : postureScore !== null && postureScore >= 60
                        ? "#f59e0b"
                        : "#ef4444"
                    }
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Score Number Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  {loading ? (
                    <Skeleton width={44} height={32} />
                  ) : postureScore !== null ? (
                    <>
                      <span className="text-3xl font-extrabold font-mono text-text-primary tracking-tight">
                        {postureScore}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">/ 100</span>
                    </>
                  ) : (
                    <span className="text-2xl font-mono text-text-muted">—</span>
                  )}
                </div>
              </div>

              {/* Posture Narrative & Invariant Summary */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                  {postureScore !== null && postureScore >= 80
                    ? "Optimal Security Posture"
                    : postureScore !== null && postureScore >= 60
                    ? "Medium Posture — Review Signals"
                    : stats.critical_threats > 0
                    ? "Elevated Threats Detected"
                    : "No Score Available"}
                </div>

                <p className="text-sm text-text-secondary leading-relaxed max-w-xl">
                  {stats.critical_threats > 0
                    ? "Your latest analysis detected signals that require review. Authenticode certificates and entropy patterns were evaluated."
                    : "Multi-engine static telemetry analyzes Authenticode signatures, certificate trust chains, entropy variations, and passive reconnaissance indicators without executing untrusted code."}
                </p>

                {/* Breakdown Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                  <div className="p-3 rounded-xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xl font-bold font-mono text-text-primary">
                      {stats.total_scans}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">Files analyzed</div>
                  </div>

                  <div className="p-3 rounded-xl neu-inset-sm bg-surface-0/60">
                    <div className={`text-xl font-bold font-mono ${stats.critical_threats > 0 ? "text-danger" : "text-emerald-500"}`}>
                      {stats.critical_threats}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">Threats detected</div>
                  </div>

                  <div className="p-3 rounded-xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xl font-bold font-mono text-text-primary">
                      {stats.recon_targets}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">Recon targets</div>
                  </div>

                  <div className="p-3 rounded-xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                      {stats.quantum_simulations}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">Quantum runs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
            <span>Deterministic Non-Repudiation Guaranteed</span>
            <button
              onClick={() => onNavigate("reports")}
              className="text-primary hover:underline font-semibold flex items-center space-x-1"
            >
              <span>View Security Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>

        {/* Real-time Telemetry Trend (4 cols) */}
        <Card surface="raised" className="lg:col-span-4 p-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary" />
              <span>Risk Posture Trend</span>
            </span>
            <span className="text-xs font-mono text-text-muted font-medium">
              {chartData.length} data points
            </span>
          </div>

          {chartData.length > 0 ? (
            <div className="w-full h-44 pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="neuRiskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#neuRiskGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-text-muted">
              No historical trends yet. Analyze files to populate telemetry.
            </div>
          )}

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
            <span>Real-time Multi-Engine</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● Active</span>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 2: 4 CLICKABLE KPI METRIC CARDS (34–46px NUMBERS)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* FILES ANALYZED */}
        <Card
          surface="raised"
          interactive
          onClick={() => onNavigate("scanner")}
          className="p-6 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-muted">Files Analyzed</span>
            <div className="p-2.5 rounded-xl neu-inset-sm text-primary group-hover:scale-105 transition-transform">
              <FileSearch className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-4xl font-extrabold font-mono text-text-primary tracking-tight">
              {loading ? <Skeleton width={48} height={36} /> : stats.total_scans}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-text-muted">
            <span>Static quarantine</span>
            <span className="text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
              Inspect →
            </span>
          </div>
        </Card>

        {/* THREATS */}
        <Card
          surface="raised"
          interactive
          onClick={() => onNavigate("history")}
          className="p-6 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-muted">Threats</span>
            <div className="p-2.5 rounded-xl neu-inset-sm text-danger group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-4xl font-extrabold font-mono tracking-tight ${
                stats.critical_threats > 0 ? "text-danger" : "text-text-primary"
              }`}
            >
              {loading ? <Skeleton width={48} height={36} /> : stats.critical_threats}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-text-muted">
            <span>{stats.critical_threats > 0 ? "Review signals" : "Clean baseline"}</span>
            <span className="text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
              View →
            </span>
          </div>
        </Card>

        {/* RECON TARGETS */}
        <Card
          surface="raised"
          interactive
          onClick={() => onNavigate("recon")}
          className="p-6 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-muted">Recon Targets</span>
            <div className="p-2.5 rounded-xl neu-inset-sm text-emerald-500 group-hover:scale-105 transition-transform">
              <Globe2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-4xl font-extrabold font-mono text-text-primary tracking-tight">
              {loading ? <Skeleton width={48} height={36} /> : stats.recon_targets}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-text-muted">
            <span>Passive OSINT</span>
            <span className="text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
              Explore →
            </span>
          </div>
        </Card>

        {/* QUANTUM RUNS */}
        <Card
          surface="raised"
          interactive
          onClick={() => onNavigate("quantum")}
          className="p-6 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-muted">Quantum Runs</span>
            <div className="p-2.5 rounded-xl neu-inset-sm text-purple-500 group-hover:scale-105 transition-transform">
              <Atom className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-4xl font-extrabold font-mono text-text-primary tracking-tight">
              {loading ? <Skeleton width={48} height={36} /> : stats.quantum_simulations}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-text-muted">
            <span>Bell-state |Φ⁺⟩</span>
            <span className="text-purple-500 font-semibold group-hover:translate-x-0.5 transition-transform">
              Simulate →
            </span>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 3: 4 TACTILE QUICK ACTIONS CARDS
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
            Quick Actions
          </h2>
          <span className="text-xs text-text-muted">Fast workflow execution</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Action 1: Analyze File */}
          <div
            onClick={() => onNavigate("scanner")}
            className="group cursor-pointer p-6 rounded-3xl neu-raised hover:-translate-y-1 active:translate-y-0 active:neu-inset-sm transition-all duration-200 flex flex-col justify-between border border-border/60"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl neu-inset-sm text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileSearch className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-text-muted">Quarantine</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  Analyze File
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                  Safely inspect an untrusted artifact.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-sm font-semibold text-primary">
              <span>Start Analysis</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Action 2: Passive Recon */}
          <div
            onClick={() => onNavigate("recon")}
            className="group cursor-pointer p-6 rounded-3xl neu-raised hover:-translate-y-1 active:translate-y-0 active:neu-inset-sm transition-all duration-200 flex flex-col justify-between border border-border/60"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl neu-inset-sm text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Globe2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-text-muted">OSINT</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  Passive Recon
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                  Understand public exposure.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Check Domain</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Action 3: Quantum Trust */}
          <div
            onClick={() => onNavigate("quantum")}
            className="group cursor-pointer p-6 rounded-3xl neu-raised hover:-translate-y-1 active:translate-y-0 active:neu-inset-sm transition-all duration-200 flex flex-col justify-between border border-border/60"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl neu-inset-sm text-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Atom className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-text-muted">Bell-State</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  Quantum Trust
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                  Explore verification integrity.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-sm font-semibold text-purple-600 dark:text-purple-400">
              <span>Run Simulation</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Action 4: Security Reports */}
          <div
            onClick={() => onNavigate("reports")}
            className="group cursor-pointer p-6 rounded-3xl neu-raised hover:-translate-y-1 active:translate-y-0 active:neu-inset-sm transition-all duration-200 flex flex-col justify-between border border-border/60"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl neu-inset-sm text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-text-muted">Provenance</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  Security Reports
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                  Generate evidence-based reports.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-sm font-semibold text-primary">
              <span>Create Report</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 4: RECENT ACTIVITY LIST (COMPACT, HIGH DENSITY, CLICKABLE)
          ========================================================================= */}
      <Card surface="raised" className="p-7 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
              Recent Security Activity
            </h2>
          </div>
          <button
            onClick={() => onNavigate("history")}
            className="text-xs font-semibold text-primary hover:underline flex items-center space-x-1 transition-colors"
          >
            <span>Full Audit Trail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats.recent_scans && stats.recent_scans.length > 0 ? (
          <div className="divide-y divide-border/50">
            {stats.recent_scans.map((scan) => {
              let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "safe";
              if (scan.risk_level === "LOW") badgeVariant = "low";
              else if (scan.risk_level === "MEDIUM") badgeVariant = "medium";
              else if (scan.risk_level === "HIGH" || scan.risk_level === "CRITICAL") badgeVariant = "high";

              const scoreVal = typeof scan.risk_score === "number" && Number.isFinite(scan.risk_score)
                ? scan.risk_score.toFixed(0)
                : "0";

              return (
                <div
                  key={scan.scan_id}
                  onClick={() => onNavigate("scanner")}
                  className="py-3.5 px-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-surface-0/60 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5 overflow-hidden">
                    <div className="p-2 rounded-xl neu-inset-sm text-primary shrink-0">
                      <FileSearch className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-bold text-text-primary truncate group-hover:text-primary transition-colors">
                        {scan.filename}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5 flex items-center space-x-2">
                        <span>Static Quarantine Analysis</span>
                        <span>·</span>
                        <span className="font-mono">{formatTimeAgo(scan.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 ml-auto sm:ml-0">
                    <Badge variant={badgeVariant} size="sm">
                      {scan.risk_level || "SAFE"} ({scoreVal})
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-text-muted">
            No recent activity recorded yet. Run a file analysis or passive recon to populate the log.
          </div>
        )}
      </Card>
    </div>
  );
};
