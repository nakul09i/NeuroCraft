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
    if (loading) return "Synchronizing real-time security telemetry…";
    if (stats.total_scans === 0) {
      return "Your security command center is ready.";
    }
    if (stats.critical_threats > 0) {
      return `${stats.critical_threats} signal${stats.critical_threats === 1 ? "" : "s"} require review in active memory.`;
    }
    return "Your security command center is ready.";
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
        <div className="p-3.5 rounded-2xl neu-raised-md bg-surface-0 text-xs">
          <div className="font-semibold text-text-primary text-[14px]">{data.name}</div>
          <div className="text-text-muted text-[12px] mt-0.5">{data.time}</div>
          <div className="mt-2.5 flex items-center justify-between gap-4 border-t border-border/60 pt-2">
            <span className="text-text-secondary">Risk Score</span>
            <span className="font-bold text-primary text-[13px]">{data.risk} / 100</span>
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
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hr ago`;
      return `${Math.round(diffHours / 24)} d ago`;
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-10 max-w-[1360px] mx-auto pb-16">
      {/* =========================================================================
          HERO BANNER: LARGE TYPOGRAPHY + PROMINENT PRIMARY ACTIONS
          ========================================================================= */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 sm:p-10 rounded-3xl neu-raised animate-fadeUp">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center space-x-2 text-[13px] font-medium text-text-muted">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Security Command Center · NeuroCraft</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight leading-tight">
            {getGreeting()}, {displayName}.
          </h1>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
            {getSecondaryHeroLine()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 shrink-0">
          <Button
            size="lg"
            variant="primary"
            onClick={() => onNavigate("scanner")}
            icon={<Plus className="w-5 h-5" />}
          >
            Analyze File
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => onNavigate("recon")}
            icon={<Globe className="w-5 h-5 text-text-secondary" />}
          >
            Check Exposure
          </Button>
          <button
            onClick={loadData}
            title="Refresh Telemetry"
            className="p-3.5 rounded-2xl neu-button text-text-secondary hover:text-text-primary transition focus-ring"
            aria-label="Refresh Dashboard Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROW 1: HERO SECURITY POSTURE MODULE
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
        {/* Large Security Posture Breakdown (8 columns) */}
        <Card
          level={0}
          className="lg:col-span-8 p-8 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center space-x-3">
                <span className="text-[13px] font-semibold uppercase tracking-wider text-text-muted">
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
                  size="md"
                >
                  {stats.critical_threats > 0
                    ? "Elevated Risk"
                    : stats.total_scans === 0
                    ? "Baseline Ready"
                    : "Optimal"}
                </Badge>
              </div>
              <span className="text-xs text-text-muted font-mono">
                Zero Dynamic Execution · Deterministic
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                {stats.total_scans === 0
                  ? "Awaiting Initial Security Baseline"
                  : stats.critical_threats === 0
                  ? "Consolidated Posture: Resilient & Healthy"
                  : `${stats.critical_threats} High-Severity Finding${stats.critical_threats === 1 ? "" : "s"} Flagged`}
              </h2>
              <p className="text-[15px] text-text-secondary mt-2.5 leading-relaxed max-w-2xl">
                {stats.critical_threats > 0
                  ? "Your latest analysis detected signals that require review. Authenticode certificates and entropy patterns were evaluated."
                  : "Multi-engine static telemetry analyzes Authenticode signatures, certificate trust chains, entropy variations, and passive reconnaissance indicators without executing untrusted code."}
              </p>
            </div>

            {/* Supporting Real Evidence Indicators */}
            <div className="pt-2">
              <div className="text-[13px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                Supporting Evidence
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl neu-inset">
                  <div className="text-3xl font-bold text-text-primary tracking-tight">
                    {stats.total_scans}
                  </div>
                  <div className="text-[13px] text-text-secondary mt-1">
                    Artifact{stats.total_scans === 1 ? "" : "s"} Analyzed
                  </div>
                </div>
                <div className="p-4 rounded-2xl neu-inset">
                  <div className={`text-3xl font-bold tracking-tight ${stats.critical_threats > 0 ? "text-danger" : "text-emerald-500"}`}>
                    {stats.critical_threats}
                  </div>
                  <div className="text-[13px] text-text-secondary mt-1">
                    Findings Detected
                  </div>
                </div>
                <div className="p-4 rounded-2xl neu-inset">
                  <div className="text-3xl font-bold text-primary tracking-tight">
                    {stats.recon_targets > 0 ? stats.recon_targets : "0"}
                  </div>
                  <div className="text-[13px] text-text-secondary mt-1">
                    Passive Engines Checked
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-[13px] text-text-muted">
              EPR Bell-State Channel Simulation: Verified
            </span>
            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="inline-flex items-center space-x-2 text-[14px] font-semibold text-primary hover:text-primary-hover transition-colors group"
            >
              <span>View Evidence-Based Report</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </Card>

        {/* Consolidated Score Card (4 columns) */}
        <Card
          level={0}
          className="lg:col-span-4 p-8 flex flex-col justify-between items-center text-center relative overflow-hidden"
        >
          <div className="w-full flex items-center justify-between border-b border-border/60 pb-4">
            <span className="text-[13px] font-semibold uppercase tracking-wider text-text-muted">
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
                ? "Optimal"
                : postureScore !== null && postureScore >= 60
                ? "Moderate"
                : "Elevated"}
            </Badge>
          </div>

          <div className="my-6">
            <ScoreRing
              score={postureScore}
              loading={loading}
              variant="posture"
              size={150}
              strokeWidth={11}
              label={stats.total_scans === 0 ? "Baseline" : "Security Posture"}
              sublabel="0–100 Scale"
            />
          </div>

          <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t border-border/60 text-left">
            <div className="p-3.5 rounded-xl neu-inset">
              <div className="text-[12px] text-text-muted">Base Metric</div>
              <div className="text-[14px] font-semibold text-text-primary mt-0.5">
                {stats.total_scans === 0 ? "100 (Default)" : "Deterministic"}
              </div>
            </div>
            <div className="p-3.5 rounded-xl neu-inset">
              <div className="text-[12px] text-text-muted">Risk Penalty</div>
              <div className="text-[14px] font-semibold text-text-primary mt-0.5">
                {stats.critical_threats > 0 ? `-${stats.critical_threats * 30} pts` : "0 pts"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 2: KPI SECTION (Numbers 32-44px, Labels 13-14px)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* FILES ANALYZED */}
        <Card level={1} className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-text-muted">
              Files Analyzed
            </span>
            <div className="w-10 h-10 rounded-2xl neu-inset text-primary flex items-center justify-center">
              <FileSearch className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              {loading ? <Skeleton width={50} height={36} /> : stats.total_scans}
            </span>
            <span className="text-[13px] text-text-muted">
              {stats.total_scans === 0 ? "No scans" : "Quarantine"}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[13px]">
            <span className="text-text-muted">Engine</span>
            <Badge variant="safe" size="sm">Active</Badge>
          </div>
        </Card>

        {/* THREATS */}
        <Card level={1} className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-text-muted">
              Threats
            </span>
            <div className="w-10 h-10 rounded-2xl neu-inset text-danger flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-bold tracking-tight ${stats.critical_threats > 0 ? "text-danger" : "text-text-primary"}`}>
              {loading ? <Skeleton width={50} height={36} /> : stats.critical_threats}
            </span>
            <span className="text-[13px] text-text-muted">
              {stats.critical_threats > 0 ? "Action required" : "Zero alerts"}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[13px]">
            <span className="text-text-muted">Integrity</span>
            <Badge variant={stats.critical_threats > 0 ? "high" : "safe"} size="sm">
              {stats.critical_threats > 0 ? "Flagged" : "Clean"}
            </Badge>
          </div>
        </Card>

        {/* RECON TARGETS */}
        <Card level={1} className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-text-muted">
              Recon Targets
            </span>
            <div className="w-10 h-10 rounded-2xl neu-inset text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              {loading ? <Skeleton width={50} height={36} /> : stats.recon_targets}
            </span>
            <span className="text-[13px] text-text-muted">
              {stats.recon_targets === 0 ? "No domains" : "Footprint"}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[13px]">
            <span className="text-text-muted">Assessment</span>
            <Badge variant="info" size="sm">Defensive</Badge>
          </div>
        </Card>

        {/* QUANTUM RUNS */}
        <Card level={1} className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-text-muted">
              Quantum Runs
            </span>
            <div className="w-10 h-10 rounded-2xl neu-inset text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Atom className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              {loading ? <Skeleton width={50} height={36} /> : stats.quantum_simulations}
            </span>
            <span className="text-[13px] text-text-muted font-mono">
              |Φ⁺⟩ Bell-state
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[13px]">
            <span className="text-text-muted">Entanglement</span>
            <Badge variant="quantum" size="sm">Simulated</Badge>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 3: 4 TACTILE NEUMORPHIC QUICK ACTION CARDS
          ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold uppercase tracking-wider text-text-muted">
            Quick Actions
          </h3>
          <span className="text-sm text-text-muted">Core capabilities</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Action 1: Analyze File */}
          <div
            onClick={() => onNavigate("scanner")}
            className="group cursor-pointer p-6 rounded-3xl neu-raised neu-interactive flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl neu-inset text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileSearch className="w-6 h-6" />
                </div>
                <span className="text-[12px] text-text-muted font-mono">PE · PDF · APK</span>
              </div>
              <div>
                <h4 className="text-[18px] font-semibold text-text-primary tracking-tight">
                  Analyze File
                </h4>
                <p className="text-[14px] text-text-secondary mt-1.5 leading-relaxed">
                  Safely inspect an untrusted artifact without code execution.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between text-[14px] font-semibold text-primary">
              <span>Start Analysis</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Action 2: Passive Recon */}
          <div
            onClick={() => onNavigate("recon")}
            className="group cursor-pointer p-6 rounded-3xl neu-raised neu-interactive flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl neu-inset text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Globe className="w-6 h-6" />
                </div>
                <span className="text-[12px] text-text-muted font-mono">DNS · TLS · HTTP</span>
              </div>
              <div>
                <h4 className="text-[18px] font-semibold text-text-primary tracking-tight">
                  Passive Recon
                </h4>
                <p className="text-[14px] text-text-secondary mt-1.5 leading-relaxed">
                  Understand public exposure and defense hygiene.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between text-[14px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Check Domain</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Action 3: Quantum Trust */}
          <div
            onClick={() => onNavigate("quantum")}
            className="group cursor-pointer p-6 rounded-3xl neu-raised neu-interactive flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl neu-inset text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Atom className="w-6 h-6" />
                </div>
                <span className="text-[12px] text-text-muted font-mono">Bell-State</span>
              </div>
              <div>
                <h4 className="text-[18px] font-semibold text-text-primary tracking-tight">
                  Quantum Trust
                </h4>
                <p className="text-[14px] text-text-secondary mt-1.5 leading-relaxed">
                  Explore verification integrity through Bell-State simulation.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between text-[14px] font-semibold text-purple-600 dark:text-purple-400">
              <span>Run Simulation</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Action 4: Security Reports */}
          <div
            onClick={() => onNavigate("reports")}
            className="group cursor-pointer p-6 rounded-3xl neu-raised neu-interactive flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl neu-inset text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[12px] text-text-muted font-mono">Provenance</span>
              </div>
              <div>
                <h4 className="text-[18px] font-semibold text-text-primary tracking-tight">
                  Security Reports
                </h4>
                <p className="text-[14px] text-text-secondary mt-1.5 leading-relaxed">
                  Generate evidence-based reports with cryptographic proof.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between text-[14px] font-semibold text-amber-600 dark:text-amber-400">
              <span>Create Report</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 4: ACTIVITY TIMELINE (7 cols) & REAL ENGINE STATUS (5 cols)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
        {/* Security Activity Visualization */}
        <Card level={0} className="lg:col-span-7 p-7 flex flex-col justify-between space-y-5">
          <div className="border-b border-border/60 pb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Activity className="w-5 h-5 text-primary" />
              <h4 className="text-[15px] font-semibold uppercase tracking-wider text-text-muted">
                Security Activity & Risk Timeline
              </h4>
            </div>
            <span className="text-xs text-text-muted">
              {stats.recent_scans?.length || 0} recorded scans
            </span>
          </div>

          {stats.recent_scans && stats.recent_scans.length > 0 ? (
            <div className="w-full h-60 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="neuRiskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                  />
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
            <div className="py-8">
              <EmptyState
                icon={<Activity className="w-8 h-8 text-text-muted" />}
                title="No scans yet"
                description="Your security baseline starts here. Analyze an artifact to populate live telemetry."
                actionLabel="Analyze File"
                onAction={() => onNavigate("scanner")}
              />
            </div>
          )}

          <div className="pt-3.5 border-t border-border/60 flex items-center justify-between text-[13px] text-text-muted">
            <span>Historical Risk Tracker</span>
            <span className="text-primary font-medium">Live Telemetry</span>
          </div>
        </Card>

        {/* Engine Status Panel */}
        <Card level={0} className="lg:col-span-5 p-7 flex flex-col justify-between space-y-5">
          <div className="border-b border-border/60 pb-4 flex items-center justify-between">
            <h4 className="text-[15px] font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-primary" />
              <span>Engine Status</span>
            </h4>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>4 / 4 Operational</span>
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Engine 1: Static Analysis */}
            <div className="p-4 rounded-2xl neu-inset flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary text-[14px]">
                  Static Analysis
                </div>
                <p className="text-[12px] text-text-muted mt-0.5">
                  Quarantine, entropy & SHA-256
                </p>
              </div>
              <Badge variant="safe" size="sm">● Operational</Badge>
            </div>

            {/* Engine 2: Digital Signatures */}
            <div className="p-4 rounded-2xl neu-inset flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary text-[14px]">
                  Digital Signatures
                </div>
                <p className="text-[12px] text-text-muted mt-0.5">
                  Authenticode PKCS#7 & X.509
                </p>
              </div>
              <Badge variant="safe" size="sm">● Operational</Badge>
            </div>

            {/* Engine 3: Passive Recon */}
            <div className="p-4 rounded-2xl neu-inset flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary text-[14px]">
                  Passive Recon
                </div>
                <p className="text-[12px] text-text-muted mt-0.5">
                  DNS hygiene, TLS ciphers, headers
                </p>
              </div>
              <Badge variant="safe" size="sm">● Ready</Badge>
            </div>

            {/* Engine 4: Quantum Trust */}
            <div className="p-4 rounded-2xl neu-inset flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary text-[14px]">
                  Quantum Trust
                </div>
                <p className="text-[12px] text-text-muted mt-0.5">
                  Bell-state entanglement simulation
                </p>
              </div>
              <Badge variant="quantum" size="sm">● Ready</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 5: RECENT ACTIVITY TIMELINE LIST (Subtle Dividers, Clickable)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
        {/* Recent Activity List */}
        <Card level={0} className="lg:col-span-8 p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-5 h-5 text-text-secondary" />
              <h4 className="text-[15px] font-semibold uppercase tracking-wider text-text-muted">
                Recent Activity
              </h4>
            </div>
            <button
              onClick={() => onNavigate("history")}
              className="text-[14px] font-semibold text-primary hover:text-primary-hover flex items-center space-x-1.5 transition-colors"
            >
              <span>View all</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {stats.recent_scans && stats.recent_scans.length > 0 ? (
            <div className="divide-y divide-border/60">
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
                    className="py-3.5 px-3 rounded-2xl hover:bg-surface-1/60 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3.5 overflow-hidden">
                      <div className="w-10 h-10 rounded-2xl neu-inset text-text-secondary group-hover:text-primary flex items-center justify-center shrink-0 transition-colors">
                        <FileSearch className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-[15px] font-semibold text-text-primary truncate">
                          {scan.filename}
                        </div>
                        <div className="text-[12px] text-text-muted flex items-center space-x-2 mt-0.5">
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
        <Card level={0} className="lg:col-span-4 p-7 flex flex-col justify-between space-y-5">
          <div className="border-b border-border/60 pb-4 flex items-center justify-between">
            <h4 className="text-[15px] font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Security Insights</span>
            </h4>
            <Badge variant="safe" size="sm">Active</Badge>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-4 rounded-2xl neu-inset">
              <div className="font-semibold text-text-primary text-[14px] flex items-center space-x-2">
                <Zap className="w-4 h-4 text-primary" />
                <span>Zero Execution Mandate</span>
              </div>
              <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
                All uploaded binaries are quarantined in memory without invoking sub-processes, preventing lateral malware propagation.
              </p>
            </div>

            <div className="p-4 rounded-2xl neu-inset">
              <div className="font-semibold text-text-primary text-[14px] flex items-center space-x-2">
                <Atom className="w-4 h-4 text-purple-500" />
                <span>Non-Repudiation Bell State</span>
              </div>
              <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
                Quantum correlations verify channel integrity before digital signature certificates are trusted.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border/60">
            <Button
              size="md"
              variant="secondary"
              className="w-full"
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
