import React from "react";
import { Search, Menu, HelpCircle, User } from "lucide-react";
import { ThemeSwitcher } from "../ui/ThemeSwitcher";
import { NotificationCenter } from "../ui/NotificationCenter";
import { EngineStatusPopover } from "../ui/EngineStatusPopover";
import { SyncStatusBeacon } from "../ui/SyncStatusBeacon";
import { UserProfile } from "../../types";

export interface HeaderProps {
  activeTabTitle: string;
  onOpenCommand: () => void;
  onOpenMobileMenu?: () => void;
  onNavigate: (tabId: string) => void;
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenHelp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  onOpenCommand,
  onOpenMobileMenu,
  onNavigate,
  user,
  onOpenAuth,
  onOpenHelp,
}) => {
  return (
    <header className="h-16 border-b border-border bg-surface-0/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between z-20 sticky top-0 transition-colors duration-200">
      <div className="flex items-center space-x-3.5">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl bg-surface-0 border border-border hover:bg-surface-1 md:hidden text-text-secondary hover:text-text-primary focus-ring shadow-xs"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center space-x-2.5">
          <span className="text-text-muted font-bold hidden sm:inline text-sm">
            NeuroCraft
          </span>
          <span className="text-text-muted/40 hidden sm:inline text-sm">/</span>
          <h1 className="font-bold text-text-primary tracking-tight text-base sm:text-lg">
            {activeTabTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Search Command Palette Trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center space-x-3 px-3.5 py-2 rounded-xl bg-surface-inset border border-border text-xs text-text-muted hover:text-text-primary hover:border-border-strong transition-all focus-ring shadow-xs"
          aria-label="Open Command Center (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-text-muted" />
          <span className="hidden md:inline text-xs font-medium text-text-secondary">
            Quick Search…
          </span>
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono rounded-md bg-surface-0 border border-border text-text-muted font-bold">
            ⌘K
          </kbd>
        </button>

        {/* Offline-First Sync Queue Beacon */}
        <SyncStatusBeacon />

        {/* Engine Status Beacon & Popover */}
        <EngineStatusPopover />

        {/* Notification Center Popover */}
        <NotificationCenter onNavigate={onNavigate} />

        {/* Visible Theme Switcher */}
        <ThemeSwitcher variant="dropdown" />

        {/* Help Button */}
        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            className="p-2.5 rounded-xl bg-surface-0 border border-border hover:bg-surface-1 text-text-secondary hover:text-text-primary transition-colors focus-ring shadow-xs"
            title="Help & Shortcuts"
            aria-label="Open Help and Shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        {/* User Identity / Auth Trigger */}
        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-xl bg-surface-0 border border-border hover:bg-surface-1 text-text-primary hover:-translate-y-0.5 active:translate-y-0 transition-all focus-ring shadow-xs"
          >
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline max-w-[120px] truncate">
              {user?.display_name || user?.email?.split("@")[0] || "Sign In"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
