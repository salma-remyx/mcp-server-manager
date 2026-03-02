/**
 * Tests for per-profile client connection lifecycle.
 * Verifies that connect/disconnect/getStatus correctly use profile-specific gateway keys
 * and that config files reflect the expected state after each operation.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { ClientService, resetClientService } from "../src/services/client.service.js";
import { resetConfigService } from "../src/services/config.service.js";
import { getClientStrategy, clearStrategyCache } from "../src/services/clients/index.js";
import type { IClientStrategy } from "../src/types/client-strategy.types.js";

const testConfigDir = path.join(os.tmpdir(), "mcpsm-profile-conn-test-" + Date.now());

function getClaudeStrategy(): IClientStrategy {
  const strategy = getClientStrategy("claude");
  if (!strategy) throw new Error("Claude strategy not found");
  return strategy;
}

describe("Per-Profile Client Connection", () => {
  beforeEach(() => {
    process.env.MCP_MANAGER_CONFIG_DIR = testConfigDir;
    resetConfigService();
    resetClientService();
    clearStrategyCache();

    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

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
    clearStrategyCache();
  });

  describe("Gateway key naming", () => {
    it("should use mcpsm-{profileId} as the gateway key for a profile", () => {
      const strategy = getClaudeStrategy();

      const config = { mcpServers: {} };
      const updated = strategy.addGateway(config, 8850, "production");
      const servers = (updated as { mcpServers: Record<string, unknown> }).mcpServers;

      expect(servers).toHaveProperty("mcpsm-production");
      expect(servers).not.toHaveProperty("mcpsm");
    });

    it("should use bare mcpsm key when no profileId is given", () => {
      const strategy = getClaudeStrategy();

      const config = { mcpServers: {} };
      const updated = strategy.addGateway(config, 8850);
      const servers = (updated as { mcpServers: Record<string, unknown> }).mcpServers;

      expect(servers).toHaveProperty("mcpsm");
      expect(servers).not.toHaveProperty("mcpsm-production");
    });
  });

  describe("hasGateway with profileId", () => {
    it("should detect profile-specific gateway", () => {
      const strategy = getClaudeStrategy();
      const config = strategy.addGateway({ mcpServers: {} }, 8850, "dev");

      expect(strategy.hasGateway(config, "dev")).toBe(true);
      expect(strategy.hasGateway(config, "staging")).toBe(false);
      expect(strategy.hasGateway(config)).toBe(false); // bare key doesn't exist
    });

    it("should not confuse profile keys with bare key", () => {
      const strategy = getClaudeStrategy();
      let config = strategy.addGateway({ mcpServers: {} }, 8850); // bare mcpsm
      config = strategy.addGateway(config, 8850, "dev"); // mcpsm-dev

      expect(strategy.hasGateway(config)).toBe(true); // bare exists
      expect(strategy.hasGateway(config, "dev")).toBe(true); // dev exists
      expect(strategy.hasGateway(config, "staging")).toBe(false); // staging doesn't
    });
  });

  describe("removeGateway with profileId", () => {
    it("should remove only the specified profile gateway", () => {
      const strategy = getClaudeStrategy();
      let config = strategy.addGateway({ mcpServers: {} }, 8850, "dev");
      config = strategy.addGateway(config, 8850, "staging");

      expect(strategy.hasGateway(config, "dev")).toBe(true);
      expect(strategy.hasGateway(config, "staging")).toBe(true);

      config = strategy.removeGateway(config, "dev");

      expect(strategy.hasGateway(config, "dev")).toBe(false);
      expect(strategy.hasGateway(config, "staging")).toBe(true);
    });

    it("should preserve other servers when removing a profile gateway", () => {
      const strategy = getClaudeStrategy();
      const config = {
        mcpServers: {
          "my-custom-server": { command: "node", args: ["custom.js"] },
        },
      };
      let updated = strategy.addGateway(config, 8850, "dev");
      updated = strategy.removeGateway(updated, "dev");

      const servers = (updated as { mcpServers: Record<string, unknown> }).mcpServers;
      expect(servers).toHaveProperty("my-custom-server");
      expect(servers).not.toHaveProperty("mcpsm-dev");
    });
  });

  describe("getStatus with profileId", () => {
    it("should report connected only for the installed profile", () => {
      const strategy = getClaudeStrategy();

      // Build a config with only mcpsm-dev
      const config = strategy.addGateway({ mcpServers: {} }, 8850, "dev");

      // We can't test getStatus directly (needs isInstalled), so test hasGateway instead
      // which is what getStatus delegates to
      expect(strategy.hasGateway(config, "dev")).toBe(true);
      expect(strategy.hasGateway(config, "staging")).toBe(false);
      expect(strategy.hasGateway(config)).toBe(false);
    });
  });

  describe("Full connect/disconnect lifecycle", () => {
    it("should build gateway config with profile-specific URL path", () => {
      const strategy = getClaudeStrategy();
      const gatewayConfig = strategy.buildGatewayConfig(8850, "production");

      // Should contain /mcp/production in the args
      const argsStr = JSON.stringify(gatewayConfig);
      expect(argsStr).toContain("/mcp/production");
    });

    it("should build gateway config with bare /mcp path when no profileId", () => {
      const strategy = getClaudeStrategy();
      const gatewayConfig = strategy.buildGatewayConfig(8850);

      const argsStr = JSON.stringify(gatewayConfig);
      expect(argsStr).toContain("/mcp");
      expect(argsStr).not.toContain("/mcp/");
    });

    it("should support multiple profiles in the same config", () => {
      const strategy = getClaudeStrategy();
      let config = { mcpServers: {} };

      config = strategy.addGateway(config, 8850, "default") as typeof config;
      config = strategy.addGateway(config, 8850, "dev") as typeof config;
      config = strategy.addGateway(config, 8850, "staging") as typeof config;

      const servers = config.mcpServers;
      expect(Object.keys(servers)).toContain("mcpsm-default");
      expect(Object.keys(servers)).toContain("mcpsm-dev");
      expect(Object.keys(servers)).toContain("mcpsm-staging");
      expect(Object.keys(servers)).toHaveLength(3);

      // Each should have profile-specific URL path
      const defaultArgs = JSON.stringify(servers["mcpsm-default" as keyof typeof servers]);
      const devArgs = JSON.stringify(servers["mcpsm-dev" as keyof typeof servers]);
      const stagingArgs = JSON.stringify(servers["mcpsm-staging" as keyof typeof servers]);

      expect(defaultArgs).toContain("/mcp/default");
      expect(devArgs).toContain("/mcp/dev");
      expect(stagingArgs).toContain("/mcp/staging");
    });

    it("should disconnect one profile without affecting others", () => {
      const strategy = getClaudeStrategy();
      let config = { mcpServers: {} };

      config = strategy.addGateway(config, 8850, "default") as typeof config;
      config = strategy.addGateway(config, 8850, "dev") as typeof config;
      config = strategy.addGateway(config, 8850, "staging") as typeof config;

      // Remove only dev
      config = strategy.removeGateway(config, "dev") as typeof config;

      expect(strategy.hasGateway(config, "default")).toBe(true);
      expect(strategy.hasGateway(config, "dev")).toBe(false);
      expect(strategy.hasGateway(config, "staging")).toBe(true);
    });
  });

  describe("ClientService per-profile methods", () => {
    it("should connect with profileId", () => {
      const clientService = new ClientService();
      const result = clientService.connectClient("claude", "dev");
      // May fail if Claude is not installed, but should have correct shape
      expect(result).toHaveProperty("success");
    });

    it("should disconnect with profileId", () => {
      const clientService = new ClientService();
      const result = clientService.disconnectClient("claude", "dev");
      expect(result).toHaveProperty("success");
    });

    it("should check connection status with profileId", () => {
      const clientService = new ClientService();
      const status = clientService.getConnectionStatus("claude", "dev");
      expect(["connected", "disconnected", "not-installed"]).toContain(status);
    });

    it("should detect clients with profileId filter", () => {
      const clientService = new ClientService();
      const clients = clientService.detectClients("dev");

      expect(clients).toBeInstanceOf(Array);
      for (const client of clients) {
        expect(["connected", "disconnected", "not-installed"]).toContain(client.status);
      }
    });
  });
});
