/**
 * TOML Client Strategy - Base class for TOML-based client strategies
 * Handles TOML config reading/writing with conversion to standard format
 */

import fs from "fs";
import TOML from "@iarna/toml";
import { BaseClientStrategy } from "./base-client.strategy.js";
import type { ClientMcpConfig } from "../../types/index.js";

/**
 * Base class for TOML-based client strategies
 * Handles TOML config reading/writing with conversion to standard format
 */
export abstract class TomlClientStrategy extends BaseClientStrategy {
  readConfig(): ClientMcpConfig | null {
    const platform = this.getPlatform();
    const configPath = this.getPrimaryConfigPath(platform);

    if (!configPath || !fs.existsSync(configPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(configPath, "utf8");
      const tomlConfig = TOML.parse(data);
      return this.tomlToStandardConfig(tomlConfig);
    } catch (error) {
      this.log.debug(`Failed to read TOML config from ${configPath}:`, error);
      return null;
    }
  }

  writeConfig(config: ClientMcpConfig): boolean {
    const platform = this.getPlatform();
    const configPath = this.getPrimaryConfigPath(platform);

    if (!configPath) return false;

    try {
      this.ensureDirectory(configPath);

      // Read existing config to preserve other settings
      let existingConfig: TOML.JsonMap = {};
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf8");
        existingConfig = TOML.parse(data);
      }

      // Convert and merge
      const tomlConfig = this.standardToTomlConfig(config, existingConfig);
      fs.writeFileSync(configPath, TOML.stringify(tomlConfig));
      return true;
    } catch (error) {
      this.log.debug(`Failed to write TOML config to ${configPath}:`, error);
      return false;
    }
  }

  /**
   * Convert TOML config to standard ClientMcpConfig format
   */
  protected abstract tomlToStandardConfig(tomlConfig: TOML.JsonMap): ClientMcpConfig;

  /**
   * Convert standard ClientMcpConfig to TOML format, merging with existing config
   */
  protected abstract standardToTomlConfig(
    config: ClientMcpConfig,
    existingConfig: TOML.JsonMap
  ): TOML.JsonMap;
}
