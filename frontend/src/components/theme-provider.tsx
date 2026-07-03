"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const DEFAULT_THEME: Theme = "light";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Inline, render-blocking script that applies the stored theme to <html> before
 * first paint (prevents a light→dark flash). It is rendered by the server
 * RootLayout, so React never re-renders it on the client — which is exactly what
 * avoids React 19's "script tag rendered on the client" warning that next-themes
 * triggers. Keep it tiny and dependency-free.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="dark"&&t!=="light"){t="${DEFAULT_THEME}";}var d=document.documentElement;d.classList.toggle("dark",t==="dark");d.style.colorScheme=t;}catch(e){}})();`;

/**
 * The initial theme, read from the <html> class that the inline script already
 * applied before hydration. On the server `document` is undefined, so we fall
 * back to the default — which matches the server-rendered markup (no dark class).
 * Reading it as a lazy initializer (not in an effect) keeps state and the DOM in
 * sync from the first client render without a setState-in-effect.
 */
function initialTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return document.documentElement.classList.contains("dark") ? "dark" : DEFAULT_THEME;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Seed from the DOM (already themed by the inline script) — no flash, no
  // setState-in-effect.
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  // Keep the <html> class/colorScheme in sync whenever the theme changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Cross-tab sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setThemeState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write failures (private mode, storage disabled)
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Access the current theme and a setter. Returns a safe default when used
 * outside the provider (mirrors next-themes' non-throwing behavior).
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: DEFAULT_THEME, resolvedTheme: DEFAULT_THEME, setTheme: () => {} };
  }
  return ctx;
}
