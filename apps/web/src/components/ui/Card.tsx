import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: 0 | 1 | 2 | "elevated";
  surface?: "raised" | "inset" | "flat";
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", level = 1, surface = "raised", interactive = false, ...props }, ref) => {
    let surfaceClass = "bg-surface-0 border border-border shadow-sm";
    if (surface === "inset" || level === 2) {
      surfaceClass = "bg-surface-inset border border-border-subtle";
    } else if (surface === "flat") {
      surfaceClass = "bg-surface-0 border border-border";
    } else if (level === "elevated") {
      surfaceClass = "bg-surface-elevated border border-border shadow-md";
    } else if (level === 1) {
      surfaceClass = "bg-surface-0 border border-border shadow-sm";
    } else {
      surfaceClass = "bg-surface-0 border border-border shadow-xs";
    }

    const interactiveClass = interactive
      ? "hover:-translate-y-1 hover:border-border-strong hover:shadow-md active:translate-y-0 active:shadow-xs transition-all duration-200 cursor-pointer"
      : "";

    return (
      <div
        ref={ref}
        className={`rounded-2xl ${surfaceClass} ${interactiveClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`p-6 border-b border-border/70 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <h3 className={`text-base sm:text-lg font-semibold text-text-primary tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <p className={`text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`p-5 border-t border-border/70 bg-surface-1/50 rounded-b-2xl ${className}`} {...props}>
    {children}
  </div>
);
