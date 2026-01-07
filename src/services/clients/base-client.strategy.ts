/**
 * Base Client Strategy - Abstract base class for all client strategies
 * Provides common functionality and enforces the strategy contract
 */

import fs from "fs";
import path from "path";
import os from "os";
import type {
  IClientStrategy,
  ClientMetadata,
  ClientCapabilities,
  ClientPlatformPaths,
} from "../../types/client-strategy.types.js";
import type {
  Platform,
  ClientMcpConfig,
  ClientServerConfig,
  OperationResult,
  ClientStatus,
} from "../../types/index.js";
import { createLogger } from "../../shared/logger.js";

/**
 * Abstract base class for all client strategies
 * Provides common functionality and enforces the strategy contract
 */
export abstract class BaseClientStrategy implements IClientStrategy {
  protected readonly log;

  abstract readonly metadata: ClientMetadata;
  abstract readonly capabilities: ClientCapabilities;
  abstract readonly paths: ClientPlatformPaths;

  constructor() {
    this.log = createLogger(this.constructor.name);
  }

  // === Platform Helpers ===

  protected getPlatform(): Platform {
    return process.platform as Platform;
  }

  protected getHomedir(): string {
    return os.homedir();
  }

  protected getAppData(): string {
    return process.env.APPDATA || "";
  }

  // === Path Resolution ===

  getPrimaryConfigPath(platform: Platform): string | null {
    return this.paths.primary[platform] || null;
  }

  getSecondaryConfigPath(): string | null {
    return this.paths.secondary || null;
  }

  getEffectiveConfigPath(platform: Platform): string | null {
    // Real-time clients use secondary path as source of truth
    if (this.capabilities.hasSecondaryConfigPath && this.paths.secondary) {
      return this.paths.secondary;
    }
    return this.paths.primary[platform] || null;
  }

  // === Installation Detection ===

  isInstalled(platform: Platform): boolean {
    const configPath = this.getPrimaryConfigPath(platform);
    if (!configPath) return false;

    // Check if config file exists
    if (fs.existsSync(configPath)) return true;

    // Check if parent directory exists
    const parentDir = path.dirname(configPath);
    if (fs.existsSync(parentDir)) return true;

    // Check app bundles (macOS)
    if (platform === "darwin" && this.paths.appBundles?.darwin) {
      if (fs.existsSync(this.paths.appBundles.darwin)) return true;
    }

    // Check binary paths (CLI tools)
    const binaryPath = this.paths.binaryPaths?.[platform];
    if (binaryPath && fs.existsSync(binaryPath)) return true;

    return false;
  }

  // === Configuration I/O (Abstract - must be implemented by subclasses) ===

  abstract readConfig(): ClientMcpConfig | null;
  abstract writeConfig(config: ClientMcpConfig): boolean;

  // === Gateway Management ===

  abstract buildGatewayConfig(port: number): ClientServerConfig;

  hasGateway(config: ClientMcpConfig | null): boolean {
    if (!config) return false;

    const serversKey = this.capabilities.serversKey;
    let servers: Record<string, ClientServerConfig> | undefined;
    if (serversKey === "servers") {
      servers = config.servers;
    } else if (serversKey === "mcp") {
      servers = config.mcp;
    } else {
      servers = config.mcpServers;
    }
    const gateway = servers?.mcpsm;

    if (!gateway) return false;

    return !!(
      gateway.command ||
      gateway.url ||
      gateway.type ||
      (gateway.args && gateway.args.length > 0) ||
      (gateway.env && Object.keys(gateway.env).length > 0)
    );
  }

  addGateway(config: ClientMcpConfig, port: number): ClientMcpConfig {
    const serversKey = this.capabilities.serversKey;
    const gatewayConfig = this.buildGatewayConfig(port);

    if (serversKey === "servers") {
      return {
        ...config,
        servers: {
          ...config.servers,
          mcpsm: gatewayConfig,
        },
      };
    }

    if (serversKey === "mcp") {
      return {
        ...config,
        mcp: {
          ...config.mcp,
          mcpsm: gatewayConfig,
        },
      };
    }

    return {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        mcpsm: gatewayConfig,
      },
    };
  }

  removeGateway(config: ClientMcpConfig): ClientMcpConfig {
    const serversKey = this.capabilities.serversKey;
    const result = { ...config };

    if (serversKey === "servers" && result.servers?.mcpsm) {
      const { mcpsm: _, ...rest } = result.servers;
      result.servers = rest;
    } else if (serversKey === "mcp" && result.mcp?.mcpsm) {
      const { mcpsm: _, ...rest } = result.mcp;
      result.mcp = rest;
    } else if (result.mcpServers?.mcpsm) {
      const { mcpsm: _, ...rest } = result.mcpServers;
      result.mcpServers = rest;
    }

    return result;
  }

  // === High-Level Operations ===

  connect(port: number): OperationResult {
    const platform = this.getPlatform();

    if (!this.isInstalled(platform)) {
      return { success: false, error: "Client not installed" };
    }

    try {
      let config = this.readConfig() || {};
      config = this.addGateway(config, port);

      const success = this.writeConfig(config);
      return {
        success,
        error: success ? undefined : "Failed to write config",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: `Failed to connect: ${errorMsg}` };
    }
  }

  disconnect(): OperationResult {
    try {
      const config = this.readConfig();

      if (!config || !this.hasGateway(config)) {
        return { success: true }; // Already disconnected
      }

      const updatedConfig = this.removeGateway(config);
      const success = this.writeConfig(updatedConfig);

      return {
        success,
        error: success ? undefined : "Failed to write config",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: `Failed to disconnect: ${errorMsg}` };
    }
  }

  getStatus(platform: Platform): ClientStatus {
    if (!this.isInstalled(platform)) {
      return "not-installed";
    }

    const config = this.readConfig();
    return this.hasGateway(config) ? "connected" : "disconnected";
  }

  getServerCount(): number {
    const config = this.readConfig();
    if (!config) return 0;

    let count = 0;
    if (config.mcpServers) count += Object.keys(config.mcpServers).length;
    if (config.servers) count += Object.keys(config.servers).length;
    if (config.mcp) count += Object.keys(config.mcp).length;
    return count;
  }

  // === Helper Methods ===

  protected ensureDirectory(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
