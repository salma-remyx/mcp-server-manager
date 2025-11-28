/**
 * Theme color palettes
 */

import type { Theme } from "./types.js";

/** Default theme - balanced colors with good contrast */
export const defaultTheme: Theme = {
  name: "default",
  colors: {
    // Primary colors
    primary: "cyan",
    secondary: "magenta",
    accent: "yellow",

    // Status colors
    success: "green",
    error: "red",
    warning: "yellow",
    info: "cyan",

    // UI elements
    border: "green",
    headerBorder: "cyan",
    text: "white",
    dimText: "gray",
    highlightText: "magenta",
    selectedText: "magenta",

    // Server list
    serverName: "white",
    serverNameDisabled: "gray",
    serverCheckEnabled: "green",
    serverCheckDisabled: "gray",
    serverArrowLocal: "green",
    serverArrowRemote: "magenta",
    serverArrowSelected: "magenta",
    serverStatus: "green",
    serverStatusError: "red",
    serverNeedsAuth: "red",

    // Interactive elements
    inputPrompt: "cyan",
    inputText: "white",
    link: "cyan",

    // Special
    disabled: "gray",
  },
};

/** Get theme by name (currently only default is available) */
export function getTheme(_name: "default"): Theme {
  return defaultTheme;
}
