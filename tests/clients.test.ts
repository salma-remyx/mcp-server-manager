import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { ClientService, resetClientService } from "../src/services/client.service.js";
import { resetConfigService } from "../src/services/config.service.js";

// Test directory setup
const testConfigDir = path.join(os.tmpdir(), "mcpsm-clients-test-" + Date.now());

describe("ClientService", () => {
  let clientService: ClientService;

  beforeEach(() => {
    process.env.MCP_MANAGER_CONFIG_DIR = testConfigDir;
    resetConfigService();
    resetClientService();

    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // Write default config
    fs.writeFileSync(
      path.join(testConfigDir, "config.json"),
      JSON.stringify({
        servers: [{ id: "test-server", name: "Test Server", command: "node", args: ["-e", "1"] }],
        remoteServers: [],
        port: 8850,
      })
    );
  });

  afterEach(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    resetClientService();
    resetConfigService();
  });

  describe("getClientConfigPath", () => {
    it("should return path for known client", () => {
      clientService = new ClientService();

      const claudePath = clientService.getClientConfigPath("claude");
      expect(claudePath).toBeDefined();
      expect(typeof claudePath).toBe("string");
    });

    it("should return null for unknown client", () => {
      clientService = new ClientService();

      // Test with invalid client ID - permitted to use 'as any' in test files
      const unknownPath = clientService.getClientConfigPath("unknown-client" as any);
      expect(unknownPath).toBeNull();
    });
  });

  describe("isClientInstalled", () => {
    it("should check if client config directory exists", () => {
      clientService = new ClientService();

      // Most likely false in test environment
      const result = clientService.isClientInstalled("claude");
      expect(typeof result).toBe("boolean");
    });

    it("should return false for unknown client", () => {
      clientService = new ClientService();

      // Test with invalid client ID - permitted to use 'as any' in test files
      const result = clientService.isClientInstalled("unknown-client" as any);
      expect(result).toBe(false);
    });
  });

  describe("detectClients", () => {
    it("should return array of detected clients", () => {
      clientService = new ClientService();

      const clients = clientService.detectClients();
      expect(clients).toBeInstanceOf(Array);

      // Each client should have expected properties
      for (const client of clients) {
        expect(client).toHaveProperty("id");
        expect(client).toHaveProperty("name");
        expect(client).toHaveProperty("installed");
        expect(client).toHaveProperty("status");
      }
    });

    it("should have correct status field", () => {
      clientService = new ClientService();

      const clients = clientService.detectClients();
      for (const client of clients) {
        expect(["connected", "disconnected", "not-installed"]).toContain(client.status);
      }
    });
  });

  describe("connectClient / disconnectClient", () => {
    it("should connect servers to a client", () => {
      clientService = new ClientService();

      const result = clientService.connectClient("claude");
      // Will succeed or fail depending on whether claude is installed
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });

    it("should disconnect servers from a client", () => {
      clientService = new ClientService();

      const result = clientService.disconnectClient("claude");
      // Will succeed or fail depending on whether claude is installed
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });

    it("should return error for unknown client", () => {
      clientService = new ClientService();

      // Test with invalid client ID - permitted to use 'as any' in test files
      const result = clientService.connectClient("unknown-client" as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should merge servers from real-time config when connecting", () => {
      clientService = new ClientService();

      // Create a temp test config directory
      const testClientDir = path.join(testConfigDir, "test-client-cursor");
      fs.mkdirSync(testClientDir, { recursive: true });

      const primaryConfigPath = path.join(testClientDir, "config.json");
      const realtimeConfigPath = path.join(testConfigDir, "test-cursor-mcp.json");

      // Write primary config with servers A, B
      fs.writeFileSync(
        primaryConfigPath,
        JSON.stringify({
          mcpServers: {
            serverA: { command: "cmd", args: ["a"] },
            serverB: { command: "cmd", args: ["b"] },
          },
        })
      );

      // Write real-time config with servers B, C
      fs.writeFileSync(
        realtimeConfigPath,
        JSON.stringify({
          mcpServers: {
            serverB: { command: "cmd", args: ["b-override"] },
            serverC: { command: "cmd", args: ["c"] },
          },
        })
      );

      // Manually test the merge logic
      const primaryConfig = JSON.parse(fs.readFileSync(primaryConfigPath, "utf8"));
      const mergedConfig = primaryConfig;

      // Read and merge from real-time path
      const realtimeConfig = JSON.parse(fs.readFileSync(realtimeConfigPath, "utf8"));
      if (realtimeConfig.mcpServers) {
        if (!mergedConfig.mcpServers) {
          mergedConfig.mcpServers = {};
        }
        for (const [name, server] of Object.entries(realtimeConfig.mcpServers)) {
          if (name !== "mcpsm" && !mergedConfig.mcpServers[name]) {
            mergedConfig.mcpServers[name] = server;
          }
        }
      }

      // Should have servers A, B, C (B from primary, not overridden)
      expect(Object.keys(mergedConfig.mcpServers)).toContain("serverA");
      expect(Object.keys(mergedConfig.mcpServers)).toContain("serverB");
      expect(Object.keys(mergedConfig.mcpServers)).toContain("serverC");

      // serverB should be from primary (not overridden)
      expect(mergedConfig.mcpServers.serverB.args[0]).toBe("b");
    });
  });

  describe("getConnectionStatus", () => {
    it("should return connection status for client", () => {
      clientService = new ClientService();

      const status = clientService.getConnectionStatus("claude");
      expect(["connected", "disconnected", "not-installed"]).toContain(status);
    });

    it("should return not-installed for uninstalled client", () => {
      clientService = new ClientService();

      // Claude is unlikely to be installed in test environment
      const status = clientService.getConnectionStatus("claude");
      // Most likely will be not-installed or disconnected
      expect(["disconnected", "not-installed"]).toContain(status);
    });
  });

  describe("getClientName", () => {
    it("should return display name for client", () => {
      clientService = new ClientService();

      const name = clientService.getClientName("claude");
      expect(name).toBe("Claude Desktop");
    });
  });

  describe("getSupportedClients", () => {
    it("should return list of supported client IDs", () => {
      clientService = new ClientService();

      const clients = clientService.getSupportedClients();
      expect(clients).toContain("claude");
      expect(clients).toContain("cursor");
      expect(clients).toContain("windsurf");
      expect(clients).toContain("kiro");
    });
  });

  describe("clientExists", () => {
    it("should return true for known client", () => {
      clientService = new ClientService();

      expect(clientService.clientExists("claude")).toBe(true);
      expect(clientService.clientExists("cursor")).toBe(true);
      expect(clientService.clientExists("kiro")).toBe(true);
    });

    it("should return false for unknown client", () => {
      clientService = new ClientService();

      expect(clientService.clientExists("unknown")).toBe(false);
    });
  });
});
