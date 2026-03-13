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

    it("should load existing profile and migrate string IDs to objects", () => {
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
      // After migration, servers should be objects
      expect(profile?.servers).toHaveLength(1);
      expect(profile?.servers[0].id).toBe("server1");
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
    it("should create a new profile with empty server arrays", () => {
      profileService = new ProfileService();

      const result = profileService.create("test", "Test Profile");
      expect(result.success).toBe(true);

      const profile = profileService.getProfile("test");
      expect(profile).toBeDefined();
      expect(profile?.name).toBe("Test Profile");
      expect(profile?.servers).toEqual([]);
      expect(profile?.remoteServers).toEqual([]);
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

    it("should not allow deleting active profile", () => {
      profileService = new ProfileService();

      // Try to delete the currently active profile (default is active by default)
      const activeProfileId = profileService.getActiveProfileId();
      const result = profileService.delete(activeProfileId);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot delete active");
    });

    it("should fail when profile not found", () => {
      profileService = new ProfileService();

      const result = profileService.delete("nonexistent");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should allow deleting non-active profile", () => {
      profileService = new ProfileService();

      // Create a test profile
      profileService.create("test", "Test");
      profileService.create("another", "Another");

      // Switch to "another" profile
      profileService.use("another");
      expect(profileService.getActiveProfileId()).toBe("another");

      // Should be able to delete "test" since it's not active
      const result = profileService.delete("test");
      expect(result.success).toBe(true);
      expect(profileService.getProfile("test")).toBeUndefined();
      expect(profileService.getActiveProfileId()).toBe("another"); // Active profile unchanged
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

    it("should load profile servers into config.json when switching", () => {
      profileService = new ProfileService();
      const configService = getConfigService();

      // Default profile was migrated to have all servers from config
      // Create a new profile with specific servers
      profileService.create("minimal", "Minimal");
      const minimalProfile = profileService.getProfile("minimal");
      expect(minimalProfile?.servers).toEqual([]);

      // Switch to the minimal profile
      profileService.use("minimal");

      // Config should now have no servers (empty profile)
      configService.reload();
      expect(configService.getLocalServers()).toEqual([]);
      expect(configService.getRemoteServers()).toEqual([]);

      // Switch back to default
      profileService.use("default");

      // Config should have the original servers
      configService.reload();
      expect(configService.getLocalServers()).toHaveLength(2);
      expect(configService.getRemoteServers()).toHaveLength(1);
    });
  });

  describe("syncFromConfig", () => {
    it("should sync config.json servers into active profile", () => {
      profileService = new ProfileService();
      const configService = getConfigService();

      // Add a server to config.json
      configService.addLocalServer({
        id: "server3",
        name: "Server 3",
        command: "test",
        args: [],
      });

      // Sync into active profile
      profileService.syncFromConfig();

      const profile = profileService.getActiveProfile();
      expect(profile?.servers).toHaveLength(3);
      expect(profile?.servers.some((s) => s.id === "server3")).toBe(true);
    });
  });

  describe("getServersForActiveProfile", () => {
    it("should return profile servers directly", () => {
      profileService = new ProfileService();

      // Default profile was migrated — should match what's in config.json
      const { servers, remoteServers } = profileService.getServersForActiveProfile();
      // Verify the servers are full objects (not string IDs)
      expect(servers.length).toBeGreaterThan(0);
      expect(servers[0]).toHaveProperty("id");
      expect(servers[0]).toHaveProperty("command");
      expect(remoteServers.length).toBeGreaterThan(0);
      expect(remoteServers[0]).toHaveProperty("url");
    });

    it("should return empty arrays for new empty profile", () => {
      profileService = new ProfileService();

      profileService.create("empty", "Empty");
      profileService.use("empty");

      const { servers, remoteServers } = profileService.getServersForActiveProfile();
      expect(servers).toHaveLength(0);
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
    it("should successfully clone a profile with servers", () => {
      profileService = new ProfileService();

      // Default profile has all servers from migration
      const result = profileService.clone("default", "target");
      expect(result.success).toBe(true);

      const cloned = profileService.getProfile("target");
      expect(cloned).toBeDefined();
      expect(cloned?.name).toBe("Default (Copy)");
      expect(cloned?.servers).toHaveLength(2);
      expect(cloned?.servers[0].id).toBe("server1");
    });

    it("should clone with custom display name", () => {
      profileService = new ProfileService();

      profileService.create("source2", "Source");
      const result = profileService.clone("source2", "target2", "Custom Name");

      expect(result.success).toBe(true);
      expect(profileService.getProfile("target2")?.name).toBe("Custom Name");
    });

    it("should deep clone server objects", () => {
      profileService = new ProfileService();

      // Default profile has servers from migration
      profileService.clone("default", "target3");

      const source = profileService.getProfile("default");
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

  describe("migration", () => {
    it("should migrate old string-ID profiles to embedded server objects", () => {
      fs.writeFileSync(
        path.join(testConfigDir, "profiles.json"),
        JSON.stringify({
          activeProfile: "default",
          profiles: {
            default: { name: "Default", servers: [], remoteServers: [] },
            old: { name: "Old", servers: ["server1", "server2"], remoteServers: ["remote1"] },
          },
        })
      );

      profileService = new ProfileService();

      const profile = profileService.getProfile("old");
      expect(profile?.servers).toHaveLength(2);
      expect(profile?.servers[0].id).toBe("server1");
      expect(profile?.servers[0].name).toBe("Server 1");
      expect(profile?.remoteServers).toHaveLength(1);
      expect(profile?.remoteServers[0].id).toBe("remote1");
    });

    it("should populate empty profiles from config.json on first load", () => {
      // Default profile with empty arrays should be populated from config
      profileService = new ProfileService();

      const profile = profileService.getActiveProfile();
      expect(profile?.servers).toHaveLength(2);
      expect(profile?.remoteServers).toHaveLength(1);
    });
  });
});
