import React, { useState } from "react";
import {
  Globe,
  Search,
  AlertCircle,
  ShieldCheck,
  Server,
  Lock,
  ArrowRight,
  Shield,
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
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-14">
      {/* Header with explicit Badges */}
      <div className="p-7 rounded-2xl border border-border/70 bg-surface-0/70 backdrop-blur-sm shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="safe" size="sm">Passive</Badge>
          <Badge variant="info" size="sm">Public</Badge>
          <Badge variant="neutral" size="sm">Non-Intrusive</Badge>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
          Passive Exposure Reconnaissance
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary max-w-3xl leading-relaxed">
          Inspect public security hygiene through observable DNS records, TLS certificates, and HTTP defense headers without active port scanning or intrusion.
        </p>
      </div>

      {/* Target Search Form */}
      <Card level={0} className="p-6">
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
            <input
              type="text"
              required
              placeholder="example.com or target-domain.org"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-1/60 border border-border/70 text-xs font-mono text-text-primary placeholder:text-text-muted focus-ring transition shadow-xs"
            />
          </div>
          <Button
            type="submit"
            loading={scanning}
            loadingText="Inspecting…"
            variant="primary"
            className="text-xs font-medium"
            icon={<Search className="w-4 h-4" />}
          >
            Check Exposure
          </Button>
        </form>
        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
          <span>Target compliance: Zero intrusive packets</span>
          <span className="font-mono text-[11px]">RFC-Compliant DNS/TLS</span>
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
                    {reconData.exposure_level} Exposure
                  </Badge>
                  <span className="text-xs text-text-muted">Public Footprint</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
                  {reconData.target}
                </h3>
                <p className="text-xs text-text-secondary">
                  Assessment finished: {reconData.dns_records.length} DNS records, TLS verified.
                </p>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <ScoreRing
                  score={reconData.exposure_score}
                  variant="risk"
                  size={128}
                  strokeWidth={9}
                  label="Exposure Score"
                />
              </div>
            </div>
          </Card>

          {/* Results: DNS, TLS, HTTP, TECHNOLOGY, PUBLIC EXPOSURE */}
          <Card level={0} className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Analysis Categories
              </h4>
              <Tabs
                size="sm"
                activeId={activeCategoryTab}
                onChange={setActiveCategoryTab}
                items={[
                  { id: "dns", label: "DNS", badge: reconData.dns_records.length },
                  { id: "tls", label: "TLS" },
                  { id: "http", label: "HTTP Headers" },
                  { id: "tech", label: "Infrastructure" },
                  { id: "exposure", label: "Exposure Score" },
                ]}
              />
            </div>

            {/* DNS Tab */}
            {activeCategoryTab === "dns" && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {reconData.dns_records.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-surface-1/40 border border-border/60 text-xs flex items-center justify-between font-mono"
                  >
                    <span className="px-2 py-0.5 rounded-md border border-border/60 bg-surface-0 text-text-primary text-[11px] font-semibold">
                      {r.record_type}
                    </span>
                    <span className="text-text-primary truncate max-w-md" title={r.value}>
                      {r.value}
                    </span>
                    <span className="text-[11px] text-text-muted">TTL {r.ttl}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TLS Tab */}
            {activeCategoryTab === "tls" && (
              <div className="space-y-3 text-xs">
                {reconData.tls_info ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
                      <span className="text-text-muted text-[11px]">Subject Common Name</span>
                      <div className="font-mono text-text-primary font-medium">{reconData.tls_info.subject}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
                      <span className="text-text-muted text-[11px]">Issuing Certificate Authority</span>
                      <div className="font-mono text-text-primary font-medium">{reconData.tls_info.issuer}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
                        <span className="text-text-muted text-[11px]">Protocol Version</span>
                        <div className="font-mono text-text-primary font-medium">{reconData.tls_info.tls_version}</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
                        <span className="text-text-muted text-[11px]">Negotiated Cipher Suite</span>
                        <div className="font-mono text-text-primary text-[11px] truncate">{reconData.tls_info.cipher_suite}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-text-muted text-xs">
                    No TLS handshake response captured on port 443.
                  </div>
                )}
              </div>
            )}

            {/* HTTP Tab (Security Headers) */}
            {activeCategoryTab === "http" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">HSTS</div>
                    <div className="text-[11px] text-text-muted">Strict Transport</div>
                  </div>
                  <Badge variant={reconData.security_headers?.hsts ? "safe" : "high"} size="sm">
                    {reconData.security_headers?.hsts ? "Present" : "Missing"}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">CSP</div>
                    <div className="text-[11px] text-text-muted">Content Policy</div>
                  </div>
                  <Badge variant={reconData.security_headers?.csp ? "safe" : "high"} size="sm">
                    {reconData.security_headers?.csp ? "Present" : "Missing"}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">X-Frame</div>
                    <div className="text-[11px] text-text-muted">Framing Guard</div>
                  </div>
                  <Badge variant={reconData.security_headers?.x_frame_options ? "safe" : "low"} size="sm">
                    {reconData.security_headers?.x_frame_options ? "Configured" : "Missing"}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">nosniff</div>
                    <div className="text-[11px] text-text-muted">MIME Guard</div>
                  </div>
                  <Badge variant={reconData.security_headers?.x_content_type_options ? "safe" : "low"} size="sm">
                    {reconData.security_headers?.x_content_type_options ? "Configured" : "Missing"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Technology Tab */}
            {activeCategoryTab === "tech" && (
              <div className="p-4 rounded-xl bg-surface-1/40 border border-border/60 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Detected Infrastructure Signals
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 bg-surface-0 border border-border/60 rounded-xl">
                    <div className="text-[11px] text-text-muted">TLS Protocol</div>
                    <div className="font-medium text-text-primary mt-0.5">{reconData.tls_info?.tls_version || "Unknown"}</div>
                  </div>
                  <div className="p-3 bg-surface-0 border border-border/60 rounded-xl">
                    <div className="text-[11px] text-text-muted">Name Servers</div>
                    <div className="font-medium text-text-primary mt-0.5">{reconData.dns_records.filter(r => r.record_type === "NS").length} Configured</div>
                  </div>
                  <div className="p-3 bg-surface-0 border border-border/60 rounded-xl">
                    <div className="text-[11px] text-text-muted">Mail Exchangers</div>
                    <div className="font-medium text-text-primary mt-0.5">{reconData.dns_records.filter(r => r.record_type === "MX").length} Active</div>
                  </div>
                </div>
              </div>
            )}

            {/* Public Exposure Tab */}
            {activeCategoryTab === "exposure" && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-surface-1/40 border border-border/60">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Public Attack Surface Assessment
                  </h5>
                  <p className="text-xs text-text-secondary mt-1">
                    Calculated from missing defense headers, plain HTTP redirection, and nameserver exposure.
                  </p>
                  <div className="mt-3 flex items-center space-x-3 text-xs">
                    <span className="text-text-muted">Exposure Score:</span>
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
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Recommended Defensive Remediations ({reconData.findings.length})</span>
            </h4>

            {reconData.findings.length === 0 ? (
              <div className="py-4 text-center text-xs text-emerald-500 font-medium">
                ✓ Zero active exposure deficiencies detected.
              </div>
            ) : (
              <div className="divide-y border-border/60">
                {reconData.findings.map((f) => (
                  <div key={f.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="font-medium text-text-primary">{f.title}</div>
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
            icon={<Globe className="w-8 h-8 text-text-muted" />}
            title="No exposure data"
            description="Check a domain to begin analyzing its public security posture."
            actionLabel="Check Domain"
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
