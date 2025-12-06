/**
 * CLI commands for daemon management
 */

import { Command } from "commander";
import { spawn } from "child_process";
import { colors } from "../../shared/colors.js";
import { outputJson } from "../../shared/formatters.js";
import { getDaemonService } from "../../services/daemon.service.js";
import { getConfigService } from "../../services/config.service.js";
import { getProfileService } from "../../services/profile.service.js";
import { getHttpConnectionService } from "../../services/http-connection.service.js";

/** Register daemon commands */
export function registerDaemonCommands(program: Command): void {
  const daemon = program.command("daemon").description("Manage the gateway daemon");

  // daemon start
  daemon
    .command("start [servers...]")
    .description("Start the gateway daemon")
    .option("-p, --profile <name>", "Use servers from a profile")
    .option("-f, --foreground", "Run in foreground (not as daemon)")
    .action(async (servers: string[], options) => {
      await handleStart(servers, options);
    });

  // daemon stop
  daemon
    .command("stop")
    .description("Stop the gateway daemon")
    .action(async () => {
      await handleStop();
    });

  // daemon refresh
  daemon
    .command("refresh")
    .description("Refresh running daemon configuration without restart")
    .action(async () => {
      await handleRefresh();
    });

  // daemon status
  daemon
    .command("status")
    .description("Show daemon status")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      await handleStatus(options);
    });

  // daemon logs
  daemon
    .command("logs")
    .description("View daemon logs")
    .option("-n, --lines <number>", "Number of lines to show", "50")
    .option("-f, --follow", "Follow log output")
    .option("--clear", "Clear the logs")
    .action(async (options) => {
      await handleLogs(options);
    });

  // daemon startup
  const startup = daemon.command("startup").description("Manage auto-start on system boot");

  startup
    .command("enable")
    .description("Enable auto-start on boot")
    .action(async () => {
      await handleStartupEnable();
    });

  startup
    .command("disable")
    .description("Disable auto-start on boot")
    .action(async () => {
      await handleStartupDisable();
    });

  startup
    .command("status")
    .description("Show auto-start status")
    .action(async () => {
      await handleStartupStatus();
    });

  // Default startup action (show status)
  startup.action(async () => {
    await handleStartupStatus();
  });

  // daemon connect command
  daemon
    .command("connect")
    .description("Connect to the gateway daemon (for MCP clients)")
    .option("--http", "Connect via HTTP transport (native alternative to supergateway)")
    .option("--stdio", "Connect directly via STDIO transport (legacy)")
    .option("--port <number>", "Gateway port (overrides settings)")
    .option("--server <id>", "Server ID for direct STDIO connection")
    .option("--command <cmd>", "Direct command to execute")
    .option("--env <key=val>", "Environment variable (can be used multiple times)")
    .action(async (options) => {
      await handleConnect(options);
    });
}

/** Handle daemon start */
async function handleStart(
  serverNames: string[],
  options: { profile?: string; foreground?: boolean }
): Promise<void> {
  const daemonService = getDaemonService();
  const configService = getConfigService();
  const profileService = getProfileService();

  // Build list of servers to start
  let selectedServers: string[] = [];

  if (options.profile) {
    // Load servers from profile
    const profileData = profileService.getProfile(options.profile);
    if (!profileData) {
      console.error(`${colors.red}Error: Profile '${options.profile}' not found${colors.reset}`);
      process.exit(1);
    }
    selectedServers = profileData.servers || [];
    const includesAll =
      selectedServers.length === 0 && (profileData.remoteServers || []).length === 0;
    if (selectedServers.length === 0 && !includesAll) {
      console.error(
        `${colors.red}Error: Profile '${options.profile}' has no servers${colors.reset}`
      );
      process.exit(1);
    }
    console.log(
      `${colors.gray}Using profile '${options.profile}' with ${selectedServers.length || "all"} server(s)${colors.reset}`
    );
  } else if (serverNames.length > 0) {
    // Validate server names
    for (const nameOrId of serverNames) {
      const found = configService.findServer(nameOrId);
      if (!found) {
        console.error(`${colors.red}Error: Server '${nameOrId}' not found${colors.reset}`);
        process.exit(1);
      }
      selectedServers.push(found.server.id);
    }
  }

  // Start in foreground mode (non-daemon)
  if (options.foreground) {
    console.log(`${colors.cyan}Starting gateway in foreground mode...${colors.reset}`);
    console.log(`${colors.gray}Press Ctrl+C to stop${colors.reset}\n`);

    const { runGatewayForeground } = await import("../../services/gateway.service.js");
    await runGatewayForeground(selectedServers.length > 0 ? selectedServers : undefined);
    return;
  }

  // Daemon mode
  const result = await daemonService.startDaemon();
  if (result.success) {
    console.log(`${colors.green}✓${colors.reset} Gateway started (PID: ${result.pid})`);
    if (selectedServers.length > 0) {
      console.log(`${colors.gray}Servers: ${selectedServers.join(", ")}${colors.reset}`);
    } else {
      console.log(`${colors.gray}All enabled servers${colors.reset}`);
    }
    console.log(`${colors.gray}Logs: ${daemonService.getLogFilePath()}${colors.reset}`);
  } else {
    console.error(`${colors.red}Error: ${result.error}${colors.reset}`);
    process.exit(1);
  }
}

