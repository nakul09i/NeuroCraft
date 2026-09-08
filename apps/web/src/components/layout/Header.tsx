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
    <header className="h-16 border-b border-border bg-surface-0/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 sticky top-0">
      <div className="flex items-center space-x-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 rounded-lg md:hidden text-text-secondary hover:bg-surface-2 focus-ring"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center space-x-2 text-xs sm:text-sm">
          <span className="font-bold text-text-muted hidden sm:inline">NeuroCraft</span>
          <span className="text-text-muted hidden sm:inline">/</span>
          <h1 className="font-extrabold text-text-primary tracking-tight">
            {activeTabTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Quick Search Command Palette Trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-surface-1 border border-border text-xs text-text-muted hover:text-text-primary hover:border-border-strong transition-all shadow-sm focus-ring"
          aria-label="Open Command Center (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-text-muted" />
          <span className="hidden md:inline text-[12px]">Search NeuroCraft...</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-2 border border-border text-text-secondary font-bold">
            ⌘K
          </kbd>
        </button>

        {/* Engine Status Beacon */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-surface-1 border border-border text-[11px] font-mono text-theme-success-text">
          <span className="w-2 h-2 rounded-full bg-theme-success animate-pulse" />
          <span className="font-semibold tracking-wider text-[10px]">ENGINES OPERATIONAL</span>
        </div>

        {/* Visible Theme Switcher */}
        <ThemeSwitcher variant="dropdown" />

        {/* User Identity / Auth Trigger */}
        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-subtle border border-primary-border text-primary hover:bg-primary/20 transition-all focus-ring"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="max-w-[100px] truncate">
              {user?.display_name || user?.email?.split("@")[0] || "Sign In"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};

