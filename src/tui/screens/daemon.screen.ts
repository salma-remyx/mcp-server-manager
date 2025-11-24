/**
 * Daemon Screen - Manage gateway daemon
 */

import fs from "fs";
import { colors, clearScreen } from "../../shared/colors.js";
import { waitForKey } from "../../shared/prompts.js";
import { getDaemonService } from "../../services/daemon.service.js";

/** Daemon screen state */
interface DaemonState {
  currentIndex: number;
  running: boolean;
}

const MENU_OPTIONS = [
  { id: "status", label: "View Status", description: "Show daemon status" },
  { id: "start", label: "Start Daemon", description: "Start the gateway daemon" },
  { id: "stop", label: "Stop Daemon", description: "Stop the running daemon" },
  { id: "logs", label: "View Logs", description: "View recent daemon logs" },
  { id: "startup-enable", label: "Enable Auto-start", description: "Start daemon on boot" },
  { id: "startup-disable", label: "Disable Auto-start", description: "Don't start on boot" },
];

/** Show daemon management screen */
export async function showDaemonScreen(): Promise<void> {
  const state: DaemonState = {
    currentIndex: 0,
    running: true,
  };

  while (state.running) {
    renderDaemonScreen(state);
    const key = await waitForKeypress();
    await handleDaemonKeypress(state, key);
  }
}

/** Render the daemon screen */
function renderDaemonScreen(state: DaemonState): void {
  clearScreen();
  const daemonService = getDaemonService();
  const status = daemonService.getStatus();

  console.log(`\n${colors.bright}${colors.cyan}  Daemon Management${colors.reset}\n`);

  // Status summary
  const statusIcon = status.running
    ? `${colors.green}●${colors.reset}`
    : `${colors.red}●${colors.reset}`;
  const statusText = status.running
    ? `${colors.green}Running${colors.reset} (PID: ${status.pid})`
    : `${colors.red}Stopped${colors.reset}`;
  console.log(`  Status: ${statusIcon} ${statusText}`);
  console.log(`  Port: ${colors.cyan}${status.port}${colors.reset}`);
  console.log(
    `  Auto-start: ${status.startupEnabled ? `${colors.green}enabled${colors.reset}` : `${colors.gray}disabled${colors.reset}`}`
  );
  console.log();

  // Menu options
  for (let i = 0; i < MENU_OPTIONS.length; i++) {
    const option = MENU_OPTIONS[i];
    const isCurrent = i === state.currentIndex;
    const cursor = isCurrent ? `${colors.cyan}→${colors.reset}` : " ";
    const label = isCurrent
      ? `${colors.bright}${colors.white}${option.label}${colors.reset}`
      : option.label;

    console.log(`  ${cursor} ${label}`);
    console.log(`      ${colors.gray}${option.description}${colors.reset}`);
  }

  console.log();
  console.log(`${colors.gray}  ↑/↓ Navigate  ENTER Select  Q Back${colors.reset}`);
}

/** Wait for a keypress */
async function waitForKeypress(): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (key: string): void => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      resolve(key);
    };

    stdin.on("data", onData);
  });
}

/** Handle keypress in daemon screen */
async function handleDaemonKeypress(state: DaemonState, key: string): Promise<void> {
  // Quit
  if (key === "q" || key === "Q" || key === "\u001b") {
    state.running = false;
    return;
  }

  // Navigation
  if (key === "\u001b[A" || key === "k") {
    // Up
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    return;
  }

  if (key === "\u001b[B" || key === "j") {
    // Down
    state.currentIndex = Math.min(MENU_OPTIONS.length - 1, state.currentIndex + 1);
    return;
  }

  // Select
  if (key === "\r" || key === "\n") {
    const option = MENU_OPTIONS[state.currentIndex];
    await handleMenuOption(option.id);
  }
}

/** Handle menu option selection */
async function handleMenuOption(optionId: string): Promise<void> {
  const daemonService = getDaemonService();

  clearScreen();
  console.log();

  switch (optionId) {
    case "status": {
      const status = daemonService.getStatus();
      console.log(`${colors.bright}${colors.cyan}  Daemon Status${colors.reset}\n`);
      if (status.running) {
        console.log(`  Status: ${colors.green}Running${colors.reset} (PID: ${status.pid})`);
      } else {
        console.log(`  Status: ${colors.red}Stopped${colors.reset}`);
      }
      console.log(`  Port: ${colors.cyan}${status.port}${colors.reset}`);
      console.log(
        `  Auto-start: ${status.startupEnabled ? `${colors.green}enabled${colors.reset}` : `${colors.gray}disabled${colors.reset}`}`
      );
      console.log(`  Log file: ${colors.gray}${status.logFile}${colors.reset}`);
      break;
    }

    case "start": {
      const status = daemonService.isDaemonRunning();
      if (status.running) {
        console.log(
          `  ${colors.yellow}⚠${colors.reset} Daemon already running (PID: ${status.pid})`
        );
      } else {
        console.log(`  Starting daemon...`);
        const result = daemonService.startDaemon([]);
        if (result.success) {
          console.log(`  ${colors.green}✓${colors.reset} Daemon started (PID: ${result.pid})`);
        } else {
          console.log(`  ${colors.red}✗${colors.reset} Failed: ${result.error}`);
        }
      }
      break;
    }

    case "stop": {
      const status = daemonService.isDaemonRunning();
      if (!status.running) {
        console.log(`  ${colors.yellow}⚠${colors.reset} Daemon is not running`);
      } else {
        const result = daemonService.stopDaemon();
        if (result.success) {
          console.log(`  ${colors.green}✓${colors.reset} Daemon stopped`);
        } else {
          console.log(`  ${colors.red}✗${colors.reset} Failed: ${result.error}`);
        }
      }
      break;
    }

    case "logs": {
      const logPath = daemonService.getLogFilePath();
      console.log(`${colors.bright}${colors.cyan}  Recent Logs${colors.reset}\n`);
      console.log(`  ${colors.gray}${logPath}${colors.reset}\n`);

      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, "utf8");
        const lines = content.trim().split("\n").slice(-30);
        for (const line of lines) {
          console.log(`  ${colors.gray}${line}${colors.reset}`);
        }
        if (lines.length === 0) {
          console.log(`  ${colors.gray}(no logs yet)${colors.reset}`);
        }
      } else {
        console.log(`  ${colors.gray}(no log file found)${colors.reset}`);
      }
      break;
    }

    case "startup-enable": {
      const result = daemonService.enableStartup();
      if (result.success) {
        console.log(`  ${colors.green}✓${colors.reset} Auto-start enabled`);
      } else {
        console.log(`  ${colors.red}✗${colors.reset} Failed: ${result.error}`);
      }
      break;
    }

    case "startup-disable": {
      const result = daemonService.disableStartup();
      if (result.success) {
        console.log(`  ${colors.green}✓${colors.reset} Auto-start disabled`);
      } else {
        console.log(`  ${colors.red}✗${colors.reset} Failed: ${result.error}`);
      }
      break;
    }
  }

  console.log(`\n${colors.gray}  Press any key to continue...${colors.reset}`);
  await waitForKey();
}
