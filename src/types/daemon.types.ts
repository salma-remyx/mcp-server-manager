/**
 * Daemon-related type definitions
 */

/** Daemon status */
export type DaemonStatus = "running" | "stopped" | "unknown";

/** Daemon info */
export interface DaemonInfo {
  status: DaemonStatus;
  pid?: number;
  port?: number;
  uptime?: number;
  servers?: string[];
}

/** Daemon start options */
export interface DaemonStartOptions {
  /** Server IDs to start (empty = all enabled) */
  servers?: string[];
  /** Profile to use */
  profile?: string;
  /** Run in foreground instead of daemon */
  foreground?: boolean;
}

/** Daemon logs options */
export interface DaemonLogsOptions {
  /** Follow logs in real-time */
  follow?: boolean;
  /** Number of lines to show */
  lines?: number;
  /** Clear logs */
  clear?: boolean;
}

/** Startup configuration status */
export type StartupStatus = "enabled" | "disabled" | "unknown";

/** Daemon operation result */
export interface DaemonResult {
  success: boolean;
  error?: string;
  info?: DaemonInfo;
}

/** Log entry */
export interface LogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  metadata?: Record<string, unknown>;
}
