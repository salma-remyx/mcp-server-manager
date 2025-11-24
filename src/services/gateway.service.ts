/**
 * Gateway Service - MCP multiplexing gateway
 *
 * This service creates an HTTP server that:
 * 1. Accepts MCP connections from clients (Claude, Cursor, etc.)
 * 2. Spawns and manages local MCP servers (STDIO)
 * 3. Connects to remote MCP servers (HTTP/SSE)
 * 4. Routes MCP requests to the appropriate servers
 * 5. Applies tool filtering based on user configuration
 */

import {
  createServer,
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getConfigService } from "./config.service.js";
import { createLogger } from "../shared/logger.js";
import { VERSION } from "../shared/version.js";
import type { LocalServer, RemoteServer } from "../types/index.js";

const logger = createLogger("GatewayService");

type RemoteTransport = SSEClientTransport | StreamableHTTPClientTransport;

interface ConnectedServer {
  id: string;
  name: string;
  type: "local" | "remote";
  client: Client;
  transport: StdioClientTransport | RemoteTransport;
  tools: Tool[];
}

interface GatewayState {
  running: boolean;
  port: number;
  httpServer: HttpServer | null;
  mcpServer: Server | null;
  connectedServers: Map<string, ConnectedServer>;
  toolToServerMap: Map<string, string>; // toolName -> serverId
}

let gatewayState: GatewayState = {
  running: false,
  port: 8850,
  httpServer: null,
  mcpServer: null,
  connectedServers: new Map(),
  toolToServerMap: new Map(),
};

/**
 * Connect to a local STDIO-based MCP server
 */
async function connectLocalServer(server: LocalServer): Promise<ConnectedServer | null> {
  const configService = getConfigService();

  try {
    logger.info(`Connecting to local server: ${server.name}`);

    const transport = new StdioClientTransport({
      command: server.command,
      args: server.args || [],
      env: { ...process.env, ...(server.env || {}) } as Record<string, string>,
    });

    const client = new Client({ name: "mcpsm-gateway", version: VERSION }, { capabilities: {} });

    await client.connect(transport);

    // Get available tools
    const toolsResult = await client.listTools();
    const allTools = toolsResult.tools || [];

    // Apply tool filtering
    const toolFilters = configService.getToolFilters();
    const filter = toolFilters[server.id];
    const disabledTools = new Set(filter?.disabledTools || []);
    const enabledTools = allTools.filter((t) => !disabledTools.has(t.name));

    logger.info(
      `Connected to ${server.name}: ${enabledTools.length}/${allTools.length} tools enabled`
    );

    return {
      id: server.id,
      name: server.name,
      type: "local",
      client,
      transport,
      tools: enabledTools,
    };
  } catch (error) {
    logger.error(`Failed to connect to local server ${server.name}:`, error);
    return null;
  }
}

/**
 * Connect to a remote HTTP/SSE MCP server
 */
async function connectRemoteServer(server: RemoteServer): Promise<ConnectedServer | null> {
  const configService = getConfigService();

  try {
    logger.info(`Connecting to remote server: ${server.name} (${server.type})`);

    const url = new URL(server.url);
    const headers: Record<string, string> = {};

    if (server.bearerToken) {
      headers["Authorization"] = `Bearer ${server.bearerToken}`;
    }

    // Create appropriate transport based on server type
    let transport: RemoteTransport;

    if (server.type === "sse") {
      transport = new SSEClientTransport(url, {
        requestInit: { headers },
      });
    } else {
      // HTTP type uses StreamableHTTP
      transport = new StreamableHTTPClientTransport(url, {
        requestInit: { headers },
      });
    }

    const client = new Client({ name: "mcpsm-gateway", version: VERSION }, { capabilities: {} });

    await client.connect(transport);

    // Get available tools
    const toolsResult = await client.listTools();
    const allTools = toolsResult.tools || [];

    // Apply tool filtering
    const toolFilters = configService.getToolFilters();
    const filterId = `remote:${server.id}`;
    const filter = toolFilters[filterId];
    const disabledTools = new Set(filter?.disabledTools || []);
    const enabledTools = allTools.filter((t) => !disabledTools.has(t.name));

    logger.info(
      `Connected to ${server.name}: ${enabledTools.length}/${allTools.length} tools enabled`
    );

    return {
      id: filterId,
      name: server.name,
      type: "remote",
      client,
      transport,
      tools: enabledTools,
    };
  } catch (error) {
    logger.error(`Failed to connect to remote server ${server.name}:`, error);
    return null;
  }
}

