import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  FileSearch,
  Globe,
  Atom,
  FileText,
  History,
  LayoutDashboard,
  Settings,
  Sun,
  Moon,
  Monitor,
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { setTheme } = useTheme();
  const listRef = useRef<HTMLDivElement>(null);

  const actions = [
    // Navigation
    {
      id: "nav-dash",
      category: "Navigation",
      label: "Go to Dashboard",
      desc: "Overview, security posture & metrics",
      icon: LayoutDashboard,
      action: () => {
        onNavigate("dashboard");
        onClose();
      },
    },
    {
      id: "nav-scan",
      category: "Navigation",
      label: "Go to File Analysis",
      desc: "Zero-execution static extraction & signature validation",
      icon: FileSearch,
      action: () => {
        onNavigate("scanner");
        onClose();
      },
    },
    {
      id: "nav-recon",
      category: "Navigation",
      label: "Go to Passive Recon",
      desc: "DNS footprint, TLS certificates, defense headers",
      icon: Globe,
      action: () => {
        onNavigate("recon");
        onClose();
      },
    },
    {
      id: "nav-quantum",
      category: "Navigation",
      label: "Go to Quantum Trust Simulation",
      desc: "Bell-state channel tamper detection",
      icon: Atom,
      action: () => {
        onNavigate("quantum");
        onClose();
      },
    },
    {
      id: "nav-reports",
      category: "Navigation",
      label: "Go to Security Reports",
      desc: "Executive audit & provenance certificates",
      icon: FileText,
      action: () => {
        onNavigate("reports");
        onClose();
      },
    },
    {
      id: "nav-history",
      category: "Navigation",
      label: "Go to Audit History",
      desc: "Search and inspect past scan artifacts",
      icon: History,
      action: () => {
        onNavigate("history");
        onClose();
      },
    },
    {
      id: "nav-settings",
      category: "Navigation",
      label: "Go to Settings",
      desc: "Theme, account profile & system info",
      icon: Settings,
      action: () => {
        onNavigate("settings");
        onClose();
      },
    },

    // Appearance
    {
      id: "theme-light",
      category: "Appearance",
      label: "Switch to Light Theme",
      desc: "Clean high-contrast daytime interface",
      icon: Sun,
      action: () => {
        setTheme("light");
        onClose();
      },
    },
    {
      id: "theme-dark",
      category: "Appearance",
      label: "Switch to Dark Theme",
      desc: "Deep charcoal/navy non-fatiguing theme",
      icon: Moon,
      action: () => {
        setTheme("dark");
        onClose();
      },
    },
    {
      id: "theme-system",
      category: "Appearance",
      label: "Switch to System Preference",
      desc: "Match operating system light/dark mode automatically",
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl border border-border bg-surface-0 shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-scaleIn"
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-text-muted mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search view..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-text-muted border border-border">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">
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
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                    isSelected
                      ? "bg-primary-subtle border border-primary-border text-primary"
                      : "text-text-primary hover:bg-surface-1 border border-transparent"
                  }`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div
                      className={`p-2 rounded-lg shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary/20 text-primary"
                          : "bg-surface-2 text-text-secondary group-hover:text-text-primary"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold truncate">{item.label}</span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-surface-2 text-text-muted border border-border">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted truncate mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      isSelected
                        ? "text-primary translate-x-0.5"
                        : "text-text-muted opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-surface-1 border-t border-border flex items-center justify-between text-[11px] text-text-muted font-mono">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="font-bold text-primary">NeuroCraft ⌘K</span>
        </div>
      </div>
    </div>
  );
};
