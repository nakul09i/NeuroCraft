import React, { useState, useEffect } from "react";
import {
  Search,
  FileSearch,
  Globe,
  Atom,
  FileText,
  Sun,
  Moon,
  Laptop,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState("");
  const { setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onNavigate(query ? "" : ""); // Trigger open in parent
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: "scan",
      label: "Start New File Scan",
      desc: "Static zero-execution analysis & signature check",
      icon: FileSearch,
      action: () => {
        onNavigate("scanner");
        onClose();
      },
    },
    {
      id: "recon",
      label: "Run Passive Reconnaissance",
      desc: "Check DNS records, TLS certificate, and HTTP headers",
      icon: Globe,
      action: () => {
        onNavigate("recon");
        onClose();
      },
    },
    {
      id: "quantum",
      label: "Execute Quantum Channel Simulation",
      desc: "Bell-state entanglement verification across 5 scenarios",
      icon: Atom,
      action: () => {
        onNavigate("quantum");
        onClose();
      },
    },
    {
      id: "reports",
      label: "Generate Security Report",
      desc: "Executive audit & cryptographic provenance certificate",
      icon: FileText,
      action: () => {
        onNavigate("reports");
        onClose();
      },
    },
    {
      id: "theme-light",
      label: "Switch to Light Theme",
      desc: "Warm neutral surface aesthetics",
      icon: Sun,
      action: () => {
        setTheme("light");
        onClose();
      },
    },
    {
      id: "theme-dark",
      label: "Switch to Dark Theme",
      desc: "Deep non-fatiguing charcoal surfaces",
      icon: Moon,
      action: () => {
        setTheme("dark");
        onClose();
      },
    },
    {
      id: "theme-system",
      label: "Switch to System Theme",
      desc: "Follow OS preference automatically",
      icon: Laptop,
      action: () => {
        setTheme("system");
        onClose();
      },
    },
  ];

  const filteredActions = actions.filter(
    (a) =>
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl border border-border bg-surface-elevated shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border/80">
          <Search className="w-4 h-4 text-text-muted mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-text-muted border border-border">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">
              No matching actions found for "{query}".
            </div>
          ) : (
            filteredActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-surface-2 transition group focus-ring"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-surface-2 group-hover:bg-primary-subtle text-text-secondary group-hover:text-primary transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text-primary">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
