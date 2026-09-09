import React, { useEffect, useState } from "react";
import {
  FileSearch,
  Globe2,
  Atom,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Clock,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Search,
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
import { HeroBackground } from "../ui/HeroBackground";
import { api } from "../../api";
import { DashboardStats, UserProfile } from "../../types";
import { formatMetric, safeNumber } from "../../utils/error";
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

  // Smooth Count-Up animated metrics
  const animatedScans = useCountUp(safeNumber(stats.total_scans, 0));
  const animatedThreats = useCountUp(safeNumber(stats.critical_threats, 0));
  const animatedRecon = useCountUp(safeNumber(stats.recon_targets, 0));
  const animatedQuantum = useCountUp(safeNumber(stats.quantum_simulations, 0));

  // Safe posture calculation (0 to 100)
  const calculateSafetyScore = (): number | null => {
    if (loading || hasError) return null;
    if (stats.total_scans === 0 && stats.recon_targets === 0) return 100;
    const penalty = (safeNumber(stats.critical_threats) * 30) + (safeNumber(stats.average_exposure) * 0.15);
    const raw = Math.max(15, Math.min(100, Math.round(100 - penalty)));
    return Number.isFinite(raw) ? raw : 100;
  };

  const safetyScore = calculateSafetyScore();

  // SVG Radial Gauge Geometry
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = safetyScore !== null
    ? circumference - (safetyScore / 100) * circumference
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
      safety: 100 - numericRisk,
      time: timeLabel,
      level: scan.risk_level || "SAFE",
    };
  }).reverse();

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-xl bg-surface-elevated border border-border shadow-lg text-xs">
          <div className="font-bold text-text-primary">{data.name}</div>
          <div className="text-text-muted text-[11px] mt-0.5">{data.time}</div>
          <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-1.5 font-mono">
            <span className="text-text-secondary">Safety Score:</span>
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
      return `${Math.round(diffHours / 24)}d ago`;
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-8 max-w-[1360px] mx-auto pb-16 animate-fadeIn">
      {/* =========================================================================
          HERO BANNER: SIMPLE, FRIENDLY, AND DIRECT
          ========================================================================= */}
      <Card surface="raised" className="p-7 sm:p-9 relative overflow-hidden border border-border shadow-md">
        <HeroBackground />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* LEFT 60%: Friendly Headline & Value Statement */}
          <div className="lg:col-span-7 space-y-4">
            {/* Ready Status Pill */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-surface-1 border border-border text-xs font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 beacon-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">All Systems Ready</span>
              <span className="text-text-muted">·</span>
              <span className="text-text-secondary text-[11px]">Zero-risk file check</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary tracking-tight leading-[1.1]">
              Know what you can trust.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl font-normal">
              Check files, websites and security information in one place — quickly, safely, and without complicated jargon.
            </p>

            {/* Simple Trust Promises */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-text-muted">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-surface-1 border border-border/80">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% Safe (Files are never run)</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-surface-1 border border-border/80">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Instant Results</span>
              </span>
            </div>
          </div>

          {/* RIGHT 40%: Visual Action Box */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-surface-0/95 border border-border shadow-lg space-y-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Start a Check</span>
                </span>
                <span className="text-[11px] text-text-muted">
                  Free & instant
                </span>
              </div>

              {/* PRIMARY ACTION: ANALYZE A FILE */}
              <button
                onClick={() => onNavigate("scanner")}
                className="w-full h-14 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-base sm:text-lg shadow-md hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all flex items-center justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-white/20 text-white flex items-center justify-center">
                    <FileSearch className="w-5 h-5" />
                  </div>
                  <span>Analyze a File</span>
                </div>
                <div className="flex items-center space-x-1 font-semibold text-sm bg-white/15 px-3 py-1.5 rounded-lg group-hover:bg-white/25 transition-colors">
                  <span>Start</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* SECONDARY ACTIONS: CHECK A WEBSITE & TRUST TEST */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => onNavigate("recon")}
                  className="w-full justify-center text-xs font-semibold py-2.5"
                  icon={<Globe2 className="w-4 h-4 text-emerald-500" />}
                >
                  Check a Website
                </Button>

                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => onNavigate("quantum")}
                  className="w-full justify-center text-xs font-semibold py-2.5"
                  icon={<Atom className="w-4 h-4 text-purple-500" />}
                >
                  Trust Test
                </Button>
              </div>

              {/* Refresh / Timestamp */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
                <span>Updated {lastUpdated}</span>
                <button
                  onClick={loadData}
                  className="flex items-center space-x-1 hover:text-primary transition-colors"
                  title="Refresh status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          SECURITY STATUS SECTION (Is everything okay?)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Your Security Status Card (8 cols) */}
        <Card surface="raised" className="lg:col-span-8 p-7 sm:p-8 flex flex-col justify-between border border-border">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Your Security Status
              </span>
              <Badge
                variant={
                  safetyScore !== null && safetyScore >= 80
                    ? "safe"
                    : safetyScore !== null && safetyScore >= 60
                    ? "medium"
                    : "high"
                }
                size="md"
              >
                {safetyScore !== null && safetyScore >= 80
                  ? "ALL SAFE"
                  : safetyScore !== null && safetyScore >= 60
                  ? "NEEDS REVIEW"
                  : "ATTENTION"}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              {/* Radial Score Ring */}
              <div className="relative flex items-center justify-center shrink-0 w-36 h-36">
                <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="var(--surface-2)"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke={
                      safetyScore !== null && safetyScore >= 80
                        ? "var(--success)"
                        : safetyScore !== null && safetyScore >= 60
                        ? "var(--warning)"
                        : "var(--danger)"
                    }
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Score Number */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  {loading ? (
                    <Skeleton width={44} height={32} />
                  ) : safetyScore !== null ? (
                    <>
                      <span className="text-3xl font-extrabold font-mono text-text-primary tracking-tight">
                        {safetyScore}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">/ 100</span>
                    </>
                  ) : (
                    <span className="text-2xl font-mono text-text-muted">—</span>
                  )}
                </div>
              </div>

              {/* Status Message */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight flex items-center justify-center sm:justify-start space-x-2">
                  {safetyScore !== null && safetyScore >= 80 ? (
                    <>
                      <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
                      <span>Everything looks good</span>
                    </>
                  ) : safetyScore !== null && safetyScore >= 60 ? (
                    <>
                      <AlertTriangle className="w-7 h-7 text-amber-500 shrink-0" />
                      <span>A few things worth checking</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-7 h-7 text-rose-500 shrink-0" />
                      <span>Something needs attention</span>
                    </>
                  )}
                </div>

                <p className="text-sm text-text-secondary leading-relaxed max-w-xl">
                  {stats.critical_threats > 0
                    ? `We found ${stats.critical_threats} potential problem(s) in your recent checks that you should review.`
                    : "All your recent file checks, website lookups, and security tests look healthy and safe."}
                </p>

                {/* Summary Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-xl font-bold font-mono text-text-primary">
                      {stats.total_scans}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">Files checked</div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className={`text-xl font-bold font-mono ${stats.critical_threats > 0 ? "text-danger" : "text-emerald-500"}`}>
                      {stats.critical_threats}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">Problems found</div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-xl font-bold font-mono text-text-primary">
                      {stats.recon_targets}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">Websites checked</div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                      {stats.quantum_simulations}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">Trust tests</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>Files are checked safely in memory</span>
            <button
              onClick={() => onNavigate("reports")}
              className="text-primary hover:underline font-semibold flex items-center space-x-1"
            >
              <span>View Full Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>

        {/* Safety Trend Chart (4 cols) */}
        <Card surface="raised" className="lg:col-span-4 p-7 flex flex-col justify-between space-y-4 border border-border">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Safety Trend
            </span>
            <span className="text-xs font-mono text-text-muted font-medium">
              {chartData.length} checks
            </span>
          </div>

          {chartData.length > 0 ? (
            <div className="w-full h-44 pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="safetyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
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
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#safetyGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-text-muted space-y-1">
              <div className="font-semibold text-text-secondary">Not enough history yet</div>
              <div>Check a file to see your safety trend.</div>
            </div>
          )}

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>Safety History</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● Active</span>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 2: 4 SIMPLE KPI CARDS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* FILES CHECKED */}
        <Card
          surface="raised"
          interactive
          onClick={() => onNavigate("scanner")}
          className="p-6 cursor-pointer group border border-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-muted">FILES CHECKED</span>
            <div className="p-2.5 rounded-xl bg-surface-1 border border-border text-primary group-hover:scale-110 transition-transform shadow-xs">
              <FileSearch className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-4xl font-extrabold font-mono text-text-primary tracking-tight">
              {loading ? <Skeleton width={48} height={36} /> : formatMetric(animatedScans, "0")}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1.5 leading-snug">
            Safe file structure & authenticity checks
          </p>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>Check a file</span>
            <span className="text-primary font-semibold group-hover:translate-x-1 transition-transform">
              Open →
            </span>
          </div>
        </Card>

        {/* PROBLEMS FOUND */}
        <Card
          surface="raised"
          interactive
          onClick={() => onNavigate("history")}
          className="p-6 cursor-pointer group border border-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-muted">PROBLEMS FOUND</span>
            <div className="p-2.5 rounded-xl bg-surface-1 border border-border text-danger group-hover:scale-110 transition-transform shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-4xl font-extrabold font-mono tracking-tight ${
                safeNumber(stats.critical_threats) > 0 ? "text-danger" : "text-text-primary"
              }`}
            >
              {loading ? <Skeleton width={48} height={36} /> : formatMetric(animatedThreats, "0")}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1.5 leading-snug">
            Unusual file patterns or missing signatures
          </p>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>{safeNumber(stats.critical_threats) > 0 ? "Review issues" : "Zero issues"}</span>
            <span className="text-primary font-semibold group-hover:translate-x-1 transition-transform">
              View →
            </span>
          </div>
        </Card>

        {/* WEBSITES CHECKED */}
        <Card
          surface="raised"
          interactive
          onClick={() => onNavigate("recon")}
          className="p-6 cursor-pointer group border border-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-muted">WEBSITES CHECKED</span>
            <div className="p-2.5 rounded-xl bg-surface-1 border border-border text-emerald-500 group-hover:scale-110 transition-transform shadow-xs">
              <Globe2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-4xl font-extrabold font-mono text-text-primary tracking-tight">
              {loading ? <Skeleton width={48} height={36} /> : formatMetric(animatedRecon, "0")}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1.5 leading-snug">
            HTTPS security & public website info
          </p>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>Check a website</span>
            <span className="text-primary font-semibold group-hover:translate-x-1 transition-transform">
              Open →
            </span>
          </div>
        </Card>

        {/* TRUST TESTS */}
        <Card
          surface="raised"
          interactive
          onClick={() => onNavigate("quantum")}
          className="p-6 cursor-pointer group border border-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-muted">TRUST TESTS</span>
            <div className="p-2.5 rounded-xl bg-surface-1 border border-border text-purple-500 group-hover:scale-110 transition-transform shadow-xs">
              <Atom className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-4xl font-extrabold font-mono text-purple-600 dark:text-purple-400 tracking-tight">
              {loading ? <Skeleton width={48} height={36} /> : formatMetric(animatedQuantum, "0")}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1.5 leading-snug">
            Simulations testing channel security
          </p>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>Run a test</span>
            <span className="text-purple-500 font-semibold group-hover:translate-x-1 transition-transform">
              Test →
            </span>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ROW 3: 4 SIMPLE CORE MODULES
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            What would you like to do?
          </h2>
          <span className="text-xs text-text-muted font-mono">Simple Tools</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Action 1: Check a File */}
          <div
            onClick={() => onNavigate("scanner")}
            className="group cursor-pointer p-6 rounded-2xl bg-surface-0 border border-border hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-1 active:translate-y-0 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-surface-1 border border-border text-primary flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <FileSearch className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary-subtle text-primary border border-primary-border">
                  Popular
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors">
                  Check a File
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                  Upload a file and we'll look for anything unusual safely.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-sm font-semibold text-primary">
              <span>Check File</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
            </div>
          </div>

          {/* Action 2: Check a Website */}
          <div
            onClick={() => onNavigate("recon")}
            className="group cursor-pointer p-6 rounded-2xl bg-surface-0 border border-border hover:border-emerald-500/50 shadow-sm hover:shadow-md hover:-translate-y-1 active:translate-y-0 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-surface-1 border border-border text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <Globe2 className="w-6 h-6 transition-transform group-hover:rotate-12 duration-300" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Instant
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Check a Website
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                  See what information a website publicly shares.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Check Website</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
            </div>
          </div>

          {/* Action 3: Trust Test */}
          <div
            onClick={() => onNavigate("quantum")}
            className="group cursor-pointer p-6 rounded-2xl bg-surface-0 border border-border hover:border-purple-500/50 shadow-sm hover:shadow-md hover:-translate-y-1 active:translate-y-0 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-surface-1 border border-border text-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <Atom className="w-6 h-6 transition-transform group-hover:rotate-180 duration-700" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Simulation
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Trust Test
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                  Explore how secure channels detect outside eavesdroppers.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-sm font-semibold text-purple-600 dark:text-purple-400">
              <span>Run Test</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
            </div>
          </div>

          {/* Action 4: Security Reports */}
          <div
            onClick={() => onNavigate("reports")}
            className="group cursor-pointer p-6 rounded-2xl bg-surface-0 border border-border hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-1 active:translate-y-0 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-surface-1 border border-border text-primary flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary-subtle text-primary border border-primary-border">
                  Export
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors">
                  Security Reports
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                  Create clean PDF or JSON summaries of your checks.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-sm font-semibold text-primary">
              <span>Create Report</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 4: RECENT ACTIVITY LIST
          ========================================================================= */}
      <Card surface="raised" className="p-7 space-y-4 border border-border">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Recent Checks
            </h2>
          </div>
          <button
            onClick={() => onNavigate("history")}
            className="text-xs font-semibold text-primary hover:underline flex items-center space-x-1 transition-colors"
          >
            <span>View All History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats.recent_scans && stats.recent_scans.length > 0 ? (
          <div className="divide-y divide-border">
            {stats.recent_scans.map((scan) => {
              let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "safe";
              let label = "SAFE";
              if (scan.risk_level === "LOW") { badgeVariant = "low"; label = "LOW RISK"; }
              else if (scan.risk_level === "MEDIUM") { badgeVariant = "medium"; label = "MEDIUM RISK"; }
              else if (scan.risk_level === "HIGH" || scan.risk_level === "CRITICAL") { badgeVariant = "high"; label = "HIGH RISK"; }

              const scoreVal = typeof scan.risk_score === "number" && Number.isFinite(scan.risk_score)
                ? (100 - scan.risk_score).toFixed(0)
                : "100";

              return (
                <div
                  key={scan.scan_id}
                  onClick={() => onNavigate("scanner")}
                  className="py-3.5 px-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-surface-1/60 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5 overflow-hidden">
                    <div className="p-2 rounded-xl bg-surface-1 border border-border text-primary shrink-0 shadow-xs">
                      <FileSearch className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-bold text-text-primary truncate group-hover:text-primary transition-colors">
                        {scan.filename}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5 flex items-center space-x-2">
                        <span>File Check</span>
                        <span>·</span>
                        <span>{formatTimeAgo(scan.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 ml-auto sm:ml-0">
                    <Badge variant={badgeVariant} size="sm">
                      {label} ({scoreVal}/100)
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-text-muted space-y-1">
            <div className="font-semibold text-text-secondary">No files checked yet</div>
            <div>Upload a file or check a website above to see your history here.</div>
          </div>
        )}
      </Card>
    </div>
  );
};
