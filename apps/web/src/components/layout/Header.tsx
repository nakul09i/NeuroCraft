import React from "react";
import { Search, Sun, Moon, Laptop, ShieldCheck, Menu } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export interface HeaderProps {
  activeTabTitle: string;
  onOpenCommand: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  onOpenCommand,
  onOpenMobileMenu,
}) => {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <header className="h-16 border-b border-border bg-surface-0/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20">
      <div className="flex items-center space-x-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 rounded-lg md:hidden text-text-secondary hover:bg-surface-2"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-sm sm:text-base font-extrabold text-text-primary tracking-tight">
            {activeTabTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommand}
          className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-1 border border-border text-xs text-text-muted hover:text-text-primary hover:border-border-strong transition focus-ring"
          aria-label="Open Command Center (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Quick Search...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-secondary font-bold">
            Ctrl K
          </kbd>
        </button>

        {/* Engine Status Beacon */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-surface-1 border border-border text-[11px] font-mono text-theme-success-text">
          <span className="w-1.5 h-1.5 rounded-full bg-theme-success animate-pulse" />
          <span className="font-semibold">STATIC ENGINES ACTIVE</span>
        </div>

        {/* Theme Switcher Toggle */}
        <button
          onClick={cycleTheme}
          title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
          className="p-2 rounded-xl bg-surface-1 border border-border text-text-secondary hover:text-text-primary hover:bg-surface-2 transition focus-ring"
          aria-label={`Toggle theme, current is ${theme}`}
        >
          {theme === "light" ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : theme === "dark" ? (
            <Moon className="w-4 h-4 text-blue-400" />
          ) : (
            <Laptop className="w-4 h-4 text-primary" />
          )}
        </button>
      </div>
    </header>
  );
};
