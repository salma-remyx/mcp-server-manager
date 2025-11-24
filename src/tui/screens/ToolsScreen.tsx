/**
 * ToolsScreen - Manage tool filtering per server (ink component)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { Header } from "../components/index.js";
import { getConfigService } from "../../services/config.service.js";
import type { LocalServer, RemoteServer, ServerToolFilter } from "../../types/index.js";

type View = "servers" | "tools";

interface ServerItem {
  id: string;
  filterId: string;
  name: string;
  type: "local" | "remote";
  server: LocalServer | RemoteServer;
}

interface ToolsScreenProps {
  onBack: () => void;
}

interface ToolsState {
  servers: ServerItem[];
  currentServerIndex: number;
  filter: ServerToolFilter | null;
  tools: string[];
  currentToolIndex: number;
  view: View;
  message: string | null;
  messageType: "success" | "error" | "info";
}

export function ToolsScreen({ onBack }: ToolsScreenProps): React.ReactElement {
  const configService = getConfigService();

  const [state, setState] = useState<ToolsState>(() => {
    const localServers = configService.getLocalServers();
    const remoteServers = configService.getRemoteServers();

    const servers: ServerItem[] = [
      ...localServers.map((s) => ({
        id: s.id,
        filterId: s.id,
        name: s.name,
        type: "local" as const,
        server: s,
      })),
      ...remoteServers.map((s) => ({
        id: s.id,
        filterId: `remote:${s.id}`,
        name: s.name,
        type: "remote" as const,
        server: s,
      })),
    ];

    // Load tools for first server
    const toolFilters = configService.getToolFilters();
    const firstServer = servers[0];
    const filter = firstServer ? toolFilters[firstServer.filterId] || null : null;

    return {
      servers,
      currentServerIndex: 0,
      filter,
      tools: filter?.allTools || [],
      currentToolIndex: 0,
      view: "servers",
      message: null,
      messageType: "info",
    };
  });

  // Load tools for current server
  const loadServerTools = useCallback(
    (serverIndex: number) => {
      const server = state.servers[serverIndex];
      if (!server) return;

      const toolFilters = configService.getToolFilters();
      const filter = toolFilters[server.filterId] || null;

      setState((prev) => ({
        ...prev,
        filter,
        tools: filter?.allTools || [],
        currentToolIndex: 0,
      }));
    },
    [state.servers, configService]
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

  // Handle keyboard input
  useInput((input, key) => {
    const { servers, currentServerIndex, tools, currentToolIndex, view } = state;

    // Quit / Back
    if (input === "q" || key.escape) {
      if (view === "tools") {
        setState((prev) => ({ ...prev, view: "servers" }));
      } else {
        onBack();
      }
      return;
    }

    if (view === "servers") {
      // Navigation - Up
      if (key.upArrow && servers.length > 0) {
        const newIndex = (currentServerIndex - 1 + servers.length) % servers.length;
        setState((prev) => ({ ...prev, currentServerIndex: newIndex }));
        loadServerTools(newIndex);
        return;
      }

      // Navigation - Down
      if (key.downArrow && servers.length > 0) {
        const newIndex = (currentServerIndex + 1) % servers.length;
        setState((prev) => ({ ...prev, currentServerIndex: newIndex }));
        loadServerTools(newIndex);
        return;
      }

      // View tools - Enter
      if (key.return && state.tools.length > 0) {
        setState((prev) => ({ ...prev, view: "tools", currentToolIndex: 0 }));
        return;
      }

      // Reset filters - R
      if (input.toLowerCase() === "r") {
        const server = servers[currentServerIndex];
        if (server) {
          const result = configService.resetToolFilters(server.filterId);
          if (result.success) {
            showMessage("Filters reset", "success");
            loadServerTools(currentServerIndex);
          } else {
            showMessage(result.error || "Failed to reset", "error");
          }
        }
        return;
      }
    } else {
      // Tools view
      const server = servers[currentServerIndex];

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
      if (input === " " && tools.length > 0 && server) {
        const tool = tools[currentToolIndex];
        configService.toggleTool(server.filterId, tool);
        loadServerTools(currentServerIndex);
        return;
      }

      // Enable all - A
      if (input.toLowerCase() === "a" && tools.length > 0 && server) {
        configService.enableAllTools(server.filterId);
        loadServerTools(currentServerIndex);
        showMessage("All tools enabled", "success");
        return;
      }

      // Disable all - N
      if (input.toLowerCase() === "n" && tools.length > 0 && server) {
        configService.disableAllTools(server.filterId);
        loadServerTools(currentServerIndex);
        showMessage("All tools disabled", "success");
        return;
      }
    }
  });

  const { servers, currentServerIndex, tools, currentToolIndex, view, filter, message, messageType } =
    state;
  const toolFilters = configService.getToolFilters();

  // No servers configured
  if (servers.length === 0) {
    return (
      <Box flexDirection="column">
        <Header title="Tool Filters" />
        <Box paddingX={1} marginTop={1}>
          <Text dimColor>No servers configured.</Text>
        </Box>
        <Box paddingX={1} marginTop={1}>
          <Text dimColor>Press Q or ESC to go back</Text>
        </Box>
      </Box>
    );
  }

  // Servers view
  if (view === "servers") {
    return (
      <Box flexDirection="column">
        <Header title="Tool Filters" />

        <Box paddingX={1} marginTop={1}>
          <Text dimColor>Select a server to manage its tools</Text>
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

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          {servers.map((server, idx) => {
            const isCurrent = idx === currentServerIndex;
            const serverFilter = toolFilters[server.filterId];
            const totalTools = serverFilter?.allTools?.length || 0;
            const disabledCount = serverFilter?.disabledTools?.length || 0;
            const enabledCount = totalTools - disabledCount;

            const typeLabel =
              server.type === "remote" ? ` (${(server.server as RemoteServer).type})` : "";

            let toolsInfo: string;
            let toolsColor: string;
            if (totalTools === 0) {
              toolsInfo = "no tools discovered";
              toolsColor = "gray";
            } else if (disabledCount === 0) {
              toolsInfo = `${enabledCount}/${totalTools} tools enabled`;
              toolsColor = "green";
            } else {
              toolsInfo = `${enabledCount}/${totalTools} tools enabled`;
              toolsColor = "yellow";
            }

            return (
              <Box key={server.id} flexDirection="column" marginBottom={1}>
                <Box gap={1}>
                  <Text color="cyan">{isCurrent ? "→" : " "}</Text>
                  <Text color={isCurrent ? "cyan" : undefined} bold={isCurrent}>
                    {server.name}
                  </Text>
                  <Text dimColor>{typeLabel}</Text>
                </Box>
                <Box marginLeft={4}>
                  <Text color={toolsColor as "gray" | "green" | "yellow"}>{toolsInfo}</Text>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box paddingX={1} marginTop={1}>
          <Text dimColor>↑/↓ Navigate ENTER View tools R Reset filters Q Back</Text>
        </Box>
      </Box>
    );
  }

  // Tools view
  const currentServer = servers[currentServerIndex];
  const disabledTools = new Set(filter?.disabledTools || []);

  return (
    <Box flexDirection="column">
      <Header title={`Tools: ${currentServer?.name || ""}`} />

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

      <Box flexDirection="column" paddingX={1} marginTop={1}>
        {tools.length === 0 ? (
          <Box flexDirection="column">
            <Text dimColor>No tools discovered for this server.</Text>
            <Text dimColor>Run a test to discover tools.</Text>
          </Box>
        ) : (
          tools.map((tool, idx) => {
            const isCurrent = idx === currentToolIndex;
            const isEnabled = !disabledTools.has(tool);

            return (
              <Box key={tool} gap={1}>
                <Text color="cyan">{isCurrent ? "→" : " "}</Text>
                <Text color={isEnabled ? "green" : "red"}>{isEnabled ? "[✓]" : "[ ]"}</Text>
                <Text color={isEnabled ? (isCurrent ? "white" : undefined) : "gray"} bold={isCurrent}>
                  {tool}
                </Text>
              </Box>
            );
          })
        )}
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text dimColor>↑/↓ Navigate SPACE Toggle A Enable all N Disable all ESC Back</Text>
      </Box>
    </Box>
  );
}

export default ToolsScreen;
