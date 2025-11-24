/**
 * Client-related type definitions
 */

/** Supported client IDs */
export type ClientId =
  | "claude"
  | "cursor"
  | "windsurf"
  | "vscode"
  | "claude-code"
  | "codex"
  | "gemini";

/** Platform types */
export type Platform = "darwin" | "win32" | "linux";

/** Client configuration paths per platform */
export type ClientPaths = Record<Platform, string>;

/** Client paths configuration */
export type ClientPathsConfig = Record<ClientId, ClientPaths>;

/** Client display names */
export type ClientNames = Record<ClientId, string>;

/** Detected client information */
export interface DetectedClient {
  /** Client identifier */
  id: ClientId;
  /** Display name */
  name: string;
  /** Config file path for current platform */
  configPath: string | null;
  /** Whether client is installed */
  installed: boolean;
  /** Whether client has config file */
  hasConfig: boolean;
  /** Whether sync is enabled for this client */
  enabled: boolean;
  /** Whether servers are synced */
  synced: boolean;
  /** Number of MCP servers in client config */
  serverCount: number;
}

/** Client sync state */
export interface ClientsState {
  /** List of enabled client IDs */
  enabledClients: ClientId[];
}

/** Claude Desktop server format */
export interface ClaudeServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/** Client MCP configuration */
export interface ClientMcpConfig {
  mcpServers?: Record<string, ClaudeServerConfig>;
  [key: string]: unknown;
}

/** Sync result for a single client */
export interface SyncResult {
  success: boolean;
  addedCount?: number;
  skippedCount?: number;
  error?: string | null;
}

/** Sync result with client info */
export interface ClientSyncResult extends SyncResult {
  clientId: ClientId;
  clientName: string;
}

/** Operation result */
export interface OperationResult {
  success: boolean;
  error?: string;
}
