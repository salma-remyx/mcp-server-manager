import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

// Test config directory
const testConfigDir = path.join(os.tmpdir(), "mcpsm-smoke-test-" + Date.now());

describe("CLI Smoke Tests", () => {
  beforeEach(() => {
    // Create test config directory
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // Create minimal config
    const configPath = path.join(testConfigDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        port: 8850,
        servers: [],
        remoteServers: [],
      })
    );

    // Create profiles file
    const profilesPath = path.join(testConfigDir, "profiles.json");
    fs.writeFileSync(
      profilesPath,
      JSON.stringify({
        profiles: {
          default: { name: "Default", servers: [], remoteServers: [] },
        },
        activeProfile: "default",
      })
    );

    // Create settings file
    const settingsPath = path.join(testConfigDir, "settings.json");
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        port: 8850,
        autoTestServers: false,
      })
    );
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe("Help Commands", () => {
    it("mcpsm --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm list --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js list --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm add --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js add --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm remove --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js remove --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm edit --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js edit --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm test --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js test --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm clients --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js clients --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm profile --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js profile --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm settings --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js settings --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm tools --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js tools --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm doctor --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js doctor --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm config --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js config --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm tokens --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js tokens --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm port --help should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js port --help", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });
  });

  describe("Read-Only Commands", () => {
    it("mcpsm --version should return valid version", () => {
      const result = execSync("node bin/cli.js --version", {
        encoding: "utf8",
        cwd: process.cwd(),
      });
      expect(result).toMatch(/\d+\.\d+\.\d+/);
    });

    it("mcpsm list should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js list", {
          encoding: "utf8",
          cwd: process.cwd(),
          env: { ...process.env, MCP_MANAGER_CONFIG_DIR: testConfigDir },
        });
      }).not.toThrow();
    });

    it("mcpsm doctor should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js doctor", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm settings should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js settings", {
          encoding: "utf8",
          cwd: process.cwd(),
          env: { ...process.env, MCP_MANAGER_CONFIG_DIR: testConfigDir },
        });
      }).not.toThrow();
    });

    it("mcpsm settings get port should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js settings get port", {
          encoding: "utf8",
          cwd: process.cwd(),
          env: { ...process.env, MCP_MANAGER_CONFIG_DIR: testConfigDir },
        });
      }).not.toThrow();
    });

    it("mcpsm clients should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js clients", {
          encoding: "utf8",
          cwd: process.cwd(),
        });
      }).not.toThrow();
    });

    it("mcpsm profile list should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js profile list", {
          encoding: "utf8",
          cwd: process.cwd(),
          env: { ...process.env, MCP_MANAGER_CONFIG_DIR: testConfigDir },
        });
      }).not.toThrow();
    });

    it("mcpsm tokens should not crash", () => {
      expect(() => {
        execSync("node bin/cli.js tokens", {
          encoding: "utf8",
          cwd: process.cwd(),
          env: { ...process.env, MCP_MANAGER_CONFIG_DIR: testConfigDir },
        });
      }).not.toThrow();
    });
  });
});
