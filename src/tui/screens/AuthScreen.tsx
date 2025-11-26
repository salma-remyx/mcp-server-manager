/**
 * AuthScreen - OAuth authentication management for MCP servers (ink component)
 */

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import open from "open";
import { Header } from "../components/index.js";
import { getConfigService } from "../../services/config.service.js";
import { getAuthService } from "../../services/auth.service.js";
import { getTestingService } from "../../services/testing.service.js";
import type { RemoteServer, AuthStatus } from "../../types/index.js";

interface AuthScreenProps {
  onBack: () => void;
  /** Optional: specific server to authenticate */
  serverId?: string;
  /** Optional: callback when authentication completes */
  onAuthComplete?: (serverId: string, success: boolean) => void;
}

type View = "needs-auth" | "authenticated";
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
  serverId,
  onAuthComplete,
}: AuthScreenProps): React.ReactElement {
  const [allServers, setAllServers] = useState<ServerAuthState[]>([]);
  const [view, setView] = useState<View>("needs-auth");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAuthServer, setCurrentAuthServer] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  // Get filtered lists based on view
  const needsAuthServers = allServers.filter(
    (s) => s.status.requiresAuth || s.phase === "error"
  );
  const authenticatedServers = allServers.filter(
    (s) => s.status.hasToken && !s.status.isExpired && s.phase !== "error"
  );

  const currentList = view === "needs-auth" ? needsAuthServers : authenticatedServers;

  // Load servers and their auth status
  const loadServers = useCallback(async (): Promise<void> => {
    const configService = getConfigService();
    const authService = getAuthService();
    const testingService = getTestingService();

    const allRemoteServers = configService.getRemoteServers();
    const states: ServerAuthState[] = [];

    for (const server of allRemoteServers) {
      const hasToken = authService.hasValidToken(server.id);
      const isExpired = authService.isTokenExpired(server.id);
      const token = authService.getToken(server.id);
      const hasStaticToken = !!server.bearerToken;
      const isOAuthEnabled = server.oauth?.enabled || false;

      // Check if server actually needs auth (test it) - only if no tokens
      let requiresAuth = false;
      if (!hasToken && !hasStaticToken) {
        // Quick test to see if server needs auth
        const testResult = await testingService.testRemoteServer(server, true);
        requiresAuth = testResult.requiresAuth || false;
      }

      // Only include servers that:
      // 1. Have OAuth enabled, OR
      // 2. Have an OAuth token stored, OR
      // 3. Returned 401 (require auth)
      const shouldInclude = isOAuthEnabled || hasToken || requiresAuth;

      if (!shouldInclude) {
        continue; // Skip servers without OAuth
      }

      const status: AuthStatus = {
        serverId: server.id,
        serverName: server.name,
        hasToken,
        isOAuth: isOAuthEnabled,
        isExpired,
        expiresAt: token?.expiresAt,
                    tokenPreview: hasToken ? authService.getTokenPreview(server.id) || undefined : undefined,
        requiresAuth: requiresAuth || isExpired,
      };

      states.push({
        server,
        status,
        phase: "idle",
      });
    }

    setAllServers(states);
    setIsLoading(false);

    // If single server mode and it needs auth, start immediately
    if (serverId) {
      const targetServer = states.find((s) => s.server.id === serverId);
      if (targetServer?.status.requiresAuth) {
        await startAuth(targetServer.server);
      }
    }

    // Auto-switch to authenticated view if no servers need auth
    const needsAuth = states.filter((s) => s.status.requiresAuth);
    const hasAuth = states.filter((s) => s.status.hasToken && !s.status.isExpired);
    if (needsAuth.length === 0 && hasAuth.length > 0) {
      setView("authenticated");
    }
  }, [serverId]);

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
    [onAuthComplete]
  );

  // Revoke authentication for a server
  const revokeAuth = useCallback((serverId: string): void => {
    const authService = getAuthService();
    authService.removeToken(serverId);

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

    setMessage(`Token revoked for server`);
    setConfirmRevoke(null);

    // Switch to needs-auth view if that's the only server in authenticated
    setTimeout(() => {
      setView("needs-auth");
      setSelectedIndex(0);
    }, 500);
  }, []);

  // Handle keyboard input
  useInput(
    (input, key) => {
      // Handle revoke confirmation
      if (confirmRevoke) {
        if (input === "y" || input === "Y") {
          revokeAuth(confirmRevoke);
        } else {
          setConfirmRevoke(null);
          setMessage("");
        }
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

      // Tab to switch views
      if (key.tab || input === "1" || input === "2") {
        if (key.tab) {
          setView((prev) => (prev === "needs-auth" ? "authenticated" : "needs-auth"));
        } else if (input === "1") {
          setView("needs-auth");
        } else if (input === "2") {
          setView("authenticated");
        }
        setSelectedIndex(0);
        setMessage("");
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(currentList.length - 1, prev + 1));
      } else if (key.return) {
        const selected = currentList[selectedIndex];
        if (selected) {
          if (view === "needs-auth" && selected.status.requiresAuth) {
            startAuth(selected.server);
          }
        }
      } else if (input === "a" || input === "A") {
        // Authenticate all servers that need auth
        if (view === "needs-auth" && needsAuthServers.length > 0) {
          startAuth(needsAuthServers[0].server);
        }
      } else if ((input === "r" || input === "R") && view === "authenticated") {
        // Revoke selected server's token
        const selected = currentList[selectedIndex];
        if (selected) {
          setConfirmRevoke(selected.server.id);
          setMessage(`Revoke token for ${selected.server.name}? (Y/N)`);
        }
      } else if (input === "q" || input === "Q") {
        onBack();
      }
    },
    { isActive: !isLoading }
  );

  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Header title="OAuth Management" />
        <Box paddingX={1} marginTop={1} gap={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text>Checking OAuth servers...</Text>
        </Box>
      </Box>
    );
  }

  // No OAuth servers at all
  if (allServers.length === 0) {
    return (
      <Box flexDirection="column">
        <Header title="OAuth Management" />
        <Box paddingX={1} marginTop={1} flexDirection="column">
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
        <Box paddingX={1} marginTop={2}>
          <Text>
            <Text color="yellow">ESC</Text>
            <Text dimColor>: Back to main</Text>
          </Text>
        </Box>
      </Box>
    );
  }

  const noServersNeedAuth = needsAuthServers.length === 0;
  const noAuthenticatedServers = authenticatedServers.length === 0;

  return (
    <Box flexDirection="column">
      <Header title="OAuth Management" />

      {/* Tab bar */}
      <Box paddingX={1} marginTop={1} gap={2}>
        <Text
          color={view === "needs-auth" ? "cyan" : "gray"}
          bold={view === "needs-auth"}
        >
          [1] Needs Auth ({needsAuthServers.length})
        </Text>
        <Text
          color={view === "authenticated" ? "cyan" : "gray"}
          bold={view === "authenticated"}
        >
          [2] Authenticated ({authenticatedServers.length})
        </Text>
      </Box>

      <Box flexDirection="column" paddingX={1} marginTop={1}>
        {view === "needs-auth" ? (
          noServersNeedAuth ? (
            <Box flexDirection="column" paddingY={1}>
              <Text color="green">✓ All servers are authenticated!</Text>
              <Box marginTop={1}>
                <Text dimColor>
                  Press Tab or 2 to manage authenticated servers
                </Text>
              </Box>
            </Box>
          ) : (
            needsAuthServers.map((state, index) => {
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
                  if (status.isExpired) {
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
                    <Text color={isSelected ? "cyan" : undefined}>
                      {isSelected ? "▶" : " "}
                    </Text>
                    <Text color={statusColor}>{statusIcon}</Text>
                    <Text bold={isSelected} color={isSelected ? "cyan" : undefined}>
                      {server.name}
                    </Text>
                    <Text color={statusColor}>({statusText})</Text>
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
            })
          )
        ) : noAuthenticatedServers ? (
          <Box flexDirection="column" paddingY={1}>
            <Text dimColor>No authenticated servers</Text>
            <Box marginTop={1}>
              <Text dimColor>
                Press Tab or 1 to authenticate servers
              </Text>
            </Box>
          </Box>
        ) : (
          authenticatedServers.map((state, index) => {
            const isSelected = index === selectedIndex;
            const { server, status } = state;

            return (
              <Box key={server.id} gap={1}>
                <Text color={isSelected ? "cyan" : undefined}>
                  {isSelected ? "▶" : " "}
                </Text>
                <Text color="green">✓</Text>
                <Text bold={isSelected} color={isSelected ? "cyan" : undefined}>
                  {server.name}
                </Text>
                {status.tokenPreview && (
                  <Text dimColor>({status.tokenPreview})</Text>
                )}
              </Box>
            );
          })
        )}
      </Box>

      {message && (
        <Box paddingX={1} marginTop={1}>
          <Text color={confirmRevoke ? "yellow" : "cyan"}>{message}</Text>
        </Box>
      )}

      <Box paddingX={1} marginTop={2} flexDirection="column" borderStyle="single" borderColor="gray">
        {currentAuthServer ? (
          <Text>
            <Text color="yellow">ESC</Text>
            <Text dimColor>: Cancel authentication</Text>
          </Text>
        ) : confirmRevoke ? (
          <Text>
            <Text color="green">Y</Text>
            <Text dimColor>: Confirm  </Text>
            <Text color="red">N</Text>
            <Text dimColor>: Cancel</Text>
          </Text>
        ) : (
          <Box flexDirection="column" gap={0}>
            <Text>
              <Text color="cyan">Tab</Text>
              <Text dimColor>/</Text>
              <Text color="cyan">1</Text>
              <Text dimColor>/</Text>
              <Text color="cyan">2</Text>
              <Text dimColor>: Switch tab  </Text>
              <Text color="cyan">↑↓</Text>
              <Text dimColor>: Navigate  </Text>
              {view === "needs-auth" ? (
                <>
                  <Text color="green">Enter</Text>
                  <Text dimColor>: Authenticate  </Text>
                  <Text color="green">A</Text>
                  <Text dimColor>: Auth all</Text>
                </>
              ) : (
                <>
                  <Text color="red">R</Text>
                  <Text dimColor>: Revoke token</Text>
                </>
              )}
            </Text>
            <Text>
              <Text color="yellow">Q</Text>
              <Text dimColor>/</Text>
              <Text color="yellow">ESC</Text>
              <Text dimColor>: Back to main</Text>
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default AuthScreen;
