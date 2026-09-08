import React from "react";
import { X, Keyboard, Shield, HelpCircle, FileSearch, Globe, Atom, FileText, CheckCircle2 } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { Badge } from "./Badge";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ["⌘K", "Ctrl + K"], label: "Open Quick Search & Command Center" },
    { keys: ["Esc"], label: "Close active modal, drawer, or search palette" },
    { keys: ["Tab"], label: "Sequential accessible focus navigation" },
    { keys: ["Enter"], label: "Execute selected command or confirm action" },
  ];

  const coreModules = [
    {
      name: "File Quarantine Analysis",
      icon: FileSearch,
      desc: "Deterministic static analysis of untrusted files (PE, ELF, Mach-O, PDF, APK) in memory. Code is never dynamically executed.",
    },
    {
      name: "Passive Threat Reconnaissance",
      icon: Globe,
      desc: "Public-domain security posture audit covering DNS, TLS certificates, SPF/DMARC email hardening, and HTTP security headers without intrusive port scanning.",
    },
    {
      name: "Quantum Trust Simulation",
      icon: Atom,
      desc: "Verification channel simulating Bell-state |Φ⁺⟩ non-locality. Detects forgery and interception by measuring Total Variation Distance (TVD).",
    },
    {
      name: "Evidence-Based Reports",
      icon: FileText,
      desc: "Synthesizes multi-engine quarantine findings, certificate chain provenance, and risk scores into tamper-evident PDF/print reports.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-surface-0 border border-border/80 rounded-3xl neu-raised-lg p-7 sm:p-8 overflow-hidden max-h-[90vh] flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl neu-inset-sm text-primary">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                NeuroCraft Guide & Shortcuts
              </h2>
              <p className="text-xs text-text-muted">
                System operations, keyboard workflows, and architectural invariants
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl neu-button text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Keyboard Shortcuts */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              <Keyboard className="w-4 h-4 text-primary" />
              <span>Global Keyboard Shortcuts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {shortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl neu-inset-sm bg-surface-0/60 flex items-center justify-between text-xs"
                >
                  <span className="text-text-secondary font-medium">{sc.label}</span>
                  <div className="flex items-center space-x-1">
                    {sc.keys.map((k, idx) => (
                      <kbd
                        key={idx}
                        className="px-2 py-0.5 rounded-md neu-raised-sm bg-surface-0 font-mono text-[11px] font-bold text-text-primary"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Modules Overview */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              <Shield className="w-4 h-4 text-primary" />
              <span>System Capabilities</span>
            </div>

            <div className="space-y-2.5">
              {coreModules.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl neu-inset-sm bg-surface-0/50 flex items-start space-x-3.5 text-xs"
                  >
                    <div className="p-2 rounded-xl neu-button text-primary shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-text-primary text-sm mb-0.5">{mod.name}</div>
                      <p className="text-text-secondary leading-relaxed">{mod.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Architectural Guarantees */}
          <div className="p-4 rounded-2xl neu-raised-sm bg-surface-0/40 border border-border/60">
            <div className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Core Architectural Invariants</span>
            </div>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc pl-5 leading-relaxed">
              <li><strong className="text-text-primary">Zero Dynamic Execution:</strong> Code is strictly parsed in-memory; binaries never run.</li>
              <li><strong className="text-text-primary">Free-First Open Source Stack:</strong> Runs self-contained on Python 3.11+ without paid vendor APIs.</li>
              <li><strong className="text-text-primary">Deterministic Provenance:</strong> Unsigned binaries are audited with cryptographic proof, never assumed malicious.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 pt-4 flex justify-end">
          <Button size="md" variant="primary" onClick={onClose} className="px-6">
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
};
