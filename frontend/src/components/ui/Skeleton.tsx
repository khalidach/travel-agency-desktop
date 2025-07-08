import React from "react";

/**
 * A reusable skeleton loader component with a pulse animation.
 * @param className - Additional classes for sizing and positioning.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      {...props}
    />
  );
}
