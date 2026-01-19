/**
 * DaemonScreen - Manage gateway daemon (ink component)
 */

import React, { useState, useCallback, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import fs from "fs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

interface DaemonStatus {
  running: boolean;
  pid?: number;
  startupEnabled: boolean;
  port: number;
  logFile: string;
  healthy: boolean;
  health?: DaemonHealthResponse;
}

export function DaemonScreen({ onBack }: DaemonScreenProps): React.ReactElement {
  const { theme } = useTheme();
  const daemonService = getDaemonService();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState<View>("menu");
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(
    null
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [lastCheckedAt, setLastCheckedAt] = useState<number>(Date.now());

  // Query for daemon status
  // NOTE: refetchInterval doesn't work in Ink/TUI, so we manually refetch below
  const {
    data: status,
    isLoading: statusLoading,
    isFetching,
    refetch,
  } = useQuery<DaemonStatus>({
    queryKey: ["daemon-status"],
    queryFn: async () => {
      const result = await daemonService.getStatus();
      setLastCheckedAt(Date.now());
      return result;
    },
  });

  // Manually trigger refetch (refetchInterval doesn't work in Ink)
  useEffect(() => {
    const interval = setInterval(() => refetch(), 2000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Mutation for starting daemon - waits until healthy
  const startMutation = useMutation({
    mutationFn: async (): Promise<{ success: boolean; pid?: number; healthy?: boolean; error?: string }> => {
      const startResult = await daemonService.startDaemon();
      if (!startResult.success) {
        return { success: false, error: startResult.error };
      }

      // Poll for health status (max 15 seconds, check every 500ms)
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const health = await daemonService.checkHealth(2000);
        if (health.status === "ok") {
          return { success: true, pid: startResult.pid, healthy: true };
        }
      }

      // Started but never became healthy
      return { success: true, pid: startResult.pid, healthy: false, error: "Health check timed out" };
    },
    onSuccess: (result) => {
      setView("action");
      if (!result.success) {
        setActionResult({ success: false, message: `Failed: ${result.error}` });
      } else if (result.healthy) {
        setActionResult({ success: true, message: `Daemon started and healthy (PID: ${result.pid})` });
      } else {
        setActionResult({ success: false, message: `Daemon started (PID: ${result.pid}) but not healthy: ${result.error}` });
      }
      queryClient.invalidateQueries({ queryKey: ["daemon-status"] });
    },
  });

  // Mutation for stopping daemon
  const stopMutation = useMutation({
    mutationFn: () => daemonService.stopDaemon(),
    onSuccess: (result) => {
      setView("action");
      setActionResult(
        result.success
          ? { success: true, message: "Daemon stopped" }
          : { success: false, message: `Failed: ${result.error}` }
      );
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["daemon-status"] });
      }
    },
  });

  // Mutation for refreshing daemon
  const refreshMutation = useMutation({
    mutationFn: () => daemonService.refreshDaemon(),
    onSuccess: async (result) => {
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["daemon-status"] });
      }
      setView("action");
      setActionResult(
        result.success
          ? { success: true, message: "Daemon refreshed" }
          : { success: false, message: `Failed: ${result.error}` }
      );
    },
  });

  const isLoading = startMutation.isPending || stopMutation.isPending || refreshMutation.isPending;

  // Handle menu option selection
  const handleMenuOption = useCallback(
    async (optionId: string) => {
      switch (optionId) {
        case "start": {
          const runningStatus = daemonService.isDaemonRunning();
          if (runningStatus.running) {
            setView("action");
            setActionResult({
              success: false,
              message: `Daemon already running (PID: ${runningStatus.pid})`,
            });
          } else {
            startMutation.mutate();
          }
          break;
        }

        case "stop": {
          const runningStatus = daemonService.isDaemonRunning();
          if (!runningStatus.running) {
            setView("action");
            setActionResult({ success: false, message: "Daemon is not running" });
          } else {
            stopMutation.mutate();
          }
          break;
        }

        case "refresh": {
          refreshMutation.mutate();
          break;
        }

        case "logs": {
          const logPath = daemonService.getLogFilePath();
          let logLines: string[] = [];

          if (fs.existsSync(logPath)) {
            const content = fs.readFileSync(logPath, "utf8");
            logLines = content.trim().split("\n").slice(-30);
          }

          setLogs(logLines);
          setView("logs");
          break;
        }

        case "clear-logs": {
          const logPath = daemonService.getLogFilePath();
          try {
            fs.writeFileSync(logPath, "");
            setView("action");
            setActionResult({ success: true, message: "Logs cleared" });
          } catch (error) {
            setView("action");
            setActionResult({
              success: false,
              message: `Failed to clear logs: ${error instanceof Error ? error.message : String(error)}`,
            });
          }
          break;
        }

        case "startup-enable": {
          const result = daemonService.enableStartup();
          setView("action");
          setActionResult(
            result.success
              ? { success: true, message: "Auto-start enabled" }
              : { success: false, message: `Failed: ${result.error}` }
          );
          break;
        }

        case "startup-disable": {
          const result = daemonService.disableStartup();
          setView("action");
          setActionResult(
            result.success
              ? { success: true, message: "Auto-start disabled" }
              : { success: false, message: `Failed: ${result.error}` }
          );
          break;
        }
      }
    },
    [daemonService, startMutation, stopMutation, refreshMutation]
  );

  // Handle keyboard input
  useInput((input, key) => {
    // Any key to go back from sub-views
    if (view !== "menu") {
      setView("menu");
      setActionResult(null);
      // Force refetch status when returning to menu
      queryClient.invalidateQueries({ queryKey: ["daemon-status"] });
      return;
    }

    // Quit
    if (input === "q" || key.escape) {
      onBack();
      return;
    }

    // Navigation - Up
    if (key.upArrow) {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    // Navigation - Down
    if (key.downArrow) {
      setCurrentIndex((prev) => Math.min(MENU_OPTIONS.length - 1, prev + 1));
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

  const daemonMenuSections = createMenuSections({
    actions: [{ key: "Enter", label: "Select" }],
    showData: false,
    showConfig: false,
    showSystem: false,
  });

  // Loading view
  if (isLoading) {
    const loadingMessage = startMutation.isPending
      ? "Starting daemon and waiting for health check..."
      : stopMutation.isPending
        ? "Stopping daemon..."
        : "Refreshing daemon...";

    return (
      <ScreenLayout title="Daemon Management" menuSections={daemonMenuSections}>
        <Box paddingY={1} gap={1}>
          <Text color={theme.colors.primary}>
            <Spinner type="dots" />
          </Text>
          <Text>{loadingMessage}</Text>
        </Box>
      </ScreenLayout>
    );
  }

  // Logs view
  if (view === "logs") {
    return (
      <ScreenLayout title="Recent Logs" shortcuts={[{ key: "Any", label: "Go back" }]}>
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
      <ScreenLayout title="Daemon Management" shortcuts={[{ key: "Any", label: "Continue" }]}>
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
    if (statusLoading || !status) {
      return <Text dimColor>Loading...</Text>;
    }

    if (!status.running) {
      return <Text color="red">● Stopped</Text>;
    }

    if (status.healthy) {
      return (
        <Text color="green">
          ● Healthy (PID: {status.pid}, {status.health?.servers ?? 0} servers,{" "}
          {status.health?.tools ?? 0} tools)
        </Text>
      );
    }

    // Running but unhealthy
    return (
      <Box gap={1}>
        <Text color="yellow">● Running but unhealthy (PID: {status.pid})</Text>
        <Text color="red">{status.health?.error || "Not responding"}</Text>
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
        <Text color={theme.colors.primary}>{status?.port ?? "..."}</Text>
        <Text dimColor>|</Text>
        <Text>Auto-start:</Text>
        <Text color={status?.startupEnabled ? "green" : "gray"}>
          {status?.startupEnabled ? "enabled" : "disabled"}
        </Text>
      </Box>
      <Box marginBottom={1} gap={1}>
        <Text dimColor>
          Last checked: {lastCheckedAt > 0 ? new Date(lastCheckedAt).toLocaleTimeString() : "never"}
        </Text>
        {isFetching && (
          <>
            <Text dimColor>|</Text>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
          </>
        )}
      </Box>

      {/* Menu options */}
      {MENU_OPTIONS.map((option, idx) => {
        const isCurrent = idx === currentIndex;

        return (
          <Box key={option.id} flexDirection="column" marginBottom={1}>
            <Box gap={1}>
              <Text color={isCurrent ? theme.colors.highlightText : theme.colors.primary}>
                {isCurrent ? "→" : " "}
              </Text>
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
