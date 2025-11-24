/**
 * Daemon service - manages gateway daemon process
 */

import fs from "fs";
import path from "path";
import os from "os";
import { spawn, execSync, ChildProcess } from "child_process";
import { getConfigService } from "./config.service.js";
import type { Result } from "../types/index.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("DaemonService");

/** Daemon status */
export interface DaemonStatus {
  running: boolean;
  pid?: number;
}

/** Daemon service class */
export class DaemonService {
  private configDir: string;
  private pidFile: string;
  private logFile: string;
  private logsDir: string;

  constructor() {
    const configService = getConfigService();
    this.configDir = configService.getPaths().configDir;
    this.logsDir = path.join(this.configDir, "logs");
    this.pidFile = path.join(this.configDir, "daemon.pid");
    this.logFile = path.join(this.logsDir, "gateway.log");

    this.ensureLogsDir();
  }

  /** Ensure logs directory exists */
  private ensureLogsDir(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /** Check if daemon is running */
  isDaemonRunning(): DaemonStatus {
    if (!fs.existsSync(this.pidFile)) {
      return { running: false };
    }

    try {
      const pid = parseInt(fs.readFileSync(this.pidFile, "utf8").trim());
      // Check if process is alive (signal 0 doesn't kill, just checks)
      process.kill(pid, 0);
      return { running: true, pid };
    } catch (error) {
      log.debug("Daemon process not found, cleaning up stale PID file:", error);
      // Process not found, clean up stale pid file
      try {
        fs.unlinkSync(this.pidFile);
      } catch (cleanupError) {
        log.debug("Failed to remove stale PID file:", cleanupError);
      }
      return { running: false };
    }
  }

  /** Start daemon */
  startDaemon(selectedServers: string[] = []): Result & { pid?: number } {
    const status = this.isDaemonRunning();
    if (status.running) {
      return { success: false, error: `Daemon already running (PID: ${status.pid})` };
    }

    // Find the CLI path - using import.meta.url for ES modules
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const cliPath = path.join(currentDir, "..", "..", "bin", "cli.js");

    // Check if dist exists, use that instead
    const distCliPath = path.join(currentDir, "..", "..", "dist", "cli", "index.js");
    const finalCliPath = fs.existsSync(distCliPath) ? distCliPath : cliPath;

    // Start the gateway process in background
    this.ensureLogsDir();
    const logStream = fs.openSync(this.logFile, "a");

    const env: Record<string, string | undefined> = { ...process.env, MCPSM_DAEMON: "1" };

    // Pass selected servers as env variable if specified
    if (selectedServers.length > 0) {
      env.MCPSM_SERVERS = selectedServers.join(",");
    }

    const child: ChildProcess = spawn("node", [finalCliPath, "--daemon-mode"], {
      detached: true,
      stdio: ["ignore", logStream, logStream],
      env,
    });

    child.unref();

    // Save PID
    if (child.pid) {
      fs.writeFileSync(this.pidFile, child.pid.toString());
      return { success: true, pid: child.pid };
    }

    return { success: false, error: "Failed to start daemon process" };
  }

  /** Stop daemon */
  stopDaemon(): Result {
    const status = this.isDaemonRunning();
    if (!status.running) {
      return { success: false, error: "Daemon not running" };
    }

    try {
      process.kill(status.pid!, "SIGTERM");
      fs.unlinkSync(this.pidFile);
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** Get logs */
  getLogs(lines = 50): string[] {
    if (!fs.existsSync(this.logFile)) {
      return [];
    }

    const content = fs.readFileSync(this.logFile, "utf8");
    const allLines = content.split("\n").filter((l) => l.trim());
    return allLines.slice(-lines);
  }

  /** Clear logs */
  clearLogs(): Result {
    if (fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, "");
    }
    return { success: true };
  }

  /** Get log file path */
  getLogFilePath(): string {
    return this.logFile;
  }

  // === Startup Management ===

  /** Get LaunchAgent path for macOS */
  private getLaunchAgentPath(): string {
    return path.join(os.homedir(), "Library/LaunchAgents/com.mcpsm.gateway.plist");
  }

  /** Get systemd service path for Linux */
  private getSystemdPath(): string {
    return path.join(os.homedir(), ".config/systemd/user/mcpsm.service");
  }

  /** Generate LaunchAgent content for macOS */
  private generateLaunchAgentContent(): string {
    const nodePath = process.execPath;
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const cliPath = path.join(currentDir, "..", "..", "bin", "cli.js");
    const distCliPath = path.join(currentDir, "..", "..", "dist", "cli", "index.js");
    const finalCliPath = fs.existsSync(distCliPath) ? distCliPath : cliPath;

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mcpsm.gateway</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${finalCliPath}</string>
        <string>--daemon-mode</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${this.logFile}</string>
    <key>StandardErrorPath</key>
    <string>${this.logFile}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>MCPSM_DAEMON</key>
        <string>1</string>
    </dict>
</dict>
</plist>`;
  }

  /** Generate systemd service content for Linux */
  private generateSystemdContent(): string {
    const nodePath = process.execPath;
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const cliPath = path.join(currentDir, "..", "..", "bin", "cli.js");
    const distCliPath = path.join(currentDir, "..", "..", "dist", "cli", "index.js");
    const finalCliPath = fs.existsSync(distCliPath) ? distCliPath : cliPath;

    return `[Unit]
Description=MCP Server Manager Gateway
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${finalCliPath} --daemon-mode
Restart=always
Environment=MCPSM_DAEMON=1

[Install]
WantedBy=default.target`;
  }

  /** Check if startup is enabled */
  isStartupEnabled(): boolean {
    if (process.platform === "darwin") {
      return fs.existsSync(this.getLaunchAgentPath());
    } else if (process.platform === "linux") {
      return fs.existsSync(this.getSystemdPath());
    }
    return false;
  }

  /** Enable startup */
  enableStartup(): Result {
    if (process.platform === "darwin") {
      const launchAgentPath = this.getLaunchAgentPath();
      const content = this.generateLaunchAgentContent();

      const dir = path.dirname(launchAgentPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(launchAgentPath, content);

      try {
        execSync(`launchctl load "${launchAgentPath}"`, { stdio: "ignore" });
      } catch (error) {
        log.debug("launchctl load failed (may already be loaded):", error);
      }

      return { success: true };
    } else if (process.platform === "linux") {
      const systemdPath = this.getSystemdPath();
      const content = this.generateSystemdContent();

      const dir = path.dirname(systemdPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(systemdPath, content);

      try {
        execSync("systemctl --user daemon-reload", { stdio: "ignore" });
        execSync("systemctl --user enable mcpsm", { stdio: "ignore" });
      } catch (error) {
        log.debug("systemctl enable failed:", error);
      }

      return { success: true };
    }

    return { success: false, error: "Unsupported platform" };
  }

  /** Disable startup */
  disableStartup(): Result {
    if (process.platform === "darwin") {
      const launchAgentPath = this.getLaunchAgentPath();
      if (fs.existsSync(launchAgentPath)) {
        try {
          execSync(`launchctl unload "${launchAgentPath}"`, { stdio: "ignore" });
        } catch (error) {
          log.debug("launchctl unload failed:", error);
        }
        fs.unlinkSync(launchAgentPath);
      }
      return { success: true };
    } else if (process.platform === "linux") {
      const systemdPath = this.getSystemdPath();
      if (fs.existsSync(systemdPath)) {
        try {
          execSync("systemctl --user disable mcpsm", { stdio: "ignore" });
        } catch (error) {
          log.debug("systemctl disable failed:", error);
        }
        fs.unlinkSync(systemdPath);
      }
      return { success: true };
    }

    return { success: false, error: "Unsupported platform" };
  }

  /** Get platform info */
  getPlatformInfo(): { platform: string; supported: boolean; type: string } {
    if (process.platform === "darwin") {
      return { platform: "macOS", supported: true, type: "LaunchAgent" };
    } else if (process.platform === "linux") {
      return { platform: "Linux", supported: true, type: "systemd" };
    }
    return { platform: process.platform, supported: false, type: "none" };
  }

  /** Get full status */
  getStatus(): {
    running: boolean;
    pid?: number;
    startupEnabled: boolean;
    port: number;
    logFile: string;
  } {
    const configService = getConfigService();
    const daemonStatus = this.isDaemonRunning();

    return {
      running: daemonStatus.running,
      pid: daemonStatus.pid,
      startupEnabled: this.isStartupEnabled(),
      port: configService.getPort(),
      logFile: this.logFile,
    };
  }
}

/** Singleton instance */
let instance: DaemonService | null = null;

/** Get or create the daemon service instance */
export function getDaemonService(): DaemonService {
  if (!instance) {
    instance = new DaemonService();
  }
  return instance;
}

/** Reset the singleton instance (for testing) */
export function resetDaemonService(): void {
  instance = null;
}

export default DaemonService;
