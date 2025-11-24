import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  ImportExportService,
  resetImportExportService,
} from "../src/services/import-export.service.js";
import { getConfigService, resetConfigService } from "../src/services/config.service.js";
import type { ConfigService } from "../src/services/config.service.js";
import { resetClientService } from "../src/services/client.service.js";

// Test directory setup
const testConfigDir = path.join(os.tmpdir(), "mcpsm-import-export-test-" + Date.now());

describe("ImportExportService", () => {
  let importExportService: ImportExportService;
  let configService: ConfigService;

  beforeEach(() => {
    process.env.MCP_MANAGER_CONFIG_DIR = testConfigDir;
    resetConfigService();
    resetClientService();
    resetImportExportService();

    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // Write default config
    fs.writeFileSync(
      path.join(testConfigDir, "config.json"),
      JSON.stringify({
        servers: [{ id: "existing-local", name: "Existing Local", command: "node", args: [] }],
        remoteServers: [
          {
            id: "existing-remote",
            name: "Existing Remote",
            type: "http",
            url: "http://localhost:3000",
          },
        ],
        port: 8850,
      })
    );

    configService = getConfigService(testConfigDir);
    importExportService = new ImportExportService();
  });

  afterEach(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    resetImportExportService();
    resetClientService();
    resetConfigService();
  });

  describe("parseImportData", () => {
    it("should parse Claude Desktop format with local servers", () => {
      const claudeConfig = {
        mcpServers: {
          "test-server": {
            command: "npx",
            args: ["-y", "test-package"],
          },
          "another-server": {
            command: "node",
            args: ["server.js"],
            env: { API_KEY: "secret" },
          },
        },
      };

      const result = importExportService.parseImportData(claudeConfig);
      expect(result?.format).toBe("claude");
      expect(result?.servers).toHaveLength(2);
      expect(result?.servers[0].id).toBe("test-server");
      expect(result?.servers[0].command).toBe("npx");
      expect(result?.servers[0].args).toEqual(["-y", "test-package"]);
      expect(result?.servers[1].env).toEqual({ API_KEY: "secret" });
    });

    it("should parse Claude format with remote servers", () => {
      const claudeConfig = {
        mcpServers: {
          "remote-test": {
            url: "https://api.example.com/mcp",
            bearerToken: "token123",
          },
        },
      };

      const result = importExportService.parseImportData(claudeConfig);
      expect(result?.format).toBe("claude");
      expect(result?.servers[0].serverType).toBe("remote");
      expect(result?.servers[0].url).toBe("https://api.example.com/mcp");
      expect(result?.servers[0].bearerToken).toBe("token123");
    });

    it("should parse MCPSM format with servers and remoteServers", () => {
      const mcpsmConfig = {
        servers: [{ id: "local1", name: "Local 1", command: "npx", args: [] }],
        remoteServers: [{ id: "remote1", name: "Remote 1", type: "http", url: "http://localhost" }],
      };

      const result = importExportService.parseImportData(mcpsmConfig);
      expect(result?.format).toBe("mcpsm");
      expect(result?.servers).toHaveLength(2);
      expect(result?.servers[0].serverType).toBe("local");
      expect(result?.servers[1].serverType).toBe("remote");
    });

    it("should parse array format", () => {
      const arrayConfig = [
        { id: "server1", name: "Server 1", command: "npx" },
        { id: "server2", url: "http://localhost:3000" },
      ];

      const result = importExportService.parseImportData(arrayConfig);
      expect(result?.format).toBe("array");
      expect(result?.servers).toHaveLength(2);
      expect(result?.servers[0].serverType).toBe("local");
      expect(result?.servers[1].serverType).toBe("remote");
    });

    it("should return null for unknown format", () => {
      const unknownConfig = { randomKey: "randomValue" };
      const result = importExportService.parseImportData(unknownConfig);
      expect(result).toBeNull();
    });

    it("should return null for empty object", () => {
      const result = importExportService.parseImportData({});
      expect(result).toBeNull();
    });
  });

  describe("importFromFile", () => {
    it("should import from valid Claude format file", () => {
      const importFile = path.join(testConfigDir, "import.json");
      fs.writeFileSync(
        importFile,
        JSON.stringify({
          mcpServers: {
            "imported-server": { command: "node", args: ["test.js"] },
          },
        })
      );

      const result = importExportService.importFromFile(importFile);
      expect(result.success).toBe(true);
      expect(result.format).toBe("claude");
      expect(result.servers).toHaveLength(1);
      expect(result.servers?.[0].id).toBe("imported-server");
    });

    it("should return error for non-existent file", () => {
      const result = importExportService.importFromFile("/nonexistent/path/file.json");
      expect(result.success).toBe(false);
      expect(result.error).toBe("File not found");
    });

    it("should return error for invalid JSON", () => {
      const importFile = path.join(testConfigDir, "invalid.json");
      fs.writeFileSync(importFile, "not valid json");

      const result = importExportService.importFromFile(importFile);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error for unknown format", () => {
      const importFile = path.join(testConfigDir, "unknown.json");
      fs.writeFileSync(importFile, JSON.stringify({ someRandomKey: true }));

      const result = importExportService.importFromFile(importFile);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown format");
    });
  });

  describe("mergeServers", () => {
    it("should add new local servers", () => {
      const servers = [
        {
          id: "new-local",
          name: "New Local",
          command: "npx",
          args: ["-y", "test"],
          serverType: "local" as const,
        },
      ];

      const result = importExportService.mergeServers(servers);
      expect(result.added).toBe(1);
      expect(result.skipped).toBe(0);

      const newConfig = configService.getConfig();
      expect(newConfig.servers.find((s) => s.id === "new-local")).toBeDefined();
    });

    it("should add new remote servers", () => {
      const servers = [
        {
          id: "new-remote",
          name: "New Remote",
          url: "http://localhost:4000",
          serverType: "remote" as const,
        },
      ];

      const result = importExportService.mergeServers(servers);
      expect(result.added).toBe(1);

      const newConfig = configService.getConfig();
      expect(newConfig.remoteServers.find((s) => s.id === "new-remote")).toBeDefined();
    });

    it("should skip existing servers without overwrite", () => {
      const servers = [
        {
          id: "existing-local",
          name: "Different Name",
          command: "python",
          args: [],
          serverType: "local" as const,
        },
      ];

      const result = importExportService.mergeServers(servers);
      expect(result.skipped).toBe(1);
      expect(result.added).toBe(0);
    });

    it("should update existing servers with overwrite option", () => {
      const servers = [
        {
          id: "existing-local",
          name: "Updated Name",
          command: "python",
          args: ["new.py"],
          serverType: "local" as const,
        },
      ];

      const result = importExportService.mergeServers(servers, { overwrite: true });
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(0);

      const updated = configService.findLocalServer("existing-local");
      expect(updated?.command).toBe("python");
      expect(updated?.name).toBe("Updated Name");
    });

    it("should handle mixed local and remote servers", () => {
      const servers = [
        {
          id: "new-local-1",
          name: "Local 1",
          command: "npx",
          serverType: "local" as const,
        },
        {
          id: "new-remote-1",
          name: "Remote 1",
          url: "http://localhost:5000",
          serverType: "remote" as const,
        },
        {
          id: "existing-local",
          name: "Skip",
          command: "skip",
          serverType: "local" as const,
        },
      ];

      const result = importExportService.mergeServers(servers);
      expect(result.added).toBe(2);
      expect(result.skipped).toBe(1);
    });
  });

  describe("exportToClaudeFormat", () => {
    it("should export local servers to Claude format", () => {
      const result = importExportService.exportToClaudeFormat();
      expect(result.mcpServers).toBeDefined();
      expect(result.mcpServers["existing-local"]).toBeDefined();
      expect(result.mcpServers["existing-local"].command).toBe("node");
    });

    it("should export remote servers using mcp-remote", () => {
      const result = importExportService.exportToClaudeFormat();
      expect(result.mcpServers["existing-remote"]).toBeDefined();
      expect(result.mcpServers["existing-remote"].command).toBe("npx");
      expect(result.mcpServers["existing-remote"].args).toContain("mcp-remote");
    });

    it("should exclude disabled servers", () => {
      // Write config with disabled server
      fs.writeFileSync(
        path.join(testConfigDir, "config.json"),
        JSON.stringify({
          servers: [
            { id: "enabled", name: "Enabled", command: "node", args: [] },
            { id: "disabled", name: "Disabled", command: "node", args: [], disabled: true },
          ],
          remoteServers: [],
          port: 8850,
        })
      );

      resetConfigService();
      configService = getConfigService(testConfigDir);
      importExportService = new ImportExportService();

      const result = importExportService.exportToClaudeFormat();
      expect(result.mcpServers["enabled"]).toBeDefined();
      expect(result.mcpServers["disabled"]).toBeUndefined();
    });

    it("should include env for servers with env variables", () => {
      fs.writeFileSync(
        path.join(testConfigDir, "config.json"),
        JSON.stringify({
          servers: [
            { id: "with-env", name: "With Env", command: "node", args: [], env: { KEY: "value" } },
          ],
          remoteServers: [],
          port: 8850,
        })
      );

      resetConfigService();
      configService = getConfigService(testConfigDir);
      importExportService = new ImportExportService();

      const result = importExportService.exportToClaudeFormat();
      expect(result.mcpServers["with-env"].env).toEqual({ KEY: "value" });
    });

    it("should add MCP_AUTH_TOKEN env for remote servers with bearerToken", () => {
      fs.writeFileSync(
        path.join(testConfigDir, "config.json"),
        JSON.stringify({
          servers: [],
          remoteServers: [
            {
              id: "authed-remote",
              name: "Authed Remote",
              type: "http",
              url: "http://localhost",
              bearerToken: "token",
            },
          ],
          port: 8850,
        })
      );

      resetConfigService();
      configService = getConfigService(testConfigDir);
      importExportService = new ImportExportService();

      const result = importExportService.exportToClaudeFormat();
      expect(result.mcpServers["authed-remote"].env).toEqual({ MCP_AUTH_TOKEN: "token" });
    });
  });

  describe("exportToMcpsmFormat", () => {
    it("should export all servers in MCPSM format", () => {
      const result = importExportService.exportToMcpsmFormat();
      expect(result.servers).toBeInstanceOf(Array);
      expect(result.remoteServers).toBeInstanceOf(Array);
      expect(result.port).toBe(8850);
    });

    it("should include all server properties", () => {
      const result = importExportService.exportToMcpsmFormat();
      const local = result.servers.find((s) => s.id === "existing-local");
      expect(local).toHaveProperty("id");
      expect(local).toHaveProperty("name");
      expect(local).toHaveProperty("command");
      expect(local).toHaveProperty("args");
    });
  });

  describe("export", () => {
    it("should export in MCPSM format by default", () => {
      const result = importExportService.export() as {
        servers: unknown[];
        remoteServers: unknown[];
      };
      expect(result).toHaveProperty("servers");
      expect(result).toHaveProperty("remoteServers");
    });

    it("should export in Claude format when specified", () => {
      const result = importExportService.export("claude") as {
        mcpServers: Record<string, unknown>;
      };
      expect(result).toHaveProperty("mcpServers");
    });
  });

  describe("exportToFile", () => {
    it("should write export to file", () => {
      const outputFile = path.join(testConfigDir, "exported.json");

      const result = importExportService.exportToFile(outputFile);
      expect(result.success).toBe(true);
      expect(fs.existsSync(outputFile)).toBe(true);

      const content = JSON.parse(fs.readFileSync(outputFile, "utf8"));
      expect(content).toHaveProperty("servers");
    });
  });
});
