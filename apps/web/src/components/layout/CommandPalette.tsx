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
      label: "Check a File",
      desc: "Upload a file and look for anything unusual safely",
      icon: FileSearch,
      action: () => {
        onNavigate("scanner");
        onClose();
      },
    },
    {
      id: "act-exposure",
      category: "Quick Actions",
      label: "Check a Website",
      desc: "See what security information a website shares publicly",
      icon: Globe2,
      action: () => {
        onNavigate("recon");
        onClose();
      },
    },
    {
      id: "act-quantum",
      category: "Quick Actions",
      label: "Run Trust Test",
      desc: "Test how secure communication channels detect tampering",
      icon: Atom,
      action: () => {
        onNavigate("quantum");
        onClose();
      },
    },
    {
      id: "act-report",
      category: "Quick Actions",
      label: "Create Security Report",
      desc: "Generate clean summary or detailed report",
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
      desc: "Overview of your safety score, recent checks & quick actions",
      icon: LayoutDashboard,
      action: () => {
        onNavigate("dashboard");
        onClose();
      },
    },
    {
      id: "nav-scan",
      category: "Navigation",
      label: "Files",
      desc: "Check PDF, EXE, ZIP, scripts, and document safety",
      icon: FileSearch,
      action: () => {
        onNavigate("scanner");
        onClose();
      },
    },
    {
      id: "nav-recon",
      category: "Navigation",
      label: "Websites",
      desc: "Check website status, HTTPS certificate, and public info",
      icon: Globe2,
      action: () => {
        onNavigate("recon");
        onClose();
      },
    },
    {
      id: "nav-quantum",
      category: "Navigation",
      label: "Trust Test",
      desc: "Simulate secure communication and test tamper detection",
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
      desc: "View and download easy-to-read reports",
      icon: FileText,
      action: () => {
        onNavigate("reports");
        onClose();
      },
    },
    {
      id: "nav-history",
      category: "Navigation",
      label: "Past Checks",
      desc: "Search and review all your previous file and website checks",
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
      desc: "Appearance, theme, alerts, and account preferences",
      icon: Settings,
      action: () => {
        onNavigate("settings");
        onClose();
      },
    },

    // Appearance & System
    {
      id: "theme-light",
      category: "Theme",
      label: "Switch to Light Mode",
      desc: "Clean, bright, and friendly appearance",
      icon: Sun,
      action: () => {
        setTheme("light");
        onClose();
      },
    },
    {
      id: "theme-dark",
      category: "Theme",
      label: "Switch to Dark Mode",
      desc: "Comfortable deep appearance for low-light environments",
      icon: Moon,
      action: () => {
        setTheme("dark");
        onClose();
      },
    },
    {
      id: "theme-system",
      category: "Theme",
      label: "Use System Theme",
      desc: "Match your computer's light or dark mode setting automatically",
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
        className="relative w-full max-w-xl rounded-2xl bg-surface-elevated border border-border shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-scaleIn"
      >
        {/* Inset Search Input */}
        <div className="p-4 border-b border-border bg-surface-0">
          <div className="flex items-center px-4 py-3 rounded-xl bg-surface-1 border border-border">
            <Search className="w-4 h-4 text-text-muted mr-3 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search features, actions, or pages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            <kbd className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-surface-0 border border-border text-text-muted shadow-xs">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2.5 space-y-1">
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
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-150 group ${
                    isSelected
                      ? "bg-primary-subtle text-primary font-semibold border border-primary-border"
                      : "text-text-secondary hover:bg-surface-1 hover:text-text-primary font-medium"
                  }`}
                >
                  <div className="flex items-center space-x-3.5 overflow-hidden">
                    <div
                      className={`p-2 rounded-lg shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-surface-0 border border-border text-text-muted group-hover:text-text-primary shadow-xs"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-text-primary truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-surface-2 text-text-muted">
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
        <div className="px-5 py-3 bg-surface-1 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>Esc Close</span>
          </div>
          <span>NeuroCraft</span>
        </div>
      </div>
    </div>
  );
};
