import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md",
          "transition-colors",
          variant === "default" && "bg-primary/20 text-primary",
          variant === "secondary" && "bg-secondary text-secondary-foreground",
          variant === "outline" && "border border-border text-muted-foreground",
          variant === "success" && "bg-emerald-500/20 text-emerald-400",
          variant === "warning" && "bg-amber-500/20 text-amber-400",
          variant === "danger" && "bg-red-500/20 text-red-400",
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";
