/**
 * Server-related type definitions
 */

/** Transport type for remote servers */
export type TransportType = "http" | "sse";

/** Server transport type including local */
export type ServerType = "stdio" | TransportType;

/** Base server interface with common properties */
export interface BaseServer {
  /** Unique server identifier */
  id: string;
  /** Display name for the server */
  name: string;
  /** Whether the server is disabled */
  disabled?: boolean;
}

/** Local server configuration (STDIO-based) */
export interface LocalServer extends BaseServer {
  /** Command to execute (e.g., "npx", "node", "python") */
  command: string;
  /** Command arguments */
  args: string[];
  /** Environment variables */
  env?: Record<string, string>;
}

/** Remote server configuration (HTTP/SSE-based) */
export interface RemoteServer extends BaseServer {
  /** Transport type */
  type: TransportType;
  /** Server endpoint URL */
  url: string;
  /** Bearer token for authentication */
  bearerToken?: string;
}

/** Union type for any server */
export type Server = LocalServer | RemoteServer;

/** Type guard to check if server is local */
export function isLocalServer(server: Server): server is LocalServer {
  return "command" in server;
}

/** Type guard to check if server is remote */
export function isRemoteServer(server: Server): server is RemoteServer {
  return "url" in server && "type" in server;
}

/** Server test result */
export interface ServerTestResult {
  success: boolean;
  error?: string;
  toolCount?: number;
  responseTime?: number;
}

/** Server with test status */
export interface ServerWithStatus extends BaseServer {
  status: "unknown" | "ok" | "error" | "testing";
  lastTestResult?: ServerTestResult;
}
