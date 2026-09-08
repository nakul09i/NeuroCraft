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
      label: "Dashboard",
      desc: "Security posture overview and telemetry",
      icon: LayoutDashboard,
      action: () => {
        onNavigate("dashboard");
        onClose();
      },
    },
    {
      id: "nav-scan",
      category: "Navigation",
      label: "Static File Analysis",
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
      label: "Passive Reconnaissance",
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
      label: "Quantum Trust Simulation",
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
      label: "Security Reports",
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
      label: "Audit History",
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
      label: "Settings",
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
      label: "Light Theme",
      desc: "Soft cool slate background (#EEF3F7) with tactile depth",
      icon: Sun,
      action: () => {
        setTheme("light");
        onClose();
      },
    },
    {
      id: "theme-dark",
      category: "Appearance",
      label: "Dark Theme",
      desc: "Deep navy charcoal interface with soft cyan accents",
      icon: Moon,
      action: () => {
        setTheme("dark");
        onClose();
      },
    },
    {
      id: "theme-system",
      category: "Appearance",
      label: "System Theme",
      desc: "Synchronize with operating system appearance",
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/45 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-2xl neu-raised-lg bg-surface-0 border border-border/60 overflow-hidden flex flex-col max-h-[72vh] animate-scaleIn"
      >
        {/* Inset Search Bar */}
        <div className="p-3 border-b border-border/60 bg-surface-0">
          <div className="flex items-center px-4 py-2.5 rounded-xl neu-inset">
            <Search className="w-4 h-4 text-text-muted mr-3 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Type a command or search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[15px] font-normal text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            <kbd className="text-[11px] font-mono px-2 py-0.5 rounded-md neu-raised-sm text-text-muted">
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
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all group ${
                    isSelected
                      ? "neu-inset text-primary font-medium"
                      : "text-text-secondary hover:bg-surface-1/60 hover:text-text-primary"
                  }`}
                >
                  <div className="flex items-center space-x-3.5 overflow-hidden">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary/20 text-primary"
                          : "neu-raised-sm bg-surface-0 text-text-muted group-hover:text-text-secondary"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <span className="text-[14px] font-medium text-text-primary truncate">{item.label}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-text-muted font-normal">
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

        {/* Footer info */}
        <div className="px-5 py-3 bg-surface-1/50 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="text-text-muted/80 text-[11px] font-mono">NeuroCraft Spotlight</span>
        </div>
      </div>
    </div>
  );
};
