/**
 * AuthScreen - OAuth authentication management for MCP servers (ink component)
 */

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import open from "open";
import { ScreenLayout, ScrollableList, ConfirmDialog } from "../components/index.js";
import { createMenuSections } from "../utils/menu.js";
import { getConfigService } from "../../services/config.service.js";
import { getAuthService } from "../../services/auth.service.js";
import { getTestingService } from "../../services/testing.service.js";
import { getDaemonService } from "../../services/daemon.service.js";
import type { RemoteServer, AuthStatus } from "../../types/index.js";

interface AuthScreenProps {
  onBack: () => void;
  /** Optional: specific server to authenticate */
  serverId?: string;
  /** Optional: callback when authentication completes */
  onAuthComplete?: (serverId: string, success: boolean) => void;
}

type AuthPhase = "idle" | "authenticating" | "waiting" | "success" | "error";

interface ServerAuthState {
  server: RemoteServer;
  status: AuthStatus;
  phase: AuthPhase;
  error?: string;
  authUrl?: string;
}

export function AuthScreen({
  onBack,
  serverId: _serverId,
  onAuthComplete,
}: AuthScreenProps): React.ReactElement {
  const [allServers, setAllServers] = useState<ServerAuthState[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAuthServer, setCurrentAuthServer] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; name: string } | null>(null);
  const refreshDaemonIfRunning = useCallback((context: string) => {
    const daemonService = getDaemonService();
    if (daemonService.isDaemonRunning().running) {
      daemonService.refreshDaemon().catch((error) => {
        console.error(`Failed to refresh daemon after ${context}:`, error);
      });
    }
  }, []);

  // Load servers and their auth status
  const loadServers = useCallback(async (): Promise<void> => {
    const configService = getConfigService();
    const authService = getAuthService();
    const testingService = getTestingService();

    const allRemoteServers = configService.getRemoteServers();
    const states: ServerAuthState[] = [];

    // Also get all server IDs that have stored OAuth tokens
    const storedTokenServerIds = authService.getAllStoredTokenServerIds();

    for (const server of allRemoteServers) {
      const token = authService.getToken(server.id);
      const hasToken = !!token; // Check if token exists (even if expired)
      const hasStoredToken = storedTokenServerIds.includes(server.id);
      const isExpired = authService.isTokenExpired(server.id);
      const hasStaticToken = !!server.bearerToken;
      const isOAuthEnabled = server.oauth?.enabled || false;

      // Check if server actually needs auth (test it) - only if no tokens at all
      let requiresAuth = false;
      if (!hasToken && !hasStaticToken && isOAuthEnabled) {
        // Quick test to see if server needs auth
        const testResult = await testingService.testRemoteServer(server, true);
        requiresAuth = testResult.requiresAuth || false;
      }

      // Include ALL servers that:
      // 1. Have OAuth enabled, OR
      // 2. Have an OAuth token stored (even if expired)
      const shouldInclude = isOAuthEnabled || hasToken || hasStoredToken;

      if (!shouldInclude) {
        continue; // Skip servers without OAuth
      }

      // Determine if server requires auth:
      // - No token and OAuth enabled (needs auth)
      // - Token expired (needs re-auth)
      // - Test returned 401 (needs auth)
      const needsAuth = (!hasToken && !hasStaticToken && isOAuthEnabled) || (hasToken && isExpired) || requiresAuth;

      const status: AuthStatus = {
        serverId: server.id,
        serverName: server.name,
        hasToken: hasToken || hasStoredToken, // Token exists (may be expired)
        isOAuth: isOAuthEnabled || hasStoredToken, // Consider as OAuth if has stored token
        isExpired,
        expiresAt: token?.expiresAt,
        tokenPreview: (hasToken || hasStoredToken) ? authService.getTokenPreview(server.id) || undefined : undefined,
        requiresAuth: needsAuth,
      };

      states.push({
        server,
        status,
        phase: "idle",
      });
    }

    setAllServers(states);
    setIsLoading(false);

  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // Start authentication for a server
  const startAuth = useCallback(
    async (server: RemoteServer): Promise<void> => {
      const configService = getConfigService();
      const authService = getAuthService();
      const testingService = getTestingService();

      setCurrentAuthServer(server.id);
      setMessage(`Starting authentication for ${server.name}...`);

      // Update server state to authenticating
      setAllServers((prev) =>
        prev.map((s) =>
          s.server.id === server.id ? { ...s, phase: "authenticating" as AuthPhase } : s
        )
      );

      // Auto-enable OAuth if not enabled
      if (!server.oauth?.enabled) {
        configService.updateRemoteServer(server.id, { oauth: { enabled: true } });
        server.oauth = { enabled: true };
      }

      // First, test to get auth requirements
      const testResult = await testingService.testRemoteServer(server, true);

      // Start OAuth flow
      const flow = await authService.startOAuthFlow(server, testResult.authRequirements);

      if (!flow) {
        setAllServers((prev) =>
          prev.map((s) =>
            s.server.id === server.id
              ? { ...s, phase: "error" as AuthPhase, error: "Could not start OAuth flow" }
              : s
          )
        );
        setCurrentAuthServer(null);
        setMessage("Could not start OAuth flow - server may not support OAuth discovery");
        return;
      }

      // Update state with auth URL
      setAllServers((prev) =>
        prev.map((s) =>
          s.server.id === server.id
            ? { ...s, phase: "waiting" as AuthPhase, authUrl: flow.authUrl }
            : s
        )
      );

      setMessage(`Opening browser for ${server.name}...`);

      // Open browser
      try {
        await open(flow.authUrl);
      } catch {
        setMessage(`Could not open browser. Please open the URL manually.`);
      }

      setMessage(`Waiting for authentication...`);

      // Wait for auth to complete
      const authResult = await authService.waitForAuth(flow.state);
      authService.stopCallbackServer();

      if (authResult.success) {
        // Re-test to verify and get tools
        await testingService.testRemoteServer(server);

        setAllServers((prev) =>
          prev.map((s) =>
            s.server.id === server.id
              ? {
                  ...s,
                  phase: "success" as AuthPhase,
                  status: {
                    ...s.status,
                    hasToken: true,
                    requiresAuth: false,
                    tokenPreview: authService.getTokenPreview(server.id) || undefined,
                  },
                }
              : s
          )
        );
        setMessage(`${server.name} authenticated successfully!`);
        onAuthComplete?.(server.id, true);
        refreshDaemonIfRunning("authentication");

        // Switch to authenticated view after a delay
        setTimeout(() => {
          setAllServers((prev) =>
            prev.map((s) =>
              s.server.id === server.id ? { ...s, phase: "idle" as AuthPhase } : s
            )
          );
        }, 1500);
      } else {
        setAllServers((prev) =>
          prev.map((s) =>
            s.server.id === server.id
              ? { ...s, phase: "error" as AuthPhase, error: authResult.error }
              : s
          )
        );
        setMessage(`Authentication failed: ${authResult.error}`);
        onAuthComplete?.(server.id, false);
      }

      setCurrentAuthServer(null);
    },
    [onAuthComplete, refreshDaemonIfRunning]
  );

  // Revoke authentication for a server
  const revokeAuth = useCallback(
    (serverId: string): void => {
      const authService = getAuthService();
      authService.removeToken(serverId);
      refreshDaemonIfRunning("revoking auth");

      setAllServers((prev) =>
        prev.map((s) =>
          s.server.id === serverId
            ? {
                ...s,
                status: {
                  ...s.status,
                  hasToken: false,
                  requiresAuth: true,
                  tokenPreview: undefined,
                },
                phase: "idle" as AuthPhase,
              }
            : s
        )
      );

      setMessage(`Token revoked for ${serverId}`);
      setConfirmRevoke(null);

      // Reload to update the lists
      loadServers();
    },
    [loadServers, refreshDaemonIfRunning]
  );

  // Handle keyboard input
  useInput(
    (input, key) => {
      // Skip input handling when confirmation dialog is active (ConfirmDialog handles its own input)
      if (confirmRevoke) {
        return;
      }

      // Don't process input during authentication
      if (currentAuthServer) {
        if (key.escape) {
          // Cancel authentication
          const authService = getAuthService();
          authService.stopCallbackServer();
          authService.cancelPendingAuth(currentAuthServer);
          setCurrentAuthServer(null);
          setMessage("Authentication cancelled");
          setAllServers((prev) =>
            prev.map((s) =>
              s.server.id === currentAuthServer ? { ...s, phase: "idle" as AuthPhase } : s
            )
          );
        }
        return;
      }

      if (key.escape) {
        onBack();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(allServers.length - 1, prev + 1));
      } else if (key.return) {
        // Enter to authenticate server that needs auth
        const selected = allServers[selectedIndex];
        if (selected && selected.status.requiresAuth) {
          startAuth(selected.server);
        }
      } else if (input === "r" || input === "R") {
        // Revoke selected server's token (if it has one)
        const selected = allServers[selectedIndex];
        if (selected && selected.status.hasToken) {
          setConfirmRevoke({ id: selected.server.id, name: selected.server.name });
        }
      } else if (input === "q" || input === "Q") {
        onBack();
      }
    },
    { isActive: !isLoading }
  );

  // Create menu sections
  const authMenuSections = createMenuSections({
    actions: [
      { key: "Enter", label: "Authenticate" },
      { key: "R", label: "Revoke token" },
    ],
    showData: false,
    showConfig: false,
    showSystem: false,
  });

  if (isLoading) {
    return (
      <ScreenLayout title="OAuth Management" menuSections={authMenuSections}>
        <Box paddingX={1} paddingY={1} gap={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text>Checking OAuth servers...</Text>
        </Box>
      </ScreenLayout>
    );
  }

  // No OAuth servers at all
  if (allServers.length === 0) {
    return (
      <ScreenLayout
        title="OAuth Management"
        menuSections={authMenuSections}
        footer={
          <Text>
            <Text color="yellow">ESC</Text>
            <Text dimColor>: Back to main</Text>
          </Text>
        }
      >
        <Box paddingX={1} paddingY={1} flexDirection="column">
          <Text dimColor>No OAuth servers found.</Text>
          <Box marginTop={1}>
            <Text dimColor>
              Remote servers that require OAuth authentication will appear here.
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Add a remote server and test it - if it requires auth, it will show up.
            </Text>
          </Box>
        </Box>
      </ScreenLayout>
    );
  }

  // Footer message (hide when showing confirmation dialog)
  const footerMessage = confirmRevoke ? undefined : currentAuthServer ? (
    <Text>
      <Text color="yellow">ESC</Text>
      <Text dimColor>: Cancel authentication</Text>
    </Text>
  ) : message ? (
    <Text color="cyan">{message}</Text>
  ) : undefined;

  return (
    <ScreenLayout
      title="OAuth Management"
      menuSections={authMenuSections}
      footer={footerMessage}
    >
      {/* Revoke confirmation dialog */}
      {confirmRevoke && (
        <Box paddingX={1} marginBottom={1}>
          <ConfirmDialog
            title="Revoke Token"
            description={`Are you sure you want to revoke the OAuth token for '${confirmRevoke.name}'? You will need to re-authenticate to use this server.`}
            confirmText="Yes, revoke"
            cancelText="No, keep it"
            titleColor="yellow"
            onConfirm={() => {
              revokeAuth(confirmRevoke.id);
            }}
            onCancel={() => {
              setConfirmRevoke(null);
              setMessage("");
            }}
          />
        </Box>
      )}

      <Box flexDirection="column" paddingX={1}>
        {allServers.length === 0 ? (
          <Box flexDirection="column" paddingY={1}>
            <Text dimColor>No OAuth servers configured.</Text>
          </Box>
        ) : (
          <ScrollableList
            items={allServers}
            selectedIndex={selectedIndex}
            emptyMessage="No OAuth servers configured."
            renderItem={(state, index) => {
              const isSelected = index === selectedIndex;
              const { server, status, phase, error, authUrl } = state;

              let statusIcon: string;
              let statusColor: string;
              let statusText: string;

              switch (phase) {
                case "authenticating":
                case "waiting":
                  statusIcon = "○";
                  statusColor = "yellow";
                  statusText =
                    phase === "waiting" ? "waiting for browser..." : "starting...";
                  break;
                case "error":
                  statusIcon = "✗";
                  statusColor = "red";
                  statusText = error || "failed";
                  break;
                default:
                  if (status.hasToken && !status.isExpired) {
                    statusIcon = "✓";
                    statusColor = "green";
                    statusText = status.tokenPreview || "authenticated";
                  } else if (status.hasToken && status.isExpired) {
                    statusIcon = "!";
                    statusColor = "yellow";
                    statusText = "token expired";
                  } else {
                    statusIcon = "○";
                    statusColor = "red";
                    statusText = "not authenticated";
                  }
              }

              return (
                <Box key={server.id} flexDirection="column">
                  <Box gap={1}>
                    <Text color={isSelected ? "magenta" : "cyan"}>{isSelected ? "→" : " "}</Text>
                    <Text color={statusColor}>{statusIcon}</Text>
                    <Text bold={isSelected} color={isSelected ? "magenta" : undefined}>
                      {server.name}
                    </Text>
                    <Text color={statusColor} dimColor={!isSelected}>({statusText})</Text>
                    {phase === "waiting" && (
                      <Text color="cyan">
                        <Spinner type="dots" />
                      </Text>
                    )}
                  </Box>
                  {phase === "waiting" && authUrl && (
                    <Box marginLeft={4}>
                      <Text dimColor wrap="truncate">
                        URL: {authUrl.substring(0, 60)}...
                      </Text>
                    </Box>
                  )}
                </Box>
              );
            }}
          />
        )}
      </Box>
    </ScreenLayout>
  );
}

export default AuthScreen;
