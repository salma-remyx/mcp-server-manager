import fs from "fs";
import path from "path";
import type { AppConfig, ConfigPaths, SelectionState, ToolFilters } from "../../types/index.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("ConfigRepository");

const DEFAULT_CONFIG: AppConfig = {
  servers: [],
  remoteServers: [],
  port: 8850,
};

export class ConfigRepository {
  private configDir: string;
  private paths: ConfigPaths;
  private config: AppConfig = { ...DEFAULT_CONFIG };
  private toolFilters: ToolFilters = {};
  private selectionState: SelectionState = { local: [], remote: [] };

  constructor(configDir?: string) {
    this.configDir =
      configDir ||
      process.env.MCP_MANAGER_CONFIG_DIR ||
      path.join(process.env.HOME || process.env.USERPROFILE || "", ".mcp-manager");

    this.paths = {
      configDir: this.configDir,
      configPath: path.join(this.configDir, "config.json"),
      toolFiltersPath: path.join(this.configDir, "tool-filters.json"),
      selectionStatePath: path.join(this.configDir, "selection-state.json"),
      settingsPath: path.join(this.configDir, "settings.json"),
      profilesPath: path.join(this.configDir, "profiles.json"),
      clientsStatePath: path.join(this.configDir, "clients.json"),
    };

    this.ensureConfigDir();
    this.reload();
  }

  reload(): void {
    this.config = this.loadConfig();
    this.toolFilters = this.loadToolFilters();
    this.selectionState = this.loadSelectionState();
  }

  getPaths(): ConfigPaths {
    return this.paths;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  saveConfig(): void {
    fs.writeFileSync(this.paths.configPath, JSON.stringify(this.config, null, 2));
  }

  updateConfig(mutator: (config: AppConfig) => void): void {
    mutator(this.config);
    this.saveConfig();
  }

  getToolFilters(): ToolFilters {
    return this.toolFilters;
  }

  saveToolFilters(): void {
    fs.writeFileSync(this.paths.toolFiltersPath, JSON.stringify(this.toolFilters, null, 2));
  }

  updateToolFilters(mutator: (filters: ToolFilters) => void): void {
    mutator(this.toolFilters);
    this.saveToolFilters();
  }

  getSelectionState(): SelectionState {
    return this.selectionState;
  }

  saveSelectionState(state: SelectionState): void {
    this.selectionState = state;
    fs.writeFileSync(this.paths.selectionStatePath, JSON.stringify(state, null, 2));
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.paths.configPath)) {
        const data = fs.readFileSync(this.paths.configPath, "utf8");
        const parsed = JSON.parse(data) as Partial<AppConfig>;

        const normalizeServers = (servers: unknown[]): AppConfig["servers"] =>
          Array.isArray(servers) ? servers.map((s) => s as AppConfig["servers"][number]) : [];

        const normalizeRemoteServers = (servers: unknown[]): AppConfig["remoteServers"] =>
          Array.isArray(servers) ? servers.map((s) => s as AppConfig["remoteServers"][number]) : [];

        return {
          servers: normalizeServers(parsed.servers || []),
          remoteServers: normalizeRemoteServers(parsed.remoteServers || []),
          port: typeof parsed.port === "number" ? parsed.port : DEFAULT_CONFIG.port,
        };
      }
    } catch (error) {
      log.debug("Failed to load config, using defaults:", error);
    }

    const fallback = { ...DEFAULT_CONFIG };
    fs.writeFileSync(this.paths.configPath, JSON.stringify(fallback, null, 2));
    return fallback;
  }

  private loadToolFilters(): ToolFilters {
    try {
      if (fs.existsSync(this.paths.toolFiltersPath)) {
        const data = fs.readFileSync(this.paths.toolFiltersPath, "utf8");
        return JSON.parse(data) as ToolFilters;
      }
    } catch (error) {
      log.debug("Failed to load tool filters:", error);
    }
    return {};
  }

  private loadSelectionState(): SelectionState {
    try {
      if (fs.existsSync(this.paths.selectionStatePath)) {
        const data = fs.readFileSync(this.paths.selectionStatePath, "utf8");
        return JSON.parse(data) as SelectionState;
      }
    } catch (error) {
      log.debug("Failed to load selection state:", error);
    }
    return { local: [], remote: [] };
  }
}
