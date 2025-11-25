/**
 * Main TUI Application - Ink-based terminal UI
 */

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import Spinner from "ink-spinner";
import { Header, MenuPanel } from "./components/index.js";
import { getConfigService } from "../services/config.service.js";
import { getTestingService } from "../services/testing.service.js";
import { getProfileService } from "../services/profile.service.js";
import { getDaemonService } from "../services/daemon.service.js";
import type { LocalServer, RemoteServer } from "../types/index.js";
import { VERSION } from "../shared/version.js";

// Screen components
import { AddServerScreen } from "./screens/AddServerScreen.js";
import { ToolsScreen } from "./screens/ToolsScreen.js";
import { ClientsScreen } from "./screens/ClientsScreen.js";
import { ProfilesScreen } from "./screens/ProfilesScreen.js";
import { SettingsScreen } from "./screens/SettingsScreen.js";
import { DaemonScreen } from "./screens/DaemonScreen.js";
import { ImportExportScreen } from "./screens/ImportExportScreen.js";
import { DoctorScreen } from "./screens/DoctorScreen.js";
import { TokensScreen } from "./screens/TokensScreen.js";

type Section = "local" | "remote";
type Screen =
  | "main"
  | "add-server"
  | "tools"
  | "clients"
  | "profiles"
  | "settings"
  | "daemon"
  | "import-export"
  | "doctor"
  | "tokens"
  | "testing";

interface AppState {
  screen: Screen;
  currentSection: Section;
  currentIndex: number;
  selectedServers: Set<string>;
  toolCounts: Map<string, number>;
  localServers: LocalServer[];
  remoteServers: RemoteServer[];
  message: string | null;
  messageType: "success" | "error" | "info";
  testResults: Array<{
    name: string;
    type: string;
    success: boolean;
    toolCount?: number;
    error?: string;
  }> | null;
}

interface AppProps {
  onExit?: () => void;
}

