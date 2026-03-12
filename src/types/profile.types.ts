/**
 * Profile-related type definitions
 */

import type { ToolFilters } from "./config.types.js";

/** Single profile definition */
export interface Profile {
  /** Profile display name */
  name: string;
  /** Local server IDs in this profile */
  servers: string[];
  /** Remote server IDs in this profile */
  remoteServers: string[];
  /** Per-profile tool filters (optional, for independent tool management) */
  toolFilters?: ToolFilters;
}

/** Profiles configuration */
export interface ProfilesConfig {
  /** Currently active profile ID */
  activeProfile: string;
  /** All profiles keyed by ID */
  profiles: Record<string, Profile>;
}

/** Profile list item for display */
export interface ProfileListItem {
  /** Profile ID */
  id: string;
  /** Profile display name */
  name: string;
  /** Total server count */
  serverCount: number;
  /** Whether this is the active profile */
  isActive: boolean;
}

/** Profile operation result */
export interface ProfileResult {
  success: boolean;
  error?: string;
}

/** Servers for a profile */
export interface ProfileServers {
  servers: import("./server.types.js").LocalServer[];
  remoteServers: import("./server.types.js").RemoteServer[];
}
