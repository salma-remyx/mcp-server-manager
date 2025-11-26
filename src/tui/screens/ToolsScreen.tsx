/**
 * ToolsScreen - Manage tool filtering for a specific server (ink component)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { ScreenLayout, ScrollableList } from "../components/index.js";
import { createMenuSections } from "../utils/menu.js";
import { getConfigService } from "../../services/config.service.js";
import { getDaemonService } from "../../services/daemon.service.js";
import type { ServerToolFilter } from "../../types/index.js";

interface ToolsScreenProps {
  onBack: () => void;
  initialServerId?: string; // Server to show tools for
}

interface ToolsState {
  serverId: string;
  serverName: string;
  filter: ServerToolFilter | null;
  tools: string[];
  currentToolIndex: number;
  message: string | null;
  messageType: "success" | "error" | "info";
}

export function ToolsScreen({ onBack, initialServerId }: ToolsScreenProps): React.ReactElement {
  const configService = getConfigService();

  const [state, setState] = useState<ToolsState>(() => {
    const localServers = configService.getLocalServers();
    const remoteServers = configService.getRemoteServers();

    // Find the server
    let serverId = initialServerId || "";
    let serverName = "";

    if (initialServerId?.startsWith("remote:")) {
      const id = initialServerId.replace("remote:", "");
      const server = remoteServers.find((s) => s.id === id);
      if (server) {
        serverId = initialServerId;
        serverName = server.name;
      }
    } else if (initialServerId) {
      const server = localServers.find((s) => s.id === initialServerId);
      if (server) {
        serverId = initialServerId;
        serverName = server.name;
      }
    }

    // Load tools for the server
    const toolFilters = configService.getToolFilters();
    const filter = serverId ? toolFilters[serverId] || null : null;

    return {
      serverId,
      serverName,
      filter,
      tools: filter?.allTools || [],
      currentToolIndex: 0,
      message: null,
      messageType: "info",
    };
  });

  // Reload tools from config
  const reloadTools = useCallback(
    (preserveIndex = false) => {
      const toolFilters = configService.getToolFilters();
      const filter = state.serverId ? toolFilters[state.serverId] || null : null;

      setState((prev) => ({
        ...prev,
        filter,
        tools: filter?.allTools || [],
        currentToolIndex: preserveIndex ? prev.currentToolIndex : 0,
      }));
    },
    [state.serverId, configService]
  );

  // Show temporary message
  const showMessage = useCallback(
    (msg: string, type: "success" | "error" | "info" = "info") => {
      setState((prev) => ({ ...prev, message: msg, messageType: type }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, message: null }));
      }, 2000);
    },
    []
  );

  // Restart daemon if running (for auto-sync tool changes)
  const restartDaemonIfRunning = useCallback(() => {
    const daemonService = getDaemonService();
    const daemonStatus = daemonService.isDaemonRunning();
    if (daemonStatus.running) {
      daemonService.stopDaemon();
      // Small delay to ensure process exits before restarting
      setTimeout(() => {
        daemonService.startDaemon();
      }, 100);
    }
  }, []);

  // Handle keyboard input
  useInput((input, key) => {
    const { serverId, tools, currentToolIndex } = state;

    // Quit / Back
    if (input === "q" || key.escape) {
      onBack();
      return;
    }

    // Navigation - Up
    if (key.upArrow && tools.length > 0) {
      setState((prev) => ({
        ...prev,
        currentToolIndex: (currentToolIndex - 1 + tools.length) % tools.length,
      }));
      return;
    }

    // Navigation - Down
    if (key.downArrow && tools.length > 0) {
      setState((prev) => ({
        ...prev,
        currentToolIndex: (currentToolIndex + 1) % tools.length,
      }));
      return;
    }

    // Toggle tool - Space
    if (input === " " && tools.length > 0 && serverId) {
      const tool = tools[currentToolIndex];
      configService.toggleTool(serverId, tool);
      restartDaemonIfRunning();
      reloadTools(true);
      return;
    }

    // Enable all - A
    if (input.toLowerCase() === "a" && tools.length > 0 && serverId) {
      configService.enableAllTools(serverId);
      restartDaemonIfRunning();
      reloadTools(true);
      showMessage("All tools enabled", "success");
      return;
    }

    // Disable all - N
    if (input.toLowerCase() === "n" && tools.length > 0 && serverId) {
      configService.disableAllTools(serverId);
      restartDaemonIfRunning();
      reloadTools(true);
      showMessage("All tools disabled", "success");
      return;
    }

  });

  const { serverName, tools, currentToolIndex, filter, message, messageType } = state;
  const disabledTools = new Set(filter?.disabledTools || []);

  // No server selected
  if (!state.serverId) {
    return (
      <ScreenLayout
        title="Tool Filters"
        menuSections={createMenuSections({ showData: false, showConfig: false, showSystem: false })}
      >
        <Box paddingX={1} paddingY={1} flexDirection="column">
          <Text dimColor>No server selected.</Text>
          <Box marginTop={1}>
            <Text dimColor>Press Q or ESC to go back</Text>
          </Box>
        </Box>
      </ScreenLayout>
    );
  }

  const toolsMenuSections = createMenuSections({
    actions: [
      { key: "Space", label: "Toggle" },
      { key: "A", label: "Enable all" },
      { key: "N", label: "Disable all" },
    ],
    showData: false,
    showConfig: false,
    showSystem: false,
  });

  const footer = message ? (
    <Text
      color={messageType === "success" ? "green" : messageType === "error" ? "red" : "yellow"}
    >
      {messageType === "success" ? "✓" : messageType === "error" ? "✗" : "ℹ"} {message}
    </Text>
  ) : undefined;

  return (
    <ScreenLayout
      title={`Tools: ${serverName}`}
      menuSections={toolsMenuSections}
      highlightedView="T"
      footer={footer}
    >
      {tools.length === 0 ? (
        <Box paddingX={1} paddingY={1} flexDirection="column">
          <Text dimColor>No tools discovered for this server.</Text>
          <Text dimColor>Run a test (X) to discover tools.</Text>
        </Box>
      ) : (
        <ScrollableList
          items={tools}
          selectedIndex={currentToolIndex}
          emptyMessage="No tools discovered for this server."
          renderItem={(tool, idx) => {
            const isCurrent = idx === currentToolIndex;
            const isEnabled = !disabledTools.has(tool);

            return (
              <Box key={tool} gap={1} paddingX={1}>
                <Text color="cyan">{isCurrent ? "→" : " "}</Text>
                <Text color={isEnabled ? "green" : "red"}>{isEnabled ? "[✓]" : "[ ]"}</Text>
                <Text
                  color={isEnabled ? (isCurrent ? "white" : undefined) : "gray"}
                  bold={isCurrent}
                >
                  {tool}
                </Text>
              </Box>
            );
          }}
        />
      )}
    </ScreenLayout>
  );
}

export default ToolsScreen;
