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
  let sizeStyles = "px-2.5 py-0.5 text-[11px] gap-1.5 rounded-md font-bold";
  let iconSize = "w-3 h-3";

  if (size === "sm") {
    sizeStyles = "px-2 py-0.5 text-[10px] gap-1 rounded font-bold";
    iconSize = "w-2.5 h-2.5";
  }

  let colorStyles = "bg-surface-2 text-text-primary border-border";
  let defaultIcon = <CircleDot className={`${iconSize} shrink-0`} />;

  if (variant === "safe") {
    colorStyles = "bg-theme-success-subtle text-theme-success-text border-theme-success border-2";
    defaultIcon = <CheckCircle2 className={`${iconSize} text-theme-success shrink-0`} />;
  } else if (variant === "low") {
    colorStyles = "bg-theme-info-subtle text-theme-info-text border-primary border-2";
    defaultIcon = <Info className={`${iconSize} text-primary shrink-0`} />;
  } else if (variant === "medium") {
    colorStyles = "bg-theme-warning-subtle text-theme-warning-text border-warning border-2";
    defaultIcon = <AlertTriangle className={`${iconSize} text-warning shrink-0`} />;
  } else if (variant === "high" || variant === "critical") {
    colorStyles = "bg-theme-danger-subtle text-theme-danger-text border-danger border-2";
    defaultIcon = <ShieldAlert className={`${iconSize} text-danger shrink-0`} />;
  } else if (variant === "info") {
    colorStyles = "bg-theme-primary-subtle text-theme-primary-text border-primary border-2";
    defaultIcon = <Info className={`${iconSize} text-primary shrink-0`} />;
  } else if (variant === "quantum") {
    colorStyles = "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-accent-purple border-2";
    defaultIcon = <Atom className={`${iconSize} text-accent-purple shrink-0`} />;
  } else {
    colorStyles = "bg-surface-2 text-text-primary border-border border-2";
  }

  return (
    <span
      className={`inline-flex items-center font-mono uppercase tracking-wider select-none shadow-[1px_1px_0px_var(--border)] ${sizeStyles} ${colorStyles} ${className}`}
      {...props}
    >
      {showIcon && defaultIcon}
      <span>{children}</span>
    </span>
  );
};
