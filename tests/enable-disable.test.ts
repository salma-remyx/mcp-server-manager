import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

const CLI = "node bin/cli.js";

describe("CLI enable/disable commands", () => {
  let testConfigDir: string;
  let configPath: string;

  beforeEach(() => {
    testConfigDir = path.join(os.tmpdir(), `mcpsm-enable-disable-${Date.now()}`);
    configPath = path.join(testConfigDir, "config.json");

    fs.mkdirSync(testConfigDir, { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          port: 8850,
          servers: [
            { id: "local1", name: "Local 1", command: "node", args: ["-e", "1"], disabled: false },
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

  it("disables and re-enables a server", () => {
    execSync(`${CLI} disable local1 --yes`, {
      cwd: process.cwd(),
      env: cliEnv(),
      stdio: "pipe",
    });

    let config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(config.servers[0].disabled).toBe(true);

    execSync(`${CLI} enable local1`, {
      cwd: process.cwd(),
      env: cliEnv(),
      stdio: "pipe",
    });

    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(config.servers[0].disabled).toBe(false);
  });
});
