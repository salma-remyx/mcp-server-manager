/**
 * Terminal color codes and utilities
 */

/** ANSI color codes */
export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Background colors
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
} as const;

/** Color helper functions */
export const c = {
  reset: (text: string): string => `${colors.reset}${text}${colors.reset}`,
  bright: (text: string): string => `${colors.bright}${text}${colors.reset}`,
  dim: (text: string): string => `${colors.dim}${text}${colors.reset}`,

  red: (text: string): string => `${colors.red}${text}${colors.reset}`,
  green: (text: string): string => `${colors.green}${text}${colors.reset}`,
  yellow: (text: string): string => `${colors.yellow}${text}${colors.reset}`,
  blue: (text: string): string => `${colors.blue}${text}${colors.reset}`,
  magenta: (text: string): string => `${colors.magenta}${text}${colors.reset}`,
  cyan: (text: string): string => `${colors.cyan}${text}${colors.reset}`,
  white: (text: string): string => `${colors.white}${text}${colors.reset}`,
  gray: (text: string): string => `${colors.gray}${text}${colors.reset}`,

  // Status colors
  success: (text: string): string => `${colors.green}${colors.bright}${text}${colors.reset}`,
  error: (text: string): string => `${colors.red}${colors.bright}${text}${colors.reset}`,
  warning: (text: string): string => `${colors.yellow}${colors.bright}${text}${colors.reset}`,
  info: (text: string): string => `${colors.cyan}${colors.bright}${text}${colors.reset}`,

  // Icons with colors
  checkmark: `${colors.green}✓${colors.reset}`,
  cross: `${colors.red}✗${colors.reset}`,
  warning_icon: `${colors.yellow}⚠${colors.reset}`,
  info_icon: `${colors.cyan}ℹ${colors.reset}`,
  arrow: `${colors.cyan}→${colors.reset}`,
  bullet: `${colors.gray}•${colors.reset}`,
};

/** Clear the terminal screen */
export function clearScreen(): void {
  console.clear();
}

/** Move cursor to position */
export function moveCursor(row: number, col: number): void {
  process.stdout.write(`\x1b[${row};${col}H`);
}

/** Hide cursor */
export function hideCursor(): void {
  process.stdout.write("\x1b[?25l");
}

/** Show cursor */
export function showCursor(): void {
  process.stdout.write("\x1b[?25h");
}

/** Clear current line */
export function clearLine(): void {
  process.stdout.write("\x1b[2K");
}

/** Move cursor up N lines */
export function moveUp(n: number = 1): void {
  process.stdout.write(`\x1b[${n}A`);
}

/** Move cursor down N lines */
export function moveDown(n: number = 1): void {
  process.stdout.write(`\x1b[${n}B`);
}
