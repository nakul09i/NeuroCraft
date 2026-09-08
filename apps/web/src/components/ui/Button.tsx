import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "quantum" | "inset";
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
      "inline-flex items-center justify-center font-medium select-none transition-all duration-150 focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";

    let sizeStyles = "px-4 py-2.5 text-[15px] gap-2 rounded-xl";
    if (size === "sm") sizeStyles = "px-3 py-1.5 text-[13px] gap-1.5 rounded-lg";
    if (size === "lg") sizeStyles = "px-6 py-3 text-[16px] gap-2.5 rounded-2xl font-semibold";

    let variantStyles =
      "bg-primary text-text-inverse hover:bg-primary-hover shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm";

    if (variant === "secondary") {
      variantStyles =
        "neu-button text-text-primary";
    } else if (variant === "inset") {
      variantStyles =
        "neu-inset text-primary font-semibold";
    } else if (variant === "outline") {
      variantStyles =
        "bg-surface-0/60 text-text-primary border border-border hover:bg-surface-1 hover:border-border-strong shadow-xs";
    } else if (variant === "ghost") {
      variantStyles =
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-1/60";
    } else if (variant === "destructive") {
      variantStyles =
        "bg-danger text-white hover:opacity-95 shadow-sm hover:-translate-y-0.5 active:translate-y-0";
    } else if (variant === "quantum") {
      variantStyles =
        "bg-accent-purple text-white hover:opacity-95 shadow-md shadow-purple-500/20 hover:-translate-y-0.5 active:translate-y-0";
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
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
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
