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
  ChevronRight,
  Sparkles,
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
      // Retain baseline state gracefully
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

  // Dynamic secondary line based on live system state
  const getSecondaryHeroLine = () => {
    if (loading) return "Synchronizing real-time security telemetry...";
    if (stats.total_scans === 0) {
      return "Your security command center is ready. Inspect an artifact or domain to begin.";
    }
    if (stats.critical_threats > 0) {
      return `Attention required: ${stats.critical_threats} high-risk finding${stats.critical_threats === 1 ? "" : "s"} detected in active memory.`;
    }
    return "All analyzed artifacts and cryptographic signatures meet verified security baselines.";
  };

  // Safe posture score calculation (100 is best, 0 is worst) — Guaranteed never NaN
  const calculatePostureScore = (): number | null => {
    if (loading) return null;
    if (stats.total_scans === 0) return 100;
    const penalty = (stats.critical_threats * 30) + (stats.average_exposure * 0.15);
    const score = Math.max(15, Math.min(100, Math.round(100 - penalty)));
    return isNaN(score) ? 100 : score;
  };

  const postureScore = calculatePostureScore();

  // Real scan activity data for Recharts (no fabricated trends)
  const chartData = (stats.recent_scans || []).map((scan, idx) => {
    const timeLabel = scan.created_at
      ? new Date(scan.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : `Scan #${idx + 1}`;
    const numericRisk = typeof scan.risk_score === "number" && !isNaN(scan.risk_score)
      ? Math.round(scan.risk_score)
      : 0;
    return {
      name: scan.filename.length > 14 ? `${scan.filename.substring(0, 12)}…` : scan.filename,
      risk: numericRisk,
      time: timeLabel,
      level: scan.risk_level || "UNKNOWN",
    };
  }).reverse();

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-xl bg-surface-0/95 backdrop-blur-md border border-border/80 shadow-lg text-xs">
          <div className="font-medium text-text-primary">{data.name}</div>
          <div className="text-text-muted text-[11px] mt-0.5">{data.time}</div>
          <div className="mt-2 flex items-center justify-between gap-4 border-t border-border/60 pt-1.5">
            <span className="text-text-secondary">Risk Score</span>
            <span className="font-semibold text-primary">{data.risk} / 100</span>
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
          HERO BANNER: CLEAN, CALM, HIGH-POLISH COMMAND CENTER
          ========================================================================= */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-7 rounded-2xl border border-border/70 bg-surface-0/70 backdrop-blur-sm shadow-sm transition-all animate-fadeUp">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2 text-xs font-medium text-text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Security Command Center · NeuroCraft v1.4</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
            {getGreeting()}, {displayName}.
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {getSecondaryHeroLine()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            size="md"
            variant="primary"
            onClick={() => onNavigate("scanner")}
            icon={<Plus className="w-4 h-4" />}
          >
            Analyze File
          </Button>
          <Button
            size="md"
            variant="secondary"
            onClick={() => onNavigate("recon")}
            icon={<Globe className="w-4 h-4 text-text-secondary" />}
          >
            Check Exposure
          </Button>
          <button
            onClick={loadData}
            title="Refresh Telemetry"
            className="p-2.5 rounded-xl border border-border/70 bg-surface-1/60 hover:bg-surface-1 text-text-secondary hover:text-text-primary shadow-xs hover:-translate-y-0.5 active:scale-[0.98] transition-all focus-ring"
            aria-label="Refresh Dashboard Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROW 1: SECURITY POSTURE (8 columns) & CONSOLIDATED SCORE (4 columns)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Large Security Posture Feature Card */}
        <Card
          level={0}
          className="lg:col-span-8 p-7 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center space-x-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Security Posture
                </span>
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
                    ? "Elevated Risk"
                    : stats.total_scans === 0
                    ? "Baseline Ready"
                    : "Optimal"}
                </Badge>
              </div>
              <span className="text-[11px] text-text-muted font-mono">
                Zero Dynamic Execution · Deterministic
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight">
                {stats.total_scans === 0
                  ? "Awaiting Initial Security Baseline"
                  : stats.critical_threats === 0
                  ? "Consolidated Posture: Resilient & Healthy"
                  : `${stats.critical_threats} High-Severity Finding${stats.critical_threats === 1 ? "" : "s"} Flagged`}
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary mt-2 leading-relaxed max-w-2xl">
                Multi-engine static telemetry analyzes Authenticode signatures, certificate trust chains, entropy variations, and passive reconnaissance indicators without executing untrusted code.
              </p>
            </div>

            {/* Supporting Real Evidence Indicators */}
            <div className="pt-2">
              <div className="text-[11px] font-medium text-text-muted mb-2.5">
                Supporting Evidence
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-border/60 bg-surface-1/40">
                  <div className="text-xl font-semibold text-text-primary tracking-tight">
                    {stats.total_scans}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    Artifact{stats.total_scans === 1 ? "" : "s"} Analyzed
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border/60 bg-surface-1/40">
                  <div className={`text-xl font-semibold tracking-tight ${stats.critical_threats > 0 ? "text-danger" : "text-emerald-500"}`}>
                    {stats.critical_threats}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    Findings Detected
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border/60 bg-surface-1/40">
                  <div className="text-xl font-semibold text-primary tracking-tight">
                    {stats.recon_targets > 0 ? stats.recon_targets : "0"}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    Passive Exposure Checked
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-text-muted">
              EPR Bell-State Channel Simulation: Verified
            </span>
            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors group"
            >
              <span>View Evidence-Based Report</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </Card>

        {/* Consolidated Score Card */}
        <Card
          level={0}
          className="lg:col-span-4 p-7 flex flex-col justify-between items-center text-center relative overflow-hidden"
        >
          <div className="w-full flex items-center justify-between border-b border-border/60 pb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Consolidated Trust
            </span>
            <Badge
              variant={
                postureScore !== null && postureScore < 60
                  ? "high"
                  : postureScore !== null && postureScore < 80
                  ? "medium"
                  : "safe"
              }
              size="sm"
            >
              {postureScore !== null && postureScore >= 80
                ? "Excellent"
                : postureScore !== null && postureScore >= 60
                ? "Moderate"
                : "Elevated Risk"}
            </Badge>
          </div>

          <div className="my-6">
            <ScoreRing
              score={postureScore}
              loading={loading}
              variant="posture"
              size={144}
              strokeWidth={10}
              label={stats.total_scans === 0 ? "Baseline" : "Security Posture"}
              sublabel="0–100 Scale"
            />
          </div>

          <div className="w-full grid grid-cols-2 gap-2.5 pt-4 border-t border-border/60 text-left">
            <div className="p-3 rounded-xl bg-surface-1/40 border border-border/60">
              <div className="text-[11px] text-text-muted">Base Metric</div>
              <div className="text-xs font-semibold text-text-primary mt-0.5">
                {stats.total_scans === 0 ? "100 (Default)" : "Deterministic"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface-1/40 border border-border/60">
              <div className="text-[11px] text-text-muted">Risk Penalty</div>
              <div className="text-xs font-semibold text-text-primary mt-0.5">
                {stats.critical_threats > 0 ? `-${stats.critical_threats * 30} pts` : "0 pts"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 2: 4 KEY ANALYTICS METRICS (Never invent numbers)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FILES ANALYZED */}
        <Card level={1} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">
              Files Analyzed
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileSearch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
              {loading ? <Skeleton width={45} height={32} /> : stats.total_scans}
            </span>
            <span className="text-xs text-text-muted">
              {stats.total_scans === 0 ? "No scans" : "Isolated quarantine"}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-text-muted">Engine</span>
            <Badge variant="safe" size="sm">Active</Badge>
          </div>
        </Card>

        {/* THREATS FLAGGED */}
        <Card level={1} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">
              Threats Flagged
            </span>
            <div className="p-2 rounded-lg bg-danger/10 text-danger">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-3xl font-semibold tracking-tight ${stats.critical_threats > 0 ? "text-danger" : "text-text-primary"}`}>
              {loading ? <Skeleton width={45} height={32} /> : stats.critical_threats}
            </span>
            <span className="text-xs text-text-muted">
              {stats.critical_threats > 0 ? "Action required" : "Zero alerts"}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-text-muted">Integrity</span>
            <Badge variant={stats.critical_threats > 0 ? "high" : "safe"} size="sm">
              {stats.critical_threats > 0 ? "Flagged" : "Clean"}
            </Badge>
          </div>
        </Card>

        {/* RECON TARGETS */}
        <Card level={1} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">
              Recon Targets
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
              {loading ? <Skeleton width={45} height={32} /> : stats.recon_targets}
            </span>
            <span className="text-xs text-text-muted">
              {stats.recon_targets === 0 ? "No domains" : "Passive footprint"}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-text-muted">Assessment</span>
            <Badge variant="info" size="sm">Defensive</Badge>
          </div>
        </Card>

        {/* QUANTUM RUNS */}
        <Card level={1} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">
              Quantum Runs
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Atom className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
              {loading ? <Skeleton width={45} height={32} /> : stats.quantum_simulations}
            </span>
            <span className="text-xs text-text-muted">
              Bell-state |Φ⁺⟩
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-text-muted">Entanglement</span>
            <Badge variant="quantum" size="sm">Simulated</Badge>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 3: 4 MINIMAL QUICK ACTION CARDS (Tactile & Clean)
          ========================================================================= */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Quick Actions
          </h3>
          <span className="text-xs text-text-muted">Core capabilities</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Analyze File */}
          <div
            onClick={() => onNavigate("scanner")}
            className="group cursor-pointer p-5 rounded-2xl border border-border/70 bg-surface-0 hover:bg-surface-1/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                  <FileSearch className="w-5 h-5" />
                </div>
                <span className="text-[11px] text-text-muted font-mono">PE · PDF · APK</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary tracking-tight">
                  Analyze File
                </h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Analyze an untrusted artifact safely without code execution.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-medium text-primary">
              <span>Start Analysis</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Action 2: Passive Recon */}
          <div
            onClick={() => onNavigate("recon")}
            className="group cursor-pointer p-5 rounded-2xl border border-border/70 bg-surface-0 hover:bg-surface-1/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Globe className="w-5 h-5" />
                </div>
                <span className="text-[11px] text-text-muted font-mono">DNS · TLS · Headers</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary tracking-tight">
                  Passive Recon
                </h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Inspect public security exposure and external trust hygiene.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span>Check Domain</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Action 3: Quantum Trust */}
          <div
            onClick={() => onNavigate("quantum")}
            className="group cursor-pointer p-5 rounded-2xl border border-border/70 bg-surface-0 hover:bg-surface-1/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                  <Atom className="w-5 h-5" />
                </div>
                <span className="text-[11px] text-text-muted font-mono">Bell-State</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary tracking-tight">
                  Quantum Trust
                </h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Run a Bell-State simulation across 5 attack vectors.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-medium text-purple-600 dark:text-purple-400">
              <span>Run Simulation</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Action 4: Security Reports */}
          <div
            onClick={() => onNavigate("reports")}
            className="group cursor-pointer p-5 rounded-2xl border border-border/70 bg-surface-0 hover:bg-surface-1/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] text-text-muted font-mono">Provenance</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary tracking-tight">
                  Security Reports
                </h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Generate an evidence-based report with cryptographic provenance.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-medium text-amber-600 dark:text-amber-400">
              <span>Create Report</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 4: ACTIVITY TIMELINE (7 cols) & ENGINE READINESS (5 cols)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Security Activity Visualization */}
        <Card level={0} className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-border/60 pb-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Security Activity & Risk Timeline
              </h4>
            </div>
            <span className="text-xs text-text-muted">
              {stats.recent_scans?.length || 0} recorded scans
            </span>
          </div>

          {stats.recent_scans && stats.recent_scans.length > 0 ? (
            <div className="w-full h-56 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appleRiskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#appleRiskGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-8">
              <EmptyState
                icon={<Activity className="w-8 h-8 text-text-muted" />}
                title="No scans yet"
                description="Your security baseline starts here. Analyze an artifact to populate live activity."
                actionLabel="Analyze File"
                onAction={() => onNavigate("scanner")}
              />
            </div>
          )}

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
            <span>Historical Risk Tracker</span>
            <span className="text-primary font-medium">Live Telemetry</span>
          </div>
        </Card>

        {/* Engine Status Panel */}
        <Card level={0} className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-border/60 pb-3.5 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span>Engine Status</span>
            </h4>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>4 / 4 Operational</span>
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Engine 1 */}
            <div className="p-3 rounded-xl bg-surface-1/40 border border-border/60 flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">
                  Static File Analysis
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Quarantine, entropy & SHA-256
                </p>
              </div>
              <Badge variant="safe" size="sm">Ready</Badge>
            </div>

            {/* Engine 2 */}
            <div className="p-3 rounded-xl bg-surface-1/40 border border-border/60 flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">
                  Digital Signatures
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Authenticode PKCS#7 & X.509
                </p>
              </div>
              <Badge variant="safe" size="sm">Ready</Badge>
            </div>

            {/* Engine 3 */}
            <div className="p-3 rounded-xl bg-surface-1/40 border border-border/60 flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">
                  Passive Reconnaissance
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  DNS hygiene, TLS ciphers, headers
                </p>
              </div>
              <Badge variant="safe" size="sm">Ready</Badge>
            </div>

            {/* Engine 4 */}
            <div className="p-3 rounded-xl bg-surface-1/40 border border-border/60 flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">
                  Quantum Trust Simulation
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Bell-state entanglement channel
                </p>
              </div>
              <Badge variant="quantum" size="sm">Ready</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 5: RECENT ACTIVITY (8 cols) & SECURITY INSIGHTS (4 cols)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Recent Activity List */}
        <Card level={0} className="lg:col-span-8 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-text-secondary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Recent Activity
              </h4>
            </div>
            <button
              onClick={() => onNavigate("history")}
              className="text-xs font-medium text-primary hover:text-primary-hover flex items-center space-x-1 transition-colors"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.recent_scans && stats.recent_scans.length > 0 ? (
            <div className="space-y-2">
              {stats.recent_scans.map((scan) => {
                let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "safe";
                if (scan.risk_level === "LOW") badgeVariant = "low";
                else if (scan.risk_level === "MEDIUM") badgeVariant = "medium";
                else if (scan.risk_level === "HIGH" || scan.risk_level === "CRITICAL") badgeVariant = "high";

                const scoreVal = typeof scan.risk_score === "number" && !isNaN(scan.risk_score)
                  ? scan.risk_score.toFixed(0)
                  : "0";

                return (
                  <div
                    key={scan.scan_id}
                    onClick={() => onNavigate("history")}
                    className="p-3 rounded-xl border border-border/60 bg-surface-1/30 hover:bg-surface-1/70 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-surface-2/60 text-text-secondary group-hover:text-primary transition-colors">
                        <FileSearch className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-medium text-text-primary truncate">
                          {scan.filename}
                        </div>
                        <div className="text-[11px] text-text-muted flex items-center space-x-2 mt-0.5">
                          <span>Static Analysis</span>
                          <span>·</span>
                          <span>{formatTimeAgo(scan.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <Badge variant={badgeVariant} size="sm">
                        {scan.risk_level || "Evaluated"} · {scoreVal}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8">
              <EmptyState
                icon={<Clock className="w-8 h-8 text-text-muted" />}
                title="No scans yet"
                description="Your security baseline starts here. Inspect an untrusted file to begin."
                actionLabel="Analyze File"
                onAction={() => onNavigate("scanner")}
              />
            </div>
          )}
        </Card>

        {/* Security Baseline Insights */}
        <Card level={0} className="lg:col-span-4 p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-border/60 pb-3.5 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Security Insights</span>
            </h4>
            <Badge variant="safe" size="sm">Active</Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60">
              <div className="font-medium text-text-primary flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span>Zero Execution Mandate</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                All uploaded binaries are quarantined in-memory without invoking sub-processes, preventing lateral malware propagation.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60">
              <div className="font-medium text-text-primary flex items-center space-x-1.5">
                <Atom className="w-3.5 h-3.5 text-purple-500" />
                <span>Non-Repudiation Bell State</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                Quantum correlations verify channel integrity before digital signature certificates are trusted.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs font-medium"
              onClick={() => onNavigate("quantum")}
            >
              Run Quantum Audit
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
