import React, { useState } from "react";
import {
  Globe,
  Search,
  AlertCircle,
  ShieldCheck,
  Radio,
  Server,
  Lock,
  FileCode,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { Tabs } from "../ui/Tabs";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api";
import { ReconScanResponse, VerdictLevel } from "../../types";

export const ReconView: React.FC = () => {
  const { toast } = useToast();
  const [target, setTarget] = useState("");
  const [scanning, setScanning] = useState(false);
  const [reconData, setReconData] = useState<ReconScanResponse | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("dns");

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    setScanning(true);
    try {
      const res = await api.runRecon(target.trim());
      setReconData(res);
      toast.success(`Passive assessment completed for ${res.target}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to inspect domain", "Reconnaissance Error");
    } finally {
      setScanning(false);
    }
  };

  const getVerdictBadgeVariant = (level: VerdictLevel): "safe" | "low" | "medium" | "high" | "critical" => {
    if (level === "SAFE") return "safe";
    if (level === "LOW") return "low";
    if (level === "MEDIUM") return "medium";
    return "high";
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Header with explicit Badges */}
      <div className="p-6 sm:p-7 rounded-xl border-2 border-border bg-surface-0 shadow-brutal space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="safe" size="sm">PASSIVE</Badge>
          <Badge variant="info" size="sm">PUBLIC</Badge>
          <Badge variant="neutral" size="sm">NON-INTRUSIVE</Badge>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display uppercase">
          PASSIVE EXPOSURE RECON
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary max-w-3xl leading-relaxed">
          Understand a domain's public security footprint through publicly observable DNS records, TLS certificates, and defense-in-depth HTTP security headers. Zero invasive scanning or aggressive probing.
        </p>
      </div>

      {/* Target Search Form */}
      <Card level={0} className="p-6">
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3.5 top-3 w-4 h-4 text-text-primary stroke-[2.2]" />
            <input
              type="text"
              required
              placeholder="example.com or company-domain.org"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-1 border-2 border-border text-xs font-bold text-text-primary placeholder:text-text-muted focus-ring font-mono transition shadow-[2px_2px_0px_var(--border)]"
            />
          </div>
          <Button
            type="submit"
            loading={scanning}
            loadingText="INSPECTING..."
            variant="primary"
            className="text-xs font-black uppercase tracking-wider"
            icon={<Search className="w-4 h-4 stroke-[2.5]" />}
          >
            CHECK EXPOSURE →
          </Button>
        </form>
        <div className="mt-3 pt-2.5 border-t-2 border-border flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span>Target compliance: Zero dynamic packets</span>
          <span className="font-bold text-text-primary uppercase">RFC-Compliant Queries</span>
        </div>
      </Card>

      {/* Results View */}
      {reconData ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Posture Banner */}
          <Card level={0} className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <Badge variant={getVerdictBadgeVariant(reconData.exposure_level)} size="md">
                    {reconData.exposure_level} EXPOSURE
                  </Badge>
                  <span className="text-xs font-mono font-bold text-text-muted uppercase">Public Footprint</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black font-display text-text-primary">
                  {reconData.target}
                </h3>
                <p className="text-xs text-text-secondary font-mono">
                  Assessment finished: {reconData.dns_records.length} DNS records, TLS verified.
                </p>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <ScoreRing
                  score={reconData.exposure_score}
                  variant="risk"
                  size={130}
                  strokeWidth={12}
                  label="EXPOSURE SCORE"
                />
              </div>
            </div>
          </Card>

          {/* Results: DNS, TLS, HTTP, TECHNOLOGY, PUBLIC EXPOSURE */}
          <Card level={0} className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-border pb-3 gap-3">
              <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider">
                ANALYSIS CATEGORIES
              </h4>
              <Tabs
                size="sm"
                activeId={activeCategoryTab}
                onChange={setActiveCategoryTab}
                items={[
                  { id: "dns", label: "DNS", badge: reconData.dns_records.length },
                  { id: "tls", label: "TLS" },
                  { id: "http", label: "HTTP" },
                  { id: "tech", label: "TECHNOLOGY" },
                  { id: "exposure", label: "PUBLIC EXPOSURE" },
                ]}
              />
            </div>

            {/* DNS Tab */}
            {activeCategoryTab === "dns" && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {reconData.dns_records.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-surface-1 border-2 border-border text-xs flex items-center justify-between font-mono shadow-[2px_2px_0px_var(--border)]"
                  >
                    <span className="px-2 py-0.5 rounded border border-border bg-primary text-black text-[10px] font-extrabold">
                      {r.record_type}
                    </span>
                    <span className="text-text-primary truncate max-w-md font-bold" title={r.value}>
                      {r.value}
                    </span>
                    <span className="text-[10px] text-text-muted font-bold">TTL {r.ttl}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TLS Tab */}
            {activeCategoryTab === "tls" && (
              <div className="space-y-3 text-xs">
                {reconData.tls_info ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border space-y-1 shadow-[2px_2px_0px_var(--border)]">
                      <span className="text-text-muted text-[10px] font-mono font-bold uppercase">SUBJECT COMMON NAME</span>
                      <div className="font-mono text-text-primary font-bold">{reconData.tls_info.subject}</div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border space-y-1 shadow-[2px_2px_0px_var(--border)]">
                      <span className="text-text-muted text-[10px] font-mono font-bold uppercase">ISSUING CERTIFICATE AUTHORITY</span>
                      <div className="font-mono text-text-primary font-bold">{reconData.tls_info.issuer}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border space-y-1 shadow-[2px_2px_0px_var(--border)]">
                        <span className="text-text-muted text-[10px] font-mono font-bold uppercase">PROTOCOL VERSION</span>
                        <div className="font-mono text-text-primary font-extrabold">{reconData.tls_info.tls_version}</div>
                      </div>
                      <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border space-y-1 shadow-[2px_2px_0px_var(--border)]">
                        <span className="text-text-muted text-[10px] font-mono font-bold uppercase">NEGOTIATED CIPHER SUITE</span>
                        <div className="font-mono text-text-primary text-[11px] font-bold truncate">{reconData.tls_info.cipher_suite}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-text-muted text-xs font-mono font-bold uppercase">
                    No TLS handshake response captured on port 443.
                  </div>
                )}
              </div>
            )}

            {/* HTTP Tab (Security Headers) */}
            {activeCategoryTab === "http" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border flex items-center justify-between shadow-[2px_2px_0px_var(--border)]">
                  <div>
                    <div className="font-extrabold text-text-primary font-display">HSTS</div>
                    <div className="text-[10px] text-text-muted font-mono">Strict Transport</div>
                  </div>
                  <Badge variant={reconData.security_headers?.hsts ? "safe" : "high"} size="sm">
                    {reconData.security_headers?.hsts ? "PRESENT" : "MISSING"}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border flex items-center justify-between shadow-[2px_2px_0px_var(--border)]">
                  <div>
                    <div className="font-extrabold text-text-primary font-display">CSP</div>
                    <div className="text-[10px] text-text-muted font-mono">Content Policy</div>
                  </div>
                  <Badge variant={reconData.security_headers?.csp ? "safe" : "high"} size="sm">
                    {reconData.security_headers?.csp ? "PRESENT" : "MISSING"}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border flex items-center justify-between shadow-[2px_2px_0px_var(--border)]">
                  <div>
                    <div className="font-extrabold text-text-primary font-display">X-Frame</div>
                    <div className="text-[10px] text-text-muted font-mono">Framing Guard</div>
                  </div>
                  <Badge variant={reconData.security_headers?.x_frame_options ? "safe" : "low"} size="sm">
                    {reconData.security_headers?.x_frame_options ? "CONFIGURED" : "MISSING"}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border flex items-center justify-between shadow-[2px_2px_0px_var(--border)]">
                  <div>
                    <div className="font-extrabold text-text-primary font-display">nosniff</div>
                    <div className="text-[10px] text-text-muted font-mono">MIME Guard</div>
                  </div>
                  <Badge variant={reconData.security_headers?.x_content_type_options ? "safe" : "low"} size="sm">
                    {reconData.security_headers?.x_content_type_options ? "CONFIGURED" : "MISSING"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Technology Tab */}
            {activeCategoryTab === "tech" && (
              <div className="p-4 rounded-lg bg-surface-1 border-2 border-border space-y-3">
                <div className="font-extrabold text-xs font-mono uppercase text-text-primary">
                  DETECTED SERVER & INFRASTRUCTURE SIGNALS
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 bg-surface-0 border-2 border-border rounded-lg">
                    <div className="text-[10px] text-text-muted uppercase">TLS PROTOCOL</div>
                    <div className="font-bold text-text-primary mt-0.5">{reconData.tls_info?.tls_version || "UNKNOWN"}</div>
                  </div>
                  <div className="p-3 bg-surface-0 border-2 border-border rounded-lg">
                    <div className="text-[10px] text-text-muted uppercase">NAME SERVERS</div>
                    <div className="font-bold text-text-primary mt-0.5">{reconData.dns_records.filter(r => r.record_type === "NS").length} Configured</div>
                  </div>
                  <div className="p-3 bg-surface-0 border-2 border-border rounded-lg">
                    <div className="text-[10px] text-text-muted uppercase">MAIL EXCHANGERS</div>
                    <div className="font-bold text-text-primary mt-0.5">{reconData.dns_records.filter(r => r.record_type === "MX").length} Active</div>
                  </div>
                </div>
              </div>
            )}

            {/* Public Exposure Tab */}
            {activeCategoryTab === "exposure" && (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-surface-1 border-2 border-border">
                  <h5 className="text-xs font-mono font-extrabold uppercase text-text-primary">
                    PUBLIC ATTACK SURFACE ASSESSMENT
                  </h5>
                  <p className="text-xs text-text-secondary mt-1">
                    Calculated from missing defense headers, plain HTTP redirection, and public nameserver sprawl.
                  </p>
                  <div className="mt-3 flex items-center space-x-3 text-xs font-mono">
                    <span className="font-bold">EXPOSURE SCORE:</span>
                    <Badge variant={getVerdictBadgeVariant(reconData.exposure_level)} size="sm">
                      {reconData.exposure_score} / 100
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Actionable Remediations */}
          <Card level={0} className="p-6 space-y-3">
            <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-warning stroke-[2.5]" />
              <span>RECOMMENDED DEFENSIVE REMEDIATIONS ({reconData.findings.length})</span>
            </h4>

            {reconData.findings.length === 0 ? (
              <div className="py-4 text-center text-xs text-theme-success font-bold font-mono">
                ✓ ZERO ACTIVE EXPOSURE DEFICIENCIES DETECTED.
              </div>
            ) : (
              <div className="divide-y-2 divide-border">
                {reconData.findings.map((f) => (
                  <div key={f.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="font-extrabold text-text-primary font-display">{f.title}</div>
                      <div className="text-text-secondary mt-0.5 leading-relaxed">{f.recommendation}</div>
                    </div>
                    <Badge variant={f.severity === "HIGH" ? "high" : "medium"} size="sm">
                      {f.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card level={0} className="p-12">
          <EmptyState
            icon={<Globe className="w-8 h-8 text-text-muted stroke-[2.2]" />}
            title="NO EXPOSURE DATA."
            description="Check a domain to begin analyzing its public security posture."
            actionLabel="CHECK DOMAIN →"
            onAction={() => {
              const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
              if (inputEl) inputEl.focus();
            }}
          />
        </Card>
      )}
    </div>
  );
};
