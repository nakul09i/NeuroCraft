import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, ChevronDown, Check } from "lucide-react";
import { useTheme, ThemeMode } from "../../context/ThemeContext";

export interface ThemeSwitcherProps {
  className?: string;
  variant?: "dropdown" | "segmented";
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = "",
  variant = "dropdown",
}) => {
  const { theme, setTheme } = useTheme();
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

  const themeOptions: Array<{ mode: ThemeMode; label: string; icon: typeof Sun }> = [
    { mode: "light", label: "Light", icon: Sun },
    { mode: "dark", label: "Dark", icon: Moon },
    { mode: "system", label: "System", icon: Monitor },
  ];

  if (variant === "segmented") {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl neu-inset ${className}`}>
        {themeOptions.map((opt) => {
          const isActive = theme === opt.mode;
          const Icon = opt.icon;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setTheme(opt.mode)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isActive
                  ? "neu-raised-sm bg-surface-0 text-primary font-semibold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title={`Switch to ${opt.label} mode`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant (compact for header)
  const CurrentIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-xl neu-button text-text-secondary hover:text-text-primary transition-all focus-ring"
        aria-label="Toggle Theme Menu"
        aria-expanded={open}
      >
        <CurrentIcon className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline capitalize text-[13px]">
          {theme}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-surface-0 neu-raised-lg p-1.5 z-50 animate-scaleIn">
          {themeOptions.map((opt) => {
            const isActive = theme === opt.mode;
            const Icon = opt.icon;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  setTheme(opt.mode);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-left transition-colors ${
                  isActive
                    ? "neu-inset text-primary font-semibold"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-[13px]">{opt.label}</span>
                </div>
                {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
