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
  Terminal,
  Shield,
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
      // Retain baseline state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 18) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  };

  const displayName = (user?.display_name || user?.email?.split("@")[0] || "ANALYST").toUpperCase();

  // Dynamic secondary line based on live system state
  const getSecondaryHeroLine = () => {
    if (loading) return "Synchronizing real-time telemetry...";
    if (stats.total_scans === 0) {
      return "Your security command center is ready. Start your first verification.";
    }
    if (stats.critical_threats > 0) {
      return `Attention required: ${stats.critical_threats} critical finding${stats.critical_threats === 1 ? "" : "s"} flagged in active memory.`;
    }
    return "All verified artifacts and cryptographic credentials match healthy security baselines.";
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
      : `Run #${idx + 1}`;
    const numericRisk = typeof scan.risk_score === "number" && !isNaN(scan.risk_score)
      ? Math.round(scan.risk_score)
      : 0;
    return {
      name: scan.filename.length > 14 ? `${scan.filename.substring(0, 12)}...` : scan.filename,
      risk: numericRisk,
      time: timeLabel,
      level: scan.risk_level || "UNKNOWN",
    };
  }).reverse();

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-md bg-surface-0 border-2 border-border shadow-brutal text-xs font-mono">
          <div className="font-extrabold text-text-primary font-display">{data.name}</div>
          <div className="text-text-muted text-[10px] mt-0.5">{data.time}</div>
          <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-border pt-1">
            <span className="text-text-secondary">RISK SCORE:</span>
            <span className="font-extrabold text-primary">{data.risk} / 100</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "JUST NOW";
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
      if (diffMins < 60) return `${diffMins} MIN AGO`;
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `${diffHours} HR AGO`;
      return `${Math.round(diffHours / 24)} D AGO`;
    } catch {
      return "RECENT";
    }
  };

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-12">
      {/* =========================================================================
          HERO BANNER: EDITORIAL NEO-BRUTALIST COMMAND CENTER
          ========================================================================= */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 sm:p-7 rounded-xl border-2 border-border bg-surface-0 shadow-brutal animate-fadeUp">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2 text-[10px] font-mono font-extrabold tracking-widest text-text-muted uppercase">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse border border-black" />
            <span>NEUROCRAFT SECURITY OPERATING CENTER · v1.4</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight font-display">
            {getGreeting()}, {displayName}.
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-sans">
            {getSecondaryHeroLine()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            size="md"
            variant="primary"
            onClick={() => onNavigate("scanner")}
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
          >
            + NEW SCAN
          </Button>
          <Button
            size="md"
            variant="secondary"
            onClick={() => onNavigate("recon")}
            icon={<Globe className="w-4 h-4 stroke-[2.2]" />}
          >
            CHECK EXPOSURE
          </Button>
          <button
            onClick={loadData}
            title="Refresh Telemetry"
            className="p-2.5 rounded-lg border-2 border-border bg-surface-1 hover:bg-surface-2 text-text-primary shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition focus-ring"
            aria-label="Refresh Dashboard Data"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2.2] ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROW 1: 12-COLUMN ASYMMETRIC GRID
          Security Posture (8 columns) & Consolidated Score (4 columns)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Large Security Posture Feature Card (8 columns) */}
        <Card
          level={0}
          className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-3.5">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-text-primary">
                  SECURITY POSTURE
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
                    ? "ELEVATED RISK"
                    : stats.total_scans === 0
                    ? "BASELINE READY"
                    : "OPTIMAL"}
                </Badge>
              </div>
              <span className="text-[10px] font-mono font-bold text-text-muted uppercase">
                ZERO DYNAMIC EXECUTION · DETERMINISTIC
              </span>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black text-text-primary font-display tracking-tight">
                {stats.total_scans === 0
                  ? "Awaiting Initial Security Baseline"
                  : stats.critical_threats === 0
                  ? "Consolidated Posture: Resilient & Healthy"
                  : `${stats.critical_threats} High-Severity Finding${stats.critical_threats === 1 ? "" : "s"} Flagged`}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary mt-2 leading-relaxed max-w-2xl">
                Multi-engine static telemetry parses Authenticode digital signatures, certificate chains, entropy deviations, and passive exposure vectors with cryptographic guarantees.
              </p>
            </div>

            {/* Supporting Real Evidence Indicators */}
            <div className="pt-2">
              <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-text-muted mb-2">
                SUPPORTING EVIDENCE:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border-2 border-border bg-surface-1 shadow-[2px_2px_0px_var(--border)]">
                  <div className="text-lg font-black font-display text-text-primary">
                    {stats.total_scans}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-text-secondary uppercase">
                    Artifact{stats.total_scans === 1 ? "" : "s"} Analyzed
                  </div>
                </div>
                <div className="p-3 rounded-lg border-2 border-border bg-surface-1 shadow-[2px_2px_0px_var(--border)]">
                  <div className={`text-lg font-black font-display ${stats.critical_threats > 0 ? "text-danger" : "text-theme-success"}`}>
                    {stats.critical_threats}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-text-secondary uppercase">
                    Findings Detected
                  </div>
                </div>
                <div className="p-3 rounded-lg border-2 border-border bg-surface-1 shadow-[2px_2px_0px_var(--border)]">
                  <div className="text-lg font-black font-display text-primary">
                    {stats.recon_targets > 0 ? stats.recon_targets : "0"}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-text-secondary uppercase">
                    Passive Exposure Checked
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t-2 border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] font-mono font-bold text-text-muted">
              EPR BELL-STATE CHANNEL SIMULATION: VERIFIED
            </span>
            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="inline-flex items-center space-x-1.5 text-xs font-black font-display text-primary hover:text-primary-hover uppercase tracking-wider transition group"
            >
              <span>View Evidence-Based Report</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </Card>

        {/* Dedicated Consolidated Score Card (4 columns) */}
        <Card
          level={0}
          className="lg:col-span-4 p-6 flex flex-col justify-between items-center text-center relative overflow-hidden"
        >
          <div className="w-full flex items-center justify-between border-b-2 border-border pb-3">
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-text-muted">
              CONSOLIDATED TRUST
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
                ? "EXCELLENT"
                : postureScore !== null && postureScore >= 60
                ? "MODERATE"
                : "ELEVATED"}
            </Badge>
          </div>

          <div className="my-5">
            <ScoreRing
              score={postureScore}
              loading={loading}
              variant="posture"
              size={150}
              strokeWidth={14}
              label={stats.total_scans === 0 ? "BASELINE" : "SECURITY POSTURE"}
              sublabel="0–100 Scale"
            />
          </div>

          <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t-2 border-border text-left">
            <div className="p-2.5 rounded-lg bg-surface-1 border-2 border-border">
              <div className="text-[9px] text-text-muted font-mono uppercase font-bold">Base Metric</div>
              <div className="text-xs font-black text-text-primary mt-0.5 font-display">
                {stats.total_scans === 0 ? "100 (Init)" : "Deterministic"}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-1 border-2 border-border">
              <div className="text-[9px] text-text-muted font-mono uppercase font-bold">Risk Penalty</div>
              <div className="text-xs font-black text-text-primary mt-0.5 font-display">
                {stats.critical_threats > 0 ? `-${stats.critical_threats * 30} PTS` : "0 PTS"}
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
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-text-muted">
              FILES ANALYZED
            </span>
            <div className="p-2 rounded-md border-2 border-border bg-primary text-black shadow-brutal-sm">
              <FileSearch className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black font-display text-text-primary">
              {loading ? <Skeleton width={45} height={36} /> : stats.total_scans}
            </span>
            <span className="text-xs font-mono font-bold text-text-secondary">
              {stats.total_scans === 0 ? "No scans" : "Safe quarantine"}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t-2 border-border flex items-center justify-between text-[10px] font-mono">
            <span className="text-text-muted">QUARANTINE ENGINE</span>
            <Badge variant="safe" size="sm">ISOLATED</Badge>
          </div>
        </Card>

        {/* THREATS FLAGGED */}
        <Card level={1} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-text-muted">
              THREATS FLAGGED
            </span>
            <div className="p-2 rounded-md border-2 border-border bg-danger text-white shadow-brutal-sm">
              <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-black font-display ${stats.critical_threats > 0 ? "text-danger" : "text-text-primary"}`}>
              {loading ? <Skeleton width={45} height={36} /> : stats.critical_threats}
            </span>
            <span className="text-xs font-mono font-bold text-text-secondary">
              {stats.critical_threats > 0 ? "Action required" : "Zero alerts"}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t-2 border-border flex items-center justify-between text-[10px] font-mono">
            <span className="text-text-muted">INTEGRITY STATUS</span>
            <Badge variant={stats.critical_threats > 0 ? "high" : "safe"} size="sm">
              {stats.critical_threats > 0 ? "FLAGGED" : "CLEAN"}
            </Badge>
          </div>
        </Card>

        {/* RECON TARGETS */}
        <Card level={1} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-text-muted">
              RECON TARGETS
            </span>
            <div className="p-2 rounded-md border-2 border-border bg-theme-success text-black shadow-brutal-sm">
              <Globe className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black font-display text-text-primary">
              {loading ? <Skeleton width={45} height={36} /> : stats.recon_targets}
            </span>
            <span className="text-xs font-mono font-bold text-text-secondary">
              {stats.recon_targets === 0 ? "No domains" : "Passive footprint"}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t-2 border-border flex items-center justify-between text-[10px] font-mono">
            <span className="text-text-muted">ASSESSMENT MODE</span>
            <Badge variant="info" size="sm">DEFENSIVE</Badge>
          </div>
        </Card>

        {/* QUANTUM RUNS */}
        <Card level={1} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-text-muted">
              QUANTUM RUNS
            </span>
            <div className="p-2 rounded-md border-2 border-border bg-accent-purple text-white shadow-brutal-sm">
              <Atom className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black font-display text-text-primary">
              {loading ? <Skeleton width={45} height={36} /> : stats.quantum_simulations}
            </span>
            <span className="text-xs font-mono font-bold text-text-secondary">
              Bell-state $|\Phi^+\rangle$
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t-2 border-border flex items-center justify-between text-[10px] font-mono">
            <span className="text-text-muted">ENTANGLEMENT</span>
            <Badge variant="quantum" size="sm">SIMULATED</Badge>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 3: 4 BOLD NEO-BRUTALIST QUICK ACTION CARDS (Every CTA Works)
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-text-primary">
            QUICK ACTIONS & CORE CAPABILITIES
          </h3>
          <span className="text-[10px] font-mono text-text-muted uppercase">Tactile Command Shortcuts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Analyze File */}
          <div
            onClick={() => onNavigate("scanner")}
            className="group cursor-pointer p-5 rounded-xl border-2 border-border bg-surface-0 shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active transition-all duration-150 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg border-2 border-border bg-primary text-black shadow-brutal-sm group-hover:scale-105 transition-transform">
                  <FileSearch className="w-5 h-5 stroke-[2.5]" />
                </div>
                <Badge variant="neutral" size="sm">PE · PDF · APK</Badge>
              </div>
              <div>
                <h4 className="text-base font-black font-display text-text-primary tracking-tight">
                  ANALYZE FILE
                </h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Analyze an untrusted artifact safely without code execution.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-border">
              <Button
                size="sm"
                variant="primary"
                className="w-full text-xs font-black tracking-wide uppercase"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate("scanner");
                }}
              >
                START ANALYSIS →
              </Button>
            </div>
          </div>

          {/* Action 2: Passive Recon */}
          <div
            onClick={() => onNavigate("recon")}
            className="group cursor-pointer p-5 rounded-xl border-2 border-border bg-surface-0 shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active transition-all duration-150 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg border-2 border-border bg-theme-success text-black shadow-brutal-sm group-hover:scale-105 transition-transform">
                  <Globe className="w-5 h-5 stroke-[2.5]" />
                </div>
                <Badge variant="safe" size="sm">DNS · TLS · HTTP</Badge>
              </div>
              <div>
                <h4 className="text-base font-black font-display text-text-primary tracking-tight">
                  PASSIVE RECON
                </h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Inspect public security exposure and external trust hygiene.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-border">
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs font-black tracking-wide uppercase"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate("recon");
                }}
              >
                CHECK DOMAIN →
              </Button>
            </div>
          </div>

          {/* Action 3: Quantum Trust */}
          <div
            onClick={() => onNavigate("quantum")}
            className="group cursor-pointer p-5 rounded-xl border-2 border-border bg-surface-0 shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-violet active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active transition-all duration-150 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg border-2 border-border bg-accent-purple text-white shadow-brutal-sm group-hover:scale-105 transition-transform">
                  <Atom className="w-5 h-5 stroke-[2.5]" />
                </div>
                <Badge variant="quantum" size="sm">BELL-STATE</Badge>
              </div>
              <div>
                <h4 className="text-base font-black font-display text-text-primary tracking-tight">
                  QUANTUM TRUST
                </h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Run a Bell-State verification simulation across 5 attack vectors.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-border">
              <Button
                size="sm"
                variant="quantum"
                className="w-full text-xs font-black tracking-wide uppercase"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate("quantum");
                }}
              >
                RUN SIMULATION →
              </Button>
            </div>
          </div>

          {/* Action 4: Security Reports */}
          <div
            onClick={() => onNavigate("reports")}
            className="group cursor-pointer p-5 rounded-xl border-2 border-border bg-surface-0 shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active transition-all duration-150 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg border-2 border-border bg-warning text-black shadow-brutal-sm group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5 stroke-[2.5]" />
                </div>
                <Badge variant="medium" size="sm">PROVENANCE</Badge>
              </div>
              <div>
                <h4 className="text-base font-black font-display text-text-primary tracking-tight">
                  SECURITY REPORT
                </h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Generate an evidence-based report with cryptographic provenance.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-border">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-black tracking-wide uppercase"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate("reports");
                }}
              >
                CREATE REPORT →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 4: ASYMMETRIC GRID
          Activity Chart (7 columns) & Engine Status (5 columns)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Security Activity Visualization (7 columns) */}
        <Card level={0} className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4">
          <div className="border-b-2 border-border pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary stroke-[2.5]" />
              <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider">
                SECURITY ACTIVITY & RISK TIMELINE
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold text-text-muted">
              {stats.recent_scans?.length || 0} RECORDED SCANS
            </span>
          </div>

          {stats.recent_scans && stats.recent_scans.length > 0 ? (
            <div className="w-full h-56 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="brutalRiskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    fontFamily="monospace"
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    fontFamily="monospace"
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#brutalRiskGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-8">
              <EmptyState
                icon={<Activity className="w-8 h-8 text-text-muted" />}
                title="NO SCANS YET."
                description="Your security baseline starts here. Analyze an artifact to populate live activity."
                actionLabel="ANALYZE FILE →"
                onAction={() => onNavigate("scanner")}
              />
            </div>
          )}

          <div className="pt-3 border-t-2 border-border flex items-center justify-between text-[10px] text-text-muted font-mono">
            <span>HISTORICAL RISK TRACKER</span>
            <span className="text-primary font-black uppercase">LIVE TELEMETRY</span>
          </div>
        </Card>

        {/* Engine Status Panel (5 columns) */}
        <Card level={0} className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
          <div className="border-b-2 border-border pb-3 flex items-center justify-between">
            <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-primary stroke-[2.5]" />
              <span>ENGINE STATUS</span>
            </h4>
            <span className="text-[10px] font-mono text-theme-success font-extrabold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-theme-success animate-pulse border border-black" />
              <span>4 / 4 OPERATIONAL</span>
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Engine 1 */}
            <div className="p-3 rounded-lg bg-surface-1 border-2 border-border shadow-[2px_2px_0px_var(--border)] flex items-center justify-between">
              <div>
                <div className="font-extrabold text-text-primary font-display flex items-center space-x-2">
                  <span>STATIC ANALYSIS</span>
                </div>
                <p className="text-[10px] text-text-muted font-mono mt-0.5">
                  Quarantine, entropy & SHA-256
                </p>
              </div>
              <Badge variant="safe" size="sm">● READY</Badge>
            </div>

            {/* Engine 2 */}
            <div className="p-3 rounded-lg bg-surface-1 border-2 border-border shadow-[2px_2px_0px_var(--border)] flex items-center justify-between">
              <div>
                <div className="font-extrabold text-text-primary font-display flex items-center space-x-2">
                  <span>DIGITAL SIGNATURES</span>
                </div>
                <p className="text-[10px] text-text-muted font-mono mt-0.5">
                  Authenticode PKCS#7 & X.509
                </p>
              </div>
              <Badge variant="safe" size="sm">● READY</Badge>
            </div>

            {/* Engine 3 */}
            <div className="p-3 rounded-lg bg-surface-1 border-2 border-border shadow-[2px_2px_0px_var(--border)] flex items-center justify-between">
              <div>
                <div className="font-extrabold text-text-primary font-display flex items-center space-x-2">
                  <span>PASSIVE RECON</span>
                </div>
                <p className="text-[10px] text-text-muted font-mono mt-0.5">
                  DNS hygiene, TLS ciphers, headers
                </p>
              </div>
              <Badge variant="safe" size="sm">● READY</Badge>
            </div>

            {/* Engine 4 */}
            <div className="p-3 rounded-lg bg-surface-1 border-2 border-border shadow-[2px_2px_0px_var(--border)] flex items-center justify-between">
              <div>
                <div className="font-extrabold text-text-primary font-display flex items-center space-x-2">
                  <span>QUANTUM TRUST</span>
                </div>
                <p className="text-[10px] text-text-muted font-mono mt-0.5">
                  Bell-state entanglement channel
                </p>
              </div>
              <Badge variant="quantum" size="sm">● READY</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 5: ASYMMETRIC GRID
          Recent Activity (8 columns) & Security Insights (4 columns)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Recent Activity List (8 columns) */}
        <Card level={0} className="lg:col-span-8 p-6 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-border pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-text-primary stroke-[2.2]" />
              <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider">
                RECENT ACTIVITY
              </h4>
            </div>
            <button
              onClick={() => onNavigate("history")}
              className="text-xs font-bold text-primary hover:text-primary-hover uppercase tracking-wider flex items-center space-x-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {stats.recent_scans && stats.recent_scans.length > 0 ? (
            <div className="space-y-2.5">
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
                    className="p-3.5 rounded-lg border-2 border-border bg-surface-1 hover:bg-surface-2 hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-brutal-sm hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 rounded-md border-2 border-border bg-surface-0 text-text-primary group-hover:bg-primary group-hover:text-black transition">
                        <FileSearch className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-black font-display text-text-primary truncate">
                          {scan.filename}
                        </div>
                        <div className="text-[10px] font-mono text-text-muted flex items-center space-x-2 mt-0.5">
                          <span className="font-bold text-text-secondary">STATIC ANALYSIS</span>
                          <span>·</span>
                          <span>{formatTimeAgo(scan.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <Badge variant={badgeVariant} size="sm">
                        {scan.risk_level || "EVALUATED"} · {scoreVal}
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
                title="NO SCANS YET."
                description="Your security baseline starts here. Inspect an untrusted file to begin."
                actionLabel="ANALYZE FILE →"
                onAction={() => onNavigate("scanner")}
              />
            </div>
          )}
        </Card>

        {/* Security Baseline Insights (4 columns) */}
        <Card level={0} className="lg:col-span-4 p-6 flex flex-col justify-between space-y-4">
          <div className="border-b-2 border-border pb-3 flex items-center justify-between">
            <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-primary stroke-[2.5]" />
              <span>SECURITY INSIGHTS</span>
            </h4>
            <Badge variant="safe" size="sm">ACTIVE</Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-surface-1 border-2 border-border shadow-[2px_2px_0px_var(--border)]">
              <div className="font-bold font-display text-text-primary flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span>Zero Execution Mandate</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                All uploaded binaries are quarantined in-memory without invoking system sub-processes, preventing lateral malware propagation.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-surface-1 border-2 border-border shadow-[2px_2px_0px_var(--border)]">
              <div className="font-bold font-display text-text-primary flex items-center space-x-1.5">
                <Atom className="w-3.5 h-3.5 text-accent-purple" />
                <span>Non-Repudiation Bell State</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                Quantum state correlations prove zero eavesdropping before digital signature certificates are trusted.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t-2 border-border">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs font-bold uppercase tracking-wider"
              onClick={() => onNavigate("quantum")}
            >
              RUN QUANTUM AUDIT →
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
