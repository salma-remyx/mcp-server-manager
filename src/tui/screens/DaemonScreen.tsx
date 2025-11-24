/**
 * DaemonScreen - Manage gateway daemon (ink component)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import fs from "fs";
import { Header } from "../components/index.js";
import { getDaemonService } from "../../services/daemon.service.js";

type View = "menu" | "logs" | "action";

interface MenuOption {
  id: string;
  label: string;
  description: string;
}

const MENU_OPTIONS: MenuOption[] = [
  { id: "start", label: "Start Daemon", description: "Start the gateway daemon" },
  { id: "stop", label: "Stop Daemon", description: "Stop the running daemon" },
  { id: "logs", label: "View Logs", description: "View recent daemon logs" },
  { id: "startup-enable", label: "Enable Auto-start", description: "Start daemon on boot" },
  { id: "startup-disable", label: "Disable Auto-start", description: "Don't start on boot" },
];

interface DaemonScreenProps {
  onBack: () => void;
}

interface DaemonState {
  currentIndex: number;
  view: View;
  actionResult: { success: boolean; message: string } | null;
  isLoading: boolean;
  logs: string[];
}

export function DaemonScreen({ onBack }: DaemonScreenProps): React.ReactElement {
  const daemonService = getDaemonService();

  const [state, setState] = useState<DaemonState>({
    currentIndex: 0,
    view: "menu",
    actionResult: null,
    isLoading: false,
    logs: [],
  });

  // Handle menu option selection
  const handleMenuOption = useCallback(
    (optionId: string) => {
      switch (optionId) {
        case "start": {
          const runningStatus = daemonService.isDaemonRunning();
          if (runningStatus.running) {
            setState((prev) => ({
              ...prev,
              view: "action",
              actionResult: {
                success: false,
                message: `Daemon already running (PID: ${runningStatus.pid})`,
              },
            }));
          } else {
            setState((prev) => ({ ...prev, isLoading: true }));
            const result = daemonService.startDaemon([]);
            setState((prev) => ({
              ...prev,
              isLoading: false,
              view: "action",
              actionResult: result.success
                ? { success: true, message: `Daemon started (PID: ${result.pid})` }
                : { success: false, message: `Failed: ${result.error}` },
            }));
          }
          break;
        }

        case "stop": {
          const runningStatus = daemonService.isDaemonRunning();
          if (!runningStatus.running) {
            setState((prev) => ({
              ...prev,
              view: "action",
              actionResult: { success: false, message: "Daemon is not running" },
            }));
          } else {
            const result = daemonService.stopDaemon();
            setState((prev) => ({
              ...prev,
              view: "action",
              actionResult: result.success
                ? { success: true, message: "Daemon stopped" }
                : { success: false, message: `Failed: ${result.error}` },
            }));
          }
          break;
        }

        case "logs": {
          const logPath = daemonService.getLogFilePath();
          let logs: string[] = [];

          if (fs.existsSync(logPath)) {
            const content = fs.readFileSync(logPath, "utf8");
            logs = content.trim().split("\n").slice(-30);
          }

          setState((prev) => ({ ...prev, view: "logs", logs }));
          break;
        }

        case "startup-enable": {
          const result = daemonService.enableStartup();
          setState((prev) => ({
            ...prev,
            view: "action",
            actionResult: result.success
              ? { success: true, message: "Auto-start enabled" }
              : { success: false, message: `Failed: ${result.error}` },
          }));
          break;
        }

        case "startup-disable": {
          const result = daemonService.disableStartup();
          setState((prev) => ({
            ...prev,
            view: "action",
            actionResult: result.success
              ? { success: true, message: "Auto-start disabled" }
              : { success: false, message: `Failed: ${result.error}` },
          }));
          break;
        }
      }
    },
    [daemonService]
  );

  // Handle keyboard input
  useInput((input, key) => {
    const { currentIndex, view } = state;

    // Any key to go back from sub-views
    if (view !== "menu") {
      setState((prev) => ({ ...prev, view: "menu", actionResult: null }));
      return;
    }

    // Quit
    if (input === "q" || key.escape) {
      onBack();
      return;
    }

    // Navigation - Up
    if (key.upArrow) {
      setState((prev) => ({
        ...prev,
        currentIndex: Math.max(0, currentIndex - 1),
      }));
      return;
    }

    // Navigation - Down
    if (key.downArrow) {
      setState((prev) => ({
        ...prev,
        currentIndex: Math.min(MENU_OPTIONS.length - 1, currentIndex + 1),
      }));
      return;
    }

    // Select - Enter
    if (key.return) {
      const option = MENU_OPTIONS[currentIndex];
      if (option) {
        handleMenuOption(option.id);
      }
      return;
    }
  });

  const { currentIndex, view, actionResult, isLoading, logs } = state;
  const status = daemonService.getStatus();

  // Loading view
  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Header title="Daemon Management" />
        <Box paddingX={1} marginTop={1} gap={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text>Starting daemon...</Text>
        </Box>
      </Box>
    );
  }

  // Logs view
  if (view === "logs") {
    return (
      <Box flexDirection="column">
        <Header title="Recent Logs" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Box marginBottom={1}>
            <Text dimColor>{daemonService.getLogFilePath()}</Text>
          </Box>

          {logs.length === 0 ? (
            <Text dimColor>(no logs yet)</Text>
          ) : (
            logs.map((line, idx) => (
              <Text key={idx} dimColor>
                {line}
              </Text>
            ))
          )}
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>Press any key to go back...</Text>
        </Box>
      </Box>
    );
  }

  // Action result view
  if (view === "action" && actionResult) {
    return (
      <Box flexDirection="column">
        <Header title="Daemon Management" />

        <Box paddingX={1} marginTop={1} gap={1}>
          <Text color={actionResult.success ? "green" : "yellow"}>
            {actionResult.success ? "✓" : "⚠"}
          </Text>
          <Text>{actionResult.message}</Text>
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  // Menu view
  return (
    <Box flexDirection="column">
      <Header title="Daemon Management" />

      {/* Status summary */}
      <Box flexDirection="column" paddingX={1} marginTop={1}>
        <Box gap={1}>
          <Text>Status:</Text>
          <Text color={status.running ? "green" : "red"}>
            {status.running ? "●" : "●"} {status.running ? `Running (PID: ${status.pid})` : "Stopped"}
          </Text>
        </Box>
        <Box gap={1}>
          <Text>Port:</Text>
          <Text color="cyan">{status.port}</Text>
        </Box>
        <Box gap={1}>
          <Text>Auto-start:</Text>
          <Text color={status.startupEnabled ? "green" : "gray"}>
            {status.startupEnabled ? "enabled" : "disabled"}
          </Text>
        </Box>
        <Box gap={1}>
          <Text>Log file:</Text>
          <Text dimColor>{status.logFile}</Text>
        </Box>
      </Box>

      {/* Menu options */}
      <Box flexDirection="column" paddingX={1} marginTop={1}>
        {MENU_OPTIONS.map((option, idx) => {
          const isCurrent = idx === currentIndex;

          return (
            <Box key={option.id} flexDirection="column" marginBottom={1}>
              <Box gap={1}>
                <Text color="cyan">{isCurrent ? "→" : " "}</Text>
                <Text color={isCurrent ? "white" : undefined} bold={isCurrent}>
                  {option.label}
                </Text>
              </Box>
              <Box marginLeft={4}>
                <Text dimColor>{option.description}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text dimColor>↑/↓ Navigate ENTER Select Q Back</Text>
      </Box>
    </Box>
  );
}

export default DaemonScreen;
