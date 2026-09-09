import React from "react";
import { X, Keyboard, Shield, HelpCircle, FileSearch, Globe, Atom, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "./Button";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ["⌘K", "Ctrl + K"], label: "Search & Quick Commands" },
    { keys: ["Esc"], label: "Close active popups or search" },
    { keys: ["Tab"], label: "Navigate buttons and inputs" },
    { keys: ["Enter"], label: "Confirm selection or action" },
  ];

  const coreModules = [
    {
      name: "File Check",
      icon: FileSearch,
      desc: "Safely inspect files in memory without ever running them, finding unusual patterns, hidden links, and digital signatures.",
    },
    {
      name: "Website Check",
      icon: Globe,
      desc: "Check public security information for any website, including HTTPS certificates and email protection.",
    },
    {
      name: "Trust Test",
      icon: Atom,
      desc: "Run a simulated trust test to explore how secure communication detects tampering or eavesdropping.",
    },
    {
      name: "Security Reports",
      icon: FileText,
      desc: "Create clean, easy-to-read reports and summaries that you can print, download, or share.",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-surface-elevated border border-border rounded-3xl shadow-2xl p-7 sm:p-8 overflow-hidden max-h-[90vh] flex flex-col animate-scaleIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-surface-1 text-primary border border-border">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                Guide & Keyboard Shortcuts
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Quick commands, feature explanations, and safety guarantees
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors focus-ring"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Keyboard Shortcuts */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
              <Keyboard className="w-4 h-4 text-primary" />
              <span>Global Keyboard Shortcuts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {shortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-surface-1/60 border border-border-subtle flex items-center justify-between text-xs"
                >
                  <span className="text-text-secondary font-medium">{sc.label}</span>
                  <div className="flex items-center space-x-1">
                    {sc.keys.map((k, idx) => (
                      <kbd
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-surface-0 border border-border font-mono text-[11px] font-bold text-text-primary shadow-xs"
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
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
              <Shield className="w-4 h-4 text-primary" />
              <span>System Capabilities</span>
            </div>

            <div className="space-y-2.5">
              {coreModules.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-surface-1/60 border border-border-subtle flex items-start space-x-3.5 text-xs"
                  >
                    <div className="p-2 rounded-xl bg-surface-0 border border-border text-primary shrink-0 mt-0.5 shadow-xs">
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

          {/* Safety Guarantees */}
          <div className="p-4 rounded-2xl bg-surface-1/40 border border-border/80">
            <div className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Safety & Privacy Guarantees</span>
            </div>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc pl-5 leading-relaxed">
              <li><strong className="text-text-primary">Files Are Never Run:</strong> We only inspect file structure in a safe memory sandbox; binaries are never executed.</li>
              <li><strong className="text-text-primary">Free & Open:</strong> Built on open security standards without paid vendor trackers or surprise fees.</li>
              <li><strong className="text-text-primary">Clear Proof:</strong> We explain issues in plain English with optional technical details when you want them.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/80 pt-4 flex justify-end">
          <Button size="md" variant="primary" onClick={onClose} className="px-6">
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
};
