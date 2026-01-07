/**
 * Zed Strategy - Strategy for Zed editor
 * Uses settings.json with context_servers entries
 */

import fs from "fs";
import path from "path";
import { BaseClientStrategy } from "./base-client.strategy.js";
import type {
  ClientMetadata,
  ClientCapabilities,
  ClientPlatformPaths,
} from "../../types/client-strategy.types.js";
import type { ClientMcpConfig, ClientServerConfig } from "../../types/index.js";

type ZedContextServer = {
  url?: string;
  headers?: Record<string, string>;
  settings?: Record<string, unknown>;
};

type ZedConfig = ClientMcpConfig & {
  context_servers?: Record<string, ZedContextServer>;
};

const GATEWAY_ID = "mcpsm";

function stripJsonComments(input: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        result += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    result += char;
  }

  return result;
}

function stripTrailingCommas(input: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === ",") {
      let j = i + 1;
      while (j < input.length) {
        const next = input[j];
        if (next === " " || next === "\t" || next === "\n" || next === "\r") {
          j += 1;
          continue;
        }
        if (next === "}" || next === "]") {
          break;
        }
        j = -1;
        break;
      }

      if (j > 0 && j < input.length && (input[j] === "}" || input[j] === "]")) {
        continue;
      }
    }

    result += char;
  }

  return result;
}

function parseJsonWithComments(input: string): ZedConfig | null {
  try {
    const sanitized = stripTrailingCommas(stripJsonComments(input));
    return JSON.parse(sanitized) as ZedConfig;
  } catch {
    return null;
  }
}

export class ZedStrategy extends BaseClientStrategy {
  readonly metadata: ClientMetadata = {
    id: "zed",
    displayName: "Zed",
    description: "Zed editor",
  };

  readonly capabilities: ClientCapabilities = {
    supportsRealTimeReload: true,
    hasSecondaryConfigPath: false,
    configFormat: "json",
    gatewayType: "url-only",
  };

  readonly paths: ClientPlatformPaths = {
    primary: {
      darwin: path.join(this.getHomedir(), ".config/zed/settings.json"),
      win32: path.join(this.getAppData(), "Zed/settings.json"),
      linux: path.join(this.getHomedir(), ".config/zed/settings.json"),
    },
    appBundles: {
      darwin: "/Applications/Zed.app",
    },
  };

  // === Server Container Access (Zed uses context_servers, not standard MCP keys) ===
  // These are implemented for abstract contract but gateway methods are fully overridden

  protected getServersFromConfig(
    _config: ClientMcpConfig
  ): Record<string, ClientServerConfig> | undefined {
    // Zed uses context_servers, not mcpServers/servers
    // Gateway methods are fully overridden to use context_servers
    return undefined;
  }

  protected setServersInConfig(
    config: ClientMcpConfig,
    _servers: Record<string, ClientServerConfig>
  ): ClientMcpConfig {
    // Zed uses context_servers, not mcpServers/servers
    // Gateway methods are fully overridden to use context_servers
    return config;
  }

  readConfig(): ClientMcpConfig | null {
    const platform = this.getPlatform();
    const configPath = this.getEffectiveConfigPath(platform);

    if (!configPath || !fs.existsSync(configPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(configPath, "utf8");
      const parsed = parseJsonWithComments(data);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      return parsed;
    } catch (error) {
      this.log.debug(`Failed to read config from ${configPath}:`, error);
      return null;
    }
  }

  writeConfig(config: ClientMcpConfig): boolean {
    const platform = this.getPlatform();
    const configPath = this.getEffectiveConfigPath(platform);

    if (!configPath) return false;

    try {
      this.ensureDirectory(configPath);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      this.log.debug(`Failed to write config to ${configPath}:`, error);
      return false;
    }
  }

  buildGatewayConfig(port: number): ClientServerConfig {
    return {
      url: `http://localhost:${port}/mcp`,
    };
  }

  hasGateway(config: ClientMcpConfig | null): boolean {
    if (!config) return false;

    const contextServers = (config as ZedConfig).context_servers;
    const gateway = contextServers?.[GATEWAY_ID];
    if (!gateway) return false;

    return !!(
      gateway.url ||
      (gateway.headers && Object.keys(gateway.headers).length > 0) ||
      (gateway.settings && Object.keys(gateway.settings).length > 0)
    );
  }

  addGateway(config: ClientMcpConfig, port: number): ClientMcpConfig {
    const zedConfig = config as ZedConfig;
    const contextServers = zedConfig.context_servers ?? {};
    const gatewayConfig: ZedContextServer = {
      ...(this.buildGatewayConfig(port) as ZedContextServer),
      headers: {},
      settings: {},
    };

    return {
      ...zedConfig,
      context_servers: {
        ...contextServers,
        [GATEWAY_ID]: gatewayConfig,
      },
    };
  }

  removeGateway(config: ClientMcpConfig): ClientMcpConfig {
    const zedConfig = config as ZedConfig;

    if (!zedConfig.context_servers?.[GATEWAY_ID]) {
      return config;
    }

    const { [GATEWAY_ID]: _, ...rest } = zedConfig.context_servers;
    return {
      ...zedConfig,
      context_servers: rest,
    };
  }

  getServerCount(): number {
    const config = this.readConfig() as ZedConfig | null;
    if (!config) return 0;

    const contextServers = config.context_servers || {};
    let count = Object.keys(contextServers).length;

    if (config.mcpServers) count += Object.keys(config.mcpServers).length;
    if (config.servers) count += Object.keys(config.servers).length;

    return count;
  }
}
