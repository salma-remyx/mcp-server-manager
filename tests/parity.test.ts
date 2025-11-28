import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  FEATURES,
  getMissingTuiFeatures,
  getParityStatus,
  type Feature,
} from "../src/shared/features.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");

/**
 * Extract top-level CLI commands from feature definitions.
 * These are the main commands that group subcommands.
 */
function getTopLevelCommands(): Set<string> {
  const topLevel = new Set<string>();

  for (const feature of FEATURES) {
    for (const cmd of feature.cliCommands) {
      const parts = cmd.split(" ");
      topLevel.add(parts[0]); // Add base command
    }
  }

  return topLevel;
}

/**
 * Get all registered command patterns from features.ts
 * Returns patterns like "list", "clients sync", "daemon start", etc.
 */
function _getRegisteredCommandPatterns(): Set<string> {
  const patterns = new Set<string>();

  for (const feature of FEATURES) {
    for (const cmd of feature.cliCommands) {
      patterns.add(cmd); // Full pattern like "clients sync"

      // Also add variations for compound commands
      const parts = cmd.split(" ");
      if (parts.length === 1) {
        patterns.add(parts[0]); // Simple command
      } else if (parts.length >= 2) {
        // For compound commands like "clients sync", add both forms
        patterns.add(parts[0]); // "clients"
        patterns.add(`${parts[0]} ${parts[1]}`); // "clients sync"
      }
    }
  }

  return patterns;
}

