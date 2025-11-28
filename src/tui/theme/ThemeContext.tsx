/**
 * Theme Context - provides theme to all TUI components
 */

import React, { createContext, useContext, useMemo } from "react";
import { getSettingsService } from "../../services/settings.service.js";
import { getTheme } from "./palettes.js";
import type { Theme, ThemeName } from "./types.js";

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const settingsService = getSettingsService();
  const themeName = settingsService.get("theme") as ThemeName;

  const contextValue = useMemo<ThemeContextValue>(() => {
    const theme = getTheme(themeName);
    return { theme, themeName };
  }, [themeName]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access the current theme
 * @returns Theme context value with theme and themeName
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
