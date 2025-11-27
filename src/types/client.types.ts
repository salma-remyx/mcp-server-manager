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

/** Connection status for a client */
export type ClientStatus = "connected" | "disconnected" | "not-installed";

/** Detected client information */
export interface DetectedClient {
  /** Client identifier */
  id: ClientId;
  /** Display name */
  name: string;
  /** Config file path for current platform */
  configPath: string | null;
  /** MCP configuration file path (real-time loading path) */
  mcpConfigPath: string | null;
  /** Whether client is installed */
  installed: boolean;
  /** Whether client has config file */
  hasConfig: boolean;
  /** Connection status (connected/disconnected/not-installed) */
  status: ClientStatus;
  /** Number of MCP servers in client config */
  serverCount: number;
}

/** Claude Desktop server format */
export interface ClaudeServerConfig {
  command: string;
  args: string[];
  type?: string;
  env?: Record<string, string>;
}

/** Client MCP configuration */
export interface ClientMcpConfig {
  mcpServers?: Record<string, ClaudeServerConfig>;
  servers?: Record<string, ClaudeServerConfig>;
  [key: string]: unknown;
}

/** Operation result */
export interface OperationResult {
  success: boolean;
  error?: string;
}
