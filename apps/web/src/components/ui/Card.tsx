import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: 0 | 1 | 2 | "elevated";
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", level = 1, interactive = false, ...props }, ref) => {
    let bgClass = "bg-surface-1";
    if (level === 0) bgClass = "bg-surface-0";
    if (level === 2) bgClass = "bg-surface-2";
    if (level === "elevated") bgClass = "bg-surface-elevated shadow-md";

    const interactiveClass = interactive
      ? "hover:border-border-strong hover:shadow-md cursor-pointer transition-all duration-200 active:scale-[0.99]"
      : "";

    return (
      <div
        ref={ref}
        className={`rounded-2xl border border-border ${bgClass} ${interactiveClass} ${className}`}
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
  <div className={`p-5 border-b border-border/60 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <h3 className={`text-sm font-bold text-text-primary tracking-wide ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <p className={`text-xs text-text-secondary mt-0.5 leading-normal ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`p-4 border-t border-border/60 bg-surface-0/40 rounded-b-2xl ${className}`} {...props}>
    {children}
  </div>
);
