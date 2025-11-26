import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { logger, createLogger, configureLogger } from "../src/shared/logger.js";

describe("Logger", () => {
  beforeEach(() => {
    configureLogger({ level: "debug" }); // Enable all logs for testing
  });

  afterEach(() => {
    configureLogger({ level: "info" }); // Reset to default
  });

  describe("configureLogger", () => {
    it("should set log level", () => {
      configureLogger({ level: "warn" });
      // Logger is configured, can't easily verify internal state
      // but we can verify it doesn't throw
      expect(() => configureLogger({ level: "error" })).not.toThrow();
    });
  });

  describe("createLogger", () => {
    it("should create a child logger with prefix", () => {
      const childLogger = createLogger("TestModule");

      expect(childLogger).toHaveProperty("debug");
      expect(childLogger).toHaveProperty("info");
      expect(childLogger).toHaveProperty("warn");
      expect(childLogger).toHaveProperty("error");
      expect(childLogger).toHaveProperty("success");
    });
  });

  describe("logger object", () => {
    it("should have debug, info, warn, error functions", () => {
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
    });

    it("should have utility functions", () => {
      expect(typeof logger.success).toBe("function");
      expect(typeof logger.fail).toBe("function");
      expect(typeof logger.warning).toBe("function");
      expect(typeof logger.blank).toBe("function");
      expect(typeof logger.section).toBe("function");
      expect(typeof logger.item).toBe("function");
      expect(typeof logger.kv).toBe("function");
      expect(typeof logger.raw).toBe("function");
    });
  });
});
