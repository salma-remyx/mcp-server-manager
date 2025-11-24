/**
 * Client service - manages MCP client detection and sync
 */

import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import TOML from "@iarna/toml";
import type {
  ClientId,
  Platform,
  ClientPathsConfig,
  ClientNames,
  DetectedClient,
  ClientStatus,
  ClientMcpConfig,
  ClaudeServerConfig,
  OperationResult,
} from "../types/index.js";
import { getConfigService } from "./config.service.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("ClientService");

/** Client configuration paths by platform */
const CLIENT_PATHS: ClientPathsConfig = {
  claude: {
    darwin: path.join(
      os.homedir(),
      "Library/Application Support/Claude/claude_desktop_config.json"
    ),
    win32: path.join(process.env.APPDATA || "", "Claude/claude_desktop_config.json"),
    linux: path.join(os.homedir(), ".config/Claude/claude_desktop_config.json"),
  },
  cursor: {
    darwin: path.join(
      os.homedir(),
      "Library/Application Support/Cursor/User/globalStorage/cursor.mcp/config.json"
    ),
    win32: path.join(process.env.APPDATA || "", "Cursor/User/globalStorage/cursor.mcp/config.json"),
    linux: path.join(os.homedir(), ".config/Cursor/User/globalStorage/cursor.mcp/config.json"),
  },
  windsurf: {
    darwin: path.join(
      os.homedir(),
      "Library/Application Support/Windsurf/User/globalStorage/windsurf.mcp/config.json"
    ),
    win32: path.join(
      process.env.APPDATA || "",
      "Windsurf/User/globalStorage/windsurf.mcp/config.json"
    ),
    linux: path.join(os.homedir(), ".config/Windsurf/User/globalStorage/windsurf.mcp/config.json"),
  },
  vscode: {
    darwin: path.join(os.homedir(), ".continue/config.json"),
    win32: path.join(os.homedir(), ".continue/config.json"),
    linux: path.join(os.homedir(), ".continue/config.json"),
  },
  "claude-code": {
    darwin: path.join(os.homedir(), ".claude/claude_code_config.json"),
    win32: path.join(os.homedir(), ".claude/claude_code_config.json"),
    linux: path.join(os.homedir(), ".claude/claude_code_config.json"),
  },
  codex: {
    darwin: path.join(os.homedir(), ".codex/config.toml"),
    win32: path.join(os.homedir(), ".codex/config.toml"),
    linux: path.join(os.homedir(), ".codex/config.toml"),
  },
  gemini: {
    darwin: path.join(os.homedir(), ".gemini/settings.json"),
    win32: path.join(os.homedir(), ".gemini/settings.json"),
    linux: path.join(os.homedir(), ".gemini/settings.json"),
  },
};

/** Additional MCP config paths for real-time loading (per client) */
const ADDITIONAL_MCP_PATHS: Record<ClientId, string | null> = {
  cursor: path.join(os.homedir(), ".cursor/mcp.json"),
  windsurf: path.join(os.homedir(), ".windsurf/mcp.json"),
  vscode: path.join(os.homedir(), ".continue/mcp.json"),
  claude: path.join(os.homedir(), ".claude/mcp.json"),
  "claude-code": null,
  codex: null,
  gemini: null,
};

/** Client display names */
const CLIENT_NAMES: ClientNames = {
  claude: "Claude Desktop",
  cursor: "Cursor",
  windsurf: "Windsurf",
  vscode: "VS Code (Continue)",
  "claude-code": "Claude Code",
  codex: "Codex CLI",
  gemini: "Gemini CLI",
};

/** Client service class */
export class ClientService {
  constructor() {
    // No initialization needed after removing state management
  }

  /** Get current platform */
  private getPlatform(): Platform {
    return process.platform as Platform;
  }

  /** Get config path for a client on current platform */
  getClientConfigPath(clientId: ClientId): string | null {
    const paths = CLIENT_PATHS[clientId];
    if (!paths) return null;
    return paths[this.getPlatform()] || null;
  }

