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

/** Minimal theme - subdued colors, focus on content */
export const minimalTheme: Theme = {
  name: "minimal",
  colors: {
    // Primary colors
    primary: "white",
    secondary: "gray",
    accent: "white",

    // Status colors
    success: "green",
    error: "red",
    warning: "yellow",
    info: "white",

    // UI elements
    border: "gray",
    headerBorder: "white",
    text: "white",
    dimText: "gray",
    highlightText: "white",
    selectedText: "white",

    // Server list
    serverName: "white",
    serverNameDisabled: "gray",
    serverCheckEnabled: "white",
    serverCheckDisabled: "gray",
    serverArrowLocal: "white",
    serverArrowRemote: "white",
    serverArrowSelected: "white",
    serverStatus: "white",
    serverStatusError: "red",
    serverNeedsAuth: "red",

    // Interactive elements
    inputPrompt: "white",
    inputText: "white",
    link: "white",

    // Special
    disabled: "gray",
  },
};

/** Colorful theme - vibrant colors for maximum visual distinction */
export const colorfulTheme: Theme = {
  name: "colorful",
  colors: {
    // Primary colors
    primary: "cyan",
    secondary: "magenta",
    accent: "yellow",

    // Status colors
    success: "green",
    error: "red",
    warning: "yellow",
    info: "blue",

    // UI elements
    border: "magenta",
    headerBorder: "cyan",
    text: "white",
    dimText: "gray",
    highlightText: "yellow",
    selectedText: "magenta",

    // Server list
    serverName: "cyan",
    serverNameDisabled: "gray",
    serverCheckEnabled: "green",
    serverCheckDisabled: "yellow",
    serverArrowLocal: "green",
    serverArrowRemote: "magenta",
    serverArrowSelected: "yellow",
    serverStatus: "cyan",
    serverStatusError: "red",
    serverNeedsAuth: "yellow",

    // Interactive elements
    inputPrompt: "magenta",
    inputText: "cyan",
    link: "blue",

    // Special
    disabled: "gray",
  },
};

/** Get theme by name */
export function getTheme(name: "default" | "minimal" | "colorful"): Theme {
  switch (name) {
    case "minimal":
      return minimalTheme;
    case "colorful":
      return colorfulTheme;
    case "default":
    default:
      return defaultTheme;
  }
}
