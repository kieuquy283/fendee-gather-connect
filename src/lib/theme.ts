import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const storageKey = "fendee-theme";
const defaultTheme: Theme = "light";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset["theme"] = theme;
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return defaultTheme;

  const stored = window.localStorage.getItem(storageKey);
  return isTheme(stored) ? stored : defaultTheme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setThemeState(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  };

  return { theme, setTheme };
}