/**
 * Build the aggregated tool list and tool-to-server mapping
 */
function buildToolMapping(): Tool[] {
  const allTools: Tool[] = [];
  gatewayState.toolToServerMap.clear();

  for (const [serverId, server] of gatewayState.connectedServers) {
    for (const tool of server.tools) {
      // Prefix tool name with server name to avoid conflicts
      const prefixedTool: Tool = {
        ...tool,
        name: `${server.name}__${tool.name}`,
        description: `[${server.name}] ${tool.description || ""}`,
      };

      allTools.push(prefixedTool);
      gatewayState.toolToServerMap.set(prefixedTool.name, serverId);
    }
  }

  return allTools;
}

/**
 * Handle tool call by routing to the appropriate server
 */
async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const serverId = gatewayState.toolToServerMap.get(toolName);

  if (!serverId) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
      isError: true,
    };
  }

  const server = gatewayState.connectedServers.get(serverId);
  if (!server) {
    return {
      content: [{ type: "text", text: `Server not connected: ${serverId}` }],
      isError: true,
    };
  }

  // Remove the server prefix from the tool name
  const originalToolName = toolName.replace(`${server.name}__`, "");

  try {
    const result = await server.client.callTool({ name: originalToolName, arguments: args });
    return result as CallToolResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Tool call failed: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Start the MCP gateway server
 */
export async function startGateway(
  selectedServerIds?: string[]
): Promise<{ success: boolean; error?: string }> {
  if (gatewayState.running) {
    return { success: false, error: "Gateway is already running" };
  }

  const configService = getConfigService();
  const port = configService.getPort();

  logger.info(`Starting MCP Gateway on port ${port}...`);

  try {
    // Get enabled servers
    let localServers = configService.getEnabledLocalServers();
    let remoteServers = configService.getEnabledRemoteServers();

    // Determine which servers to actually start
    // Priority: explicit selectedServerIds > TUI selection state > all enabled servers
    let serverIdsToStart: Set<string> = new Set();

    if (selectedServerIds && selectedServerIds.length > 0) {
      // Explicit server IDs provided (from CLI or profile)
      serverIdsToStart = new Set(selectedServerIds);
    } else {
      // Use TUI selection state if available
      const selectionState = configService.getSelectionState();
      if (selectionState.local.length > 0 || selectionState.remote.length > 0) {
        serverIdsToStart = new Set([...selectionState.local, ...selectionState.remote]);
      } else {
        // Fall back to all enabled servers if selection state is empty
        serverIdsToStart = new Set([
          ...localServers.map((s) => s.id),
          ...remoteServers.map((s) => `remote:${s.id}`),
        ]);
      }
    }

    // Filter servers to only those in the start set
    const selectedSet = serverIdsToStart;
    localServers = localServers.filter((s) => selectedSet.has(s.id));
    remoteServers = remoteServers.filter(
      (s) => selectedSet.has(s.id) || selectedSet.has(`remote:${s.id}`)
    );

    if (localServers.length === 0 && remoteServers.length === 0) {
      return { success: false, error: "No servers to start" };
    }

    // Connect to all servers
    const connectionPromises: Promise<ConnectedServer | null>[] = [
      ...localServers.map(connectLocalServer),
      ...remoteServers.map(connectRemoteServer),
    ];

    const results = await Promise.all(connectionPromises);
    const connectedServers = results.filter((r): r is ConnectedServer => r !== null);

    if (connectedServers.length === 0) {
      return { success: false, error: "Failed to connect to any servers" };
    }

    // Store connected servers
    for (const server of connectedServers) {
      gatewayState.connectedServers.set(server.id, server);
    }

    // Build tool mapping
    const aggregatedTools = buildToolMapping();
    logger.info(
      `Aggregated ${aggregatedTools.length} tools from ${connectedServers.length} servers`
    );

    // Create MCP server using the high-level McpServer from the SDK
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");

    const mcpServer = new McpServer(
      { name: "mcpsm-gateway", version: VERSION },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register all aggregated tools
    for (const tool of aggregatedTools) {
      mcpServer.tool(tool.name, tool.description || "", async (args: Record<string, unknown>) => {
        const result = await handleToolCall(tool.name, args);
        return result;
      });
    }

    // Track active transports per session
    const activeSessions = new Map<string, StreamableHTTPServerTransport>();

    // Create HTTP server with StreamableHTTP transport
    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, mcp-session-id, mcp-protocol-version"
      );

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Health check endpoint
      if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ok",
            servers: connectedServers.length,
            tools: aggregatedTools.length,
          })
        );
        return;
      }

      // MCP endpoint - handle all MCP requests
      if (req.url === "/mcp" || req.url?.startsWith("/mcp?")) {
        // Check for existing session
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        let transport = sessionId ? activeSessions.get(sessionId) : undefined;

        if (!transport) {
          // Create new transport for new sessions
          let currentSessionId: string | undefined;
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableJsonResponse: true,
            onsessioninitialized: (newSessionId) => {
              currentSessionId = newSessionId;
              activeSessions.set(newSessionId, transport!);
            },
          });

          // Clean up session when transport closes
          transport.onclose = () => {
            if (currentSessionId) {
              activeSessions.delete(currentSessionId);
              logger.debug(`Session ${currentSessionId} closed and cleaned up`);
            }
          };

          await mcpServer.server.connect(transport);
        }

        await transport.handleRequest(req, res);
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    // Start listening
    await new Promise<void>((resolve, reject) => {
      httpServer.on("error", reject);
      httpServer.listen(port, () => {
        logger.info(`Gateway listening on http://localhost:${port}`);
        resolve();
      });
    });

    gatewayState = {
      ...gatewayState,
      running: true,
      port,
      httpServer,
      mcpServer: mcpServer.server,
    };

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to start gateway: ${errorMessage}`);
    await stopGateway();
    return { success: false, error: errorMessage };
  }
}

/**
 * Stop the MCP gateway server
 */
export async function stopGateway(): Promise<{ success: boolean; error?: string }> {
  logger.info("Stopping gateway...");

  try {
    // Close all server connections
    for (const [, server] of gatewayState.connectedServers) {
      try {
        await server.transport.close();
      } catch (error) {
        logger.warn(`Error closing connection to ${server.name}:`, error);
      }
    }

    // Close HTTP server
    if (gatewayState.httpServer) {
      await new Promise<void>((resolve) => {
        gatewayState.httpServer!.close(() => resolve());
      });
    }

    // Close MCP server
    if (gatewayState.mcpServer) {
      await gatewayState.mcpServer.close();
    }

    gatewayState = {
      running: false,
      port: 8850,
      httpServer: null,
      mcpServer: null,
      connectedServers: new Map(),
      toolToServerMap: new Map(),
    };

    logger.info("Gateway stopped");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error stopping gateway: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get gateway status
 */
export function getGatewayStatus(): {
  running: boolean;
  port: number;
  serverCount: number;
  toolCount: number;
} {
  return {
    running: gatewayState.running,
    port: gatewayState.port,
    serverCount: gatewayState.connectedServers.size,
    toolCount: gatewayState.toolToServerMap.size,
  };
}

/**
 * Run gateway in foreground mode (blocking)
 */
export async function runGatewayForeground(selectedServerIds?: string[]): Promise<void> {
  const result = await startGateway(selectedServerIds);

  if (!result.success) {
    console.error(`Failed to start gateway: ${result.error}`);
    process.exit(1);
  }

  console.log(`Gateway running on http://localhost:${gatewayState.port}`);
  console.log(`Connected to ${gatewayState.connectedServers.size} servers`);
  console.log(`Serving ${gatewayState.toolToServerMap.size} tools`);
  console.log("Press Ctrl+C to stop");

  // Handle shutdown signals
  const shutdown = async () => {
    console.log("\nShutting down...");
    await stopGateway();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep process alive
  await new Promise(() => {});
}