export function App({ onExit }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const configService = getConfigService();
  const profileService = getProfileService();

  const [state, setState] = useState<AppState>(() => {
    const localServers = configService.getLocalServers();
    const remoteServers = configService.getRemoteServers();

    // Restore selection state
    const savedState = configService.getSelectionState();
    const selectedServers = new Set<string>();

    savedState.local.forEach((id) => {
      if (localServers.find((s) => s.id === id)) {
        selectedServers.add(id);
      }
    });
    savedState.remote.forEach((id) => {
      if (remoteServers.find((s) => s.id === id)) {
        selectedServers.add(`remote:${id}`);
      }
    });

    return {
      screen: "main",
      currentSection: localServers.length > 0 ? "local" : "remote",
      currentIndex: 0,
      selectedServers,
      toolCounts: new Map<string, number>(),
      localServers,
      remoteServers,
      message: null,
      messageType: "info",
      testResults: null,
    };
  });

  // Refresh servers from config
  const refreshServers = useCallback(() => {
    setState((prev) => ({
      ...prev,
      localServers: configService.getLocalServers(),
      remoteServers: configService.getRemoteServers(),
    }));
  }, []);

  // Show temporary message
  const [messageTimeoutId, setMessageTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(
    null
  );

  const showMessage = useCallback(
    (msg: string, type: "success" | "error" | "info" = "info") => {
      setState((prev) => ({ ...prev, message: msg, messageType: type }));
      const timeoutId = setTimeout(() => {
        setState((prev) => ({ ...prev, message: null }));
      }, 2000);
      setMessageTimeoutId(timeoutId);
    },
    []
  );

  // Cleanup message timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
      }
    };
  }, [messageTimeoutId]);

  // Load tool counts on mount
  useEffect(() => {
    let isMounted = true;

    const loadToolCounts = async (): Promise<void> => {
      const testingService = getTestingService();

      // First try to load from cached tool filters
      const toolFilters = configService.getToolFilters();
      const newToolCounts = new Map<string, number>();

      for (const server of state.localServers) {
        const filter = toolFilters[server.id];
        if (filter?.allTools) {
          newToolCounts.set(server.id, filter.allTools.length);
        }
      }

      for (const server of state.remoteServers) {
        const filter = toolFilters[`remote:${server.id}`];
        if (filter?.allTools) {
          newToolCounts.set(`remote:${server.id}`, filter.allTools.length);
        }
      }

      if (!isMounted) return;
      setState((prev) => ({ ...prev, toolCounts: newToolCounts }));

      // Auto-test unknown servers in background
      await testingService.autoTestUnknownServers();

      if (!isMounted) return;

      // Reload tool counts after testing
      const updatedFilters = configService.getToolFilters();
      const finalToolCounts = new Map<string, number>();

      for (const server of state.localServers) {
        const filter = updatedFilters[server.id];
        if (filter?.allTools) {
          finalToolCounts.set(server.id, filter.allTools.length);
        }
      }

      for (const server of state.remoteServers) {
        const filter = updatedFilters[`remote:${server.id}`];
        if (filter?.allTools) {
          finalToolCounts.set(`remote:${server.id}`, filter.allTools.length);
        }
      }

      if (!isMounted) return;
      setState((prev) => ({ ...prev, toolCounts: finalToolCounts }));
    };

    loadToolCounts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Get current server
  const getCurrentServer = useCallback((): {
    server: LocalServer | RemoteServer | null;
    type: "local" | "remote";
  } => {
    const { currentSection, currentIndex, localServers, remoteServers } = state;
    if (currentSection === "local" && localServers[currentIndex]) {
      return { server: localServers[currentIndex], type: "local" };
    }
    if (currentSection === "remote" && remoteServers[currentIndex]) {
      return { server: remoteServers[currentIndex], type: "remote" };
    }
    return { server: null, type: "local" };
  }, [state]);

  // Navigate back to main screen
  const goBack = useCallback(() => {
    refreshServers();
    setState((prev) => ({ ...prev, screen: "main", testResults: null }));
  }, [refreshServers]);

  // Run test all servers
  const runTestAllServers = useCallback(async () => {
    setState((prev) => ({ ...prev, screen: "testing", testResults: null }));

    const testingService = getTestingService();
    const results = await testingService.testAllServers();

    const testResults = results.map(({ server, type, result }) => ({
      name: server.name,
      type: type === "remote" ? (server as RemoteServer).type : "stdio",
      success: result.success,
      toolCount: result.toolCount,
      error: result.error,
    }));

    setState((prev) => ({ ...prev, testResults }));
  }, []);

  // Keyboard input handling (only on main screen)
  useInput(
    (input, key) => {
      // Only handle input on main and testing screens
      if (state.screen !== "main" && state.screen !== "testing") return;

      // Handle testing screen - any key to go back
      if (state.screen === "testing" && state.testResults !== null) {
        goBack();
        return;
      }

      // Don't process other keys while testing
      if (state.screen === "testing") return;

      const { localServers, remoteServers } = state;
      const totalLocal = localServers.length;
      const totalRemote = remoteServers.length;

      // Quit
      if (input === "q") {
        if (onExit) onExit();
        exit();
        return;
      }

      // Navigation - Up
      if (key.upArrow) {
        setState((prev) => {
          if (prev.currentSection === "local") {
            if (prev.currentIndex > 0) {
              return { ...prev, currentIndex: prev.currentIndex - 1 };
            } else if (totalRemote > 0) {
              return { ...prev, currentSection: "remote", currentIndex: totalRemote - 1 };
            }
          } else {
            if (prev.currentIndex > 0) {
              return { ...prev, currentIndex: prev.currentIndex - 1 };
            } else if (totalLocal > 0) {
              return { ...prev, currentSection: "local", currentIndex: totalLocal - 1 };
            }
          }
          return prev;
        });
        return;
      }

      // Navigation - Down
      if (key.downArrow) {
        setState((prev) => {
          if (prev.currentSection === "local") {
            if (prev.currentIndex < totalLocal - 1) {
              return { ...prev, currentIndex: prev.currentIndex + 1 };
            } else if (totalRemote > 0) {
              return { ...prev, currentSection: "remote", currentIndex: 0 };
            }
          } else {
            if (prev.currentIndex < totalRemote - 1) {
              return { ...prev, currentIndex: prev.currentIndex + 1 };
            } else if (totalLocal > 0) {
              return { ...prev, currentSection: "local", currentIndex: 0 };
            }
          }
          return prev;
        });
        return;
      }

      // Space - Enable/Disable server
      if (input === " ") {
        const { server, type } = getCurrentServer();
        if (server) {
          const action = server.disabled ? "enable" : "disable";
          const result = server.disabled
            ? configService.enableServer(server.id)
            : configService.disableServer(server.id);

          if (result.success) {
            showMessage(`Server '${server.name}' ${action}d`, "success");
            // Restart daemon if running (auto-sync)
            const daemonService = getDaemonService();
            const daemonStatus = daemonService.isDaemonRunning();
            if (daemonStatus.running) {
              daemonService.stopDaemon();
              // Small delay to ensure process exits before restarting
              setTimeout(() => {
                daemonService.startDaemon();
              }, 100);
            }
            // If disabling, remove from selection
            if (!server.disabled) {
              setState((prev) => {
                const newSelected = new Set(prev.selectedServers);
                newSelected.delete(type === "remote" ? `remote:${server.id}` : server.id);
                return { ...prev, selectedServers: newSelected };
              });
            }
            refreshServers();
          } else {
            showMessage(result.error || "Failed", "error");
          }
        }
        return;
      }

      // D - Delete server
      if (input === "d" || input === "D") {
        const { server, type } = getCurrentServer();
        if (server) {
          const result =
            type === "local"
              ? configService.removeLocalServer(server.id)
              : configService.removeRemoteServer(server.id);

          if (result.success) {
            showMessage(`Server '${server.name}' deleted`, "success");
            // Restart daemon if running (auto-sync)
            const daemonService = getDaemonService();
            const daemonStatus = daemonService.isDaemonRunning();
            if (daemonStatus.running) {
              daemonService.stopDaemon();
              // Small delay to ensure process exits before restarting
              setTimeout(() => {
                daemonService.startDaemon();
              }, 100);
            }
            // Adjust index and refresh
            setState((prev) => {
              const newLocal = configService.getLocalServers();
              const newRemote = configService.getRemoteServers();
              let newIndex = prev.currentIndex;
              let newSection = prev.currentSection;

              if (prev.currentSection === "local") {
                if (newIndex >= newLocal.length) {
                  newIndex = Math.max(0, newLocal.length - 1);
                }
                if (newLocal.length === 0 && newRemote.length > 0) {
                  newSection = "remote";
                  newIndex = 0;
                }
              } else {
                if (newIndex >= newRemote.length) {
                  newIndex = Math.max(0, newRemote.length - 1);
                }
                if (newRemote.length === 0 && newLocal.length > 0) {
                  newSection = "local";
                  newIndex = 0;
                }
              }

              // Remove from selection
              const newSelected = new Set(prev.selectedServers);
              newSelected.delete(type === "remote" ? `remote:${server.id}` : server.id);

              return {
                ...prev,
                localServers: newLocal,
                remoteServers: newRemote,
                currentIndex: newIndex,
                currentSection: newSection,
                selectedServers: newSelected,
              };
            });
          } else {
            showMessage(result.error || "Failed to delete", "error");
          }
        }
        return;
      }

      // A - Add server
      if (input === "a" || input === "A") {
        setState((prev) => ({ ...prev, screen: "add-server" }));
        return;
      }

      // E - Edit server
      if (input === "e" || input === "E") {
        const { type } = getCurrentServer();
        if (type !== "remote") {
          showMessage("Edit only available for remote servers", "info");
          return;
        }
        // For edit, show message for now
        showMessage("Use CLI: mcpsm edit <server>", "info");
        return;
      }

      // X - Test servers
      if (input === "x" || input === "X") {
        runTestAllServers();
        return;
      }

      // T - Tools
      if (input === "t" || input === "T") {
        setState((prev) => ({ ...prev, screen: "tools" }));
        return;
      }

      // C - Clients
      if (input === "c" || input === "C") {
        setState((prev) => ({ ...prev, screen: "clients" }));
        return;
      }

      // F - Profiles
      if (input === "f" || input === "F") {
        setState((prev) => ({ ...prev, screen: "profiles" }));
        return;
      }

      // G - Settings
      if (input === "g" || input === "G") {
        setState((prev) => ({ ...prev, screen: "settings" }));
        return;
      }

      // I - Import/Export
      if (input === "i" || input === "I") {
        setState((prev) => ({ ...prev, screen: "import-export" }));
        return;
      }

      // H - Doctor
      if (input === "h" || input === "H") {
        setState((prev) => ({ ...prev, screen: "doctor" }));
        return;
      }

      // K - Tokens
      if (input === "k" || input === "K") {
        setState((prev) => ({ ...prev, screen: "tokens" }));
        return;
      }

      // Enter - Open daemon management screen
      if (key.return) {
        // Go to daemon management screen to start/stop daemon
        setState((prev) => ({ ...prev, screen: "daemon" }));
        return;
      }
    },
    { isActive: state.screen === "main" || state.screen === "testing" }
  );

  // Render screen based on current state
  const { screen } = state;

  // Sub-screens
  if (screen === "add-server") {
    return <AddServerScreen onBack={goBack} />;
  }

  if (screen === "tools") {
    const { server, type } = getCurrentServer();
    const initialServerId = server ? (type === "remote" ? `remote:${server.id}` : server.id) : undefined;
    return <ToolsScreen onBack={goBack} initialServerId={initialServerId} />;
  }

  if (screen === "clients") {
    return <ClientsScreen onBack={goBack} />;
  }

  if (screen === "profiles") {
    return <ProfilesScreen onBack={goBack} />;
  }

  if (screen === "settings") {
    return <SettingsScreen onBack={goBack} />;
  }

  if (screen === "daemon") {
    return <DaemonScreen onBack={goBack} />;
  }

  if (screen === "import-export") {
    return <ImportExportScreen onBack={goBack} />;
  }

  if (screen === "doctor") {
    return <DoctorScreen onBack={goBack} />;
  }

  if (screen === "tokens") {
    return <TokensScreen onBack={goBack} />;
  }

  // Testing screen
  if (screen === "testing") {
    return (
      <Box flexDirection="column">
        <Header title="MCP Server Manager" version={VERSION} />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text bold>Testing all servers...</Text>

          {state.testResults === null ? (
            <Box marginTop={1} gap={1}>
              <Text color="cyan">
                <Spinner type="dots" />
              </Text>
              <Text>Running tests...</Text>
            </Box>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              {state.testResults.map((result, idx) => (
                <Box key={idx} gap={1}>
                  <Text color={result.success ? "green" : "red"}>{result.success ? "✓" : "✗"}</Text>
                  <Text>
                    {result.name}
                    {result.type !== "stdio" ? ` (${result.type})` : ""}
                  </Text>
                  <Text dimColor>-</Text>
                  <Text color={result.success ? "green" : "red"}>
                    {result.success ? `${result.toolCount} tools` : result.error}
                  </Text>
                </Box>
              ))}

              <Box marginTop={2}>
                <Text dimColor>Press any key to continue...</Text>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // Main screen
  const {
    localServers,
    remoteServers,
    currentSection,
    currentIndex,
    selectedServers,
    message,
    messageType,
  } = state;
  const hasServers = localServers.length > 0 || remoteServers.length > 0;
  const activeProfile = profileService.getActiveProfileId();
  const port = configService.getPort();
  const toolFilters = configService.getToolFilters();

  return (
    <Box flexDirection="column">
      <Header title="MCP Server Manager" version={VERSION} />

      {/* Status bar */}
      <Box paddingX={1}>
        <Text dimColor>
          Profile: {activeProfile} | Port: {port}
        </Text>
      </Box>

      {/* Message */}
      {message && (
        <Box paddingX={1} marginTop={1}>
          <Text
            color={messageType === "success" ? "green" : messageType === "error" ? "red" : "yellow"}
          >
            {messageType === "success" ? "✓" : messageType === "error" ? "✗" : "ℹ"} {message}
          </Text>
        </Box>
      )}

      {/* Main content: Servers + Menu side by side */}
      <Box marginTop={1} gap={2}>
        {/* Left panel: Server lists */}
        <Box flexDirection="column" flexGrow={1}>
          {hasServers ? (
            <>
              <Box
                flexDirection="column"
                borderStyle="round"
                borderColor="cyan"
                paddingX={1}
                paddingY={0}
              >
                <Text color="cyan" bold>
                  Local Servers (STDIO)
                </Text>
                {localServers.length > 0 ? (
                  localServers.map((server, idx) => {
                    const isCurrent = currentSection === "local" && idx === currentIndex;
                    const isSelected = selectedServers.has(server.id);
                    const isDisabled = server.disabled;
                    const filter = toolFilters[server.id];
                    const totalTools = filter?.allTools?.length ?? 0;
                    const disabledCount = filter?.disabledTools?.length ?? 0;
                    const enabledTools = totalTools - disabledCount;

                    return (
                      <Box key={server.id} gap={1}>
                        <Text color="cyan">{isCurrent ? "→" : " "}</Text>
                        <Text color={isSelected ? "green" : "gray"}>
                          {isSelected ? "[✓]" : "[ ]"}
                        </Text>
                        <Text color={isDisabled ? "gray" : isCurrent ? "white" : undefined} bold={isCurrent}>
                          {server.name || server.id}
                        </Text>
                        <Text dimColor>-</Text>
                        <Text color={isDisabled ? "yellow" : disabledCount > 0 ? "yellow" : "gray"}>
                          {isDisabled ? "disabled" : `${enabledTools}/${totalTools} tools`}
                        </Text>
                      </Box>
                    );
                  })
                ) : (
                  <Text dimColor>No local servers</Text>
                )}
              </Box>

              {remoteServers.length > 0 && (
                <Box
                  flexDirection="column"
                  borderStyle="round"
                  borderColor="magenta"
                  paddingX={1}
                  paddingY={0}
                  marginTop={1}
                >
                  <Text color="magenta" bold>
                    Remote Servers (HTTP/SSE)
                  </Text>
                  {remoteServers.map((server, idx) => {
                    const isCurrent = currentSection === "remote" && idx === currentIndex;
                    const isSelected = selectedServers.has(`remote:${server.id}`);
                    const isDisabled = server.disabled;
                    const filter = toolFilters[`remote:${server.id}`];
                    const totalTools = filter?.allTools?.length ?? 0;
                    const disabledCount = filter?.disabledTools?.length ?? 0;
                    const enabledTools = totalTools - disabledCount;

                    return (
                      <Box key={server.id} gap={1}>
                        <Text color="magenta">{isCurrent ? "→" : " "}</Text>
                        <Text color={isSelected ? "green" : "gray"}>
                          {isSelected ? "[✓]" : "[ ]"}
                        </Text>
                        <Text color={isDisabled ? "gray" : isCurrent ? "white" : undefined} bold={isCurrent}>
                          {server.name || server.id}
                        </Text>
                        <Text dimColor>-</Text>
                        <Text color={isDisabled ? "yellow" : disabledCount > 0 ? "yellow" : "gray"}>
                          {isDisabled ? "disabled" : `${enabledTools}/${totalTools} tools`}
                        </Text>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </>
          ) : (
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor="gray"
              paddingX={1}
              paddingY={1}
            >
              <Text dimColor>No servers configured.</Text>
              <Text dimColor>Press <Text color="green" bold>A</Text> to add a new server.</Text>
            </Box>
          )}
        </Box>

        {/* Right panel: Menu */}
        <MenuPanel />
      </Box>
    </Box>
  );
}

export default App;
