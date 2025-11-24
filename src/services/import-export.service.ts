/**
 * Import/Export service - handles server configuration import and export
 */

import fs from "fs";
import path from "path";
import { getConfigService } from "./config.service.js";
import { getClientService } from "./client.service.js";
import type { LocalServer, RemoteServer, Result, TransportType, ClientId } from "../types/index.js";

/** Parsed import result */
export interface ParsedImport {
  format: string;
  servers: ImportedServer[];
}

/** Imported server (generic) */
export interface ImportedServer {
  id: string;
  name: string;
  serverType: "local" | "remote";
  // Local server fields
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // Remote server fields
  url?: string;
  type?: TransportType;
  bearerToken?: string;
}

/** Merge results */
export interface MergeResults {
  added: number;
  updated: number;
  skipped: number;
}

/** Export format */
export type ExportFormat = "mcpsm" | "claude" | "cursor" | "json";

/** Claude Desktop format */
interface ClaudeFormat {
  mcpServers: Record<
    string,
    {
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      url?: string;
      type?: string;
      bearerToken?: string;
    }
  >;
}

/** MCPSM format */
interface McpsmFormat {
  servers: LocalServer[];
  remoteServers: RemoteServer[];
  port?: number;
}

/** Import/Export service class */
export class ImportExportService {
  /** Parse import data and auto-detect format */
  parseImportData(data: unknown): ParsedImport | null {
    if (typeof data !== "object" || data === null) {
      return null;
    }

    // Claude Desktop format: { mcpServers: { id: { command, args } } }
    if ("mcpServers" in data && typeof (data as ClaudeFormat).mcpServers === "object") {
      return {
        format: "claude",
        servers: this.parseClaudeFormat(data as ClaudeFormat),
      };
    }

    // MCPSM format: { servers: [], remoteServers: [] }
    if ("servers" in data || "remoteServers" in data) {
      return {
        format: "mcpsm",
        servers: this.parseMcpsmFormat(data as McpsmFormat),
      };
    }

    // Simple array format: [{ id, command, args }]
    if (Array.isArray(data)) {
      return {
        format: "array",
        servers: this.parseArrayFormat(data),
      };
    }

    return null;
  }

  /** Parse Claude Desktop format */
  private parseClaudeFormat(data: ClaudeFormat): ImportedServer[] {
    const servers: ImportedServer[] = [];

    for (const [id, server] of Object.entries(data.mcpServers)) {
      if (server.command) {
        servers.push({
          id,
          name: id,
          serverType: "local",
          command: server.command,
          args: server.args || [],
          env: server.env,
        });
      } else if (server.url) {
        servers.push({
          id,
          name: id,
          serverType: "remote",
          url: server.url,
          type: (server.type as TransportType) || "http",
          bearerToken: server.bearerToken,
        });
      }
    }

    return servers;
  }

  /** Parse MCPSM format */
  private parseMcpsmFormat(data: McpsmFormat): ImportedServer[] {
    const servers: ImportedServer[] = [];

    if (data.servers) {
      for (const server of data.servers) {
        servers.push({
          id: server.id,
          name: server.name,
          serverType: "local",
          command: server.command,
          args: server.args,
          env: server.env,
        });
      }
    }

    if (data.remoteServers) {
      for (const server of data.remoteServers) {
        servers.push({
          id: server.id,
          name: server.name,
          serverType: "remote",
          url: server.url,
          type: server.type,
          bearerToken: server.bearerToken,
        });
      }
    }

    return servers;
  }

  /** Parse array format */
  private parseArrayFormat(data: unknown[]): ImportedServer[] {
    return data.map((item) => {
      const server = item as Record<string, unknown>;
      const isRemote = "url" in server;

      return {
        id: String(server.id || ""),
        name: String(server.name || server.id || ""),
        serverType: isRemote ? "remote" : "local",
        command: server.command ? String(server.command) : undefined,
        args: Array.isArray(server.args) ? server.args.map(String) : [],
        env: server.env as Record<string, string> | undefined,
        url: server.url ? String(server.url) : undefined,
        type: (server.type as TransportType) || "http",
        bearerToken: server.bearerToken ? String(server.bearerToken) : undefined,
      } as ImportedServer;
    });
  }

