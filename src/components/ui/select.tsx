import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2",
          "text-sm text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-200",
          "appearance-none cursor-pointer",
          "pr-10",
          className
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2322c55e' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          backgroundSize: "1.25rem",
          backgroundPosition: "right 0.5rem center",
          backgroundRepeat: "no-repeat",
        }}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";
