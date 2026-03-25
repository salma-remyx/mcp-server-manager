/**
 * Copilot CLI Strategy - Strategy for GitHub Copilot CLI
 * GitHub Copilot CLI is a command-line tool that uses MCP servers
 */

import path from "path";
import { JsonClientStrategy } from "./json-client.strategy.js";
import type {
  ClientMetadata,
  ClientCapabilities,
  ClientPlatformPaths,
} from "../../types/client-strategy.types.js";
import type { ClientServerConfig } from "../../types/index.js";

export class CopilotStrategy extends JsonClientStrategy {
  readonly metadata: ClientMetadata = {
    id: "copilot",
    displayName: "GitHub Copilot CLI",
    description: "GitHub Copilot command-line interface",
  };

  readonly capabilities: ClientCapabilities = {
    supportsRealTimeReload: false,
    hasSecondaryConfigPath: false,
    configFormat: "json",
    gatewayType: "url-only",
  };

  readonly paths: ClientPlatformPaths = {
    primary: {
      darwin: path.join(this.getHomedir(), ".copilot/mcp-config.json"),
      win32: path.join(this.getHomedir(), ".copilot/mcp-config.json"),
      linux: path.join(this.getHomedir(), ".copilot/mcp-config.json"),
    },
    binaryPaths: {
      darwin: "/usr/local/bin/gh",
      win32: path.join(this.getHomedir(), "AppData", "Local", "Microsoft", "WindowsApp", "gh.exe"),
      linux: "/usr/bin/gh",
    },
  };

  buildGatewayConfig(port: number, profileId?: string): ClientServerConfig {
    const mcpPath = profileId ? `/mcp/${profileId}` : "/mcp";
    return {
      type: "http",
      url: `http://localhost:${port}${mcpPath}`,
      headers: {},
    };
  }
}
