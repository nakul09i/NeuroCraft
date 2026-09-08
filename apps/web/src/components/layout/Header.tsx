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
    <header className="h-14 border-b border-border/70 bg-surface-0/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 sticky top-0 transition-colors duration-200">
      <div className="flex items-center space-x-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 rounded-lg border border-border/60 md:hidden text-text-secondary hover:text-text-primary hover:bg-surface-1 focus-ring"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-text-muted font-medium hidden sm:inline text-[13px]">
            NeuroCraft
          </span>
          <span className="text-text-muted/60 hidden sm:inline text-xs">/</span>
          <h1 className="font-semibold text-text-primary tracking-tight text-sm">
            {activeTabTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Search Command Palette Trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-surface-1/60 hover:bg-surface-1 border border-border/60 text-xs text-text-muted hover:text-text-primary transition-all shadow-xs focus-ring"
          aria-label="Open Command Center (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-text-secondary" />
          <span className="hidden md:inline text-[12px] font-normal text-text-secondary">Search views, actions...</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-2/80 border border-border/60 text-text-muted">
            ⌘K
          </kbd>
        </button>

        {/* Engine Status Beacon */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Engines Ready</span>
        </div>

        {/* Visible Theme Switcher */}
        <ThemeSwitcher variant="dropdown" />

        {/* User Identity / Auth Trigger */}
        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-1 hover:bg-surface-2 border border-border/70 text-text-primary shadow-xs hover:-translate-y-0.5 active:scale-[0.98] transition-all focus-ring"
          >
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="max-w-[120px] truncate">
              {user?.display_name || user?.email?.split("@")[0] || "Sign In"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};

