import { describe, it, expect } from "vitest";
import { KiroStrategy } from "../src/services/clients/kiro.strategy.js";

describe("KiroStrategy", () => {
  it("uses the Kiro MCP config path", () => {
    const strategy = new KiroStrategy();
    const configPath = strategy.getPrimaryConfigPath(
      process.platform as "darwin" | "win32" | "linux"
    );

    expect(configPath).toContain(".kiro");
    expect(configPath).toContain("mcp.json");
  });

  it("builds a direct URL gateway config", () => {
    const strategy = new KiroStrategy();
    const gateway = strategy.buildGatewayConfig(8850, "dev");

    expect(gateway.url).toBe("http://localhost:8850/mcp/dev");
    expect(gateway.command).toBeUndefined();
  });
});
