import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  FileSearch,
  Globe2,
  Atom,
  FileText,
  History,
  LayoutDashboard,
  Settings,
  Sun,
  Moon,
  Monitor,
  ArrowRight,
  Shield,
  Zap,
  Play,
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { setTheme } = useTheme();
  const listRef = useRef<HTMLDivElement>(null);

  const actions = [
    // Direct Actions
    {
      id: "act-analyze",
      category: "Quick Actions",
      label: "Analyze File",
      desc: "Upload and statically inspect untrusted artifact in memory",
      icon: FileSearch,
      action: () => {
        onNavigate("scanner");
        onClose();
      },
    },
    {
      id: "act-exposure",
      category: "Quick Actions",
      label: "Check Exposure",
      desc: "Run passive non-intrusive DNS, TLS, and header recon on a domain",
      icon: Globe2,
      action: () => {
        onNavigate("recon");
        onClose();
      },
    },
    {
      id: "act-quantum",
      category: "Quick Actions",
      label: "Run Quantum Simulation",
      desc: "Execute Bell-state projection test to verify channel integrity",
      icon: Atom,
      action: () => {
        onNavigate("quantum");
        onClose();
      },
    },
    {
      id: "act-report",
      category: "Quick Actions",
      label: "Generate Security Report",
      desc: "Build executive audit or technical provenance certificate",
      icon: FileText,
      action: () => {
        onNavigate("reports");
        onClose();
      },
    },

    // Navigation
    {
      id: "nav-dash",
      category: "Navigation",
      label: "Dashboard",
      desc: "Security command center, posture overview & telemetry",
      icon: LayoutDashboard,
      action: () => {
        onNavigate("dashboard");
        onClose();
      },
    },
    {
      id: "nav-scan",
      category: "Navigation",
      label: "File Analysis",
      desc: "Zero-execution static quarantine & Authenticode validation",
      icon: FileSearch,
      action: () => {
        onNavigate("scanner");
        onClose();
      },
    },
    {
      id: "nav-recon",
      category: "Navigation",
      label: "Passive Recon",
      desc: "Public attack surface footprinting and hardening checks",
      icon: Globe2,
      action: () => {
        onNavigate("recon");
        onClose();
      },
    },
    {
      id: "nav-quantum",
      category: "Navigation",
      label: "Quantum Trust",
      desc: "Bell-state channel tamper detection and TVD tolerance",
      icon: Atom,
      action: () => {
        onNavigate("quantum");
        onClose();
      },
    },
    {
      id: "nav-reports",
      category: "Navigation",
      label: "Security Reports",
      desc: "Executive summary & technical forensic evidence reports",
      icon: FileText,
      action: () => {
        onNavigate("reports");
        onClose();
      },
    },
    {
      id: "nav-history",
      category: "Navigation",
      label: "Audit History",
      desc: "Search, filter, and inspect past file scans & telemetry",
      icon: History,
      action: () => {
        onNavigate("history");
        onClose();
      },
    },
    {
      id: "nav-settings",
      category: "Navigation",
      label: "Settings",
      desc: "Appearance, preferences, session credentials & invariants",
      icon: Settings,
      action: () => {
        onNavigate("settings");
        onClose();
      },
    },

    // Appearance & System
    {
      id: "theme-light",
      category: "System & Theme",
      label: "Switch to Light Theme",
      desc: "Soft cool slate surface (#EEF3F7) with tactile depth",
      icon: Sun,
      action: () => {
        setTheme("light");
        onClose();
      },
    },
    {
      id: "theme-dark",
      category: "System & Theme",
      label: "Switch to Dark Theme",
      desc: "Deep navy charcoal interface (#0C111C) with cyan accents",
      icon: Moon,
      action: () => {
        setTheme("dark");
        onClose();
      },
    },
    {
      id: "theme-system",
      category: "System & Theme",
      label: "Synchronize System Theme",
      desc: "Follow operating system dark/light appearance preference",
      icon: Monitor,
      action: () => {
        setTheme("system");
        onClose();
      },
    },
  ];

  const filteredActions = actions.filter(
    (a) =>
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.desc.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl neu-raised-lg bg-surface-0 border border-border/80 overflow-hidden flex flex-col max-h-[75vh] animate-scaleIn"
      >
        {/* Inset Search Input */}
        <div className="p-4 border-b border-border/60 bg-surface-0">
          <div className="flex items-center px-4 py-3 rounded-2xl neu-inset">
            <Search className="w-5 h-5 text-text-muted mr-3 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search tools, quick actions, or views…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-base font-normal text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            <kbd className="text-xs font-mono font-bold px-2 py-0.5 rounded-md neu-raised-sm text-text-muted">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-muted">
              No matching actions found for "{query}".
            </div>
          ) : (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all duration-150 group ${
                    isSelected
                      ? "neu-inset text-primary font-semibold"
                      : "text-text-secondary hover:bg-surface-1/60 hover:text-text-primary font-medium"
                  }`}
                >
                  <div className="flex items-center space-x-3.5 overflow-hidden">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary/20 text-primary"
                          : "neu-button text-text-muted group-hover:text-text-primary"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-text-primary truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-text-muted uppercase">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-xs truncate mt-0.5 text-text-muted">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-opacity ${
                      isSelected
                        ? "text-primary opacity-100"
                        : "text-text-muted opacity-0 group-hover:opacity-60"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-surface-0/60 border-t border-border/60 flex items-center justify-between text-xs text-text-muted font-mono">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Execute</span>
            <span>Esc Dismiss</span>
          </div>
          <span>NeuroCraft Quick Console</span>
        </div>
      </div>
    </div>
  );
};
