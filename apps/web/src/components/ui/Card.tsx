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
    if (level === "elevated") bgClass = "bg-surface-elevated";

    const interactiveClass = interactive
      ? "hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active cursor-pointer transition-all duration-150"
      : "transition-all duration-150";

    return (
      <div
        ref={ref}
        className={`rounded-xl border-2 border-border shadow-brutal ${bgClass} ${interactiveClass} ${className}`}
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
  <div className={`p-5 border-b-2 border-border ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <h3 className={`text-sm font-extrabold text-text-primary tracking-tight font-display ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <p className={`text-xs text-text-secondary mt-1 leading-normal ${className}`} {...props}>
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
  <div className={`p-4 border-t-2 border-border bg-surface-0/60 rounded-b-[10px] ${className}`} {...props}>
    {children}
  </div>
);
