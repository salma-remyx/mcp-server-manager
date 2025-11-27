import { describe, it, expect } from "vitest";
import { parseEnvInput, normalizeEnv } from "../src/shared/env.js";

describe("parseEnvInput", () => {
  it("parses single key/value pair", () => {
    const result = parseEnvInput("API_KEY=123");
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ API_KEY: "123" });
  });

  it("parses multiple pairs from array or whitespace", () => {
    const fromArray = parseEnvInput(["FOO=bar", "BAR=baz"]);
    expect(fromArray.success).toBe(true);
    expect(fromArray.data).toEqual({ FOO: "bar", BAR: "baz" });

    const spaced = parseEnvInput("ONE=1 TWO=2,THREE=3");
    expect(spaced.success).toBe(true);
    expect(spaced.data).toEqual({ ONE: "1", TWO: "2", THREE: "3" });
  });

  it("preserves values containing equals signs", () => {
    const result = parseEnvInput("TOKEN=abc=def");
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ TOKEN: "abc=def" });
  });

  it("rejects invalid entries", () => {
    const result = parseEnvInput("INVALID");
    expect(result.success).toBe(false);
    expect(result.error).toContain("KEY=VALUE");
  });

  it("returns empty data for undefined or blank input", () => {
    expect(parseEnvInput().data).toEqual({});
    expect(parseEnvInput("  ").data).toEqual({});
  });
});

describe("normalizeEnv", () => {
  it("returns undefined for empty env objects", () => {
    expect(normalizeEnv({})).toBeUndefined();
    expect(normalizeEnv(undefined)).toBeUndefined();
  });

  it("returns env when populated", () => {
    const env = { FOO: "bar" };
    expect(normalizeEnv(env)).toEqual(env);
  });
});
