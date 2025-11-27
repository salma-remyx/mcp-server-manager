import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const NODE = process.execPath;
const CLI_ENTRY = "bin/cli.js";

describe("CLI import interactive conflict resolution", () => {
  let testConfigDir: string;
  let configPath: string;
  let importPath: string;

  beforeEach(() => {
    testConfigDir = path.join(os.tmpdir(), `mcpsm-import-interactive-${Date.now()}`);
    configPath = path.join(testConfigDir, "config.json");
    importPath = path.join(testConfigDir, "incoming.json");

    fs.mkdirSync(testConfigDir, { recursive: true });

    // Existing server
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          port: 8850,
          servers: [
            { id: "dup", name: "Existing", command: "node", args: ["-e", "console.log(1)"] },
          ],
          remoteServers: [],
        },
        null,
        2
      )
    );

    // Incoming conflicting server (same id, different command)
    fs.writeFileSync(
      importPath,
      JSON.stringify(
        {
          servers: [
            { id: "dup", name: "Incoming", command: "node", args: ["-e", "console.log(2)"] },
          ],
          remoteServers: [],
        },
        null,
        2
      )
    );
  });

  afterEach(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  const cliEnv = (): Record<string, string | undefined> => ({
    ...process.env,
    MCP_MANAGER_CONFIG_DIR: testConfigDir,
  });

  it("allows choosing overwrite interactively", () => {
    const result = spawnSync(NODE, [CLI_ENTRY, "import", importPath], {
      cwd: process.cwd(),
      env: cliEnv(),
      input: "o\n",
      encoding: "utf8",
    });

    expect(result.status).toBe(0);

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(config.servers[0].command).toBe("node");
    expect(config.servers[0].args).toEqual(["-e", "console.log(2)"]); // overwritten
  });
});
