import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import { useTheme, ThemeMode } from "../../context/ThemeContext";

export interface ThemeSwitcherProps {
  className?: string;
  variant?: "dropdown" | "segmented";
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = "",
  variant = "dropdown",
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themeOptions: Array<{ mode: ThemeMode; label: string; symbol: string }> = [
    { mode: "light", label: "Light", symbol: "☀" },
    { mode: "dark", label: "Dark", symbol: "☾" },
    { mode: "system", label: "System", symbol: "◐" },
  ];

  if (variant === "segmented") {
    return (
      <div className={`inline-flex items-center p-1 rounded-lg bg-surface-1 border-2 border-border shadow-brutal-sm ${className}`}>
        {themeOptions.map((opt) => {
          const isActive = theme === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setTheme(opt.mode)}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-bold rounded transition-all ${
                isActive
                  ? "bg-primary text-black border-2 border-border shadow-[1px_1px_0px_var(--border)] font-extrabold"
                  : "text-text-primary hover:bg-surface-2 border-2 border-transparent"
              }`}
              title={`Switch to ${opt.label} mode`}
            >
              <span className="font-mono text-sm">{opt.symbol}</span>
              <span className="font-display uppercase text-[11px]">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant (compact for top-bar header)
  const currentSymbol = theme === "light" ? "☀" : theme === "dark" ? "☾" : "◐";

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-surface-1 hover:bg-surface-2 text-text-primary transition-all focus-ring"
        aria-label="Toggle Theme Menu"
        aria-expanded={open}
      >
        <span className="font-mono text-sm">{currentSymbol}</span>
        <span className="hidden sm:inline uppercase font-mono font-bold text-[10px] text-text-primary">
          {theme}
        </span>
        <ChevronDown className={`w-3 h-3 text-text-primary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 rounded-lg bg-surface-0 border-2 border-border shadow-brutal py-1 z-50 animate-scaleIn">
          {themeOptions.map((opt) => {
            const isActive = theme === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  setTheme(opt.mode);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-left transition-colors ${
                  isActive
                    ? "bg-primary text-black font-extrabold"
                    : "text-text-primary hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm">{opt.symbol}</span>
                  <span className="font-display uppercase tracking-wide">{opt.label}</span>
                </div>
                {isActive && <span className="font-mono text-[10px] font-extrabold">●</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
