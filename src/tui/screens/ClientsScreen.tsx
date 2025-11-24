/**
 * ClientsScreen - Manage MCP client connections (ink component)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { Header } from "../components/index.js";
import { getClientService } from "../../services/client.service.js";
import type { DetectedClient } from "../../types/index.js";

interface ClientsScreenProps {
  onBack: () => void;
}

interface ClientsState {
  clients: DetectedClient[];
  currentIndex: number;
  connecting: boolean;
  message: string | null;
  messageType: "success" | "error" | "info";
}

export function ClientsScreen({ onBack }: ClientsScreenProps): React.ReactElement {
  const clientService = getClientService();

  const [state, setState] = useState<ClientsState>({
    clients: clientService.detectClients(),
    currentIndex: 0,
    connecting: false,
    message: null,
    messageType: "info",
  });

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
  // Keep reference to avoid unused warning
  void showMessage;

  // Handle connect/disconnect toggle
  const handleToggleConnection = useCallback(async () => {
    const { clients, currentIndex, connecting } = state;
    if (connecting || clients.length === 0) return;

    const client = clients[currentIndex];
    if (client.status === "not-installed") return;

    setState((prev) => ({ ...prev, connecting: true }));

    const result =
      client.status === "connected"
        ? clientService.disconnectClient(client.id)
        : clientService.connectClient(client.id);

    setState((prev) => ({
      ...prev,
      connecting: false,
      clients: clientService.detectClients(),
      message: result.success
        ? client.status === "connected"
          ? "Disconnected successfully"
          : "Connected successfully"
        : `Failed: ${result.error}`,
      messageType: result.success ? "success" : "error",
    }));
  }, [state, clientService]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setState((prev) => ({
      ...prev,
      clients: clientService.detectClients(),
      message: "Refreshed",
      messageType: "info",
    }));
  }, [clientService]);

  // Handle keyboard input
  useInput((input, key) => {
    const { clients, currentIndex, connecting } = state;

    // Don't process input while connecting
    if (connecting) return;

    // Quit
    if (input === "q" || key.escape) {
      onBack();
      return;
    }

    // Navigation - Up
    if (key.upArrow && clients.length > 0) {
      setState((prev) => ({
        ...prev,
        currentIndex: (currentIndex - 1 + clients.length) % clients.length,
      }));
      return;
    }

    // Navigation - Down
    if (key.downArrow && clients.length > 0) {
      setState((prev) => ({
        ...prev,
        currentIndex: (currentIndex + 1) % clients.length,
      }));
      return;
    }

    // Connect/Disconnect - Enter
    if (key.return && clients.length > 0) {
      handleToggleConnection();
      return;
    }

    // Refresh - R
    if (input === "r" || input === "R") {
      handleRefresh();
      return;
    }
  });

  const { clients, currentIndex, connecting, message, messageType } = state;

  // Show connecting spinner
  if (connecting) {
    return (
      <Box flexDirection="column">
        <Header title="MCP Clients" />

        <Box paddingX={1} marginTop={1} gap={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text>Updating client connection...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="MCP Clients" />

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
        {clients.length === 0 ? (
          <Text dimColor>No clients detected.</Text>
        ) : (
          clients.map((client, idx) => {
            const isCurrent = idx === currentIndex;

            // Status icon and color based on connection status
            let statusIcon: string;
            let statusColor: "green" | "yellow" | "gray";
            let statusText: string;

            if (client.status === "connected") {
              statusIcon = "✔";
              statusColor = "green";
              statusText = "connected";
            } else if (client.status === "disconnected") {
              statusIcon = "○";
              statusColor = "yellow";
              statusText = "disconnected";
            } else {
              statusIcon = "✗";
              statusColor = "gray";
              statusText = "not installed";
            }

            return (
              <Box key={client.id} flexDirection="column" marginBottom={1}>
                <Box gap={1}>
                  <Text color="cyan">{isCurrent ? "→" : " "}</Text>
                  <Text color={statusColor}>{statusIcon}</Text>
                  <Text color={isCurrent ? "cyan" : undefined} bold={isCurrent}>
                    {client.name}
                  </Text>
                  <Text dimColor>[{client.id}]</Text>
                </Box>
                <Box marginLeft={5} gap={1}>
                  <Text color={statusColor}>{statusText}</Text>
                  <Text dimColor>|</Text>
                  <Text dimColor>
                    {client.serverCount} {client.serverCount === 1 ? "server" : "servers"}
                  </Text>
                </Box>
                {client.mcpConfigPath && (
                  <Box marginLeft={5}>
                    <Text dimColor>{client.mcpConfigPath}</Text>
                  </Box>
                )}
              </Box>
            );
          })
        )}
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text dimColor>↑/↓ Navigate ENTER Connect/Disconnect R Refresh Q Back</Text>
      </Box>
    </Box>
  );
}

export default ClientsScreen;
