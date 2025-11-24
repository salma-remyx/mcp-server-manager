import { describe, it, expect } from "vitest";
import {
  validatePort,
  validateUrl,
  validateServerId,
  validateServerName,
  validateCommand,
  validateProfileId,
  generateServerId,
} from "../src/shared/validators.js";

describe("Validators", () => {
  describe("validatePort", () => {
    it("should accept valid port numbers", () => {
      expect(validatePort(8080).valid).toBe(true);
      expect(validatePort(3000).valid).toBe(true);
      expect(validatePort(65535).valid).toBe(true);
      expect(validatePort(1024).valid).toBe(true);
    });

    it("should reject invalid port numbers", () => {
      expect(validatePort(0).valid).toBe(false);
      expect(validatePort(-1).valid).toBe(false);
      expect(validatePort(65536).valid).toBe(false);
      expect(validatePort(100000).valid).toBe(false);
    });

    it("should reject non-integer ports", () => {
      expect(validatePort(3000.5).valid).toBe(false);
      expect(validatePort(NaN).valid).toBe(false);
    });

    it("should warn about privileged ports but still be valid", () => {
      const result = validatePort(80);
      expect(result.valid).toBe(true);
      expect(result.error).toContain("privileged");
    });
  });

  describe("validateUrl", () => {
    it("should accept valid HTTP URLs", () => {
      expect(validateUrl("http://localhost:8080").valid).toBe(true);
      expect(validateUrl("https://api.example.com").valid).toBe(true);
      expect(validateUrl("http://192.168.1.1:3000/path").valid).toBe(true);
    });

    it("should reject empty URLs", () => {
      expect(validateUrl("").valid).toBe(false);
      expect(validateUrl("   ").valid).toBe(false);
    });

    it("should reject non-HTTP protocols", () => {
      expect(validateUrl("ftp://example.com").valid).toBe(false);
      expect(validateUrl("file:///path/to/file").valid).toBe(false);
    });

    it("should reject invalid URL formats", () => {
      expect(validateUrl("not a url").valid).toBe(false);
      expect(validateUrl("://missing-protocol.com").valid).toBe(false);
    });
  });

  describe("validateServerId", () => {
    it("should accept valid server IDs", () => {
      expect(validateServerId("my-server").valid).toBe(true);
      expect(validateServerId("server_123").valid).toBe(true);
      expect(validateServerId("MyServer").valid).toBe(true);
    });

    it("should reject empty IDs", () => {
      expect(validateServerId("").valid).toBe(false);
      expect(validateServerId("   ").valid).toBe(false);
    });

    it("should reject IDs with special characters", () => {
      expect(validateServerId("server@name").valid).toBe(false);
      expect(validateServerId("server name").valid).toBe(false);
      expect(validateServerId("server.name").valid).toBe(false);
    });

    it("should reject IDs exceeding 64 characters", () => {
      const longId = "a".repeat(65);
      expect(validateServerId(longId).valid).toBe(false);
      expect(validateServerId("a".repeat(64)).valid).toBe(true);
    });
  });

  describe("validateServerName", () => {
    it("should accept valid server names", () => {
      expect(validateServerName("My Server").valid).toBe(true);
      expect(validateServerName("Production API").valid).toBe(true);
    });

    it("should reject empty names", () => {
      expect(validateServerName("").valid).toBe(false);
      expect(validateServerName("   ").valid).toBe(false);
    });

    it("should reject names exceeding 128 characters", () => {
      const longName = "a".repeat(129);
      expect(validateServerName(longName).valid).toBe(false);
      expect(validateServerName("a".repeat(128)).valid).toBe(true);
    });
  });

  describe("validateCommand", () => {
    it("should accept safe commands", () => {
      expect(validateCommand("node").valid).toBe(true);
      expect(validateCommand("npx").valid).toBe(true);
      expect(validateCommand("python3").valid).toBe(true);
    });

    it("should reject empty commands", () => {
      expect(validateCommand("").valid).toBe(false);
      expect(validateCommand("   ").valid).toBe(false);
    });

    it("should reject commands with dangerous shell metacharacters", () => {
      expect(validateCommand("cmd; rm -rf /").valid).toBe(false);
      expect(validateCommand("cmd | cat /etc/passwd").valid).toBe(false);
      expect(validateCommand("cmd && malicious").valid).toBe(false);
      expect(validateCommand("$(whoami)").valid).toBe(false);
      expect(validateCommand("`whoami`").valid).toBe(false);
    });
  });

  describe("validateProfileId", () => {
    it("should accept valid profile IDs", () => {
      expect(validateProfileId("default").valid).toBe(true);
      expect(validateProfileId("dev-profile").valid).toBe(true);
      expect(validateProfileId("profile_123").valid).toBe(true);
    });

    it("should reject empty IDs", () => {
      expect(validateProfileId("").valid).toBe(false);
    });

    it("should reject IDs with special characters", () => {
      expect(validateProfileId("profile@name").valid).toBe(false);
      expect(validateProfileId("profile name").valid).toBe(false);
    });

    it("should reject IDs exceeding 64 characters", () => {
      expect(validateProfileId("a".repeat(65)).valid).toBe(false);
    });
  });

  describe("generateServerId", () => {
    it("should generate lowercase IDs from names", () => {
      expect(generateServerId("My Server")).toBe("my-server");
      expect(generateServerId("TEST SERVER")).toBe("test-server");
    });

    it("should replace spaces with dashes", () => {
      expect(generateServerId("my server name")).toBe("my-server-name");
    });

    it("should remove special characters", () => {
      expect(generateServerId("server@test!")).toBe("servertest");
    });

    it("should truncate to 64 characters", () => {
      const longName = "a".repeat(100);
      expect(generateServerId(longName).length).toBe(64);
    });
  });
});
