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
    <header className="h-16 border-b border-border/60 bg-bg/85 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between z-20 sticky top-0 transition-colors duration-200">
      <div className="flex items-center space-x-3.5">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl neu-button md:hidden text-text-secondary hover:text-text-primary focus-ring"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center space-x-2.5">
          <span className="text-text-muted font-medium hidden sm:inline text-[14px]">
            NeuroCraft
          </span>
          <span className="text-text-muted/50 hidden sm:inline text-sm">/</span>
          <h1 className="font-semibold text-text-primary tracking-tight text-[16px]">
            {activeTabTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Quick Search Command Palette Trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center space-x-3 px-3.5 py-2 rounded-xl neu-inset text-xs text-text-muted hover:text-text-primary transition-all focus-ring"
          aria-label="Open Command Center (Ctrl+K)"
        >
          <Search className="w-4 h-4 text-text-secondary" />
          <span className="hidden md:inline text-[13px] font-normal text-text-secondary">Search views, actions…</span>
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono rounded-md neu-raised-sm text-text-muted">
            ⌘K
          </kbd>
        </button>

        {/* Engine Status Beacon */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full neu-raised-sm text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Engines Ready</span>
        </div>

        {/* Visible Theme Switcher */}
        <ThemeSwitcher variant="dropdown" />

        {/* User Identity / Auth Trigger */}
        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-xl neu-button text-text-primary hover:-translate-y-0.5 active:translate-y-0 transition-all focus-ring"
          >
            <Shield className="w-4 h-4 text-primary" />
            <span className="max-w-[130px] truncate text-[13px]">
              {user?.display_name || user?.email?.split("@")[0] || "Sign In"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
