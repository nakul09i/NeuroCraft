import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Atom,
  CircleDot,
} from "lucide-react";

export type BadgeVariant =
  | "safe"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "info"
  | "quantum"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = "",
  variant = "neutral",
  size = "md",
  showIcon = true,
  ...props
}) => {
  let sizeStyles = "px-2.5 py-0.5 text-xs gap-1.5 rounded-full font-medium";
  let iconSize = "w-3 h-3";

  if (size === "sm") {
    sizeStyles = "px-2 py-0.5 text-[11px] gap-1 rounded-full font-medium";
    iconSize = "w-2.5 h-2.5";
  }

  let colorStyles = "bg-surface-2 text-text-secondary border border-border";
  let defaultIcon = <CircleDot className={`${iconSize} shrink-0 opacity-70`} />;

  if (variant === "safe") {
    colorStyles = "bg-theme-success-subtle text-theme-success-text border border-theme-success-border";
    defaultIcon = <CheckCircle2 className={`${iconSize} text-theme-success shrink-0`} />;
  } else if (variant === "low") {
    colorStyles = "bg-theme-info-subtle text-theme-info-text border border-theme-info-border";
    defaultIcon = <Info className={`${iconSize} text-primary shrink-0`} />;
  } else if (variant === "medium") {
    colorStyles = "bg-theme-warning-subtle text-theme-warning-text border border-theme-warning-border";
    defaultIcon = <AlertTriangle className={`${iconSize} text-warning shrink-0`} />;
  } else if (variant === "high" || variant === "critical") {
    colorStyles = "bg-theme-danger-subtle text-theme-danger-text border border-theme-danger-border";
    defaultIcon = <ShieldAlert className={`${iconSize} text-danger shrink-0`} />;
  } else if (variant === "info") {
    colorStyles = "bg-primary-subtle text-primary border border-primary-border";
    defaultIcon = <Info className={`${iconSize} text-primary shrink-0`} />;
  } else if (variant === "quantum") {
    colorStyles = "bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20";
    defaultIcon = <Atom className={`${iconSize} text-accent-purple shrink-0`} />;
  }

  return (
    <span
      className={`inline-flex items-center tracking-tight select-none ${sizeStyles} ${colorStyles} ${className}`}
      {...props}
    >
      {showIcon && defaultIcon}
      <span>{children}</span>
    </span>
  );
};
