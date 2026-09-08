import React from "react";
import { Search, Shield, Menu } from "lucide-react";
import { ThemeSwitcher } from "../ui/ThemeSwitcher";
import { UserProfile } from "../../types";

export interface HeaderProps {
  activeTabTitle: string;
  onOpenCommand: () => void;
  onOpenMobileMenu?: () => void;
  user?: UserProfile | null;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  onOpenCommand,
  onOpenMobileMenu,
  user,
  onOpenAuth,
}) => {
  return (
    <header className="h-16 border-b-2 border-border bg-surface-0 px-4 sm:px-6 flex items-center justify-between z-20 sticky top-0">
      <div className="flex items-center space-x-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 rounded-md border-2 border-border md:hidden text-text-secondary hover:bg-surface-2 focus-ring"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 stroke-[2.2]" />
          </button>
        )}

        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center space-x-2 text-xs sm:text-sm">
          <span className="font-extrabold font-mono text-text-muted hidden sm:inline uppercase text-[11px]">
            NeuroCraft
          </span>
          <span className="text-text-muted hidden sm:inline font-mono">/</span>
          <h1 className="font-extrabold text-text-primary tracking-tight font-display text-sm sm:text-base">
            {activeTabTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Search Command Palette Trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-surface-1 border-2 border-border text-xs text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 focus-ring"
          aria-label="Open Command Center (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-text-primary stroke-[2.2]" />
          <span className="hidden md:inline text-[11px] font-semibold text-text-primary">Search NeuroCraft...</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded bg-surface-3 border border-border text-text-primary font-extrabold">
            ⌘K
          </kbd>
        </button>

        {/* Engine Status Beacon */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-surface-1 border-2 border-border text-[10px] font-mono text-text-primary shadow-[1px_1px_0px_var(--border)]">
          <span className="w-2 h-2 rounded-full bg-theme-success animate-pulse border border-black" />
          <span className="font-bold tracking-wider">ENGINES: READY</span>
        </div>

        {/* Visible Theme Switcher */}
        <div className="border-2 border-border rounded-lg shadow-brutal-sm bg-surface-1">
          <ThemeSwitcher variant="dropdown" />
        </div>

        {/* User Identity / Auth Trigger */}
        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-black border-2 border-border shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all focus-ring"
          >
            <Shield className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="max-w-[100px] truncate font-display">
              {user?.display_name || user?.email?.split("@")[0] || "Sign In"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