  /** Get client display name */
  getClientName(clientId: ClientId): string {
    return CLIENT_NAMES[clientId] || clientId;
  }

  /** Get all supported client IDs */
  getSupportedClients(): ClientId[] {
    return Object.keys(CLIENT_PATHS) as ClientId[];
  }

  /** Check if a client is installed */
  isClientInstalled(clientId: ClientId): boolean {
    const configPath = this.getClientConfigPath(clientId);
    if (!configPath) return false;

    // Check if config file exists OR if parent directory exists
    if (fs.existsSync(configPath)) return true;

    const parentDir = path.dirname(configPath);
    if (fs.existsSync(parentDir)) return true;

    // For macOS, also check if the Application bundle exists
    if (process.platform === "darwin") {
      const appBundles: Record<ClientId, string> = {
        claude: "/Applications/Claude.app",
        cursor: "/Applications/Cursor.app",
        windsurf: "/Applications/Windsurf.app",
        vscode: "/Applications/Visual Studio Code.app",
        "claude-code": "/Applications/Claude.app",
        codex: "/usr/local/bin/codex",
        gemini: "/usr/local/bin/gemini",
      };

      const appPath = appBundles[clientId];
      if (appPath && fs.existsSync(appPath)) return true;
    }

    return false;
  }

  /** Read Codex TOML config and convert to standard format */
  private readCodexConfig(): ClientMcpConfig | null {
    const configPath = this.getClientConfigPath("codex");
    if (!configPath || !fs.existsSync(configPath)) return null;

    try {
      const data = fs.readFileSync(configPath, "utf8");
      const tomlConfig = TOML.parse(data);
      const mcpServers: Record<string, ClaudeServerConfig> = {};

      // Convert mcp_servers from TOML format to standard format
      const mcpServersToml = tomlConfig.mcp_servers as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (mcpServersToml) {
        for (const [name, server] of Object.entries(mcpServersToml)) {
          if (server.command) {
            mcpServers[name] = {
              command: server.command as string,
              args: (server.args as string[]) || [],
              env: server.env as Record<string, string> | undefined,
            };
          }
        }
      }

      return { mcpServers };
    } catch (error) {
      log.debug("Failed to read Codex config:", error);
      return null;
    }
  }

  /** Write Codex config in TOML format */
  private writeCodexConfig(config: ClientMcpConfig): boolean {
    const configPath = this.getClientConfigPath("codex");
    if (!configPath) return false;

    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Read existing config to preserve other settings
      let existingConfig: TOML.JsonMap = {};
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf8");
        existingConfig = TOML.parse(data);
      }

      // Convert mcpServers to mcp_servers TOML format
      const mcpServers: TOML.JsonMap = {};
      if (config.mcpServers) {
        for (const [name, server] of Object.entries(config.mcpServers)) {
          const serverConfig: TOML.JsonMap = {
            command: server.command,
          };
          if (server.args && server.args.length > 0) {
            serverConfig.args = server.args;
          }
          if (server.env) {
            serverConfig.env = server.env;
          }
          mcpServers[name] = serverConfig;
        }
      }

      existingConfig.mcp_servers = mcpServers;

