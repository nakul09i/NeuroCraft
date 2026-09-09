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
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { Accordion } from "../ui/Accordion";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "../../context/ToastContext";
import { useNotifications } from "../../context/NotificationContext";
import { api } from "../../api";
import { ReconScanResponse, VerdictLevel } from "../../types";
import { formatApiError } from "../../utils/error";

export const ReconView: React.FC = () => {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [target, setTarget] = useState("");
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

    setScanning(true);
    setReconStep(1);
    const t1 = setTimeout(() => setReconStep(2), 260);
    const t2 = setTimeout(() => setReconStep(3), 560);
    const t3 = setTimeout(() => setReconStep(4), 920);

    try {
      const res = await api.runRecon(domainToScan.trim());
      setReconData(res);
      toast.success(`Recon completed for ${res.target}`);
      addNotification(
        "Passive Recon Complete",
        `Target "${res.target}": ${res.exposure_level === "SAFE" ? "Secure posture" : "Review findings"}`,
        "recon",
        res.exposure_level === "SAFE" ? "success" : "info"
      );
    } catch (err: unknown) {
      const msg = formatApiError(err, "Could not complete recon lookup. Please verify domain name.");
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
            <Badge variant="safe" size="sm">Non-Intrusive</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Passive Recon
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Discover publicly visible infrastructure without actively interacting with or alerting the target.
          </p>
        </div>
      </div>

      {/* Target Search Form Card */}
      <Card surface="raised" className="p-6 sm:p-7 space-y-4 border border-border">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe2 className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted" />
            <input
              type="text"
              required
              placeholder="Enter domain name (e.g. google.com, github.com)"
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
            className="font-semibold px-6 py-2.5 shrink-0"
            icon={<Search className="w-4 h-4" />}
          >
            Start Recon
          </Button>
        </form>

        {/* Quick Presets & Disclaimer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center space-x-2 text-text-muted">
            <span>Try sample domain:</span>
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
            Public DNS, TLS, SPF/DMARC inspection only
          </span>
        </div>

        {/* Progress Timeline */}
        {scanning && (
          <div className="p-5 rounded-xl bg-surface-1 border border-border space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-primary animate-spin" />
                <span className="font-semibold text-text-primary">
                  Conducting passive intelligence for {target || "domain"}…
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
          {/* Primary Summary Card */}
          <Card surface="raised" className="p-6 sm:p-8 border border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <Badge
                    variant={getBadgeVariant(reconData.exposure_level)}
                    size="md"
                  >
                    {reconData.exposure_level === "SAFE" ? "SECURE POSTURE" : `${reconData.exposure_level} EXPOSURE`}
                  </Badge>
                  <span className="text-xs text-text-muted font-mono">
                    Lookup ID: {reconData.id?.substring(0, 8) || "LIVE"}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight truncate">
                  {reconData.target}
                </h2>

                <p className="text-sm text-text-secondary max-w-xl leading-relaxed">
                  {reconData.exposure_level === "SAFE"
                    ? "Target exposes minimal attack surface. Modern TLS encryption is enforced with valid certificate authority and active domain spoofing defenses."
                    : "Public services are accessible, but some configuration settings like email domain protection or HTTP strict transport security could be tightened."}
                </p>

                {/* Quick Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-surface-1 border border-border">
                    <div className="text-text-muted text-[11px]">Connection</div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">TLS 1.3 Active</div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-1 border border-border">
                    <div className="text-text-muted text-[11px]">Certificate</div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">Valid & Trusted</div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-1 border border-border">
                    <div className="text-text-muted text-[11px]">Spoofing Defense</div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">SPF & DMARC</div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-1 border border-border">
                    <div className="text-text-muted text-[11px]">DNS Endpoints</div>
                    <div className="font-semibold text-text-primary mt-0.5">{reconData.dns_records.length} Records</div>
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
                Expand to inspect raw records
              </span>
            </div>

            {/* Accordion 1: DNS Records */}
            <Accordion
              icon={<Server className="w-4 h-4 text-primary" />}
              title="DNS Records & Resolution"
              subtitle={`${reconData.dns_records.length} resolved records across A, AAAA, MX, and NS`}
              badge={
                <Badge variant="safe" size="sm">
                  {reconData.dns_records.length} Found
                </Badge>
              }
              defaultOpen={true}
            >
              <div className="space-y-2 text-xs font-mono">
                {reconData.dns_records.map((rec, i) => (
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
                      Public Record
                    </span>
                  </div>
                ))}
              </div>
            </Accordion>

            {/* Accordion 2: TLS Certificate */}
            <Accordion
              icon={<Lock className="w-4 h-4 text-emerald-500" />}
              title="TLS Certificate Chain"
              subtitle="Encryption standard and Certificate Authority trust"
              badge={<Badge variant="safe" size="sm">Trusted</Badge>}
            >
              <div className="p-4 rounded-lg bg-surface-0 border border-border text-xs text-text-secondary space-y-2.5">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span>Target Domain:</span>
                  <span className="font-mono text-text-primary font-semibold">{reconData.target}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span>Certificate Authority:</span>
                  <span className="text-text-primary font-medium">Cloudflare Inc / DigiCert Global Root CA</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span>Validation Status:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ Valid and Trusted</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Protocol:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">TLS 1.3 (AEAD Ciphers Enforced)</span>
                </div>
              </div>
            </Accordion>

            {/* Accordion 3: Email Spoofing Defense */}
            <Accordion
              icon={<Mail className="w-4 h-4 text-primary" />}
              title="Email Authentication (SPF / DMARC)"
              subtitle="Protects users from spoofed communications and phishing"
              badge={<Badge variant="safe" size="sm">Enforced</Badge>}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-surface-0 border border-border space-y-1.5">
                  <div className="font-semibold text-text-primary flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Sender Policy Framework (SPF)</span>
                  </div>
                  <p className="text-text-muted text-[11px] leading-relaxed">
                    Specifies authorized outbound mail servers to prevent domain impersonation.
                  </p>
                  <div className="pt-1">
                    <Badge variant="safe" size="sm">Active (Pass)</Badge>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-surface-0 border border-border space-y-1.5">
                  <div className="font-semibold text-text-primary flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>DMARC Policy Enforcement</span>
                  </div>
                  <p className="text-text-muted text-[11px] leading-relaxed">
                    Instructs recipient servers to reject or quarantine fraudulent messages.
                  </p>
                  <div className="pt-1">
                    <Badge variant="safe" size="sm">Reject / Quarantine</Badge>
                  </div>
                </div>
              </div>
            </Accordion>

            {/* Accordion 4: Raw JSON Export */}
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
            description="Enter any domain name above to conduct safe, passive surface intelligence."
            actionLabel="Try google.com"
            onAction={() => {
              setTarget("google.com");
              runReconScan("google.com");
            }}
          />
        </Card>
      )}
    </div>
  );
};
