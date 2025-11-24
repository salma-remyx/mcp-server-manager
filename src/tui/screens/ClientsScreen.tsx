/**
 * ClientsScreen - Manage MCP client sync (ink component)
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

interface SyncResult {
  clientName: string;
  success: boolean;
  addedCount?: number;
  error?: string | null;
}

interface ClientsState {
  clients: DetectedClient[];
  currentIndex: number;
  syncing: boolean;
  syncResults: SyncResult[] | null;
  message: string | null;
  messageType: "success" | "error" | "info";
}

export function ClientsScreen({ onBack }: ClientsScreenProps): React.ReactElement {
  const clientService = getClientService();

  const [state, setState] = useState<ClientsState>({
    clients: clientService.detectClients(),
    currentIndex: 0,
    syncing: false,
    syncResults: null,
    message: null,
    messageType: "info",
  });

  // Show temporary message (will be used for error handling)
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

  // Handle sync all
  const handleSyncAll = useCallback(async () => {
    setState((prev) => ({ ...prev, syncing: true, syncResults: null }));

    const results = clientService.syncToAllClients();

    setState((prev) => ({
      ...prev,
      syncing: false,
      syncResults: results,
      clients: clientService.detectClients(),
    }));
  }, [clientService]);

  // Handle keyboard input
  useInput((input, key) => {
    const { clients, currentIndex, syncing, syncResults } = state;

    // If showing sync results, any key clears
    if (syncResults !== null && !syncing) {
      setState((prev) => ({ ...prev, syncResults: null }));
      return;
    }

    // Don't process input while syncing
    if (syncing) return;

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

    // Toggle sync - Space
    if (input === " " && clients.length > 0) {
      const client = clients[currentIndex];
      if (client.enabled) {
        clientService.disableClient(client.id);
      } else {
        clientService.enableClient(client.id);
      }
      setState((prev) => ({
        ...prev,
        clients: clientService.detectClients(),
      }));
      return;
    }

    // Sync all - S
    if (input.toLowerCase() === "s") {
      handleSyncAll();
      return;
    }
  });

  const { clients, currentIndex, syncing, syncResults, message, messageType } = state;

  // Show sync results overlay
  if (syncResults !== null) {
    return (
      <Box flexDirection="column">
        <Header title="Sync Results" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          {syncResults.length === 0 ? (
            <Text color="yellow">No clients enabled for sync.</Text>
          ) : (
            syncResults.map((result, idx) => (
              <Box key={idx} gap={1}>
                <Text color={result.success ? "green" : "red"}>{result.success ? "✓" : "✗"}</Text>
                <Text>{result.clientName}:</Text>
                <Text color={result.success ? "green" : "red"}>
                  {result.success ? `${result.addedCount} servers` : result.error}
                </Text>
              </Box>
            ))
          )}
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  // Show syncing spinner
  if (syncing) {
    return (
      <Box flexDirection="column">
        <Header title="MCP Clients" />

        <Box paddingX={1} marginTop={1} gap={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text>Syncing to clients...</Text>
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

            // Status icon
            let statusIcon: string;
            let statusColor: "green" | "yellow" | "gray";
            if (client.installed) {
              if (client.synced) {
                statusIcon = "✔";
                statusColor = "green";
              } else {
                statusIcon = "○";
                statusColor = "yellow";
              }
            } else {
              statusIcon = "✗";
              statusColor = "gray";
            }

            // Install status
            let installStatus: string;
            let installColor: "green" | "yellow" | "gray";
            if (client.installed) {
              if (client.hasConfig) {
                installStatus = "configured";
                installColor = "green";
              } else {
                installStatus = "installed";
                installColor = "yellow";
              }
            } else {
              installStatus = "not installed";
              installColor = "gray";
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
                  <Text color={installColor}>{installStatus}</Text>
                  <Text dimColor>|</Text>
                  <Text color={client.enabled ? "green" : "gray"}>
                    sync {client.enabled ? "ON" : "OFF"}
                  </Text>
                </Box>
                {client.hasConfig && (
                  <Box marginLeft={5}>
                    <Text dimColor>{client.serverCount} servers</Text>
                  </Box>
                )}
              </Box>
            );
          })
        )}
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text dimColor>↑/↓ Navigate SPACE Toggle sync S Sync all Q Back</Text>
      </Box>
    </Box>
  );
}

export default ClientsScreen;
