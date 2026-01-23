"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================
// THEME SYSTEM
// ============================================

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const newTheme = get().theme === "dark" ? "light" : "dark";
        set({ theme: newTheme });
      },
    }),
    {
      name: "squadup_theme",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
