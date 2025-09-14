import React, { useEffect } from "react";
import { useThemeStore } from "@/store/useThemeStore";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, setMode } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;

    // On initialization, check system preference settings
    const initializeTheme = () => {
      // If current theme is restored from localStorage, apply directly
      if (theme.mode) {
        root.classList.remove("light", "dark");
        root.classList.add(theme.mode);
        return;
      }

      // If no saved theme, check system preference
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const initialTheme = systemPrefersDark ? "dark" : "light";

      setMode(initialTheme);
      root.classList.remove("light", "dark");
      root.classList.add(initialTheme);
    };

    initializeTheme();

    // Listen for system theme changes (optional)
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (_e: MediaQueryListEvent) => {
      // Only follow system when user hasn't manually set theme
      // Here we always keep user's choice, don't automatically follow system changes
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [setMode]);

  useEffect(() => {
    const root = window.document.documentElement;

    // When theme changes, update HTML class name
    root.classList.remove("light", "dark");
    root.classList.add(theme.mode);

    // Optional: add a transition effect to body
    document.body.style.transition =
      "background-color 0.3s ease, color 0.3s ease";

    return () => {
      document.body.style.transition = "";
    };
  }, [theme.mode]);

  return <>{children}</>;
}
