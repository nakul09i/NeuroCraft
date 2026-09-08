import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: 0 | 1 | 2 | "elevated";
  surface?: "raised" | "inset" | "flat";
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", level = 1, surface = "raised", interactive = false, ...props }, ref) => {
    let surfaceClass = "neu-raised";
    if (surface === "inset" || level === 2) {
      surfaceClass = "neu-inset";
    } else if (surface === "flat") {
      surfaceClass = "bg-surface-0 border border-border";
    } else if (level === "elevated") {
      surfaceClass = "neu-raised-lg";
    } else if (level === 1) {
      surfaceClass = "neu-raised";
    } else {
      surfaceClass = "neu-raised-sm";
    }

    const interactiveClass = interactive
      ? "neu-interactive cursor-pointer"
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
  <div className={`p-6 border-b border-border/60 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <h3 className={`text-lg font-semibold text-text-primary tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <p className={`text-sm text-text-secondary mt-1 leading-relaxed ${className}`} {...props}>
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
  <div className={`p-5 border-t border-border/60 bg-surface-1/40 rounded-b-2xl ${className}`} {...props}>
    {children}
  </div>
);
