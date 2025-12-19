/**
 * JSON Client Strategy - Base class for JSON-based client strategies
 * Handles JSON config reading/writing
 */

import fs from "fs";
import { BaseClientStrategy } from "./base-client.strategy.js";
import type { ClientMcpConfig, ClientServerConfig } from "../../types/index.js";

/**
 * Base class for JSON-based client strategies
 * Handles JSON config reading/writing
 */
export abstract class JsonClientStrategy extends BaseClientStrategy {
  readConfig(): ClientMcpConfig | null {
    const platform = this.getPlatform();
    const configPath = this.getEffectiveConfigPath(platform);

    if (!configPath || !fs.existsSync(configPath)) {
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
      command: "npx",
      args: ["-y", "supergateway", "--streamableHttp", `http://localhost:${port}/mcp`],
    };
  }
}
