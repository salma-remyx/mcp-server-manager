/**
 * Testing service - tests MCP servers and discovers tools
 */

import { spawn, ChildProcess } from "child_process";
import type {
  LocalServer,
  RemoteServer,
  Server,
  ServerTestResult,
  ServerToolFilter,
} from "../types/index.js";
import { getConfigService } from "./config.service.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("TestingService");

/** MCP request structure */
interface McpRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: Record<string, unknown>;
}

/** MCP tools response */
interface McpToolsResponse {
  result?: {
    tools?: Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>;
  };
}

/** Testing service class */
export class TestingService {
  private readonly testTimeout = 15000;

  /** Create initialize request */
  private createInitRequest(): McpRequest {
    return {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "mcp-tester", version: "1.0.0" },
      },
    };
  }

  /** Create tools list request */
  private createToolsListRequest(): McpRequest {
    return {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    };
  }

  /** Count tokens for a tool (simplified) */
  private countToolTokens(tool: {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }): number {
    const text = JSON.stringify(tool);
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  /** Update tool filter with results */
  private updateToolFilter(
    filterId: string,
    tools: Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>,
    error?: string
  ): void {
    const configService = getConfigService();
    let filter = configService.getServerToolFilter(filterId);

    if (!filter) {
      filter = { enabled: [], allTools: [], toolsData: {} };
    }

    if (error) {
      configService.setServerToolFilter(filterId, {
        ...filter,
        error,
      } as ServerToolFilter & { error: string });
      return;
    }

    const toolNames = tools.map((t) => t.name);
    const toolsData: Record<string, { tokens: number; description?: string }> = {};
    let totalTokens = 0;

    for (const tool of tools) {
      const tokens = this.countToolTokens(tool);
      toolsData[tool.name] = {
        tokens,
        description: tool.description,
      };
      totalTokens += tokens;
    }

    configService.setServerToolFilter(filterId, {
      allTools: toolNames,
      enabled: !filter.enabled || filter.enabled.length === 0 ? [...toolNames] : filter.enabled,
      toolsData,
      totalTokens,
    });
  }

  /** Test a local STDIO server */
  async testLocalServer(server: LocalServer): Promise<ServerTestResult> {
    return new Promise((resolve) => {
      const filterId = server.id;
      let proc: ChildProcess;
      let stdout = "";
      let resolved = false;

      const cleanup = (): void => {
        if (!resolved) {
          resolved = true;
          try {
            proc?.kill();
          } catch (error) {
            log.debug("Failed to kill process:", error);
          }
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        this.updateToolFilter(filterId, [], "Timeout");
        resolve({ success: false, error: "Timeout", toolCount: 0 });
      }, this.testTimeout);

      try {
        proc = spawn(server.command, server.args, {
          env: { ...process.env, ...(server.env || {}) },
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (err) {
        clearTimeout(timeout);
        const error = err instanceof Error ? err.message : "Spawn error";
        this.updateToolFilter(filterId, [], error);
        resolve({ success: false, error, toolCount: 0 });
        return;
      }

      proc.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();

        const lines = stdout.split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line) as McpToolsResponse;
            if (msg.result?.tools) {
              clearTimeout(timeout);
              cleanup();

              const tools = msg.result.tools;
              this.updateToolFilter(filterId, tools);

              resolve({
                success: true,
                toolCount: tools.length,
              });
              return;
            }
          } catch (error) {
            log.debug("Failed to parse MCP response:", error);
          }
        }
      });

      proc.on("error", (err) => {
        clearTimeout(timeout);
        cleanup();
        this.updateToolFilter(filterId, [], err.message);
        resolve({ success: false, error: err.message, toolCount: 0 });
      });

      proc.on("close", (code) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          const error = `Exited with code ${code}`;
          this.updateToolFilter(filterId, [], error);
          resolve({ success: false, error, toolCount: 0 });
        }
      });

      // Send MCP requests
      setTimeout(() => {
        try {
          proc.stdin?.write(JSON.stringify(this.createInitRequest()) + "\n");

          setTimeout(() => {
            proc.stdin?.write(JSON.stringify(this.createToolsListRequest()) + "\n");
          }, 500);
        } catch (error) {
          log.debug("Failed to write to process stdin:", error);
        }
      }, 300);
    });
  }

  /** Test a remote HTTP/SSE server */
  async testRemoteServer(server: RemoteServer): Promise<ServerTestResult> {
    const filterId = `remote:${server.id}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.testTimeout);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      };

      if (server.bearerToken) {
        headers["Authorization"] = `Bearer ${server.bearerToken}`;
      }

      const url = server.type === "sse" ? server.url.replace("/sse", "") : server.url;

      // Initialize
      const initResponse = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(this.createInitRequest()),
        signal: controller.signal,
      });

      if (!initResponse.ok) {
        clearTimeout(timeout);
        const error = `HTTP ${initResponse.status}`;
        this.updateToolFilter(filterId, [], error);
        return { success: false, error, toolCount: 0 };
      }

      // Capture session ID if provided (for servers like deepwiki)
      const sessionId = initResponse.headers.get("mcp-session-id");
      const toolsHeaders = { ...headers };
      if (sessionId) {
        toolsHeaders["mcp-session-id"] = sessionId;
      }

      // Get tools
      const toolsResponse = await fetch(url, {
        method: "POST",
        headers: toolsHeaders,
        body: JSON.stringify(this.createToolsListRequest()),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!toolsResponse.ok) {
        const error = `HTTP ${toolsResponse.status}`;
        this.updateToolFilter(filterId, [], error);
        return { success: false, error, toolCount: 0 };
      }

      // Parse response - handle both JSON and SSE
      let result: McpToolsResponse;
      const contentType = toolsResponse.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // Parse SSE response - extract JSON from data: field
        // Following MCP SDK pattern: event-source automatically handles SSE format
        const text = await toolsResponse.text();
        let jsonStr: string | null = null;

        // Process lines to find first data line with JSON object
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: {")) {
            jsonStr = line.slice(6); // Remove "data: " prefix
            break;
          }
        }

        if (!jsonStr) {
          const error = "No JSON data in SSE response";
          this.updateToolFilter(filterId, [], error);
          return { success: false, error, toolCount: 0 };
        }

        try {
          result = JSON.parse(jsonStr);
        } catch (parseError) {
          const error = `Failed to parse SSE data: ${parseError instanceof Error ? parseError.message : "unknown error"}`;
          this.updateToolFilter(filterId, [], error);
          return { success: false, error, toolCount: 0 };
        }
      } else {
        // Parse JSON response
        result = (await toolsResponse.json()) as McpToolsResponse;
      }

      if (result.result?.tools) {
        const tools = result.result.tools;
        this.updateToolFilter(filterId, tools);
        return { success: true, toolCount: tools.length };
      }

      const error = "No tools in response";
      this.updateToolFilter(filterId, [], error);
      return { success: false, error, toolCount: 0 };
    } catch (err) {
      const error =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Timeout"
            : err.message
          : "Unknown error";
      this.updateToolFilter(filterId, [], error);
      return { success: false, error, toolCount: 0 };
    }
  }

  /** Test any server */
  async testServer(server: Server, type: "local" | "remote"): Promise<ServerTestResult> {
    if (type === "local") {
      return this.testLocalServer(server as LocalServer);
    }
    return this.testRemoteServer(server as RemoteServer);
  }

  /** Get servers without discovered tools */
  getServersWithoutTools(): {
    local: LocalServer[];
    remote: RemoteServer[];
  } {
    const configService = getConfigService();
    const toolFilters = configService.getToolFilters();

    const local = configService.getLocalServers().filter((server) => {
      const filter = toolFilters[server.id];
      return !filter || !filter.allTools || filter.allTools.length === 0;
    });

    const remote = configService.getRemoteServers().filter((server) => {
      const filter = toolFilters[`remote:${server.id}`];
      return !filter || !filter.allTools || filter.allTools.length === 0;
    });

    return { local, remote };
  }

  /** Test all servers */
  async testAllServers(): Promise<
    Array<{ server: Server; type: "local" | "remote"; result: ServerTestResult }>
  > {
    const configService = getConfigService();

    const localPromises = configService.getLocalServers().map(async (server) => ({
      server: server as Server,
      type: "local" as const,
      result: await this.testLocalServer(server),
    }));

    const remotePromises = configService.getRemoteServers().map(async (server) => ({
      server: server as Server,
      type: "remote" as const,
      result: await this.testRemoteServer(server),
    }));

    return Promise.all([...localPromises, ...remotePromises]);
  }

  /** Auto-test servers without tools */
  async autoTestUnknownServers(): Promise<void> {
    const { local, remote } = this.getServersWithoutTools();

    if (local.length === 0 && remote.length === 0) {
      return;
    }

    const localPromises = local.map((server) => this.testLocalServer(server));
    const remotePromises = remote.map((server) => this.testRemoteServer(server));

    await Promise.all([...localPromises, ...remotePromises]);
  }
}

/** Singleton instance */
let instance: TestingService | null = null;

/** Get or create the testing service instance */
export function getTestingService(): TestingService {
  if (!instance) {
    instance = new TestingService();
  }
  return instance;
}

/** Reset the singleton instance (for testing) */
export function resetTestingService(): void {
  instance = null;
}

export default TestingService;
