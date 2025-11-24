import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatTokens, outputJson } from "../src/shared/formatters.js";

describe("Formatters", () => {
  describe("formatTokens", () => {
    it("should format millions with M suffix", () => {
      expect(formatTokens(1000000)).toBe("1.0M");
      expect(formatTokens(1500000)).toBe("1.5M");
      expect(formatTokens(2300000)).toBe("2.3M");
    });

    it("should format thousands with K suffix", () => {
      expect(formatTokens(1000)).toBe("1.0K");
      expect(formatTokens(1500)).toBe("1.5K");
      expect(formatTokens(50000)).toBe("50.0K");
      expect(formatTokens(999999)).toBe("1000.0K");
    });

    it("should return plain number for values under 1000", () => {
      expect(formatTokens(0)).toBe("0");
      expect(formatTokens(1)).toBe("1");
      expect(formatTokens(500)).toBe("500");
      expect(formatTokens(999)).toBe("999");
    });

    it("should handle edge cases", () => {
      expect(formatTokens(1000)).toBe("1.0K");
      expect(formatTokens(1000000)).toBe("1.0M");
    });
  });

  describe("outputJson", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should output formatted JSON with 2 space indent", () => {
      const data = { key: "value" };
      outputJson(data);
      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it("should handle arrays", () => {
      const data = [1, 2, 3];
      outputJson(data);
      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it("should handle nested objects", () => {
      const data = { nested: { deep: { value: 123 } } };
      outputJson(data);
      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it("should handle null and undefined", () => {
      outputJson(null);
      expect(consoleSpy).toHaveBeenCalledWith("null");

      outputJson(undefined);
      expect(consoleSpy).toHaveBeenCalledWith(undefined);
    });

    it("should handle primitive values", () => {
      outputJson("string");
      expect(consoleSpy).toHaveBeenCalledWith('"string"');

      outputJson(42);
      expect(consoleSpy).toHaveBeenCalledWith("42");

      outputJson(true);
      expect(consoleSpy).toHaveBeenCalledWith("true");
    });
  });
});
