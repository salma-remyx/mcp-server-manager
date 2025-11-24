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
        expect(client).toHaveProperty("enabled");
      }
    });
  });

  describe("enableClient / disableClient", () => {
    it("should enable a client", () => {
      clientService = new ClientService();

      const result = clientService.enableClient("claude");
      expect(result.success).toBe(true);

      const enabledClients = clientService.getEnabledClients();
      expect(enabledClients).toContain("claude");
    });

    it("should not duplicate enabled clients", () => {
      clientService = new ClientService();

      clientService.enableClient("claude");
      clientService.enableClient("claude");

      const enabledClients = clientService.getEnabledClients();
      expect(enabledClients.filter((c) => c === "claude")).toHaveLength(1);
    });

    it("should disable a client", () => {
      clientService = new ClientService();

      clientService.enableClient("claude");
      expect(clientService.getEnabledClients()).toContain("claude");

      clientService.disableClient("claude");
      expect(clientService.getEnabledClients()).not.toContain("claude");
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
    });
  });

  describe("clientExists", () => {
    it("should return true for known client", () => {
      clientService = new ClientService();

      expect(clientService.clientExists("claude")).toBe(true);
      expect(clientService.clientExists("cursor")).toBe(true);
    });

    it("should return false for unknown client", () => {
      clientService = new ClientService();

      expect(clientService.clientExists("unknown")).toBe(false);
    });
  });
});
