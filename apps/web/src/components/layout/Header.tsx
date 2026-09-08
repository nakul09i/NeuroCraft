import React from "react";
import { Search, Shield, Menu, HelpCircle, User } from "lucide-react";
import { ThemeSwitcher } from "../ui/ThemeSwitcher";
import { NotificationCenter } from "../ui/NotificationCenter";
import { EngineStatusPopover } from "../ui/EngineStatusPopover";
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
    <header className="h-16 border-b border-border/60 bg-bg/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between z-20 sticky top-0 transition-colors duration-200">
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
          <span className="text-text-muted font-bold hidden sm:inline text-sm">
            NeuroCraft
          </span>
          <span className="text-text-muted/50 hidden sm:inline text-sm">/</span>
          <h1 className="font-bold text-text-primary tracking-tight text-base sm:text-lg">
            {activeTabTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Search Command Palette Trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center space-x-3 px-3.5 py-2 rounded-xl neu-inset text-xs text-text-muted hover:text-text-primary transition-all focus-ring"
          aria-label="Open Command Center (Ctrl+K)"
        >
          <Search className="w-4 h-4 text-text-secondary" />
          <span className="hidden md:inline text-xs font-medium text-text-secondary">
            Quick Search…
          </span>
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono rounded-md neu-raised-sm text-text-muted font-bold">
            ⌘K
          </kbd>
        </button>

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
            className="p-2.5 rounded-xl neu-button text-text-secondary hover:text-text-primary transition-colors focus-ring"
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
            className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-xl neu-button text-text-primary hover:-translate-y-0.5 active:translate-y-0 transition-all focus-ring"
          >
            <User className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline max-w-[120px] truncate">
              {user?.display_name || user?.email?.split("@")[0] || "Sign In"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
