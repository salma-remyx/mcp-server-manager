/**
 * Theme types for TUI
 */

/** Available theme names (kept for future expansion) */
export type ThemeName = "default";

/** Ink color types */
export type Color =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | "grey"
  | "blackBright"
  | "redBright"
  | "greenBright"
  | "yellowBright"
  | "blueBright"
  | "magentaBright"
  | "cyanBright"
  | "whiteBright";

/** Theme color palette */
export interface ThemeColors {
  // Primary colors
  primary: Color;
  secondary: Color;
  accent: Color;

  // Status colors
  success: Color;
  error: Color;
  warning: Color;
  info: Color;

  // UI elements
  border: Color;
  headerBorder: Color;
  text: Color;
  dimText: Color;
  highlightText: Color;
  selectedText: Color;

  // Server list
  serverName: Color;
  serverNameDisabled: Color;
  serverCheckEnabled: Color;
  serverCheckDisabled: Color;
  serverArrowLocal: Color;
  serverArrowRemote: Color;
  serverArrowSelected: Color;
  serverStatus: Color;
  serverStatusError: Color;
  serverNeedsAuth: Color;

  // Interactive elements
  inputPrompt: Color;
  inputText: Color;
  link: Color;

  // Special
  disabled: Color;
}

/** Full theme definition */
export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
}
