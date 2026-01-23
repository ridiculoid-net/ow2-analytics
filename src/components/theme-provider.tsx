"use client";

import { useEffect, useState, ReactNode } from "react";
import { useThemeStore } from "@/lib/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }

    // Also update body for select dropdowns
    document.body.style.colorScheme = theme;
  }, [theme, mounted]);

  // Apply dark class on initial render to prevent flash
  if (!mounted) {
    return (
      <div className="dark" style={{ colorScheme: "dark" }}>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
