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
      "inline-flex items-center justify-center select-none transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";

    let sizeStyles = "h-10 px-4 text-[14px] font-semibold gap-2 rounded-xl";
    if (size === "sm") sizeStyles = "h-8 px-3 text-[12px] font-semibold gap-1.5 rounded-lg";
    if (size === "lg") sizeStyles = "h-12 sm:h-[52px] px-6 text-[15px] sm:text-[16px] font-bold gap-2.5 rounded-xl shadow-md";

    let variantStyles =
      "bg-primary text-white hover:bg-primary-hover shadow-xs hover:shadow-sm active:scale-[0.99] cursor-pointer";

    if (variant === "secondary") {
      variantStyles =
        "bg-surface-0 text-text-primary border border-border hover:bg-surface-1 hover:border-border-strong shadow-xs active:scale-[0.99] cursor-pointer";
    } else if (variant === "inset") {
      variantStyles =
        "bg-surface-inset text-primary font-bold border border-border-subtle hover:bg-surface-1";
    } else if (variant === "outline") {
      variantStyles =
        "bg-transparent text-text-primary border border-border hover:bg-surface-1 hover:border-border-strong shadow-xs";
    } else if (variant === "ghost") {
      variantStyles =
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-1 font-medium";
    } else if (variant === "destructive") {
      variantStyles =
        "bg-danger text-white hover:bg-danger/90 shadow-sm hover:-translate-y-0.5 active:translate-y-0";
    } else if (variant === "quantum") {
      variantStyles =
        "bg-accent-purple text-white hover:bg-accent-purple/90 shadow-sm hover:-translate-y-0.5 active:translate-y-0";
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
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && <span className="shrink-0 flex items-center">{icon}</span>}
            <span>{children}</span>
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
