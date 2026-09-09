import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  variant?: "card" | "plain";
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  subtitle,
  badge,
  icon,
  defaultOpen = false,
  isOpen,
  onToggle,
  children,
  className = "",
  variant = "card",
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isOpen !== undefined ? isOpen : internalOpen;

  const handleToggle = () => {
    const next = !open;
    if (isOpen === undefined) {
      setInternalOpen(next);
    }
    onToggle?.(next);
  };

  const containerClasses =
    variant === "card"
      ? `rounded-xl border border-border bg-surface-0 overflow-hidden transition-all duration-200 ${
          open ? "shadow-xs border-border-strong" : "hover:border-border-strong"
        }`
      : "border-b border-border py-1";

  return (
    <div className={`${containerClasses} ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer group"
      >
        <div className="flex items-center space-x-3 min-w-0 pr-2">
          {icon && (
            <div className="text-text-muted group-hover:text-text-primary shrink-0 transition-colors">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-text-primary tracking-tight">
                {title}
              </span>
              {badge && <span className="shrink-0">{badge}</span>}
            </div>
            {subtitle && (
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] font-medium text-text-muted hidden sm:inline group-hover:text-text-secondary transition-colors">
            {open ? "Hide details" : "Show details"}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-text-muted transition-transform duration-200 group-hover:text-text-primary ${
              open ? "rotate-180 text-primary" : ""
            }`}
          />
        </div>
      </button>

      {open && (
        <div className={`p-4 pt-1 sm:p-5 sm:pt-2 border-t border-border animate-fadeIn ${variant === "card" ? "bg-surface-inset/40" : ""}`}>
          {children}
        </div>
      )}
    </div>
  );
};
