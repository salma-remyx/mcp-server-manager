/**
 * Tool-related type definitions
 */

/** Discovered tool from MCP server */
export interface Tool {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
}

/** Tool with enabled state */
export interface ToolWithState extends Tool {
  /** Whether tool is enabled */
  enabled: boolean;
  /** Token count for this tool */
  tokens?: number;
}

/** Tool discovery result */
export interface ToolDiscoveryResult {
  success: boolean;
  tools: Tool[];
  error?: string;
}

/** Tool filter update result */
export interface ToolFilterResult {
  success: boolean;
  error?: string;
}

/** Find server result */
export interface FindServerResult {
  server: import("./server.types.js").Server;
  type: "local" | "remote";
  filterId: string;
}

/** Tools summary for a server */
export interface ServerToolsSummary {
  name: string;
  id: string;
  type: string;
  toolCount: number;
  enabledCount: number;
  totalTokens: number;
}

/** CLI tools output */
export interface ToolsOutput {
  server?: string;
  serverId?: string;
  tools?: ToolWithState[];
  totalTokens?: number;
  servers?: ServerToolsSummary[];
}
