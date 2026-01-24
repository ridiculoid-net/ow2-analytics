"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useThemeStore } from "@/lib/theme";
import { useSoundSettings } from "@/lib/sounds";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Activity, Upload, LayoutDashboard, List, Settings, Sun, Moon, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "HOME", icon: Activity, exact: true },
  { href: "/import", label: "IMPORT", icon: Upload },
  { href: "/dashboard", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/matches", label: "MATCHES", icon: List },
  { href: "/settings", label: "SETTINGS", icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useThemeStore();
  const { enabled: soundEnabled, setEnabled: setSoundEnabled } = useSoundSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/30 bg-background/80 backdrop-blur-xl glow-sm">
      <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />
      <div className="container mx-auto px-4 relative">
        <div className="flex h-14 md:h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group" onClick={() => setMobileOpen(false)}>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/15 border border-primary/40 flex items-center justify-center glow-sm">
              <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-sm md:text-base tracking-wider text-foreground group-hover:text-primary transition-colors text-glow">
                OW2 ANALYTICS
              </span>
              <span className="font-mono text-[10px] md:text-xs text-muted-foreground tracking-widest">
                ridiculoid // buttstough
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-display tracking-widest transition-all flex items-center gap-2",
                    active
                      ? "bg-primary/15 text-primary border border-primary/40 glow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle sound"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="hidden md:inline-flex"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden"
            >
              <span className="font-display text-xs tracking-widest">{mobileOpen ? "CLOSE" : "MENU"}</span>
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-3">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "px-3 py-3 rounded-lg text-xs font-display tracking-widest transition-all flex items-center gap-2 border",
                      active
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