/** Handle daemon stop */
async function handleStop(): Promise<void> {
  const daemonService = getDaemonService();
  const result = await daemonService.stopDaemon();

  if (result.success) {
    console.log(`${colors.green}✓${colors.reset} Gateway stopped`);
  } else {
    console.error(`${colors.red}Error: ${result.error}${colors.reset}`);
    process.exit(1);
  }
}

/** Handle daemon refresh */
async function handleRefresh(): Promise<void> {
  const daemonService = getDaemonService();
  const result = await daemonService.refreshDaemon();

  if (result.success) {
    console.log(`${colors.green}✓${colors.reset} Gateway refreshed`);
  } else {
    console.error(`${colors.red}Error: ${result.error}${colors.reset}`);
    process.exit(1);
  }
}

/** Handle daemon status */
async function handleStatus(options: { json?: boolean }): Promise<void> {
  const daemonService = getDaemonService();
  const status = daemonService.getStatus();

  if (options.json) {
    outputJson(status);
    return;
  }

  console.log(`\n${colors.bright}${colors.cyan}Gateway Status${colors.reset}\n`);

  if (status.running) {
    console.log(`  Status: ${colors.green}Running${colors.reset} (PID: ${status.pid})`);
  } else {
    console.log(`  Status: ${colors.red}Stopped${colors.reset}`);
  }

  console.log(`  Port: ${colors.cyan}${status.port}${colors.reset}`);
  console.log(
    `  Auto-start: ${status.startupEnabled ? `${colors.green}enabled${colors.reset}` : `${colors.gray}disabled${colors.reset}`}`
  );
  console.log(`  Logs: ${colors.gray}${status.logFile}${colors.reset}`);
}

/** Handle daemon logs */
async function handleLogs(options: {
  lines?: string;
  follow?: boolean;
  clear?: boolean;
}): Promise<void> {
  const daemonService = getDaemonService();

  if (options.clear) {
    daemonService.clearLogs();
    console.log(`${colors.green}✓${colors.reset} Logs cleared`);
    return;
  }

  const lines = parseInt(options.lines || "50", 10);
  const logLines = daemonService.getLogs(lines);

  if (logLines.length === 0) {
    console.log(`${colors.gray}No logs yet.${colors.reset}`);
    return;
  }

  for (const line of logLines) {
    console.log(line);
  }

  if (options.follow) {
    console.log(`${colors.gray}--- Following logs (Ctrl+C to stop) ---${colors.reset}`);
    const logFile = daemonService.getLogFilePath();
    const tail = spawn("tail", ["-f", logFile], { stdio: "inherit" });

    process.on("SIGINT", () => {
      tail.kill();
      process.exit(0);
    });

    // Wait forever until interrupted
    await new Promise(() => {});
  }
}

