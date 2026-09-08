import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width,
  height,
  style,
  ...props
}) => {
  let shapeClass = "rounded-lg";
  if (variant === "circular") shapeClass = "rounded-full";
  if (variant === "card") shapeClass = "rounded-2xl";

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-surface-2 ${shapeClass} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};
