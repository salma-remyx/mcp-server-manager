/**
 * Configuration service - manages app config, servers, and tool filters
 */

import fs from "fs";
import path from "path";
import type {
  AppConfig,
  ToolFilters,
  SelectionState,
  ConfigPaths,
  LocalServer,
  RemoteServer,
  Server,
  ServerToolFilter,
  Result,
} from "../types/index.js";
import {
  validatePort,
  validateUrl,
  validateServerId,
  validateServerName,
  validateCommand,
} from "../shared/validators.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("ConfigService");

/** Default configuration */
const DEFAULT_CONFIG: AppConfig = {
  servers: [],
  remoteServers: [],
  port: 8850,
};

/** Configuration service class */
export class ConfigService {
  private configDir: string;
  private paths: ConfigPaths;
  private config: AppConfig;
  private toolFilters: ToolFilters;
  private selectionState: SelectionState;

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

    this.config = { ...DEFAULT_CONFIG };
    this.toolFilters = {};
    this.selectionState = { local: [], remote: [] };

    this.ensureConfigDir();
    this.load();
  }

  /** Ensure config directory exists */
  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /** Load all configuration files */
  private load(): void {
    this.loadConfig();
    this.loadToolFilters();
    this.loadSelectionState();
  }

  /** Load main config file */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.paths.configPath)) {
        const data = fs.readFileSync(this.paths.configPath, "utf8");
        const parsed = JSON.parse(data) as Partial<AppConfig>;

        // Normalize servers to ensure disabled property defaults to false
        const normalizeServers = (servers: unknown[]): LocalServer[] => {
          return Array.isArray(servers)
            ? servers.map((s: unknown) => ({
                ...(s as LocalServer),
                disabled: (s as LocalServer).disabled ?? false,
              }))
            : [];
        };

        const normalizeRemoteServers = (servers: unknown[]): RemoteServer[] => {
          return Array.isArray(servers)
            ? servers.map((s: unknown) => ({
                ...(s as RemoteServer),
                disabled: (s as RemoteServer).disabled ?? false,
              }))
            : [];
        };

        this.config = {
          servers: normalizeServers(parsed.servers || []),
          remoteServers: normalizeRemoteServers(parsed.remoteServers || []),
          port: typeof parsed.port === "number" ? parsed.port : 8850,
        };
      } else {
        this.saveConfig();
      }
    } catch (error) {
      log.debug("Failed to load config, using defaults:", error);
      this.config = { ...DEFAULT_CONFIG };
      this.saveConfig();
    }
  }

  /** Save main config file */
  saveConfig(): void {
    fs.writeFileSync(this.paths.configPath, JSON.stringify(this.config, null, 2));
  }

  /** Load tool filters */
  private loadToolFilters(): void {
    try {
      if (fs.existsSync(this.paths.toolFiltersPath)) {
        const data = fs.readFileSync(this.paths.toolFiltersPath, "utf8");
        this.toolFilters = JSON.parse(data) as ToolFilters;
      }
    } catch (error) {
      log.debug("Failed to load tool filters:", error);
      this.toolFilters = {};
    }
  }

  /** Save tool filters */
  saveToolFilters(): void {
    fs.writeFileSync(this.paths.toolFiltersPath, JSON.stringify(this.toolFilters, null, 2));
  }

  /** Load selection state */
  private loadSelectionState(): void {
    try {
      if (fs.existsSync(this.paths.selectionStatePath)) {
        const data = fs.readFileSync(this.paths.selectionStatePath, "utf8");
        this.selectionState = JSON.parse(data) as SelectionState;
      }
    } catch (error) {
      log.debug("Failed to load selection state:", error);
      this.selectionState = { local: [], remote: [] };
    }
  }

  /** Save selection state */
  saveSelectionState(state: SelectionState): void {
    this.selectionState = state;
    fs.writeFileSync(this.paths.selectionStatePath, JSON.stringify(state, null, 2));
  }

  /** Reload all config data from disk */
  reload(): void {
    this.load();
  }

  // === Getters ===

  /** Get config paths */
  getPaths(): ConfigPaths {
    return this.paths;
  }

  /** Get current configuration */
  getConfig(): AppConfig {
    return this.config;
  }

  /** Get all local servers */
  getLocalServers(): LocalServer[] {
    return this.config.servers;
  }

  /** Get all remote servers */
  getRemoteServers(): RemoteServer[] {
    return this.config.remoteServers;
  }

  /** Get all servers (both local and remote) */
  getAllServers(): Server[] {
    return [...this.config.servers, ...this.config.remoteServers];
  }

  /** Get enabled local servers */
  getEnabledLocalServers(): LocalServer[] {
    return this.config.servers.filter((s) => !s.disabled);
  }

  /** Get enabled remote servers */
  getEnabledRemoteServers(): RemoteServer[] {
    return this.config.remoteServers.filter((s) => !s.disabled);
  }

  /** Get gateway port */
  getPort(): number {
    return this.config.port;
  }

  /** Set gateway port */
  setPort(port: number): Result {
    const validation = validatePort(port);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    this.config.port = port;
    this.saveConfig();
    return { success: true };
  }

  /** Get tool filters */
  getToolFilters(): ToolFilters {
    return this.toolFilters;
  }

  /** Get tool filter for a server */
  getServerToolFilter(serverId: string): ServerToolFilter | undefined {
    return this.toolFilters[serverId];
  }

  /** Set tool filter for a server */
  setServerToolFilter(serverId: string, filter: ServerToolFilter): void {
    this.toolFilters[serverId] = filter;
    this.saveToolFilters();
  }

  /** Get selection state */
  getSelectionState(): SelectionState {
    return this.selectionState;
  }

  // === Server CRUD Operations ===

  /** Find server by ID or name */
  findServer(idOrName: string): { server: Server; type: "local" | "remote" } | null {
    const local = this.config.servers.find((s) => s.id === idOrName || s.name === idOrName);
    if (local) return { server: local, type: "local" };

    const remote = this.config.remoteServers.find((s) => s.id === idOrName || s.name === idOrName);
    if (remote) return { server: remote, type: "remote" };

    return null;
  }

  /** Find local server by ID */
  findLocalServer(id: string): LocalServer | undefined {
    return this.config.servers.find((s) => s.id === id);
  }

  /** Find remote server by ID */
  findRemoteServer(id: string): RemoteServer | undefined {
    return this.config.remoteServers.find((s) => s.id === id);
  }

  /** Generate unique server ID from name */
  generateServerId(name: string): string {
    const baseId = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    let id = baseId;
    let counter = 1;

    while (this.findServer(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }

    return id;
  }

  /** Add a local server */
  addLocalServer(server: LocalServer): Result {
    // Validate server ID
    const idValidation = validateServerId(server.id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    // Validate server name
    const nameValidation = validateServerName(server.name);
    if (!nameValidation.valid) {
      return { success: false, error: nameValidation.error };
    }

    // Validate command
    const cmdValidation = validateCommand(server.command);
    if (!cmdValidation.valid) {
      return { success: false, error: cmdValidation.error };
    }

    if (this.findServer(server.id)) {
      return { success: false, error: `Server with ID '${server.id}' already exists` };
    }

    this.config.servers.push(server);
    this.saveConfig();

    // Auto-select new server (so it starts with the daemon)
    if (!server.disabled && !this.selectionState.local.includes(server.id)) {
      this.selectionState.local.push(server.id);
      this.saveSelectionState(this.selectionState);
    }

    return { success: true };
  }

  /** Add a remote server */
  addRemoteServer(server: RemoteServer): Result {
    // Validate server ID
    const idValidation = validateServerId(server.id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    // Validate server name
    const nameValidation = validateServerName(server.name);
    if (!nameValidation.valid) {
      return { success: false, error: nameValidation.error };
    }

    // Validate URL
    const urlValidation = validateUrl(server.url);
    if (!urlValidation.valid) {
      return { success: false, error: urlValidation.error };
    }

    if (this.findServer(server.id)) {
      return { success: false, error: `Server with ID '${server.id}' already exists` };
    }

    this.config.remoteServers.push(server);
    this.saveConfig();

    // Auto-select new server (so it starts with the daemon)
    const remoteId = `remote:${server.id}`;
    if (!server.disabled && !this.selectionState.remote.includes(remoteId)) {
      this.selectionState.remote.push(remoteId);
      this.saveSelectionState(this.selectionState);
    }

    return { success: true };
  }

  /** Update a local server */
  updateLocalServer(id: string, updates: Partial<LocalServer>): Result {
    const index = this.config.servers.findIndex((s) => s.id === id);
    if (index === -1) {
      return { success: false, error: `Local server '${id}' not found` };
    }

    this.config.servers[index] = { ...this.config.servers[index], ...updates };
    this.saveConfig();
    return { success: true };
  }

  /** Update a remote server */
  updateRemoteServer(id: string, updates: Partial<RemoteServer>): Result {
    const index = this.config.remoteServers.findIndex((s) => s.id === id);
    if (index === -1) {
      return { success: false, error: `Remote server '${id}' not found` };
    }

    this.config.remoteServers[index] = {
      ...this.config.remoteServers[index],
      ...updates,
    };
    this.saveConfig();
    return { success: true };
  }

  /** Delete a local server */
  deleteLocalServer(id: string): Result {
    const index = this.config.servers.findIndex((s) => s.id === id);
    if (index === -1) {
      return { success: false, error: `Local server '${id}' not found` };
    }

    this.config.servers.splice(index, 1);
    delete this.toolFilters[id];
    this.saveConfig();
    this.saveToolFilters();
    return { success: true };
  }

  /** Delete a remote server */
  deleteRemoteServer(id: string): Result {
    const index = this.config.remoteServers.findIndex((s) => s.id === id);
    if (index === -1) {
      return { success: false, error: `Remote server '${id}' not found` };
    }

    this.config.remoteServers.splice(index, 1);
    delete this.toolFilters[`remote:${id}`];
    this.saveConfig();
    this.saveToolFilters();
    return { success: true };
  }

  /** Delete any server by ID */
  deleteServer(id: string): Result {
    const result = this.findServer(id);
    if (!result) {
      return { success: false, error: `Server '${id}' not found` };
    }

    if (result.type === "local") {
      return this.deleteLocalServer(id);
    } else {
      return this.deleteRemoteServer(id);
    }
  }

  /** Enable a server */
  enableServer(id: string): Result {
    const result = this.findServer(id);
    if (!result) {
      return { success: false, error: `Server '${id}' not found` };
    }

    let updateResult: Result;
    if (result.type === "local") {
      updateResult = this.updateLocalServer(id, { disabled: false });
      // Also add to selection state
      if (updateResult.success && !this.selectionState.local.includes(id)) {
        this.selectionState.local.push(id);
        this.saveSelectionState(this.selectionState);
      }
    } else {
      updateResult = this.updateRemoteServer(id, { disabled: false });
      // Also add to selection state
      const remoteId = `remote:${id}`;
      if (updateResult.success && !this.selectionState.remote.includes(remoteId)) {
        this.selectionState.remote.push(remoteId);
        this.saveSelectionState(this.selectionState);
      }
    }
    return updateResult;
  }

  /** Disable a server */
  disableServer(id: string): Result {
    const result = this.findServer(id);
    if (!result) {
      return { success: false, error: `Server '${id}' not found` };
    }

    if (result.type === "local") {
      return this.updateLocalServer(id, { disabled: true });
    } else {
      return this.updateRemoteServer(id, { disabled: true });
    }
  }

  /** Get filter ID for a server */
  getFilterId(serverId: string, type: "local" | "remote"): string {
    return type === "local" ? serverId : `remote:${serverId}`;
  }

  // === Alias methods for backwards compatibility ===

  /** Remove a local server (alias for deleteLocalServer) */
  removeLocalServer(id: string): Result {
    return this.deleteLocalServer(id);
  }

  /** Remove a remote server (alias for deleteRemoteServer) */
  removeRemoteServer(id: string): Result {
    return this.deleteRemoteServer(id);
  }

  // === Tool Filter Operations ===

  /** Toggle a tool on/off for a server */
  toggleTool(filterId: string, toolName: string): void {
    const filter = this.toolFilters[filterId];
    if (!filter) return;

    const disabledTools = new Set(filter.disabledTools || []);
    if (disabledTools.has(toolName)) {
      disabledTools.delete(toolName);
    } else {
      disabledTools.add(toolName);
    }

    filter.disabledTools = Array.from(disabledTools);
    this.saveToolFilters();
  }

  /** Enable a specific tool for a server */
  enableTool(filterId: string, toolName: string): void {
    const filter = this.toolFilters[filterId];
    if (!filter) return;

    const disabledTools = new Set(filter.disabledTools || []);
    disabledTools.delete(toolName);
    filter.disabledTools = Array.from(disabledTools);
    this.saveToolFilters();
  }

  /** Disable a specific tool for a server */
  disableTool(filterId: string, toolName: string): void {
    const filter = this.toolFilters[filterId];
    if (!filter) return;

    const disabledTools = new Set(filter.disabledTools || []);
    disabledTools.add(toolName);
    filter.disabledTools = Array.from(disabledTools);
    this.saveToolFilters();
  }

  /** Enable all tools for a server */
  enableAllTools(filterId: string): void {
    const filter = this.toolFilters[filterId];
    if (!filter) return;

    filter.disabledTools = [];
    this.saveToolFilters();
  }

  /** Disable all tools for a server */
  disableAllTools(filterId: string): void {
    const filter = this.toolFilters[filterId];
    if (!filter) return;

    filter.disabledTools = [...(filter.allTools || [])];
    this.saveToolFilters();
  }

  /** Reset tool filters for a server (enable all) */
  resetToolFilters(filterId: string): Result {
    const filter = this.toolFilters[filterId];
    if (!filter) {
      return { success: false, error: `No tool filter found for '${filterId}'` };
    }

    filter.disabledTools = [];
    this.saveToolFilters();
    return { success: true };
  }

  /** Check if a tool is enabled */
  isToolEnabled(filterId: string, toolName: string): boolean {
    const filter = this.toolFilters[filterId];
    if (!filter) return true;

    return !filter.disabledTools?.includes(toolName);
  }

  /** Get enabled tools for a server */
  getEnabledTools(filterId: string): string[] {
    const filter = this.toolFilters[filterId];
    if (!filter) return [];

    const allTools = filter.allTools || [];
    const disabledTools = new Set(filter.disabledTools || []);

    return allTools.filter((t) => !disabledTools.has(t));
  }

  /** Get disabled tools for a server */
  getDisabledTools(filterId: string): string[] {
    const filter = this.toolFilters[filterId];
    if (!filter) return [];

    return filter.disabledTools || [];
  }
}

/** Singleton instance */
let instance: ConfigService | null = null;

/** Get or create the config service instance */
export function getConfigService(configDir?: string): ConfigService {
  if (!instance) {
    instance = new ConfigService(configDir);
  }
  return instance;
}

/** Reset the singleton instance (for testing) */
export function resetConfigService(): void {
  instance = null;
}

export default ConfigService;
