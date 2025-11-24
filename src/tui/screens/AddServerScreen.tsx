/**
 * AddServerScreen - Interactive server addition (ink component)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { Header } from "../components/index.js";
import { getConfigService } from "../../services/config.service.js";
import { getTestingService } from "../../services/testing.service.js";
import type { LocalServer, RemoteServer, TransportType } from "../../types/index.js";

type Step = "name" | "type" | "command" | "args" | "url" | "token" | "testing" | "done";
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

  const [state, setState] = useState<FormState>({
    step: "name",
    name: "",
    serverId: "",
    serverType: null,
    command: "",
    args: "",
    url: "",
    token: "",
    testResult: null,
    error: null,
  });

  const [isTesting, setIsTesting] = useState(false);
  const [shouldTest, setShouldTest] = useState<boolean | null>(null);

  // Handle escape to go back
  useInput((input, key) => {
    if (key.escape) {
      if (state.step === "name") {
        onBack();
      } else if (state.step === "type") {
        setState((prev) => ({ ...prev, step: "name" }));
      } else if (state.step === "command") {
        setState((prev) => ({ ...prev, step: "type" }));
      } else if (state.step === "args") {
        setState((prev) => ({ ...prev, step: "command" }));
      } else if (state.step === "url") {
        setState((prev) => ({ ...prev, step: "type" }));
      } else if (state.step === "token") {
        setState((prev) => ({ ...prev, step: "url" }));
      } else if (state.step === "done" && !isTesting) {
        onBack();
      }
      return;
    }

    // Handle test confirmation
    if (state.step === "done" && shouldTest === null && !isTesting) {
      if (input === "y" || input === "Y") {
        setShouldTest(true);
        runTest();
      } else if (input === "n" || input === "N" || key.return) {
        onBack();
      }
    }

    // Any key after test result to go back
    if (state.step === "done" && state.testResult !== null && !isTesting) {
      onBack();
    }
  });

  // Run server test
  const runTest = useCallback(async () => {
    setIsTesting(true);
    try {
      let result: { success: boolean; toolCount?: number; error?: string };
      if (state.serverType === "stdio") {
        const server: LocalServer = {
          id: state.serverId,
          name: state.name,
          command: state.command,
          args: state.args ? state.args.split(/\s+/).filter(Boolean) : [],
        };
        result = await testingService.testLocalServer(server);
      } else {
        const server: RemoteServer = {
          id: state.serverId,
          name: state.name,
          type: state.serverType as TransportType,
          url: state.url,
          ...(state.token ? { bearerToken: state.token } : {}),
        };
        result = await testingService.testRemoteServer(server);
      }
      setState((prev) => ({ ...prev, testResult: result }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        testResult: { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      }));
    }
    setIsTesting(false);
  }, [state, testingService]);

  // Handle name submission
  const handleNameSubmit = useCallback(
    (value: string) => {
      if (!value.trim()) {
        setState((prev) => ({ ...prev, error: "Name is required" }));
        return;
      }
      const serverId = configService.generateServerId(value.trim());
      setState((prev) => ({
        ...prev,
        name: value.trim(),
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
  const handleArgsSubmit = useCallback(
    (value: string) => {
      const args = value.trim();
      setState((prev) => ({ ...prev, args }));

      // Save the server
      const server: LocalServer = {
        id: state.serverId,
        name: state.name,
        command: state.command,
        args: args ? args.split(/\s+/).filter(Boolean) : [],
      };

      const result = configService.addLocalServer(server);
      if (!result.success) {
        setState((prev) => ({ ...prev, error: result.error || "Failed to add server" }));
        return;
      }

      setState((prev) => ({ ...prev, step: "done", error: null }));
    },
    [state.serverId, state.name, state.command, configService]
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
    (value: string) => {
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

      setState((prev) => ({ ...prev, step: "done", error: null }));
    },
    [state.serverId, state.name, state.serverType, state.url, configService]
  );

  return (
    <Box flexDirection="column">
      <Header title="Add New MCP Server" />

      <Box flexDirection="column" paddingX={1} marginTop={1}>
        {/* Name step */}
        {state.step === "name" && (
          <Box flexDirection="column">
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
          <Box flexDirection="column">
            <Text>Server type:</Text>
            <Box marginTop={1}>
              <SelectInput items={SERVER_TYPE_OPTIONS} onSelect={handleTypeSelect} />
            </Box>
          </Box>
        )}

        {/* Command step (local) */}
        {state.step === "command" && (
          <Box flexDirection="column">
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
          <Box flexDirection="column">
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

        {/* URL step (remote) */}
        {state.step === "url" && (
          <Box flexDirection="column">
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
          <Box flexDirection="column">
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

        {/* Done step */}
        {state.step === "done" && (
          <Box flexDirection="column">
            <Box>
              <Text color="green">✓</Text>
              <Text> Server '{state.name}' added!</Text>
            </Box>

            {shouldTest === null && !state.testResult && (
              <Box marginTop={1}>
                <Text>Test this server now? [y/N] </Text>
              </Box>
            )}

            {isTesting && (
              <Box marginTop={1}>
                <Text color="cyan">
                  <Spinner type="dots" />
                </Text>
                <Text> Testing {state.name}...</Text>
              </Box>
            )}

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

            {shouldTest === false && !state.testResult && (
              <Box marginTop={1}>
                <Text dimColor>Press any key to continue...</Text>
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

        {/* Help */}
        {state.step !== "done" && (
          <Box marginTop={2}>
            <Text dimColor>ESC to go back</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default AddServerScreen;
