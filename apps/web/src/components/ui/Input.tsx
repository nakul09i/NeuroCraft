import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, icon, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-text-secondary uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3.5 text-text-muted pointer-events-none shrink-0">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            className={`w-full py-2.5 rounded-xl bg-surface-inset border text-xs sm:text-sm font-medium text-text-primary placeholder:text-text-muted transition-all focus-ring shadow-xs ${
              icon ? "pl-10 pr-3.5" : "px-3.5"
            } ${
              error
                ? "border-danger text-danger focus:border-danger"
                : "border-border hover:border-border-strong focus:border-primary"
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-[11px] font-medium text-danger">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, children, className = "", id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-text-secondary uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-inset border text-xs sm:text-sm font-medium text-text-primary transition-all focus-ring shadow-xs ${
            error
              ? "border-danger text-danger focus:border-danger"
              : "border-border hover:border-border-strong focus:border-primary"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p className="text-[11px] font-medium text-danger">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = "Select";
