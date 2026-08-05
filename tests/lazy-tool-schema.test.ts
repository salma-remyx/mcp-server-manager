import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
// Exercising the wiring through the (non-new) gateway module + the new module.
import {
  buildListToolsResponse,
  resetGatewayStateForTests,
  setGatewayStateForTests,
} from "../src/services/gateway.service.js";
import { resetConfigService } from "../src/services/config.service.js";
import { resetSettingsService } from "../src/services/settings.service.js";
import {
  LAZY_DESCRIPTION_MAX_LENGTH,
  LAZY_SCHEMA_TOOL_NAME,
  buildHydrationResponse,
  buildLazyToolListing,
  estimateTokenSavings,
  hydrateToolSchema,
  summarizeTool,
} from "../src/services/lazy-tool-schema.js";

/** Build a tool carrying a bulky input schema (the per-turn MCP Tax payload). */
function fullSchemaTool(name: string, description: string): Tool {
  const tool: Tool = {
    name,
    description,
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The search query." },
        limit: { type: "number", description: "Maximum results to return." },
        filters: {
          type: "object",
          description: "Optional filters.",
          properties: {
            region: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
        },
      },
      required: ["query"],
    },
  };
  return tool;
}

describe("lazy-tool-schema (capability module)", () => {
  const tool = fullSchemaTool("srv__search", "Search the index for matching records.");

  it("summarizeTool drops the bulky inputSchema and trims long descriptions", () => {
    const long = fullSchemaTool("srv__x", "x".repeat(LAZY_DESCRIPTION_MAX_LENGTH + 50));
    const summarized = summarizeTool(long, LAZY_DESCRIPTION_MAX_LENGTH);
    expect(summarized.name).toBe("srv__x");
    expect(summarized.description?.endsWith("…")).toBe(true);
    expect(Object.keys(summarized.inputSchema.properties ?? {})).toHaveLength(0);
  });

  it("summarizeTool leaves short descriptions intact", () => {
    const summarized = summarizeTool(tool);
    expect(summarized.description).toBe(tool.description);
    expect(Object.keys(summarized.inputSchema.properties ?? {})).toHaveLength(0);
  });

  it("buildLazyToolListing summarizes tools and appends the hydration meta-tool", () => {
    const listing = buildLazyToolListing([tool]);
    expect(listing).toHaveLength(2);
    expect(listing.find((t) => t.name === LAZY_SCHEMA_TOOL_NAME)).toBeDefined();
    expect(Object.keys(listing[0].inputSchema.properties ?? {})).toHaveLength(0);
  });

  it("hydrateToolSchema returns the full tool by name", () => {
    expect(hydrateToolSchema([tool], "srv__search")).toBe(tool);
    expect(hydrateToolSchema([tool], "missing")).toBeUndefined();
  });

  it("buildHydrationResponse returns the full schema as text on demand", () => {
    const res = buildHydrationResponse([tool], "srv__search");
    expect(res.isError).toBeFalsy();
    const item = res.content[0];
    expect(item).toBeDefined();
    expect((item as { text: string }).text).toContain('"query"');
  });

  it("buildHydrationResponse errors for unknown tools", () => {
    const res = buildHydrationResponse([tool], "nope");
    expect(res.isError).toBe(true);
  });

  it("estimateTokenSavings reports a per-turn reduction for bulky schemas", () => {
    const tools = [tool, fullSchemaTool("srv__create", "Create a record.")];
    const { full, lazy, saved } = estimateTokenSavings(tools);
    expect(full).toBeGreaterThan(lazy);
    expect(saved).toBeGreaterThan(0);
  });
});

describe("gateway buildListToolsResponse (lazy-tool-schema wiring)", () => {
  let configDir: string;
  let prevEnv: string | undefined;
  const tools: Tool[] = [
    fullSchemaTool("srv__search", "Search the index for matching records."),
    fullSchemaTool("srv__create", "Create a new record in the store."),
  ];

  beforeEach(() => {
    prevEnv = process.env.MCP_MANAGER_CONFIG_DIR;
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpsm-lazy-"));
    process.env.MCP_MANAGER_CONFIG_DIR = configDir;
    fs.writeFileSync(
      path.join(configDir, "config.json"),
      JSON.stringify({ servers: [], remoteServers: [], port: 8850 })
    );
    resetConfigService();
    resetSettingsService();
    resetGatewayStateForTests();
    setGatewayStateForTests({ aggregatedTools: tools });
  });

  afterEach(() => {
    if (prevEnv === undefined) {
      delete process.env.MCP_MANAGER_CONFIG_DIR;
    } else {
      process.env.MCP_MANAGER_CONFIG_DIR = prevEnv;
    }
    resetGatewayStateForTests();
    resetConfigService();
    resetSettingsService();
    if (configDir && fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true });
    }
  });

  function writeSettings(value: boolean): void {
    fs.writeFileSync(
      path.join(configDir, "settings.json"),
      JSON.stringify({ lazyToolSchemas: value })
    );
    resetSettingsService();
  }

  it("returns full schemas by default (lazyToolSchemas off — no behavior change)", () => {
    const { tools: listed } = buildListToolsResponse();
    expect(listed).toHaveLength(2);
    expect(Object.keys(listed[0].inputSchema.properties ?? {})).not.toHaveLength(0);
    expect(listed.find((t) => t.name === LAZY_SCHEMA_TOOL_NAME)).toBeUndefined();
  });

  it("summarizes tools and injects the hydration meta-tool when enabled", () => {
    writeSettings(true);
    const { tools: listed } = buildListToolsResponse();
    expect(listed).toHaveLength(3); // 2 summarized + 1 hydration meta-tool
    expect(listed.find((t) => t.name === LAZY_SCHEMA_TOOL_NAME)).toBeDefined();

    const search = listed.find((t) => t.name === "srv__search");
    if (!search) throw new Error("summarized search tool missing");
    expect(Object.keys(search.inputSchema.properties ?? {})).toHaveLength(0);
  });

  it("falls back to full schemas when settings are unreadable (safe default)", () => {
    fs.writeFileSync(path.join(configDir, "settings.json"), "{ not valid json");
    resetSettingsService();
    const { tools: listed } = buildListToolsResponse();
    expect(listed).toHaveLength(2);
    expect(Object.keys(listed[0].inputSchema.properties ?? {})).not.toHaveLength(0);
  });
});
