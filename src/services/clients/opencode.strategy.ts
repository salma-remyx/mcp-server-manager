/**
 * OpenCode Strategy - Strategy for OpenCode CLI
 * OpenCode uses 'mcp' key for servers and has multiple possible config locations
 */

import fs from "fs";
import path from "path";
import { JsonClientStrategy } from "./json-client.strategy.js";
import type {
  ClientMetadata,
  ClientCapabilities,
  ClientPlatformPaths,
} from "../../types/client-strategy.types.js";
import type { ClientMcpConfig, Platform } from "../../types/index.js";

export class OpenCodeStrategy extends JsonClientStrategy {
  readonly metadata: ClientMetadata = {
    id: "opencode",
    displayName: "OpenCode",
    description: "OpenCode AI agent CLI",
  };

  readonly capabilities: ClientCapabilities = {
    supportsRealTimeReload: false,
    hasSecondaryConfigPath: false,
    configFormat: "json",
    gatewayType: "stdio",
    serversKey: "mcp",
  };

  readonly paths: ClientPlatformPaths = {
    // Primary path is the first location to check: $HOME/.opencode.json
    primary: {
      darwin: path.join(this.getHomedir(), ".opencode.json"),
      win32: path.join(this.getHomedir(), ".opencode.json"),
      linux: path.join(this.getHomedir(), ".opencode.json"),
    },
    binaryPaths: {
      darwin: "/usr/local/bin/opencode",
      linux: "/usr/local/bin/opencode",
    },
  };

  /**
   * Get all possible config paths in search order:
   * 1. $HOME/.opencode.json
   * 2. $XDG_CONFIG_HOME/opencode/.opencode.json
   * 3. $HOME/.config/opencode/.opencode.json
   */
  private getConfigSearchPaths(): string[] {
    const homedir = this.getHomedir();
    const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(homedir, ".config");

    return [
      path.join(homedir, ".opencode.json"),
      path.join(xdgConfigHome, "opencode", ".opencode.json"),
      path.join(homedir, ".config", "opencode", ".opencode.json"),
    ];
  }

  /**
   * Find the first existing config file path
   */
  private findExistingConfigPath(): string | null {
    for (const configPath of this.getConfigSearchPaths()) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    return null;
  }

  /**
   * Get the path to use for writing config
   * Uses existing path if found, otherwise uses primary path
   */
  private getWriteConfigPath(): string {
    const existingPath = this.findExistingConfigPath();
    if (existingPath) {
      return existingPath;
    }
    // Default to primary path ($HOME/.opencode.json)
    return this.getConfigSearchPaths()[0];
  }

  /**
   * Override isInstalled to check all possible config locations
   */
  isInstalled(platform: Platform): boolean {
    // Check if any config file exists
    if (this.findExistingConfigPath()) return true;

    // Check parent directories for any of the config locations
    for (const configPath of this.getConfigSearchPaths()) {
      const parentDir = path.dirname(configPath);
      if (fs.existsSync(parentDir)) {
        // For the home directory config, just check if home exists
        if (configPath === this.getConfigSearchPaths()[0]) {
          return true;
        }
      }
    }

    // Check binary paths
    const binaryPath = this.paths.binaryPaths?.[platform];
    if (binaryPath && fs.existsSync(binaryPath)) return true;

    return false;
  }

  /**
   * Override readConfig to check all possible config locations
   */
  readConfig(): ClientMcpConfig | null {
    const configPath = this.findExistingConfigPath();

    if (!configPath) {
      return null;
    }

    try {
      const data = fs.readFileSync(configPath, "utf8");
      return JSON.parse(data) as ClientMcpConfig;
    } catch (error) {
      this.log.debug(`Failed to read config from ${configPath}:`, error);
      return null;
    }
  }

  /**
   * Override writeConfig to use appropriate config location
   */
  writeConfig(config: ClientMcpConfig): boolean {
    const configPath = this.getWriteConfigPath();

    try {
      this.ensureDirectory(configPath);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      this.log.debug(`Failed to write config to ${configPath}:`, error);
      return false;
    }
  }
}
