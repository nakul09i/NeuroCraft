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
  Lock,
  Cpu,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
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

  // Posture Score Calculation
  const postureScore = stats.total_scans > 0
    ? Math.max(0, Math.min(100, (stats.critical_threats * 25) + 15))
    : 0;

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Top Welcome & Command Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            {getGreeting()}, {displayName}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {stats.critical_threats > 0
              ? `${stats.critical_threats} security artifacts need your immediate attention.`
              : "All scanned systems and verified artifacts are in optimal posture."}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            size="sm"
            onClick={() => onNavigate("scanner")}
            icon={<Plus className="w-4 h-4" />}
          >
            New Scan
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate("recon")}
            icon={<Globe className="w-3.5 h-3.5" />}
          >
            Check Exposure
          </Button>
        </div>
      </div>

      {/* Hero Posture Gauge & Summary Card */}
      <Card level={1} className="p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-3 text-center md:text-left">
            <Badge variant="neutral" size="sm">
              Consolidated Security Posture
            </Badge>
            <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              {stats.total_scans === 0
                ? "Ready for Initial Verification"
                : stats.critical_threats === 0
                ? "Healthy Posture — Zero Critical Anomalies"
                : "Elevated Risk Detected Across Artifacts"}
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed">
              NeuroCraft continuously verifies file authenticity, parses Authenticode certificate chains, monitors passive external exposure, and validates quantum channel non-repudiation.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs text-text-muted font-mono">
              <span>Zero Dynamic Code Execution</span>
              <span>•</span>
              <span>EPR Bell-State Channels</span>
              <span>•</span>
              <span>FOSS Free-First</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center shrink-0">
            <ScoreRing
              score={postureScore}
              size={130}
              strokeWidth={11}
              label={postureScore > 50 ? "ATTENTION REQUIRED" : "SAFE POSTURE"}
              sublabel="Consolidated Metric"
            />
          </div>
        </div>
      </Card>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card level={2} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Scanned Files
            </span>
            <div className="p-2 rounded-xl bg-surface-3 text-primary">
              <FileSearch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-primary">
              {loading ? <Skeleton width={50} height={32} /> : stats.total_scans}
            </span>
            <Badge variant="safe" size="sm">
              Isolated
            </Badge>
          </div>
        </Card>

        <Card level={2} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Flagged Threats
            </span>
            <div className="p-2 rounded-xl bg-surface-3 text-theme-danger">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-primary">
              {loading ? <Skeleton width={50} height={32} /> : stats.critical_threats}
            </span>
            <Badge variant={stats.critical_threats > 0 ? "high" : "safe"} size="sm">
              {stats.critical_threats > 0 ? "Review Needed" : "Zero Alerts"}
            </Badge>
          </div>
        </Card>

        <Card level={2} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Recon Domains
            </span>
            <div className="p-2 rounded-xl bg-surface-3 text-theme-success">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-primary">
              {loading ? <Skeleton width={50} height={32} /> : stats.recon_targets}
            </span>
            <Badge variant="info" size="sm">
              Passive
            </Badge>
          </div>
        </Card>

        <Card level={2} className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Quantum Runs
            </span>
            <div className="p-2 rounded-xl bg-surface-3 text-purple-500">
              <Atom className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-text-primary">
              {loading ? <Skeleton width={50} height={32} /> : stats.quantum_simulations}
            </span>
            <Badge variant="quantum" size="sm">
              Bell-State
            </Badge>
          </div>
        </Card>
      </div>

      {/* New User Welcome State OR Recent Activity Timeline */}
      {stats.total_scans === 0 ? (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Getting Started with NeuroCraft
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              interactive
              onClick={() => onNavigate("scanner")}
              className="p-6 text-left space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary flex items-center justify-center">
                <FileSearch className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-text-primary">Scan a File</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Safely inspect executables, PDFs, APKs, or scripts. Uploaded files are quarantined and never executed.
              </p>
              <span className="inline-flex items-center text-xs font-semibold text-primary">
                Analyze File &rarr;
              </span>
            </Card>

            <Card
              interactive
              onClick={() => onNavigate("recon")}
              className="p-6 text-left space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-theme-success-subtle text-theme-success flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-text-primary">Check a Domain</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Passive external exposure assessment. Evaluates public DNS records, TLS certificates, and defense headers.
              </p>
              <span className="inline-flex items-center text-xs font-semibold text-primary">
                Inspect Domain &rarr;
              </span>
            </Card>

            <Card
              interactive
              onClick={() => onNavigate("quantum")}
              className="p-6 text-left space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Atom className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-text-primary">Explore Quantum Trust</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Test signature non-repudiation and channel disturbance across 5 attack scenarios with Bell-state simulations.
              </p>
              <span className="inline-flex items-center text-xs font-semibold text-primary">
                Run Simulation &rarr;
              </span>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Scans Activity */}
          <Card level={1} className="lg:col-span-2 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-text-muted" />
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Recent Scan Activity
                </h4>
              </div>
              <button
                onClick={loadData}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-2 transition"
                aria-label="Refresh activity"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-border/60">
              {stats.recent_scans.map((scan) => {
                let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "safe";
                if (scan.risk_level === "LOW") badgeVariant = "low";
                else if (scan.risk_level === "MEDIUM") badgeVariant = "medium";
                else if (scan.risk_level === "HIGH" || scan.risk_level === "CRITICAL") badgeVariant = "high";

                return (
                  <div
                    key={scan.scan_id}
                    className="py-3.5 flex items-center justify-between hover:bg-surface-0/60 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-surface-2 text-primary">
                        <FileSearch className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary">
                          {scan.filename}
                        </div>
                        <div className="text-[10px] font-mono text-text-muted">
                          ID: {scan.scan_id.substring(0, 16)}...
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <Badge variant={badgeVariant} size="sm">
                        {scan.risk_level} ({scan.risk_score.toFixed(0)})
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Engine Capabilities Checklist */}
          <Card level={1} className="p-6 space-y-4">
            <div className="border-b border-border pb-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-primary" />
                <span>Engine Readiness</span>
              </h4>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-0 border border-border/80">
                <div>
                  <div className="font-semibold text-text-primary">Static File Quarantine</div>
                  <div className="text-[10px] text-text-muted">Safe sandbox extraction</div>
                </div>
                <Badge variant="safe" size="sm">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-0 border border-border/80">
                <div>
                  <div className="font-semibold text-text-primary">Digital Signatures</div>
                  <div className="text-[10px] text-text-muted">Authenticode & X.509 chains</div>
                </div>
                <Badge variant="safe" size="sm">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-0 border border-border/80">
                <div>
                  <div className="font-semibold text-text-primary">Quantum Trust Simulator</div>
                  <div className="text-[10px] text-text-muted">Bell-state channel validation</div>
                </div>
                <Badge variant="safe" size="sm">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-0 border border-border/80">
                <div>
                  <div className="font-semibold text-text-primary">Defensive Reconnaissance</div>
                  <div className="text-[10px] text-text-muted">DNS, TLS & HTTP hygiene</div>
                </div>
                <Badge variant="safe" size="sm">Active</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
