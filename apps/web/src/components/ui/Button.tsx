import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      icon,
      disabled,
      ...props
    },
    ref
  ) => {
    let baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all focus-ring disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

    let sizeStyles = "px-4 py-2 text-xs gap-2";
    if (size === "sm") sizeStyles = "px-3 py-1.5 text-[11px] gap-1.5 rounded-lg";
    if (size === "lg") sizeStyles = "px-5 py-2.5 text-sm gap-2.5 rounded-xl";

    let variantStyles = "bg-primary text-text-inverse hover:bg-primary-hover shadow-sm";
    if (variant === "secondary") {
      variantStyles =
        "bg-surface-2 text-text-primary hover:bg-surface-3 border border-border";
    } else if (variant === "outline") {
      variantStyles =
        "bg-transparent text-text-primary hover:bg-surface-1 border border-border";
    } else if (variant === "ghost") {
      variantStyles =
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-1";
    } else if (variant === "destructive") {
      variantStyles =
        "bg-theme-danger text-white hover:opacity-90 shadow-sm";
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
