import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "quantum";
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
    const baseStyles =
      "inline-flex items-center justify-center font-medium select-none transition-all duration-150 focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none btn-interactive";

    let sizeStyles = "px-3.5 py-1.5 text-xs gap-2 rounded-lg";
    if (size === "sm") sizeStyles = "px-2.5 py-1 text-[11px] gap-1.5 rounded-md";
    if (size === "lg") sizeStyles = "px-5 py-2.5 text-sm gap-2 rounded-xl font-semibold";

    let variantStyles =
      "bg-primary text-text-inverse hover:bg-primary-hover shadow-xs hover:shadow-sm";

    if (variant === "secondary") {
      variantStyles =
        "bg-surface-1 text-text-primary border border-border hover:bg-surface-2 hover:border-border-strong shadow-xs";
    } else if (variant === "outline") {
      variantStyles =
        "bg-transparent text-text-primary border border-border hover:bg-surface-1 hover:border-border-strong";
    } else if (variant === "ghost") {
      variantStyles =
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-1";
    } else if (variant === "destructive") {
      variantStyles =
        "bg-danger text-white hover:opacity-95 shadow-xs";
    } else if (variant === "quantum") {
      variantStyles =
        "bg-accent-purple text-white hover:opacity-95 shadow-xs hover:shadow-sm";
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
