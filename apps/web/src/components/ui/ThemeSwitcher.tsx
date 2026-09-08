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

  const themeOptions: Array<{ mode: ThemeMode; label: string; icon: React.ReactNode }> = [
    { mode: "light", label: "Light", icon: <Sun className="w-3.5 h-3.5 text-amber-500" /> },
    { mode: "system", label: "System", icon: <Monitor className="w-3.5 h-3.5 text-cyan-500" /> },
    { mode: "dark", label: "Dark", icon: <Moon className="w-3.5 h-3.5 text-blue-400" /> },
  ];

  if (variant === "segmented") {
    return (
      <div className={`inline-flex items-center p-0.5 rounded-lg bg-surface-2 border border-border ${className}`}>
        {themeOptions.map((opt) => {
          const isActive = theme === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setTheme(opt.mode)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                isActive
                  ? "bg-surface-0 text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title={`Switch to ${opt.label} mode`}
            >
              {opt.icon}
              <span className="capitalize">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant (compact for top-bar header)
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-surface-1 hover:bg-surface-2 border border-border text-text-primary transition-all shadow-sm focus-ring"
        aria-label="Toggle Theme Menu"
        aria-expanded={open}
      >
        {resolvedTheme === "light" ? (
          <Sun className="w-4 h-4 text-amber-500 transition-transform" />
        ) : (
          <Moon className="w-4 h-4 text-cyan-400 transition-transform" />
        )}
        <span className="hidden sm:inline capitalize font-mono text-[11px] text-text-secondary">
          {theme}
        </span>
        <ChevronDown className="w-3 h-3 text-text-muted transition-transform" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-surface-0 border border-border shadow-lg py-1 z-50 animate-scaleIn">
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
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-left transition-colors ${
                  isActive
                    ? "bg-primary-subtle text-primary"
                    : "text-text-primary hover:bg-surface-1"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