  /** Import from file */
  importFromFile(filePath: string): Result & { format?: string; servers?: ImportedServer[] } {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "File not found" };
    }

    try {
      const content = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(content);
      const parsed = this.parseImportData(data);

      if (!parsed) {
        return { success: false, error: "Unknown format" };
      }

      return { success: true, ...parsed };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** Import from a client */
  importFromClient(clientId: string): Result & { format?: string; servers?: ImportedServer[] } {
    const clientService = getClientService();
    const clientConfig = clientService.readClientConfig(clientId as ClientId);

    if (!clientConfig) {
      return { success: false, error: "Client config not found" };
    }

    const parsed = this.parseImportData(clientConfig);

    if (!parsed) {
      return { success: false, error: "No servers found in client config" };
    }

    return { success: true, ...parsed };
  }

  /** Merge servers into config */
  mergeServers(servers: ImportedServer[], options: { overwrite?: boolean } = {}): MergeResults {
    const configService = getConfigService();
    const { overwrite = false } = options;
    const results: MergeResults = { added: 0, skipped: 0, updated: 0 };

    for (const server of servers) {
      if (server.serverType === "remote") {
        const existing = configService.findRemoteServer(server.id);

        if (existing) {
          if (overwrite) {
            configService.updateRemoteServer(server.id, {
              name: server.name || server.id,
              url: server.url!,
              type: server.type || "http",
              bearerToken: server.bearerToken,
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          configService.addRemoteServer({
            id: server.id,
            name: server.name || server.id,
            url: server.url!,
            type: server.type || "http",
            bearerToken: server.bearerToken,
          });
          results.added++;
        }
      } else {
        const existing = configService.findLocalServer(server.id);

        if (existing) {
          if (overwrite) {
            configService.updateLocalServer(server.id, {
              name: server.name || server.id,
              command: server.command!,
              args: server.args || [],
              env: server.env,
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          configService.addLocalServer({
            id: server.id,
            name: server.name || server.id,
            command: server.command!,
            args: server.args || [],
            env: server.env,
          });
          results.added++;
        }
      }
    }

    return results;
  }

  /** Export to Claude Desktop format */
  exportToClaudeFormat(): ClaudeFormat {
    const configService = getConfigService();
    const mcpServers: ClaudeFormat["mcpServers"] = {};

    // Export local servers
    for (const server of configService.getEnabledLocalServers()) {
      mcpServers[server.id] = {
        command: server.command,
        args: server.args || [],
      };
      if (server.env && Object.keys(server.env).length > 0) {
        mcpServers[server.id].env = server.env;
      }
    }

    // Export remote servers as mcp-remote commands
    for (const server of configService.getEnabledRemoteServers()) {
      mcpServers[server.id] = {
        command: "npx",
        args: ["-y", "mcp-remote", server.url],
      };
      if (server.bearerToken) {
        mcpServers[server.id].env = { MCP_AUTH_TOKEN: server.bearerToken };
      }
    }

    return { mcpServers };
  }

  /** Export to MCPSM format */
  exportToMcpsmFormat(): McpsmFormat {
    const configService = getConfigService();
    const localServers = configService.getLocalServers();
    const remoteServers = configService.getRemoteServers();

    return {
      servers: localServers.map((s) => ({
        id: s.id,
        name: s.name,
        command: s.command,
        args: s.args,
        env: s.env,
        disabled: s.disabled,
      })),
      remoteServers: remoteServers.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        url: s.url,
        bearerToken: s.bearerToken,
        disabled: s.disabled,
      })),
      port: configService.getPort(),
    };
  }

  /** Export configuration */
  export(format: ExportFormat = "mcpsm"): unknown {
    switch (format.toLowerCase()) {
      case "claude":
      case "cursor":
        return this.exportToClaudeFormat();
      case "mcpsm":
      case "json":
      default:
        return this.exportToMcpsmFormat();
    }
  }

  /** Export to file */
  exportToFile(filePath: string, format: ExportFormat = "mcpsm"): Result {
    try {
      const exported = this.export(format);
      const output = JSON.stringify(exported, null, 2);
      const resolvedPath = path.resolve(filePath);
      fs.writeFileSync(resolvedPath, output);
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** Get available import sources */
  getAvailableSources(): { clients: string[]; description: string }[] {
    const clientService = getClientService();
    const detected = clientService.detectClients();

    return detected
      .filter((c) => c.installed && c.hasConfig)
      .map((c) => ({
        clients: [c.id],
        description: `Import from ${c.name}`,
      }));
  }
}

/** Singleton instance */
let instance: ImportExportService | null = null;

/** Get or create the import/export service instance */
export function getImportExportService(): ImportExportService {
  if (!instance) {
    instance = new ImportExportService();
  }
  return instance;
}

/** Reset the singleton instance (for testing) */
export function resetImportExportService(): void {
  instance = null;
}

export default ImportExportService;
