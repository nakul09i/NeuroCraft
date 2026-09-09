import React, { useState } from "react";
import {
  Globe2,
  Search,
  ShieldCheck,
  Server,
  Lock,
  Mail,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Cpu,
  Layers,
  Info,
  Shield,
  WifiOff,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { Accordion } from "../ui/Accordion";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "../../context/ToastContext";
import { useNotifications } from "../../context/NotificationContext";
import { useConnectivity } from "../../context/ConnectivityContext";
import { api } from "../../api";
import { ReconScanResponse } from "../../types";
import { formatApiError } from "../../utils/error";

export const ReconView: React.FC = () => {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const { isOnline } = useConnectivity();
  const [target, setTarget] = useState("");
  const [authorized, setAuthorized] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [reconStep, setReconStep] = useState<number>(0);
  const [reconData, setReconData] = useState<ReconScanResponse | null>(null);

  const simpleStages = [
    { id: 1, label: "Resolving DNS & Nameservers", desc: "Querying public A, AAAA, MX, and NS records" },
    { id: 2, label: "Inspecting TLS Certificate", desc: "Checking certificate chain, validity, and cipher suites" },
    { id: 3, label: "Evaluating Email Defense", desc: "Verifying SPF and DMARC spoofing prevention" },
    { id: 4, label: "Analyzing Security Headers", desc: "Checking HSTS, CSP, and transport protections" },
  ];

  const runReconScan = async (domainToScan: string) => {
    if (!domainToScan.trim()) return;
    if (!authorized) {
      toast.error("Please confirm authorization before scanning target.", "Authorization Required");
      return;
    }

    setScanning(true);
    setReconStep(1);
    const t1 = setTimeout(() => setReconStep(2), 260);
    const t2 = setTimeout(() => setReconStep(3), 560);
    const t3 = setTimeout(() => setReconStep(4), 920);

    try {
      const res = await api.runRecon(domainToScan.trim(), authorized);
      setReconData(res);
      toast.success(`Recon completed for ${res.target}`);
      addNotification(
        "Passive Recon Complete",
        `Target "${res.target}": ${res.exposure_level === "SAFE" ? "Secure posture" : "Review findings"}`,
        "recon",
        res.exposure_level === "SAFE" ? "success" : "info"
      );
    } catch (err: unknown) {
      const msg = formatApiError(err, "Could not complete recon lookup. Please verify target address.");
      toast.error(msg, "Recon Error");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setScanning(false);
      setReconStep(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runReconScan(target);
  };

  const presets = ["google.com", "github.com", "cloudflare.com", "wikipedia.org"];

  const getSafetyScore = (expScore: number) => {
    return Math.max(0, Math.min(100, Math.round(100 - expScore)));
  };

  const getBadgeVariant = (level?: string): "safe" | "low" | "medium" | "high" | "neutral" => {
    switch (level?.toUpperCase()) {
      case "SAFE":
        return "safe";
      case "LOW":
        return "low";
      case "MEDIUM":
        return "medium";
      case "HIGH":
      case "CRITICAL":
        return "high";
      default:
        return "neutral";
    }
  };

  // Real SPF/DMARC status from DNS records
  const hasSpf = reconData?.dns_records.some(
    (r) => r.record_type === "TXT" && r.value.toLowerCase().includes("v=spf1")
  );
  const hasDmarc = reconData?.dns_records.some(
    (r) => r.record_type === "DMARC" || (r.record_type === "TXT" && r.value.toLowerCase().includes("v=dmarc1"))
  );

  return (
    <div className="space-y-6 page-enter max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Surface Intelligence
            </span>
            <span className="text-text-muted">•</span>
            <Badge variant="safe" size="sm">Defensive & Passive</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Passive Recon
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Discover publicly visible infrastructure and security configurations non-intrusively without active penetration.
          </p>
        </div>
      </div>

      {/* Offline Mode Notice Banner */}
      {!isOnline && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center space-x-3 animate-fadeIn">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold">Offline Mode Active: </span>
            <span>
              Passive reconnaissance requires network connectivity. You can view previously cached targets locally in SQLite, or reconnect to scan new domains.
            </span>
          </div>
        </div>
      )}

      {/* Target Search Form Card */}
      <Card surface="raised" className="p-6 sm:p-7 space-y-4 border border-border">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe2 className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted" />
            <input
              type="text"
              required
              placeholder="Enter domain name or hostname (e.g. cloudflare.com, github.com)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
            />
          </div>

          <Button
            type="submit"
            loading={scanning}
            loadingText="Analyzing…"
            size="md"
            variant="primary"
            disabled={!authorized || scanning || !target.trim()}
            className="font-semibold px-6 py-2.5 shrink-0"
            icon={<Search className="w-4 h-4" />}
          >
            Start Recon
          </Button>
        </form>

        {/* Mandatory Authorization Confirmation */}
        <div className="flex items-start space-x-2.5 pt-1 text-xs text-text-secondary">
          <input
            type="checkbox"
            id="recon-auth-check"
            checked={authorized}
            onChange={(e) => setAuthorized(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
          />
          <label htmlFor="recon-auth-check" className="cursor-pointer select-none leading-relaxed">
            I confirm authorization to perform defensive, passive intelligence on this target, or confirm it is a public domain subject to defensive review.
          </label>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center space-x-2 text-text-muted">
            <span>Try domain:</span>
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setTarget(p);
                  runReconScan(p);
                }}
                className="px-2 py-0.5 rounded-md bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>

          <span className="text-text-muted text-[11px]">
            SSRF perimeter protected • Passive DNS, TLS & Headers
          </span>
        </div>

        {/* Progress Timeline */}
        {scanning && (
          <div className="p-5 rounded-xl bg-surface-1 border border-border space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-primary animate-spin" />
                <span className="font-semibold text-text-primary">
                  Conducting passive intelligence for {target || "target"}…
                </span>
              </div>
              <span className="font-mono text-primary font-semibold">
                Step {reconStep} of 4
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {simpleStages.map((stg) => {
                const isDone = reconStep > stg.id;
                const isCurrent = reconStep === stg.id;

                return (
                  <div
                    key={stg.id}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      isDone
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : isCurrent
                        ? "bg-primary/10 border-primary/40 text-primary font-medium shadow-xs"
                        : "bg-surface-0 border-border/50 text-text-muted opacity-50"
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold mb-0.5">
                      {isDone ? "✓ Done" : isCurrent ? "→ Checking" : `Step ${stg.id}`}
                    </div>
                    <div className="font-medium text-[11px] truncate">{stg.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Results View */}
      {reconData ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Limitations Banner if any */}
          {reconData.limitations && reconData.limitations.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-start space-x-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <span className="font-semibold">Analysis Limitations Noted: </span>
                <span>{reconData.limitations.join(" • ")}</span>
              </div>
            </div>
          )}

          {/* Primary Summary Card */}
          <Card surface="raised" className="p-6 sm:p-8 border border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start space-x-2 flex-wrap gap-y-1">
                  <Badge
                    variant={getBadgeVariant(reconData.exposure_level)}
                    size="md"
                  >
                    {reconData.exposure_level === "SAFE" ? "SECURE POSTURE" : `${reconData.exposure_level} EXPOSURE`}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    CONFIDENCE: {reconData.confidence || "HIGH"}
                  </Badge>
                  {reconData.cached && (
                    <Badge variant="neutral" size="sm" className="bg-amber-500/10 text-amber-300 border-amber-500/30 font-mono">
                      ● CACHED {reconData.created_at ? `(${new Date(reconData.created_at).toLocaleDateString()})` : ""}
                    </Badge>
                  )}
                  <span className="text-xs text-text-muted font-mono">
                    ID: {reconData.id?.substring(0, 8) || "LIVE"}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight truncate">
                  {reconData.target}
                </h2>

                <p className="text-sm text-text-secondary max-w-xl leading-relaxed">
                  {reconData.exposure_level === "SAFE"
                    ? "Target exposes minimal attack surface. Modern TLS encryption is enforced with valid certificate authority and active domain spoofing defenses."
                    : "Public services are accessible. Some configuration settings like email spoofing protections or HTTP transport security headers could be hardened."}
                </p>

                {/* Dynamic Quick Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-surface-1 border border-border">
                    <div className="text-text-muted text-[11px]">Connection</div>
                    <div className="font-semibold text-text-primary mt-0.5 truncate">
                      {reconData.tls_info?.tls_version ? `${reconData.tls_info.tls_version} Active` : "No HTTPS"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-1 border border-border">
                    <div className="text-text-muted text-[11px]">Certificate</div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                      {reconData.tls_info ? (reconData.tls_info.is_expired ? "Expired" : "Valid & Active") : "Not Active"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-1 border border-border">
                    <div className="text-text-muted text-[11px]">Spoofing Defense</div>
                    <div className="font-semibold text-text-primary mt-0.5 truncate">
                      {hasSpf && hasDmarc ? "SPF + DMARC" : hasSpf ? "SPF Only" : hasDmarc ? "DMARC Only" : "Missing"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-1 border border-border">
                    <div className="text-text-muted text-[11px]">DNS Endpoints</div>
                    <div className="font-semibold text-text-primary mt-0.5">
                      {reconData.dns_records.length} Records
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center">
                <ScoreRing
                  score={getSafetyScore(reconData.exposure_score)}
                  variant="safety"
                  size={130}
                  strokeWidth={9}
                  label="Safety Score"
                />
              </div>
            </div>
          </Card>

          {/* Progressive Disclosure: Collapsible Technical Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Surface Findings & Verification Details
              </h3>
              <span className="text-xs text-text-muted">
                Expand to inspect verified observations
              </span>
            </div>

            {/* Accordion 1: DNS Records */}
            <Accordion
              icon={<Server className="w-4 h-4 text-primary" />}
              title="DNS Records & Resolution"
              subtitle={`${reconData.dns_records.length} resolved records across A, AAAA, MX, NS, and TXT`}
              badge={
                <Badge variant="safe" size="sm">
                  {reconData.dns_records.length} Found
                </Badge>
              }
              defaultOpen={true}
            >
              <div className="space-y-2 text-xs font-mono">
                {reconData.dns_records.length > 0 ? (
                  reconData.dns_records.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-surface-0 border border-border flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {rec.record_type}
                        </span>
                        <span className="text-text-primary truncate">{rec.value}</span>
                      </div>
                      <span className="text-text-muted font-sans text-[11px] shrink-0">
                        {rec.ttl ? `TTL ${rec.ttl}s` : "Public Record"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-text-muted text-center text-xs">
                    No public DNS records resolved for target.
                  </div>
                )}
              </div>
            </Accordion>

            {/* Accordion 2: TLS Certificate */}
            <Accordion
              icon={<Lock className="w-4 h-4 text-emerald-500" />}
              title="TLS Certificate Chain"
              subtitle="Encryption standard and Certificate Authority trust"
              badge={
                <Badge
                  variant={reconData.tls_info && !reconData.tls_info.is_expired ? "safe" : "neutral"}
                  size="sm"
                >
                  {reconData.tls_info ? (reconData.tls_info.is_expired ? "Expired" : "Trusted") : "No TLS"}
                </Badge>
              }
            >
              {reconData.tls_info ? (
                <div className="p-4 rounded-lg bg-surface-0 border border-border text-xs text-text-secondary space-y-2.5">
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <span>Target Domain / Subject:</span>
                    <span className="font-mono text-text-primary font-semibold">
                      {reconData.tls_info.subject || reconData.target}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <span>Certificate Authority:</span>
                    <span className="text-text-primary font-medium">
                      {reconData.tls_info.issuer || "Unknown CA"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <span>Validation Status:</span>
                    <span className={reconData.tls_info.is_expired ? "text-rose-500 font-semibold" : "font-semibold text-emerald-600 dark:text-emerald-400"}>
                      {reconData.tls_info.is_expired ? "⚠ Expired" : "✓ Valid and Active"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <span>Active Protocol & Cipher:</span>
                    <span className="font-semibold text-text-primary">
                      {reconData.tls_info.tls_version || "TLS"} ({reconData.tls_info.cipher_suite || "Active"})
                    </span>
                  </div>
                  {reconData.tls_info.san && reconData.tls_info.san.length > 0 && (
                    <div>
                      <span className="block mb-1 font-semibold text-text-primary">SAN Hostnames ({reconData.tls_info.san.length}):</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {reconData.tls_info.san.slice(0, 12).map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-surface-1 border border-border font-mono text-[10px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-text-muted text-center text-xs">
                  No TLS certificate was negotiated on port 443.
                </div>
              )}
            </Accordion>

            {/* Accordion 3: Email Spoofing Defense */}
            <Accordion
              icon={<Mail className="w-4 h-4 text-primary" />}
              title="Email Authentication (SPF / DMARC)"
              subtitle="Protects users from spoofed communications and phishing"
              badge={
                <Badge variant={hasSpf && hasDmarc ? "safe" : "neutral"} size="sm">
                  {hasSpf && hasDmarc ? "Enforced" : "Partial / Missing"}
                </Badge>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-surface-0 border border-border space-y-1.5">
                  <div className="font-semibold text-text-primary flex items-center space-x-1.5">
                    {hasSpf ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span>Sender Policy Framework (SPF)</span>
                  </div>
                  <p className="text-text-muted text-[11px] leading-relaxed">
                    Specifies authorized outbound mail servers to prevent domain impersonation.
                  </p>
                  <div className="pt-1">
                    <Badge variant={hasSpf ? "safe" : "medium"} size="sm">
                      {hasSpf ? "Active (Configured)" : "Missing Record"}
                    </Badge>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-surface-0 border border-border space-y-1.5">
                  <div className="font-semibold text-text-primary flex items-center space-x-1.5">
                    {hasDmarc ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span>DMARC Policy Enforcement</span>
                  </div>
                  <p className="text-text-muted text-[11px] leading-relaxed">
                    Instructs recipient servers to reject or quarantine fraudulent messages.
                  </p>
                  <div className="pt-1">
                    <Badge variant={hasDmarc ? "safe" : "medium"} size="sm">
                      {hasDmarc ? "Policy Configured" : "Missing Policy"}
                    </Badge>
                  </div>
                </div>
              </div>
            </Accordion>

            {/* Accordion 4: Security Headers */}
            {reconData.security_headers && (
              <Accordion
                icon={<Shield className="w-4 h-4 text-blue-500" />}
                title="HTTP Security Headers"
                subtitle="Evaluates HSTS, CSP, Clickjacking mitigation, and nosniff"
                badge={
                  <Badge variant={reconData.security_headers.hsts && reconData.security_headers.csp ? "safe" : "low"} size="sm">
                    {reconData.security_headers.hsts ? "HSTS Active" : "Review"}
                  </Badge>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-surface-0 border border-border flex items-center justify-between">
                    <span>Strict-Transport-Security</span>
                    <Badge variant={reconData.security_headers.hsts ? "safe" : "medium"} size="sm">
                      {reconData.security_headers.hsts ? "Enforced" : "Missing"}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-0 border border-border flex items-center justify-between">
                    <span>Content-Security-Policy</span>
                    <Badge variant={reconData.security_headers.csp ? "safe" : "medium"} size="sm">
                      {reconData.security_headers.csp ? "Configured" : "Missing"}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-0 border border-border flex items-center justify-between">
                    <span>X-Frame-Options</span>
                    <Badge variant={reconData.security_headers.x_frame_options ? "safe" : "low"} size="sm">
                      {reconData.security_headers.x_frame_options || "Missing"}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-0 border border-border flex items-center justify-between">
                    <span>X-Content-Type-Options</span>
                    <Badge variant={reconData.security_headers.x_content_type_options ? "safe" : "low"} size="sm">
                      {reconData.security_headers.x_content_type_options ? "nosniff" : "Missing"}
                    </Badge>
                  </div>
                </div>
              </Accordion>
            )}

            {/* Accordion 5: Detected Technologies */}
            {reconData.technologies && reconData.technologies.length > 0 && (
              <Accordion
                icon={<Cpu className="w-4 h-4 text-purple-500" />}
                title="Passively Detected Technologies"
                subtitle={`${reconData.technologies.length} components identified via banners and markers`}
                badge={
                  <Badge variant="neutral" size="sm">
                    {reconData.technologies.length} Detected
                  </Badge>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {reconData.technologies.map((t, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-surface-0 border border-border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary">{t.name}</span>
                        <Badge variant="neutral" size="sm">
                          {Math.round(t.confidence * 100)}% Conf
                        </Badge>
                      </div>
                      <div className="text-text-muted text-[11px]">
                        Category: {t.category} • Source: {t.source}
                      </div>
                    </div>
                  ))}
                </div>
              </Accordion>
            )}

            {/* Accordion 6: Findings & Evidence Observations */}
            {reconData.findings.length > 0 && (
              <Accordion
                icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
                title="Reconnaissance Observations & Recommendations"
                subtitle={`${reconData.findings.length} exposure findings discovered`}
                badge={
                  <Badge variant={getBadgeVariant(reconData.exposure_level)} size="sm">
                    {reconData.findings.length} Items
                  </Badge>
                }
              >
                <div className="space-y-3 text-xs">
                  {reconData.findings.map((f, i) => (
                    <div key={i} className="p-3.5 rounded-lg bg-surface-0 border border-border space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text-primary">{f.title}</span>
                        <Badge variant={getBadgeVariant(f.severity)} size="sm">
                          {f.severity}
                        </Badge>
                      </div>
                      <p className="text-text-secondary text-[11px] leading-relaxed">
                        {f.recommendation}
                      </p>
                      {f.evidence && Object.keys(f.evidence).length > 0 && (
                        <div className="p-2 rounded bg-surface-1 border border-border/60 font-mono text-[10px] text-text-muted">
                          <span className="font-sans font-semibold text-text-secondary block mb-0.5">Verified Evidence:</span>
                          <pre className="overflow-x-auto">{JSON.stringify(f.evidence, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Accordion>
            )}

            {/* Accordion 7: Raw JSON Export */}
            <Accordion
              icon={<FileCode2 className="w-4 h-4 text-text-muted" />}
              title="Raw Signal Response"
              subtitle="Structured JSON payload from backend recon endpoint"
            >
              <div className="p-4 rounded-lg bg-surface-0 border border-border">
                <pre className="text-[11px] font-mono text-text-secondary overflow-x-auto max-h-60">
                  {JSON.stringify(reconData, null, 2)}
                </pre>
              </div>
            </Accordion>
          </div>
        </div>
      ) : (
        <Card surface="raised" className="p-12 border border-border">
          <EmptyState
            icon={<Globe2 className="w-8 h-8 text-primary" />}
            title="Awaiting target domain"
            description="Enter any domain or hostname above to conduct safe, passive surface intelligence."
            actionLabel="Try cloudflare.com"
            onAction={() => {
              setTarget("cloudflare.com");
              runReconScan("cloudflare.com");
            }}
          />
        </Card>
      )}
    </div>
  );
};
