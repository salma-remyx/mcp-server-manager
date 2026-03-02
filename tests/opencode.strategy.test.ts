import { describe, expect, it } from "vitest";
import { OpenCodeStrategy } from "../src/services/clients/opencode.strategy.js";
import type { ClientMcpConfig } from "../src/types/index.js";

const OPENCODE_SCHEMA_URL = "https://opencode.ai/config.json";

describe("OpenCodeStrategy", () => {
  it("adds mcpsm gateway using OpenCode remote transport format", () => {
    const strategy = new OpenCodeStrategy();
    const config: ClientMcpConfig = {
      mcp: {
        existing: {
          type: "remote",
          url: "https://example.com/mcp",
        },
      },
    };

    const updated = strategy.addGateway(config, 8850);

    expect(updated).toEqual({
      $schema: OPENCODE_SCHEMA_URL,
      mcp: {
        existing: {
          type: "remote",
          url: "https://example.com/mcp",
        },
        mcpsm: {
          type: "remote",
          url: "http://localhost:8850/mcp",
        },
      },
    });
  });

  it("removes mcpsm while preserving other OpenCode servers and schema", () => {
    const strategy = new OpenCodeStrategy();
    const config: ClientMcpConfig = {
      $schema: OPENCODE_SCHEMA_URL,
      mcp: {
        mcpsm: {
          type: "remote",
          url: "http://localhost:8850/mcp",
        },
        existing: {
          type: "remote",
          url: "https://example.com/mcp",
        },
      },
    };

    const updated = strategy.removeGateway(config);

    expect(updated).toEqual({
      $schema: OPENCODE_SCHEMA_URL,
      mcp: {
        existing: {
          type: "remote",
          url: "https://example.com/mcp",
        },
      },
    });
  });
});
