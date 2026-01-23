import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2",
          "text-sm text-foreground placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-200",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
