import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { TestingService, resetTestingService } from "../src/services/testing.service.js";
import { ConfigService, resetConfigService } from "../src/services/config.service.js";

// Test directory setup
const testConfigDir = path.join(os.tmpdir(), "mcpsm-testing-test-" + Date.now());

describe("TestingService", () => {
  let testingService: TestingService;
  let configService: ConfigService;

  beforeEach(() => {
    process.env.MCP_MANAGER_CONFIG_DIR = testConfigDir;
    resetConfigService();
    resetTestingService();

    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // Write default config with servers
    fs.writeFileSync(
      path.join(testConfigDir, "config.json"),
      JSON.stringify({
        servers: [
          { id: "local-1", name: "Local 1", command: "node", args: ["server.js"] },
          { id: "local-2", name: "Local 2", command: "npx", args: ["-y", "test"] },
          { id: "local-3", name: "Local 3", command: "python", args: ["-m", "mcp"] },
        ],
        remoteServers: [
          { id: "remote-1", name: "Remote 1", type: "http", url: "http://localhost:3000" },
          { id: "remote-2", name: "Remote 2", type: "sse", url: "http://localhost:4000/sse" },
        ],
        port: 8850,
      })
    );

    // Write tool filters - some servers have tools, some don't
    fs.writeFileSync(
      path.join(testConfigDir, "tool-filters.json"),
      JSON.stringify({
        "local-1": {
          allTools: ["tool1", "tool2"],
          disabledTools: [],
          totalTokens: 500,
        },
        "remote:remote-1": {
          allTools: ["remoteTool"],
          disabledTools: [],
          totalTokens: 200,
        },
      })
    );

    configService = new ConfigService(testConfigDir);
    testingService = new TestingService();
  });

  afterEach(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    resetTestingService();
    resetConfigService();
  });

  describe("getServersWithoutTools", () => {
    it("should return servers without tool filters", () => {
      const { local, remote } = testingService.getServersWithoutTools();

      expect(local).toHaveLength(2);
      expect(local.map((s) => s.id)).toContain("local-2");
      expect(local.map((s) => s.id)).toContain("local-3");
      expect(local.map((s) => s.id)).not.toContain("local-1");

      expect(remote).toHaveLength(1);
      expect(remote[0].id).toBe("remote-2");
    });

    it("should return all servers when no tool filters exist", () => {
      fs.writeFileSync(path.join(testConfigDir, "tool-filters.json"), JSON.stringify({}));
      resetConfigService();
      configService = new ConfigService(testConfigDir);
      testingService = new TestingService();

      const { local, remote } = testingService.getServersWithoutTools();
      expect(local).toHaveLength(3);
      expect(remote).toHaveLength(2);
    });
  });

  describe("testLocalServer", () => {
    it("should return error when command fails to spawn", async () => {
      const server = {
        id: "bad-server",
        name: "Bad Server",
        command: "nonexistent-command-xyz",
        args: [],
      };

      const result = await testingService.testLocalServer(server);
      expect(result.success).toBe(false);
      expect(result.toolCount).toBe(0);
    });

    it("should save error to tool filters on failure", async () => {
      const server = {
        id: "error-server",
        name: "Error Server",
        command: "nonexistent-cmd-12345",
        args: [],
      };

      await testingService.testLocalServer(server);

      resetConfigService();
      const newConfigService = new ConfigService(testConfigDir);
      const toolFilters = newConfigService.getToolFilters();
      expect(toolFilters["error-server"]).toBeDefined();
    });
  });

  describe("testRemoteServer", () => {
    it("should return error when fetch fails", async () => {
      const server = {
        id: "unreachable",
        name: "Unreachable Server",
        type: "http" as const,
        url: "http://localhost:59999", // Unlikely to have anything running here
      };

      const result = await testingService.testRemoteServer(server);
      expect(result.success).toBe(false);
      expect(result.toolCount).toBe(0);
    });

    it("should save error to tool filters on failure", async () => {
      const server = {
        id: "failed-remote",
        name: "Failed Remote",
        type: "http" as const,
        url: "http://localhost:59998",
      };

      await testingService.testRemoteServer(server);

      resetConfigService();
      const newConfigService = new ConfigService(testConfigDir);
      const toolFilters = newConfigService.getToolFilters();
      expect(toolFilters["remote:failed-remote"]).toBeDefined();
    });
  });

  describe("autoTestUnknownServers", () => {
    it("should not run when all servers have tools", async () => {
      // Update config so all servers have tools
      fs.writeFileSync(
        path.join(testConfigDir, "tool-filters.json"),
        JSON.stringify({
          "local-1": { allTools: ["tool"], disabledTools: [] },
          "local-2": { allTools: ["tool"], disabledTools: [] },
          "local-3": { allTools: ["tool"], disabledTools: [] },
          "remote:remote-1": { allTools: ["tool"], disabledTools: [] },
          "remote:remote-2": { allTools: ["tool"], disabledTools: [] },
        })
      );
      resetConfigService();
      configService = new ConfigService(testConfigDir);
      testingService = new TestingService();

      // Should complete quickly without testing
      await testingService.autoTestUnknownServers();
      // No assertions needed - just verifies it doesn't throw
    });
  });
});
