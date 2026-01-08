/**
 * Claude Desktop Strategy - Strategy for Claude Desktop application
 */

import path from "path";
import { JsonClientStrategy } from "./json-client.strategy.js";
import type {
  ClientMetadata,
  ClientCapabilities,
  ClientPlatformPaths,
} from "../../types/client-strategy.types.js";

export class ClaudeStrategy extends JsonClientStrategy {
  readonly metadata: ClientMetadata = {
    id: "claude",
    displayName: "Claude Desktop",
    description: "Anthropic's Claude Desktop application",
  };

  readonly capabilities: ClientCapabilities = {
    supportsRealTimeReload: false,
    hasSecondaryConfigPath: false,
    configFormat: "json",
    gatewayType: "stdio",
  };

  readonly paths: ClientPlatformPaths = {
    primary: {
      darwin: path.join(
        this.getHomedir(),
        "Library/Application Support/Claude/claude_desktop_config.json"
      ),
      win32: path.join(this.getAppData(), "Claude/claude_desktop_config.json"),
      linux: path.join(this.getHomedir(), ".config/Claude/claude_desktop_config.json"),
    },
    appBundles: {
      darwin: "/Applications/Claude.app",
    },
  };
}
