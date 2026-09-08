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
      "inline-flex items-center justify-center font-bold tracking-tight rounded-lg select-none transition-all duration-150 focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";

    let sizeStyles = "px-4 py-2 text-xs gap-2";
    if (size === "sm") sizeStyles = "px-3 py-1.5 text-[11px] gap-1.5";
    if (size === "lg") sizeStyles = "px-6 py-3 text-sm gap-2.5";

    let variantStyles =
      "bg-primary text-black border-2 border-border shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active";

    if (variant === "secondary") {
      variantStyles =
        "bg-surface-2 text-text-primary border-2 border-border shadow-brutal-sm hover:bg-surface-3 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active";
    } else if (variant === "outline") {
      variantStyles =
        "bg-surface-0 text-text-primary border-2 border-border shadow-brutal-sm hover:bg-surface-1 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active";
    } else if (variant === "ghost") {
      variantStyles =
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-2 border-2 border-transparent";
    } else if (variant === "destructive") {
      variantStyles =
        "bg-danger text-white border-2 border-border shadow-brutal-sm hover:opacity-95 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active";
    } else if (variant === "quantum") {
      variantStyles =
        "bg-accent-purple text-white border-2 border-border shadow-brutal-sm hover:opacity-95 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-violet active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active";
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
