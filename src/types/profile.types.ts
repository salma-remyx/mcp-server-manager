/**
 * Profile-related type definitions
 */

import type { ToolFilters } from "./config.types.js";
import type { LocalServer, RemoteServer } from "./server.types.js";

/** Single profile definition */
export interface Profile {
  /** Profile display name */
  name: string;
  /** Local servers owned by this profile */
  servers: LocalServer[];
  /** Remote servers owned by this profile */
  remoteServers: RemoteServer[];
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
