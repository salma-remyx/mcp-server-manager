import { describe, it, expect } from "vitest";
import { colors, clearScreen } from "../src/shared/colors.js";

describe("Colors", () => {
  it("should export color codes", () => {
    expect(colors).toBeDefined();
    expect(colors.reset).toBeDefined();
    expect(colors.bright).toBeDefined();
    expect(colors.red).toBeDefined();
    expect(colors.green).toBeDefined();
    expect(colors.yellow).toBeDefined();
    expect(colors.blue).toBeDefined();
    expect(colors.cyan).toBeDefined();
    expect(colors.gray).toBeDefined();
  });

  it("should have ANSI escape codes", () => {
    expect(colors.reset).toContain("\x1b[");
    expect(colors.red).toContain("\x1b[");
    expect(colors.green).toContain("\x1b[");
  });

  it("should export clearScreen function", () => {
    expect(clearScreen).toBeDefined();
    expect(typeof clearScreen).toBe("function");
  });
});
