import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { ProfileService, resetProfileService } from "../src/services/profile.service.js";
import { getConfigService, resetConfigService } from "../src/services/config.service.js";

// Test directory setup
const testConfigDir = path.join(os.tmpdir(), "mcpsm-profiles-test-" + Date.now());

describe("ProfileService", () => {
  let profileService: ProfileService;

  beforeEach(() => {
    process.env.MCP_MANAGER_CONFIG_DIR = testConfigDir;
    resetConfigService();
    resetProfileService();

    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // Write default config
    fs.writeFileSync(
      path.join(testConfigDir, "config.json"),
      JSON.stringify({
        servers: [
          { id: "server1", name: "Server 1", command: "test", args: [] },
          { id: "server2", name: "Server 2", command: "test", args: [] },
        ],
        remoteServers: [{ id: "remote1", name: "Remote 1", type: "http", url: "http://localhost" }],
        port: 8850,
      })
    );

    getConfigService(testConfigDir);
  });

  afterEach(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    resetProfileService();
    resetConfigService();
  });

  describe("getActiveProfileId / getActiveProfile", () => {
    it("should return default profile when no file exists", () => {
      profileService = new ProfileService();

      expect(profileService.getActiveProfileId()).toBe("default");
      expect(profileService.getActiveProfile()).toBeDefined();
    });

    it("should load existing profile", () => {
      fs.writeFileSync(
        path.join(testConfigDir, "profiles.json"),
        JSON.stringify({
          activeProfile: "custom",
          profiles: {
            default: { name: "Default", servers: [], remoteServers: [] },
            custom: { name: "Custom", servers: ["server1"], remoteServers: [] },
          },
        })
      );

      profileService = new ProfileService();

      expect(profileService.getActiveProfileId()).toBe("custom");
      const profile = profileService.getProfile("custom");
      expect(profile).toBeDefined();
      expect(profile?.servers).toContain("server1");
    });
  });

  describe("list", () => {
    it("should list all profiles", () => {
      profileService = new ProfileService();
      const profiles = profileService.list();

      expect(profiles).toBeInstanceOf(Array);
      expect(profiles.length).toBeGreaterThan(0);

      const defaultProfile = profiles.find((p) => p.id === "default");
      expect(defaultProfile).toBeDefined();
      expect(defaultProfile?.isActive).toBe(true);
    });
  });

  describe("create", () => {
    it("should create a new profile", () => {
      profileService = new ProfileService();

      const result = profileService.create("test", "Test Profile");
      expect(result.success).toBe(true);

      const profile = profileService.getProfile("test");
      expect(profile).toBeDefined();
      expect(profile?.name).toBe("Test Profile");
    });

    it("should fail when profile already exists", () => {
      profileService = new ProfileService();

      // First creation should succeed
      profileService.create("test", "Test");

      // Second should fail
      const result = profileService.create("test", "Test");
      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });
  });

  describe("delete", () => {
    it("should delete a profile", () => {
      profileService = new ProfileService();

      profileService.create("test", "Test");
      expect(profileService.getProfile("test")).toBeDefined();

      const result = profileService.delete("test");
      expect(result.success).toBe(true);
      expect(profileService.getProfile("test")).toBeUndefined();
    });

    it("should not allow deleting default profile", () => {
      profileService = new ProfileService();

      const result = profileService.delete("default");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot delete default");
    });

    it("should fail when profile not found", () => {
      profileService = new ProfileService();

      const result = profileService.delete("nonexistent");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should switch to default if deleting active profile", () => {
      profileService = new ProfileService();

      profileService.create("test", "Test");
      profileService.use("test");
      expect(profileService.getActiveProfileId()).toBe("test");

      profileService.delete("test");
      expect(profileService.getActiveProfileId()).toBe("default");
    });
  });

  describe("use", () => {
    it("should switch active profile", () => {
      profileService = new ProfileService();

      profileService.create("test", "Test");
      const result = profileService.use("test");

      expect(result.success).toBe(true);
      expect(profileService.getActiveProfileId()).toBe("test");
    });

    it("should fail for non-existent profile", () => {
      profileService = new ProfileService();

      const result = profileService.use("nonexistent");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("addServer", () => {
    it("should add local server to profile", () => {
      profileService = new ProfileService();

      profileService.create("test", "Test");
      const result = profileService.addServer("test", "server1");

      expect(result.success).toBe(true);

      const profile = profileService.getProfile("test");
      expect(profile?.servers).toContain("server1");
    });

    it("should add remote server to profile", () => {
      profileService = new ProfileService();

      profileService.create("test", "Test");
      const result = profileService.addServer("test", "remote1");

      expect(result.success).toBe(true);

      const profile = profileService.getProfile("test");
      expect(profile?.remoteServers).toContain("remote1");
    });

    it("should fail when profile not found", () => {
      profileService = new ProfileService();

      const result = profileService.addServer("nonexistent", "server1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Profile not found");
    });

    it("should fail when server not found", () => {
      profileService = new ProfileService();

      profileService.create("test", "Test");
      const result = profileService.addServer("test", "nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Server not found");
    });
  });

  describe("removeServer", () => {
    it("should remove server from profile", () => {
      profileService = new ProfileService();

      profileService.create("test", "Test");
      profileService.addServer("test", "server1");

      let profile = profileService.getProfile("test");
      expect(profile?.servers).toContain("server1");

      const result = profileService.removeServer("test", "server1");
      expect(result.success).toBe(true);

      profile = profileService.getProfile("test");
      expect(profile?.servers).not.toContain("server1");
    });

    it("should fail when profile not found", () => {
      profileService = new ProfileService();

      const result = profileService.removeServer("nonexistent", "server1");
      expect(result.success).toBe(false);
    });
  });

  describe("getServersForActiveProfile", () => {
    it("should return all servers when profile has empty lists", () => {
      profileService = new ProfileService();

      const { servers, remoteServers } = profileService.getServersForActiveProfile();
      expect(servers).toHaveLength(2);
      expect(remoteServers).toHaveLength(1);
    });

    it("should return filtered servers when profile has specific servers", () => {
      resetProfileService();
      profileService = new ProfileService();

      // Use a unique profile name to avoid state from previous tests
      profileService.create("filtered-test", "Filtered Test");
      const addResult = profileService.addServer("filtered-test", "server1");
      expect(addResult.success).toBe(true);

      profileService.use("filtered-test");

      const profile = profileService.getProfile("filtered-test");
      // Verify profile state
      expect(profile?.servers).toEqual(["server1"]);
      expect(profile?.remoteServers).toEqual([]);

      const { servers, remoteServers } = profileService.getServersForActiveProfile();
      expect(servers).toHaveLength(1);
      expect(servers[0].id).toBe("server1");
      expect(remoteServers).toHaveLength(0);
    });
  });

  describe("exists", () => {
    it("should check if profile exists", () => {
      profileService = new ProfileService();

      expect(profileService.exists("default")).toBe(true);
      expect(profileService.exists("nonexistent")).toBe(false);
    });
  });

  describe("rename", () => {
    it("should rename a profile", () => {
      profileService = new ProfileService();

      profileService.create("test", "Test");
      const result = profileService.rename("test", "New Name");

      expect(result.success).toBe(true);
      expect(profileService.getProfile("test")?.name).toBe("New Name");
    });

    it("should fail when profile not found", () => {
      profileService = new ProfileService();

      const result = profileService.rename("nonexistent", "New Name");
      expect(result.success).toBe(false);
    });
  });

  describe("clone", () => {
    it("should successfully clone a profile with new ID", () => {
      profileService = new ProfileService();

      profileService.create("source", "Source Profile");
      profileService.addServer("source", "server1");

      const result = profileService.clone("source", "target");
      expect(result.success).toBe(true);

      const cloned = profileService.getProfile("target");
      expect(cloned).toBeDefined();
      expect(cloned?.name).toBe("Source Profile (Copy)");
      expect(cloned?.servers).toEqual(["server1"]);
    });

    it("should clone with custom display name", () => {
      profileService = new ProfileService();

      profileService.create("source2", "Source");
      const result = profileService.clone("source2", "target2", "Custom Name");

      expect(result.success).toBe(true);
      expect(profileService.getProfile("target2")?.name).toBe("Custom Name");
    });

    it("should deep clone servers and remoteServers arrays", () => {
      profileService = new ProfileService();

      profileService.create("source3", "Source");
      profileService.addServer("source3", "server1");
      profileService.addServer("source3", "remote1");

      profileService.clone("source3", "target3");

      const source = profileService.getProfile("source3");
      const target = profileService.getProfile("target3");

      // Should be equal values
      expect(target?.servers).toEqual(source?.servers);
      expect(target?.remoteServers).toEqual(source?.remoteServers);

      // But different array instances (deep clone)
      expect(target?.servers).not.toBe(source?.servers);
      expect(target?.remoteServers).not.toBe(source?.remoteServers);
    });

    it("should deep clone toolFilters if present", () => {
      profileService = new ProfileService();

      // Create profile with toolFilters
      fs.writeFileSync(
        path.join(testConfigDir, "profiles.json"),
        JSON.stringify({
          activeProfile: "default",
          profiles: {
            default: { name: "Default", servers: [], remoteServers: [] },
            source: {
              name: "Source",
              servers: [],
              remoteServers: [],
              toolFilters: { server1: { tool1: false, tool2: true } },
            },
          },
        })
      );

      profileService = new ProfileService();
      const result = profileService.clone("source", "target");

      expect(result.success).toBe(true);

      const source = profileService.getProfile("source");
      const target = profileService.getProfile("target");

      expect(target?.toolFilters).toEqual(source?.toolFilters);
      // Should be deep cloned (different objects)
      expect(target?.toolFilters).not.toBe(source?.toolFilters);
    });

    it("should fail when source profile not found", () => {
      profileService = new ProfileService();

      const result = profileService.clone("nonexistent", "target");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Source profile not found");
    });

    it("should fail when target profile already exists", () => {
      profileService = new ProfileService();

      profileService.create("source", "Source");
      profileService.create("target", "Target");

      const result = profileService.clone("source", "target");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Profile already exists");
    });

    it("should generate '(Copy)' suffix when no display name provided", () => {
      profileService = new ProfileService();

      profileService.create("source4", "My Profile");
      profileService.clone("source4", "target4");

      expect(profileService.getProfile("target4")?.name).toBe("My Profile (Copy)");
    });
  });
});