      fs.writeFileSync(configPath, TOML.stringify(existingConfig));
      return true;
    } catch (error) {
      log.debug("Failed to write Codex config:", error);
      return false;
    }
  }

  /** Read client's current config */
  readClientConfig(clientId: ClientId): ClientMcpConfig | null {
    // Handle TOML-based clients
    if (clientId === "codex") {
      return this.readCodexConfig();
    }

    // For clients with real-time MCP loading, read from the additional MCP path only
    // This is the source of truth for connection status
    const additionalMcpPath = ADDITIONAL_MCP_PATHS[clientId];
    if (additionalMcpPath) {
      try {
        if (fs.existsSync(additionalMcpPath)) {
          const data = fs.readFileSync(additionalMcpPath, "utf8");
          return JSON.parse(data) as ClientMcpConfig;
        }
      } catch (error) {
        log.debug(`Failed to read additional MCP config from ${additionalMcpPath}:`, error);
      }
      return null;
    }

    // For clients without real-time loading, fall back to primary config
    const configPath = this.getClientConfigPath(clientId);
    if (!configPath) return null;

    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf8");
        return JSON.parse(data) as ClientMcpConfig;
      }
    } catch (error) {
      log.debug(`Failed to read ${clientId} config:`, error);
    }

    return null;
  }

  /** Write client's config */
  writeClientConfig(clientId: ClientId, config: ClientMcpConfig): boolean {
    // Handle TOML-based clients
    if (clientId === "codex") {
      return this.writeCodexConfig(config);
    }

    const configPath = this.getClientConfigPath(clientId);
    if (!configPath) return false;

    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      log.debug(`Failed to write ${clientId} config:`, error);
      return false;
    }
  }

  /** Detect all installed clients */
  detectClients(): DetectedClient[] {
    const clients: DetectedClient[] = [];

    for (const clientId of this.getSupportedClients()) {
      const configPath = this.getClientConfigPath(clientId);
      const installed = this.isClientInstalled(clientId);
      const currentConfig = this.readClientConfig(clientId);

      // Determine connection status
      let status: ClientStatus;
      if (!installed) {
        status = "not-installed";
      } else {
        // Check if connected (has mcpsm gateway)
        const connected = !!currentConfig?.mcpServers?.mcpsm;
        status = connected ? "connected" : "disconnected";
      }

      // Count servers: all servers in config (including mcpsm when connected)
      let serverCount = 0;
      if (currentConfig?.mcpServers) {
        serverCount = Object.keys(currentConfig.mcpServers).length;
      }

      clients.push({
        id: clientId,
        name: CLIENT_NAMES[clientId] || clientId,
        configPath,
        mcpConfigPath: ADDITIONAL_MCP_PATHS[clientId] || null,
        installed,
        hasConfig: !!currentConfig,
        status,
        serverCount,
      });
    }

    return clients;
  }

  /** Connect servers to a specific client (add mcpsm gateway to client config) */
  connectClient(clientId: ClientId): OperationResult {
    if (!this.isClientInstalled(clientId)) {
      return { success: false, error: "Client not installed" };
    }

    const configService = getConfigService();
    const port = configService.getPort();

    // For clients with real-time MCP loading, use the additional MCP path as source of truth
    const additionalMcpPath = ADDITIONAL_MCP_PATHS[clientId];
    if (additionalMcpPath) {
      try {
        // Read current config from additional MCP path
        let clientConfig: ClientMcpConfig = {};
        if (fs.existsSync(additionalMcpPath)) {
          try {
            const data = fs.readFileSync(additionalMcpPath, "utf8");
            clientConfig = JSON.parse(data) as ClientMcpConfig;
          } catch (error) {
            log.debug(`Failed to read additional MCP config from ${additionalMcpPath}:`, error);
          }
        }

        // Initialize mcpServers if not present
        if (!clientConfig.mcpServers) {
          clientConfig.mcpServers = {};
        }

        // Add mcpsm gateway server
        clientConfig.mcpServers.mcpsm = {
          command: "npx",
          args: ["-y", "mcp-proxy", "--transport", "stdio", `http://localhost:${port}/mcp`],
        };

        // Write to additional MCP path only (the source of truth)
        const dir = path.dirname(additionalMcpPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(additionalMcpPath, JSON.stringify(clientConfig, null, 2));
        return { success: true };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Failed to write config: ${errorMsg}` };
      }
    }

    // For clients without real-time loading, use primary config
    const configPath = this.getClientConfigPath(clientId);
    if (!configPath) {
      return { success: false, error: "Unknown client" };
    }

    try {
      let clientConfig: ClientMcpConfig = {};
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf8");
        clientConfig = JSON.parse(data) as ClientMcpConfig;
      }

      if (!clientConfig.mcpServers) {
        clientConfig.mcpServers = {};
      }

      clientConfig.mcpServers.mcpsm = {
        command: "npx",
        args: ["-y", "mcp-proxy", "--transport", "stdio", `http://localhost:${port}/mcp`],
      };

      const success = this.writeClientConfig(clientId, clientConfig);
      return {
        success,
        error: success ? undefined : "Failed to write config",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: `Failed to connect: ${errorMsg}` };
    }
  }

  /** Disconnect servers from a specific client (remove our servers from client config) */
  disconnectClient(clientId: ClientId): OperationResult {
    // For clients with real-time MCP loading, use the additional MCP path as source of truth
    const additionalMcpPath = ADDITIONAL_MCP_PATHS[clientId];
    if (additionalMcpPath) {
      try {
        // Read current config from additional MCP path
        let currentConfig: ClientMcpConfig | null = null;
        if (fs.existsSync(additionalMcpPath)) {
          try {
            const data = fs.readFileSync(additionalMcpPath, "utf8");
            currentConfig = JSON.parse(data) as ClientMcpConfig;
          } catch (error) {
            log.debug(`Failed to read additional MCP config from ${additionalMcpPath}:`, error);
          }
        }

        // If no config or no mcpsm, already disconnected
        if (!currentConfig || !currentConfig.mcpServers || !currentConfig.mcpServers.mcpsm) {
          return { success: true };
        }

        // Remove mcpsm gateway
        delete currentConfig.mcpServers.mcpsm;

        // Write to additional MCP path only (the source of truth)
        const dir = path.dirname(additionalMcpPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(additionalMcpPath, JSON.stringify(currentConfig, null, 2));
        return { success: true };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Failed to write config: ${errorMsg}` };
      }
    }

    // For clients without real-time loading, use primary config
    const configPath = this.getClientConfigPath(clientId);
    if (!configPath) {
      return { success: false, error: "Unknown client" };
    }

    try {
      let currentConfig: ClientMcpConfig | null = null;
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf8");
        currentConfig = JSON.parse(data) as ClientMcpConfig;
      }

      if (!currentConfig || !currentConfig.mcpServers || !currentConfig.mcpServers.mcpsm) {
        return { success: true };
      }

      delete currentConfig.mcpServers.mcpsm;

      const success = this.writeClientConfig(clientId, currentConfig);
      return {
        success,
        error: success ? undefined : "Failed to write config",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: `Failed to disconnect: ${errorMsg}` };
    }
  }

  /** Get connection status for a client */
  getConnectionStatus(clientId: ClientId): ClientStatus {
    const installed = this.isClientInstalled(clientId);
    if (!installed) {
      return "not-installed";
    }

    const currentConfig = this.readClientConfig(clientId);

    if (currentConfig?.mcpServers?.mcpsm) {
      return "connected";
    }

    return "disconnected";
  }

  /** Open client config in editor */
  openClientConfig(clientId: ClientId): OperationResult {
    const configPath = this.getClientConfigPath(clientId);
    if (!configPath) {
      return { success: false, error: "Unknown client" };
    }

    if (!fs.existsSync(configPath)) {
      return { success: false, error: "Config file does not exist" };
    }

    const editor = process.env.EDITOR || process.env.VISUAL || "vi";

    try {
      spawnSync(editor, [configPath], { stdio: "inherit" });
      return { success: true };
    } catch (e) {
      const error = e instanceof Error ? e.message : "Unknown error";
      return { success: false, error };
    }
  }

  /** Check if client exists */
  clientExists(clientId: string): clientId is ClientId {
    return clientId in CLIENT_PATHS;
  }
}

/** Singleton instance */
let instance: ClientService | null = null;

/** Get or create the client service instance */
export function getClientService(): ClientService {
  if (!instance) {
    instance = new ClientService();
  }
  return instance;
}

/** Reset the singleton instance (for testing) */
export function resetClientService(): void {
  instance = null;
}

export default ClientService;
