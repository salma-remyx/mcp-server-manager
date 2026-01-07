/**
 * DaemonScreen - Manage gateway daemon (ink component)
 */

import React, { useState, useCallback, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import fs from "fs";
import { ScreenLayout } from "../components/index.js";
import { createMenuSections } from "../utils/menu.js";
import { getDaemonService, type DaemonHealthResponse } from "../../services/daemon.service.js";
import { useTheme } from "../theme/index.js";

type View = "menu" | "logs" | "action";

interface MenuOption {
  id: string;
  label: string;
  description: string;
}

const MENU_OPTIONS: MenuOption[] = [
  { id: "start", label: "Start Daemon", description: "Start the gateway daemon" },
  { id: "refresh", label: "Refresh Daemon", description: "Reload config and restart daemon" },
  { id: "stop", label: "Stop Daemon", description: "Stop the running daemon" },
  { id: "logs", label: "View Logs", description: "View recent daemon logs" },
  { id: "clear-logs", label: "Clear Logs", description: "Truncate daemon log file" },
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
  healthy: boolean;
  health?: DaemonHealthResponse;
  healthLoading: boolean;
}

export function DaemonScreen({ onBack }: DaemonScreenProps): React.ReactElement {
  const { theme } = useTheme();
  const daemonService = getDaemonService();

  const [state, setState] = useState<DaemonState>({
    currentIndex: 0,
    view: "menu",
    actionResult: null,
    isLoading: false,
    logs: [],
    healthy: false,
    healthLoading: true,
  });

  // Load health status on mount and after actions
  const loadHealth = useCallback(async () => {
    const basicStatus = daemonService.isDaemonRunning();
    if (!basicStatus.running) {
      setState((prev) => ({ ...prev, healthy: false, health: undefined, healthLoading: false }));
      return;
    }

    setState((prev) => ({ ...prev, healthLoading: true }));
    const health = await daemonService.checkHealth();
    setState((prev) => ({
      ...prev,
      healthy: health.status === "ok",
      health,
      healthLoading: false,
    }));
  }, [daemonService]);

  // Load health on mount
  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  // Handle menu option selection
  const handleMenuOption = useCallback(
    async (optionId: string) => {
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
            const result = await daemonService.startDaemon();
            setState((prev) => ({
              ...prev,
              isLoading: false,
              view: "action",
              actionResult: result.success
                ? { success: true, message: `Daemon started (PID: ${result.pid})` }
                : { success: false, message: `Failed: ${result.error}` },
            }));
            // Reload health after starting
            if (result.success) {
              setTimeout(() => loadHealth(), 1000); // Give daemon time to initialize
            }
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
            setState((prev) => ({ ...prev, isLoading: true }));
            const result = await daemonService.stopDaemon();
            setState((prev) => ({
              ...prev,
              isLoading: false,
              view: "action",
              actionResult: result.success
                ? { success: true, message: "Daemon stopped" }
                : { success: false, message: `Failed: ${result.error}` },
            }));
            // Reload health after stopping
            if (result.success) {
              loadHealth();
            }
          }
          break;
        }

        case "refresh": {
          setState((prev) => ({ ...prev, isLoading: true }));
          const result = await daemonService.refreshDaemon();
          setState((prev) => ({
            ...prev,
            isLoading: false,
            view: "action",
            actionResult: result.success
              ? { success: true, message: "Daemon refreshed" }
              : { success: false, message: `Failed: ${result.error}` },
          }));
          // Reload health after refreshing
          if (result.success) {
            setTimeout(() => loadHealth(), 500);
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

        case "clear-logs": {
          const logPath = daemonService.getLogFilePath();
          try {
            fs.writeFileSync(logPath, "");
            setState((prev) => ({
              ...prev,
              view: "action",
              actionResult: { success: true, message: "Logs cleared" },
            }));
          } catch (error) {
            setState((prev) => ({
              ...prev,
              view: "action",
              actionResult: {
                success: false,
                message: `Failed to clear logs: ${error instanceof Error ? error.message : String(error)}`,
              },
            }));
          }
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
    [daemonService, loadHealth]
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

  const { currentIndex, view, actionResult, isLoading, logs, healthy, health, healthLoading } = state;
  const status = daemonService.getStatus();

  const daemonMenuSections = createMenuSections({
    actions: [{ key: "Enter", label: "Select" }],
    showData: false,
    showConfig: false,
    showSystem: false,
  });

  // Loading view
  if (isLoading) {
    return (
      <ScreenLayout title="Daemon Management" menuSections={daemonMenuSections}>
        <Box paddingY={1} gap={1}>
          <Text color={theme.colors.primary}>
            <Spinner type="dots" />
          </Text>
          <Text>Starting daemon...</Text>
        </Box>
      </ScreenLayout>
    );
  }

  // Logs view
  if (view === "logs") {
    return (
      <ScreenLayout
        title="Recent Logs"
        shortcuts={[{ key: "Any", label: "Go back" }]}
      >
        <Box flexDirection="column" paddingY={1}>
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
      </ScreenLayout>
    );
  }

  // Action result view
  if (view === "action" && actionResult) {
    return (
      <ScreenLayout
        title="Daemon Management"
        shortcuts={[{ key: "Any", label: "Continue" }]}
      >
        <Box paddingY={1} gap={1}>
          <Text color={actionResult.success ? "green" : "yellow"}>
            {actionResult.success ? "✓" : "⚠"}
          </Text>
          <Text>{actionResult.message}</Text>
        </Box>
      </ScreenLayout>
    );
  }

  // Helper function to render health status
  const renderHealthStatus = (): React.ReactElement => {
    if (!status.running) {
      return <Text color="red">● Stopped</Text>;
    }

    if (healthLoading) {
      return (
        <Box gap={1}>
          <Text color="yellow">● Running (PID: {status.pid})</Text>
          <Text dimColor>checking health...</Text>
        </Box>
      );
    }

    if (healthy && health) {
      return (
        <Text color="green">
          ● Healthy (PID: {status.pid}, {health.servers} servers, {health.tools} tools)
        </Text>
      );
    }

    // Running but unhealthy
    return (
      <Box gap={1}>
        <Text color="yellow">● Running but unhealthy (PID: {status.pid})</Text>
        <Text color="red">{health?.error || "Not responding"}</Text>
      </Box>
    );
  };

  // Menu view
  return (
    <ScreenLayout title="Daemon Management" menuSections={daemonMenuSections}>
      {/* Status summary - compact single line */}
      <Box gap={1} marginBottom={1} paddingY={1}>
        <Text>Status:</Text>
        {renderHealthStatus()}
        <Text dimColor>|</Text>
        <Text>Port:</Text>
        <Text color={theme.colors.primary}>{status.port}</Text>
        <Text dimColor>|</Text>
        <Text>Auto-start:</Text>
        <Text color={status.startupEnabled ? "green" : "gray"}>
          {status.startupEnabled ? "enabled" : "disabled"}
        </Text>
      </Box>

      {/* Menu options */}
      {MENU_OPTIONS.map((option, idx) => {
        const isCurrent = idx === currentIndex;

        return (
          <Box key={option.id} flexDirection="column" marginBottom={1}>
            <Box gap={1}>
              <Text color={isCurrent ? theme.colors.highlightText : theme.colors.primary}>{isCurrent ? "→" : " "}</Text>
              <Text color={isCurrent ? theme.colors.highlightText : undefined} bold={isCurrent}>
                {option.label}
              </Text>
              <Text dimColor>-</Text>
              <Text dimColor>{option.description}</Text>
            </Box>
          </Box>
        );
      })}
    </ScreenLayout>
  );
}

export default DaemonScreen;
