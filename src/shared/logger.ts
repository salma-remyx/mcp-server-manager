/**
 * Logger utility for consistent logging across the application
 */

import { colors, c } from "./colors.js";

/** Log levels */
export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

/** Logger configuration */
interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  timestamps?: boolean;
}

/** Log level priorities */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/** Global logger configuration */
let config: LoggerConfig = {
  level: "info",
  timestamps: false,
};

/** Set logger configuration */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
}

/** Get current timestamp string */
function getTimestamp(): string {
  if (!config.timestamps) return "";
  const now = new Date();
  return `${colors.gray}[${now.toISOString()}]${colors.reset} `;
}

/** Get prefix string */
function getPrefix(): string {
  if (!config.prefix) return "";
  return `${colors.cyan}[${config.prefix}]${colors.reset} `;
}

/** Check if level should be logged */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level];
}

/** Logger object */
export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog("debug")) {
      console.log(`${getTimestamp()}${getPrefix()}${colors.gray}[DEBUG]${colors.reset}`, ...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (shouldLog("info")) {
      console.log(`${getTimestamp()}${getPrefix()}${colors.blue}[INFO]${colors.reset}`, ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (shouldLog("warn")) {
      console.warn(`${getTimestamp()}${getPrefix()}${colors.yellow}[WARN]${colors.reset}`, ...args);
    }
  },

  error: (...args: unknown[]): void => {
    if (shouldLog("error")) {
      console.error(`${getTimestamp()}${getPrefix()}${colors.red}[ERROR]${colors.reset}`, ...args);
    }
  },

  /** Log without any prefix/level - raw output */
  raw: (...args: unknown[]): void => {
    console.log(...args);
  },

  /** Success message with checkmark */
  success: (message: string): void => {
    console.log(`${c.checkmark} ${message}`);
  },

  /** Failure message with cross */
  fail: (message: string): void => {
    console.log(`${c.cross} ${message}`);
  },

  /** Warning message with icon */
  warning: (message: string): void => {
    console.log(`${c.warning_icon} ${c.yellow(message)}`);
  },

  /** Blank line */
  blank: (): void => {
    console.log();
  },

  /** Section header */
  section: (title: string): void => {
    console.log(`\n${colors.bright}${colors.cyan}${title}${colors.reset}\n`);
  },

  /** List item */
  item: (text: string, indent: number = 0): void => {
    const padding = "  ".repeat(indent);
    console.log(`${padding}${c.bullet} ${text}`);
  },

  /** Key-value pair */
  kv: (key: string, value: string, indent: number = 0): void => {
    const padding = "  ".repeat(indent);
    console.log(
      `${padding}${colors.bright}${key}${colors.reset}: ${colors.cyan}${value}${colors.reset}`
    );
  },
};

/** Create a child logger with a prefix */
export function createLogger(prefix: string): typeof logger {
  return {
    ...logger,
    debug: (...args: unknown[]): void => {
      if (shouldLog("debug")) {
        console.log(
          `${getTimestamp()}${colors.cyan}[${prefix}]${colors.reset} ${colors.gray}[DEBUG]${colors.reset}`,
          ...args
        );
      }
    },
    info: (...args: unknown[]): void => {
      if (shouldLog("info")) {
        console.log(
          `${getTimestamp()}${colors.cyan}[${prefix}]${colors.reset} ${colors.blue}[INFO]${colors.reset}`,
          ...args
        );
      }
    },
    warn: (...args: unknown[]): void => {
      if (shouldLog("warn")) {
        console.warn(
          `${getTimestamp()}${colors.cyan}[${prefix}]${colors.reset} ${colors.yellow}[WARN]${colors.reset}`,
          ...args
        );
      }
    },
    error: (...args: unknown[]): void => {
      if (shouldLog("error")) {
        console.error(
          `${getTimestamp()}${colors.cyan}[${prefix}]${colors.reset} ${colors.red}[ERROR]${colors.reset}`,
          ...args
        );
      }
    },
  };
}

export default logger;