/** Handle startup enable */
async function handleStartupEnable(): Promise<void> {
  const daemonService = getDaemonService();
  const platformInfo = daemonService.getPlatformInfo();

  if (!platformInfo.supported) {
    console.error(
      `${colors.red}Error: Platform '${platformInfo.platform}' not supported${colors.reset}`
    );
    process.exit(1);
  }

  const result = daemonService.enableStartup();
  if (result.success) {
    console.log(`${colors.green}✓${colors.reset} Auto-start enabled`);
    console.log(`${colors.gray}Using: ${platformInfo.type}${colors.reset}`);
  } else {
    console.error(`${colors.red}Error: ${result.error}${colors.reset}`);
    process.exit(1);
  }
}

/** Handle startup disable */
async function handleStartupDisable(): Promise<void> {
  const daemonService = getDaemonService();

  const result = daemonService.disableStartup();
  if (result.success) {
    console.log(`${colors.green}✓${colors.reset} Auto-start disabled`);
  } else {
    console.error(`${colors.red}Error: ${result.error}${colors.reset}`);
    process.exit(1);
  }
}

/** Handle startup status */
async function handleStartupStatus(): Promise<void> {
  const daemonService = getDaemonService();
  const enabled = daemonService.isStartupEnabled();
  const platformInfo = daemonService.getPlatformInfo();

  console.log(
    `Auto-start: ${enabled ? `${colors.green}enabled${colors.reset}` : `${colors.gray}disabled${colors.reset}`}`
  );
  console.log(
    `${colors.gray}Platform: ${platformInfo.platform} (${platformInfo.supported ? platformInfo.type : "not supported"})${colors.reset}`
  );
}

/** Handle daemon connect */
async function handleConnect(options: {
  http?: boolean;
  stdio?: boolean;
  port?: string;
  server?: string;
  command?: string;
  env?: string[];
}): Promise<void> {
  // Determine which connection mode to use
  if (!options.http && !options.stdio) {
    options.http = true; // Default to HTTP for backward compatibility
  }

  if (options.http && options.stdio) {
    console.error(`${colors.red}Error: Cannot specify both --http and --stdio${colors.reset}`);
    process.exit(1);
  }

  if (options.http) {
    // Native HTTP client bridge - completely silent for MCP compatibility
    const httpConnectionService = getHttpConnectionService();

    // Create connection with optional port override
    const connectionOptions: { silent?: boolean; port?: number } = { silent: true };
    if (options.port) {
      connectionOptions.port = parseInt(options.port, 10);
    }

    const result = await httpConnectionService.createConnection(connectionOptions);

    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }

    // Handle graceful shutdown
    const shutdown = async (): Promise<void> => {
      await httpConnectionService.closeAllConnections(true);
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Keep process alive
    await new Promise(() => {});
  } else if (options.stdio) {
    // Legacy STDIO connector (not recommended)
    console.warn(`${colors.yellow}Warning: --stdio mode is deprecated${colors.reset}`);
    console.warn(`${colors.gray}Use --http for native performance${colors.reset}`);

    console.log(`${colors.cyan}Starting direct STDIO connector...${colors.reset}`);

    const { spawn } = await import("child_process");
    const args: string[] = [];

    // Add arguments
    if (options.server) {
      args.push("--server", options.server);
    }
    if (options.command) {
      args.push("--command", options.command);
    }
    if (options.env) {
      options.env.forEach((env) => args.push("--env", env));
    }

    // Try to find and use the old stdio-direct script if it exists
    let stdioDirectPath: string;
    try {
      stdioDirectPath = new URL("../cli/stdio-direct.ts", import.meta.url).pathname;
    } catch {
      console.error(`${colors.red}Error: stdio-direct script not found${colors.reset}`);
      console.error(`${colors.gray}Direct STDIO connections have been deprecated${colors.reset}`);
      process.exit(1);
    }

    const child = spawn("node", [stdioDirectPath, ...args], {
      stdio: "inherit",
    });

    // Handle signals
    process.on("SIGINT", () => {
      child.kill("SIGINT");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      child.kill("SIGTERM");
      process.exit(0);
    });

    child.on("exit", (code) => {
      process.exit(code || 0);
    });

    // Wait for the child process
    await new Promise((_resolve, reject) => {
      child.on("error", reject);
    });
  }
}

export default registerDaemonCommands;