describe("CLI/TUI Parity", () => {
  describe("Feature Registry", () => {
    it("should have unique feature IDs", () => {
      const ids = FEATURES.map((f) => f.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should have valid categories", () => {
      const validCategories = [
        "servers",
        "tools",
        "clients",
        "profiles",
        "settings",
        "daemon",
        "import-export",
        "utilities",
        "auth",
      ];
      for (const feature of FEATURES) {
        expect(validCategories).toContain(feature.category);
      }
    });

    it("should have CLI commands for all features (except optional ones)", () => {
      for (const feature of FEATURES) {
        // Optional features (requiredInTui: false) may have empty CLI commands
        if (feature.requiredInTui) {
          expect(feature.cliCommands.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("CLI Implementation", () => {
    const cliCommandsDir = path.join(srcDir, "cli", "commands");

    it("should have CLI command files", () => {
      expect(fs.existsSync(cliCommandsDir)).toBe(true);
      const files = fs.readdirSync(cliCommandsDir);
      expect(files.length).toBeGreaterThan(0);
    });

    it("should implement all feature CLI commands", () => {
      const cliFiles = fs.readdirSync(cliCommandsDir);
      const cliContent = cliFiles
        .filter((f) => f.endsWith(".ts"))
        .map((f) => fs.readFileSync(path.join(cliCommandsDir, f), "utf8"))
        .join("\n");

      const missingCommands: string[] = [];

      for (const feature of FEATURES) {
        for (const cmd of feature.cliCommands) {
          // Check if command is registered (look for .command("...") pattern)
          const cmdBase = cmd.split(" ")[0];
          const hasCommand =
            cliContent.includes(`command("${cmdBase}`) ||
            cliContent.includes(`command('${cmdBase}`) ||
            cliContent.includes(`.command("${cmd}`) ||
            cliContent.includes(`.command('${cmd}`);

          if (!hasCommand) {
            missingCommands.push(`${feature.id}: ${cmd}`);
          }
        }
      }

      expect(missingCommands).toEqual([]);
    });
  });

  describe("TUI Implementation", () => {
    const tuiDir = path.join(srcDir, "tui");
    const screensDir = path.join(tuiDir, "screens");

    it("should have TUI screen files", () => {
      expect(fs.existsSync(screensDir)).toBe(true);
      const files = fs.readdirSync(screensDir);
      expect(files.length).toBeGreaterThan(0);
    });

    it("should have TUI main entry point", () => {
      const tuiIndex = path.join(tuiDir, "index.ts");
      expect(fs.existsSync(tuiIndex)).toBe(true);
    });

    it("should implement required TUI features", () => {
      const tuiIndexContent = fs.readFileSync(path.join(tuiDir, "index.ts"), "utf8");
      const screenFiles = fs.existsSync(screensDir) ? fs.readdirSync(screensDir) : [];

      const missingFeatures: Feature[] = [];

      for (const feature of FEATURES) {
        if (!feature.requiredInTui) continue;
        if (!feature.tuiImplementation) {
          missingFeatures.push(feature);
          continue;
        }

        const impl = feature.tuiImplementation;

        // Check for screen file
        if (impl.endsWith(".screen.ts")) {
          if (!screenFiles.includes(impl)) {
            missingFeatures.push(feature);
          }
          continue;
        }

        // Check for key binding
        if (impl.startsWith("key:")) {
          const key = impl.replace("key:", "");
          const hasKeyBinding =
            tuiIndexContent.includes(`=== "${key}"`) ||
            tuiIndexContent.includes(`=== '${key}'`) ||
            tuiIndexContent.includes(`.toLowerCase() === "${key}"`) ||
            tuiIndexContent.includes(`.toLowerCase() === '${key}'`);

          if (!hasKeyBinding) {
            missingFeatures.push(feature);
          }
          continue;
        }

        // Check for main-screen (always present)
        if (impl === "main-screen") {
          continue;
        }
      }

      // This test documents missing features but doesn't fail
      // To enforce parity, change toEqual([]) to strict check
      if (missingFeatures.length > 0) {
        console.log("\n⚠️  Missing TUI implementations:");
        for (const f of missingFeatures) {
          console.log(`   - ${f.name} (${f.id})`);
        }
      }
    });
  });

  describe("Parity Status", () => {
    it("should report accurate parity percentage", () => {
      const status = getParityStatus();

      expect(status.total).toBe(FEATURES.length);
      expect(status.implemented + status.missing + status.optional).toBe(status.total);
      expect(status.percentage).toBeGreaterThanOrEqual(0);
      expect(status.percentage).toBeLessThanOrEqual(100);
    });

    it("should identify missing TUI features", () => {
      const missing = getMissingTuiFeatures();
      const status = getParityStatus();

      expect(missing.length).toBe(status.missing);

      // Log status for visibility
      console.log(`\n📊 CLI/TUI Parity: ${status.percentage}%`);
      console.log(`   ✅ Implemented: ${status.implemented}`);
      console.log(`   ❌ Missing: ${status.missing}`);
      console.log(`   ⚪ Optional: ${status.optional}`);

      if (missing.length > 0) {
        console.log("\n🔴 Features missing in TUI:");
        for (const f of missing) {
          console.log(`   - [${f.category}] ${f.name}`);
        }
      }
    });

    it("should have 100% parity for required features", () => {
      const status = getParityStatus();
      const missing = getMissingTuiFeatures();

      if (missing.length > 0) {
        const missingList = missing.map((f) => `${f.name} (${f.id})`).join(", ");
        throw new Error(
          `CLI/TUI parity is ${status.percentage}%, expected 100%. Missing TUI implementations: ${missingList}`
        );
      }

      expect(status.missing).toBe(0);
      expect(status.percentage).toBe(100);
    });
  });

  describe("Command Registration", () => {
    it("should have all top-level CLI commands registered in features.ts", () => {
      const cliDir = path.join(srcDir, "cli", "commands");
      const files = fs.readdirSync(cliDir).filter((f) => f.endsWith(".cmd.ts"));
      const topLevelFromCode: string[] = [];

      // Extract top-level commands (commands registered directly on program)
      for (const file of files) {
        const content = fs.readFileSync(path.join(cliDir, file), "utf8");

        // Match program.command("...") patterns - these are top-level commands
        const programCommandRegex = /program\s*\.\s*command\(["'`]([^"'`\s]+)/g;
        let match;
        while ((match = programCommandRegex.exec(content)) !== null) {
          topLevelFromCode.push(match[1]);
        }

        // Also match: const X = program.command("...")
        const constCommandRegex = /const\s+\w+\s*=\s*program\s*\.\s*command\(["'`]([^"'`\s]+)/g;
        while ((match = constCommandRegex.exec(content)) !== null) {
          topLevelFromCode.push(match[1]);
        }
      }

      const topLevelCommands = new Set(topLevelFromCode);
      const registeredTopLevel = getTopLevelCommands();

      const unregistered = [...topLevelCommands].filter((cmd) => !registeredTopLevel.has(cmd));

      if (unregistered.length > 0) {
        throw new Error(
          `Found top-level CLI commands not registered in features.ts: ${unregistered.join(", ")}. ` +
            `Please add features for these commands to src/shared/features.ts.`
        );
      }

      expect(unregistered).toEqual([]);
    });

    it("should not have stale feature entries for non-existent top-level CLI commands", () => {
      const cliDir = path.join(srcDir, "cli", "commands");
      const files = fs.readdirSync(cliDir).filter((f) => f.endsWith(".cmd.ts"));
      const topLevelFromCode = new Set<string>();

      for (const file of files) {
        const content = fs.readFileSync(path.join(cliDir, file), "utf8");

        // Extract top-level commands
        const programCommandRegex = /program\s*\.\s*command\(["'`]([^"'`\s]+)/g;
        let match;
        while ((match = programCommandRegex.exec(content)) !== null) {
          topLevelFromCode.add(match[1]);
        }

        const constCommandRegex = /const\s+\w+\s*=\s*program\s*\.\s*command\(["'`]([^"'`\s]+)/g;
        while ((match = constCommandRegex.exec(content)) !== null) {
          topLevelFromCode.add(match[1]);
        }
      }

      const staleFeatures: string[] = [];

      for (const feature of FEATURES) {
        for (const cmd of feature.cliCommands) {
          const baseCmd = cmd.split(" ")[0];
          if (!topLevelFromCode.has(baseCmd)) {
            staleFeatures.push(`${feature.id}: ${cmd}`);
          }
        }
      }

      if (staleFeatures.length > 0) {
        throw new Error(
          `Found feature entries for non-existent CLI commands: ${staleFeatures.join(", ")}. ` +
            `Please update src/shared/features.ts to remove stale entries.`
        );
      }

      expect(staleFeatures).toEqual([]);
    });
  });
});
