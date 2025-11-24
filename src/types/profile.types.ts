/**
 * Profile-related type definitions
 */

/** Single profile definition */
export interface Profile {
  /** Profile display name */
  name: string;
  /** Local server IDs in this profile (empty = all) */
  servers: string[];
  /** Remote server IDs in this profile (empty = all) */
  remoteServers: string[];
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
  /** Whether profile includes all servers */
  includesAll: boolean;
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
