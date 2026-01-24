import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef, cloneElement, isValidElement } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, children, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center font-medium transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-50",
      // Variants
      variant === "primary" && [
        "relative overflow-hidden",
        "bg-primary text-primary-foreground",
        "hover:brightness-110 active:brightness-90",
        "shadow-lg shadow-primary/10",
        "before:absolute before:inset-0 before:rounded-[inherit] before:ring-1 before:ring-primary/60",
        "before:shadow-[0_0_24px_hsl(var(--primary)/0.35)]",
      ],
      variant === "secondary" && [
        "bg-secondary text-secondary-foreground",
        "hover:bg-secondary/80 active:bg-secondary/60",
      ],
      variant === "ghost" && [
        "hover:bg-muted/50",
        "hover:text-foreground",
      ],
      variant === "outline" && [
        "border border-border bg-transparent",
        "hover:bg-muted/30 hover:border-primary/50",
      ],
      // Sizes
      size === "sm" && "h-8 px-3 text-sm rounded-lg",
      size === "md" && "h-10 px-4 text-sm rounded-lg",
      size === "lg" && "h-12 px-6 text-base rounded-xl",
      size === "icon" && "h-10 w-10 p-0 rounded-lg",
      className
    );

    if (asChild && isValidElement(children)) {
      return cloneElement(children as any, {
        className: cn((children as any).props?.className, classes),
      });
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
