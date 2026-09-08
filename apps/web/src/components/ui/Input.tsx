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
            className="block text-xs font-mono font-extrabold text-text-primary uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-text-primary pointer-events-none shrink-0">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            className={`w-full py-2.5 rounded-lg bg-surface-1 border-2 text-xs font-bold font-mono text-text-primary placeholder:text-text-muted transition-all focus-ring shadow-[2px_2px_0px_var(--border)] ${
              icon ? "pl-9 pr-3" : "px-3"
            } ${
              error
                ? "border-danger text-danger"
                : "border-border hover:border-text-primary focus:border-primary"
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-[11px] font-mono font-bold text-danger">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] font-mono text-text-muted">{helperText}</p>
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
            className="block text-xs font-mono font-extrabold text-text-primary uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={`w-full px-3 py-2.5 rounded-lg bg-surface-1 border-2 text-xs font-bold font-mono text-text-primary transition-all focus-ring shadow-[2px_2px_0px_var(--border)] ${
            error
              ? "border-danger text-danger"
              : "border-border hover:border-text-primary focus:border-primary"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p className="text-[11px] font-mono font-bold text-danger">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] font-mono text-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = "Select";
