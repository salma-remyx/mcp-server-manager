/**
 * AddServerScreen - Interactive server addition (ink component)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import open from "open";
import { ScreenLayout } from "../components/index.js";
import { getConfigService } from "../../services/config.service.js";
import { getTestingService } from "../../services/testing.service.js";
import { getAuthService } from "../../services/auth.service.js";
import { getDaemonService } from "../../services/daemon.service.js";
import { parseEnvInput, normalizeEnv } from "../../shared/env.js";
import type { LocalServer, RemoteServer, TransportType } from "../../types/index.js";

type Step =
  | "name"
  | "type"
  | "command"
  | "args"
  | "env"
  | "url"
  | "token"
  | "testing"
  | "authenticating"
  | "done";
type ServerType = "stdio" | "http" | "sse";

interface AddServerScreenProps {
  onBack: () => void;
}

interface FormState {
  step: Step;
  name: string;
  serverId: string;
  serverType: ServerType | null;
  command: string;
  args: string;
  env: string;
  url: string;
  token: string;
  testResult: { success: boolean; toolCount?: number; error?: string } | null;
  error: string | null;
}

const SERVER_TYPE_OPTIONS = [
  { label: "Local (STDIO) - Run MCP servers locally", value: "stdio" },
  { label: "Remote (HTTP) - Connect to hosted servers", value: "http" },
  { label: "Remote (SSE) - Real-time streaming", value: "sse" },
];

export function AddServerScreen({ onBack }: AddServerScreenProps): React.ReactElement {
  useApp(); // Keep app context active
  const configService = getConfigService();
  const testingService = getTestingService();
  const refreshDaemonIfRunning = useCallback(() => {
    const daemonService = getDaemonService();
    if (daemonService.isDaemonRunning().running) {
      daemonService.refreshDaemon().catch((error) => {
        console.error("Failed to refresh daemon after server changes:", error);
      });
    }
  }, []);

  const [state, setState] = useState<FormState>({
    step: "name",
    name: "",
    serverId: "",
    serverType: null,
    command: "",
    args: "",
    env: "",
    url: "",
    token: "",
    testResult: null,
    error: null,
  });

  const [isTesting, setIsTesting] = useState(false);

  // Handle escape to go back
  useInput((_input, key) => {
    if (key.escape) {
      if (state.step === "name") {
        onBack();
      } else if (state.step === "type") {
        setState((prev) => ({ ...prev, step: "name" }));
      } else if (state.step === "command") {
        setState((prev) => ({ ...prev, step: "type" }));
      } else if (state.step === "args") {
        setState((prev) => ({ ...prev, step: "command" }));
      } else if (state.step === "env") {
        setState((prev) => ({ ...prev, step: "args" }));
      } else if (state.step === "url") {
        setState((prev) => ({ ...prev, step: "type" }));
      } else if (state.step === "token") {
        setState((prev) => ({ ...prev, step: "url" }));
      } else if (state.step === "done" && !isTesting) {
        onBack();
      }
      return;
    }

    // Any key after test result to go back
    if (state.step === "done" && state.testResult !== null && !isTesting) {
      onBack();
    }
  });

  // Handle name submission
  const handleNameSubmit = useCallback(
    (value: string) => {
      if (!value.trim()) {
        setState((prev) => ({ ...prev, error: "Name is required" }));
        return;
      }
      
      const name = value.trim();
      const nameLower = name.toLowerCase();
      
      // Check for duplicate server name (case-insensitive)
      const localServers = configService.getLocalServers();
      const remoteServers = configService.getRemoteServers();
      const existsLocal = localServers.some((s) => s.name.toLowerCase() === nameLower);
      const existsRemote = remoteServers.some((s) => s.name.toLowerCase() === nameLower);
      
      if (existsLocal || existsRemote) {
        setState((prev) => ({ ...prev, error: `Server '${name}' already exists` }));
        return;
      }
      
      const serverId = configService.generateServerId(name);
      setState((prev) => ({
        ...prev,
        name,
        serverId,
        step: "type",
        error: null,
      }));
    },
    [configService]
  );

  // Handle server type selection
  const handleTypeSelect = useCallback((item: { value: string }) => {
    const serverType = item.value as ServerType;
    setState((prev) => ({
      ...prev,
      serverType,
      step: serverType === "stdio" ? "command" : "url",
      error: null,
    }));
  }, []);

  // Handle command submission
  const handleCommandSubmit = useCallback((value: string) => {
    if (!value.trim()) {
      setState((prev) => ({ ...prev, error: "Command is required" }));
      return;
    }
    setState((prev) => ({
      ...prev,
      command: value.trim(),
      step: "args",
      error: null,
    }));
  }, []);

  // Handle args submission
  const handleArgsSubmit = useCallback((value: string) => {
    const args = value.trim();
    setState((prev) => ({ ...prev, args, step: "env", error: null }));
  }, []);

  const saveLocalServer = useCallback(
    async (envInput: string) => {
      const parsedEnv = parseEnvInput(envInput);
      if (!parsedEnv.success) {
        setState((prev) => ({ ...prev, error: parsedEnv.error || "Invalid environment variable" }));
        return;
      }

      const env = normalizeEnv(parsedEnv.data);
      const argsArray = state.args ? state.args.split(/\s+/).filter(Boolean) : [];

      const server: LocalServer = {
        id: state.serverId,
        name: state.name,
        command: state.command,
        args: argsArray,
        ...(env ? { env } : {}),
      };

      const result = configService.addLocalServer(server);
      if (!result.success) {
        setState((prev) => ({ ...prev, error: result.error || "Failed to add server" }));
        return;
      }

      // Auto-test the server
      setState((prev) => ({ ...prev, step: "testing", error: null }));
      setIsTesting(true);
      try {
        const testResult = await testingService.testLocalServer(server);
        setState((prev) => ({ ...prev, step: "done", testResult }));
      } catch (e) {
        setState((prev) => ({
          ...prev,
          step: "done",
          testResult: { success: false, error: e instanceof Error ? e.message : "Unknown error" },
        }));
      } finally {
        setIsTesting(false);
        refreshDaemonIfRunning();
      }
    },
    [
      configService,
      refreshDaemonIfRunning,
      state.args,
      state.command,
      state.name,
      state.serverId,
      testingService,
    ]
  );

  const handleEnvSubmit = useCallback(
    (value: string) => {
      const envInput = value.trim();
      setState((prev) => ({ ...prev, env: envInput, error: null }));
      void saveLocalServer(envInput);
    },
    [saveLocalServer]
  );

  // Handle URL submission
  const handleUrlSubmit = useCallback((value: string) => {
    if (!value.trim()) {
      setState((prev) => ({ ...prev, error: "URL is required" }));
      return;
    }
    setState((prev) => ({
      ...prev,
      url: value.trim(),
      step: "token",
      error: null,
    }));
  }, []);

  // Handle token submission
  const handleTokenSubmit = useCallback(
    async (value: string) => {
      const token = value.trim();
      setState((prev) => ({ ...prev, token }));

      // Save the server
      const server: RemoteServer = {
        id: state.serverId,
        name: state.name,
        type: state.serverType as TransportType,
        url: state.url,
        ...(token ? { bearerToken: token } : {}),
      };

      const result = configService.addRemoteServer(server);
      if (!result.success) {
        setState((prev) => ({ ...prev, error: result.error || "Failed to add server" }));
        return;
      }

      // Auto-test the server
      setState((prev) => ({ ...prev, step: "testing", error: null }));
      setIsTesting(true);
      try {
        const testResult = await testingService.testRemoteServer(server, true);
        
        // If auth is required, start OAuth flow automatically
        if (testResult.requiresAuth) {
          setState((prev) => ({ ...prev, step: "authenticating" }));
          
          // Enable OAuth on the server
          configService.updateRemoteServer(server.id, { oauth: { enabled: true } });
          const updatedServer = { ...server, oauth: { enabled: true } };
          
          // Start OAuth flow
          const authService = getAuthService();
          const flow = await authService.startOAuthFlow(updatedServer, testResult.authRequirements);
          
          if (flow) {
            // Open browser for authentication
            try {
              await open(flow.authUrl);
            } catch {
              // Ignore browser open errors
            }
            
            // Wait for auth to complete
            const authResult = await authService.waitForAuth(flow.state);
            authService.stopCallbackServer();
            
            if (authResult.success) {
              // Re-test with new token
              const retestResult = await testingService.testRemoteServer(updatedServer);
              setState((prev) => ({ ...prev, step: "done", testResult: retestResult }));
            } else {
              setState((prev) => ({
                ...prev,
                step: "done",
                testResult: { success: false, error: authResult.error || "Authentication failed" },
              }));
            }
          } else {
            setState((prev) => ({
              ...prev,
              step: "done",
              testResult: { success: false, error: "Could not start OAuth flow" },
            }));
          }
        } else {
          setState((prev) => ({ ...prev, step: "done", testResult }));
        }
      } catch (e) {
        setState((prev) => ({
          ...prev,
          step: "done",
          testResult: { success: false, error: e instanceof Error ? e.message : "Unknown error" },
        }));
      }
      setIsTesting(false);
      refreshDaemonIfRunning();
    },
    [
      configService,
      refreshDaemonIfRunning,
      state.name,
      state.serverId,
      state.serverType,
      state.url,
      testingService,
    ]
  );

  return (
    <ScreenLayout
      title="Add New MCP Server"
      shortcuts={[{ key: "ESC", label: "Go back" }]}
    >
      {/* Name step */}
      {state.step === "name" && (
        <Box flexDirection="column" paddingY={1}>
          <Text>Server name:</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; </Text>
            <TextInput
              value={state.name}
              onChange={(value) => setState((prev) => ({ ...prev, name: value }))}
              onSubmit={handleNameSubmit}
            />
          </Box>
        </Box>
      )}

      {/* Type step */}
      {state.step === "type" && (
        <Box flexDirection="column" paddingY={1}>
          <Text>Server type:</Text>
          <Box marginTop={1}>
            <SelectInput items={SERVER_TYPE_OPTIONS} onSelect={handleTypeSelect} />
          </Box>
        </Box>
      )}

      {/* Command step (local) */}
      {state.step === "command" && (
        <Box flexDirection="column" paddingY={1}>
          <Text>Command executable:</Text>
          <Text dimColor>Examples: npx, node, python, uvx</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; </Text>
            <TextInput
              value={state.command}
              onChange={(value) => setState((prev) => ({ ...prev, command: value }))}
              onSubmit={handleCommandSubmit}
            />
          </Box>
        </Box>
      )}

      {/* Args step (local) */}
      {state.step === "args" && (
        <Box flexDirection="column" paddingY={1}>
          <Text>Arguments (space separated, optional):</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; </Text>
            <TextInput
              value={state.args}
              onChange={(value) => setState((prev) => ({ ...prev, args: value }))}
              onSubmit={handleArgsSubmit}
            />
          </Box>
        </Box>
      )}

      {/* Env step (local) */}
      {state.step === "env" && (
        <Box flexDirection="column" paddingY={1}>
          <Text>Environment variables (optional):</Text>
          <Text dimColor>Format: KEY=VALUE pairs, separated by space or comma. Leave blank to skip.</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; </Text>
            <TextInput
              value={state.env}
              onChange={(value) => setState((prev) => ({ ...prev, env: value }))}
              onSubmit={handleEnvSubmit}
            />
          </Box>
        </Box>
      )}

      {/* URL step (remote) */}
      {state.step === "url" && (
        <Box flexDirection="column" paddingY={1}>
          <Text>Server URL:</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; </Text>
            <TextInput
              value={state.url}
              onChange={(value) => setState((prev) => ({ ...prev, url: value }))}
              onSubmit={handleUrlSubmit}
            />
          </Box>
        </Box>
      )}

      {/* Token step (remote) */}
      {state.step === "token" && (
        <Box flexDirection="column" paddingY={1}>
          <Text>Bearer token (optional):</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; </Text>
            <TextInput
              value={state.token}
              onChange={(value) => setState((prev) => ({ ...prev, token: value }))}
              onSubmit={handleTokenSubmit}
            />
          </Box>
        </Box>
      )}

      {/* Testing step */}
      {state.step === "testing" && (
        <Box flexDirection="column" paddingY={1}>
          <Box>
            <Text color="green">✓</Text>
            <Text> Server '{state.name}' added!</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
            <Text> Testing {state.name}...</Text>
          </Box>
        </Box>
      )}

      {/* Authenticating step */}
      {state.step === "authenticating" && (
        <Box flexDirection="column" paddingY={1}>
          <Box>
            <Text color="green">✓</Text>
            <Text> Server '{state.name}' added!</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="yellow">○</Text>
            <Text> Server requires authentication</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
            <Text> Opening browser for authentication...</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Complete the authentication in your browser</Text>
          </Box>
        </Box>
      )}

      {/* Done step */}
      {state.step === "done" && (
        <Box flexDirection="column" paddingY={1}>
          <Box>
            <Text color="green">✓</Text>
            <Text> Server '{state.name}' added!</Text>
          </Box>

          {state.testResult && (
            <Box flexDirection="column" marginTop={1}>
              {state.testResult.success ? (
                <Box>
                  <Text color="green">✓ OK</Text>
                  <Text> ({state.testResult.toolCount} tools)</Text>
                </Box>
              ) : (
                <Box>
                  <Text color="red">✗ FAILED</Text>
                  <Text> - {state.testResult.error}</Text>
                </Box>
              )}
              <Box marginTop={1}>
                <Text dimColor>Press any key to continue...</Text>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Error message */}
      {state.error && (
        <Box marginTop={1}>
          <Text color="red">Error: {state.error}</Text>
        </Box>
      )}
    </ScreenLayout>
  );
}

export default AddServerScreen;
