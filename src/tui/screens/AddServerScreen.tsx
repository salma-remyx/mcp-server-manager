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
import { useTheme } from "../theme/index.js";
import {
  createServerFormFields,
  prepareLocalServer,
  prepareRemoteServer,
  ServerFormFields,
} from "./server-form.js";

type Step =
  | "name"
  | "type"
  | "command"
  | "args"
  | "env"
  | "url"
  | "token"
  | "oauthToggle"
  | "clientId"
  | "clientSecret"
  | "scopes"
  | "authServer"
  | "testing"
  | "authenticating"
  | "done";

interface AddServerScreenProps {
  onBack: () => void;
}

const SERVER_TYPE_OPTIONS = [
  { label: "Local (STDIO) - Run MCP servers locally", value: "stdio" },
  { label: "Remote (HTTP) - Connect to hosted servers", value: "http" },
  { label: "Remote (SSE) - Real-time streaming", value: "sse" },
];

export function AddServerScreen({ onBack }: AddServerScreenProps): React.ReactElement {
  const { theme } = useTheme();
  useApp(); // keep the Ink app alive

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

  const [form, setForm] = useState<ServerFormFields>(() => createServerFormFields());
  const [step, setStep] = useState<Step>("name");
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; toolCount?: number; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const updateForm = useCallback((changes: Partial<ServerFormFields>) => {
    setForm((prev) => ({ ...prev, ...changes }));
  }, []);

  useInput((_input, key) => {
    if (key.escape) {
      if (step === "name") {
        onBack();
        return;
      }

      switch (step) {
        case "type":
          setStep("name");
          break;
        case "command":
          setStep("type");
          break;
        case "args":
          setStep("command");
          break;
        case "env":
          setStep("args");
          break;
        case "url":
          setStep("type");
          break;
        case "token":
          setStep("url");
          break;
        case "oauthToggle":
          setStep("token");
          break;
        case "clientId":
          setStep("oauthToggle");
          break;
        case "clientSecret":
          setStep("clientId");
          break;
        case "scopes":
          setStep("clientSecret");
          break;
        case "authServer":
          setStep("scopes");
          break;
        case "done":
          if (!isTesting) {
            onBack();
          }
          break;
      }
      return;
    }

    if (step === "done" && testResult && !isTesting) {
      onBack();
    }
  });

  const saveLocalServer = useCallback(
    async (fields: ServerFormFields) => {
      const serverId = fields.serverId || configService.generateServerId(fields.name);
      const prepared = prepareLocalServer(fields, serverId);
      if (!prepared.success || !prepared.data) {
        setError(prepared.error || "Failed to add server");
        return;
      }

      const result = configService.addLocalServer(prepared.data);
      if (!result.success) {
        setError(result.error || "Failed to add server");
        return;
      }

      setStep("testing");
      setTestResult(null);
      setIsTesting(true);

      try {
        const test = await testingService.testLocalServer(prepared.data);
        setTestResult(test);
      } catch (err) {
        setTestResult({
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsTesting(false);
        setStep("done");
        refreshDaemonIfRunning();
      }
    },
    [configService, refreshDaemonIfRunning, testingService]
  );

  const finalizeRemoteServer = useCallback(
    async (fields: ServerFormFields) => {
      const serverId = fields.serverId || configService.generateServerId(fields.name);
      const prepared = prepareRemoteServer(fields, serverId);
      if (!prepared.success || !prepared.data) {
        setError(prepared.error || "Failed to add server");
        return;
      }

      const result = configService.addRemoteServer(prepared.data);
      if (!result.success) {
        setError(result.error || "Failed to add server");
        return;
      }

      setStep("testing");
      setTestResult(null);
      setIsTesting(true);

      try {
        const test = await testingService.testRemoteServer(prepared.data, true);
        if (test.requiresAuth) {
          setStep("authenticating");
          await configService.updateRemoteServer(prepared.data.id, { oauth: { enabled: true } });
          const updatedServer = { ...prepared.data, oauth: { enabled: true } };
          const authService = getAuthService();
          const flow = await authService.startOAuthFlow(updatedServer, test.authRequirements);

          if (flow) {
            try {
              await open(flow.authUrl);
            } catch {
              // Ignore browser open errors
            }
            const authResult = await authService.waitForAuth(flow.state);
            authService.stopCallbackServer();

            if (authResult.success) {
              const retest = await testingService.testRemoteServer(updatedServer);
              setTestResult(retest);
            } else {
              setTestResult({
                success: false,
                error: authResult.error || "Authentication failed",
              });
            }
          } else {
            setTestResult({ success: false, error: "Could not start OAuth flow" });
          }
        } else {
          setTestResult(test);
        }
      } catch (err) {
        setTestResult({
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsTesting(false);
        setStep("done");
        refreshDaemonIfRunning();
      }
    },
    [configService, refreshDaemonIfRunning, testingService]
  );

  const handleNameSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setError("Name is required");
        return;
      }
      const lower = trimmed.toLowerCase();
      const exists = [...configService.getLocalServers(), ...configService.getRemoteServers()].some(
        (server) => server.name.toLowerCase() === lower
      );
      if (exists) {
        setError(`Server '${trimmed}' already exists`);
        return;
      }

      const serverId = configService.generateServerId(trimmed);
      updateForm({ name: trimmed, serverId });
      setError(null);
      setStep("type");
    },
    [configService, updateForm]
  );

  const handleTypeSelect = useCallback(
    (item: { value: string }) => {
      const serverType = item.value as ServerFormFields["serverType"];
      updateForm({ serverType });
      setError(null);
      setStep(serverType === "stdio" ? "command" : "url");
    },
    [updateForm]
  );

  const handleCommandSubmit = useCallback(
    (value: string) => {
      updateForm({ command: value.trim() });
      setError(null);
      setStep("args");
    },
    [updateForm]
  );

  const handleArgsSubmit = useCallback(
    (value: string) => {
      updateForm({ args: value.trim() });
      setError(null);
      setStep("env");
    },
    [updateForm]
  );

  const handleEnvSubmit = useCallback(
    (value: string) => {
      setForm((prev) => {
        const next = { ...prev, env: value.trim() };
        void saveLocalServer(next);
        return next;
      });
      setError(null);
    },
    [saveLocalServer]
  );

  const handleUrlSubmit = useCallback(
    (value: string) => {
      updateForm({ url: value.trim() });
      setError(null);
      setStep("token");
    },
    [updateForm]
  );

  const handleTokenSubmit = useCallback(
    (value: string) => {
      updateForm({ token: value.trim() });
      setError(null);
      setStep("oauthToggle");
    },
    [updateForm]
  );

  const handleOauthToggle = useCallback(
    (input: string) => {
      const answer = input.trim().toLowerCase();
      const enable = answer === "y" || answer === "yes";
      setForm((prev) => {
        const next = { ...prev, oauthEnabled: enable };
        if (!enable) {
          void finalizeRemoteServer(next);
        }
        return next;
      });
      setError(null);
      setStep(enable ? "clientId" : "testing");
    },
    [finalizeRemoteServer]
  );

  const handleClientIdSubmit = useCallback(
    (value: string) => {
      updateForm({ clientId: value.trim() });
      setError(null);
      setStep("clientSecret");
    },
    [updateForm]
  );

  const handleClientSecretSubmit = useCallback(
    (value: string) => {
      updateForm({ clientSecret: value.trim() });
      setError(null);
      setStep("scopes");
    },
    [updateForm]
  );

  const handleScopesSubmit = useCallback(
    (value: string) => {
      updateForm({ scopes: value.trim() });
      setError(null);
      setStep("authServer");
    },
    [updateForm]
  );

  const handleAuthServerSubmit = useCallback(
    (value: string) => {
      setForm((prev) => {
        const next = { ...prev, authServerUrl: value.trim() };
        void finalizeRemoteServer(next);
        return next;
      });
      setError(null);
    },
    [finalizeRemoteServer]
  );

  // Build summary of completed fields for context
  const completedFields: Array<{ label: string; value: string }> = [];
  if (form.name && step !== "name") completedFields.push({ label: "Name", value: form.name });
  if (form.serverType && step !== "type") completedFields.push({ label: "Type", value: form.serverType });
  if (form.serverType === "stdio") {
    if (form.command && !["name", "type", "command"].includes(step)) completedFields.push({ label: "Command", value: form.command });
    if (form.args && !["name", "type", "command", "args"].includes(step)) completedFields.push({ label: "Args", value: form.args });
  } else if (form.serverType) {
    if (form.url && !["name", "type", "url"].includes(step)) completedFields.push({ label: "URL", value: form.url });
  }

  // Step number for local: name(1) type(2) command(3) args(4) env(5) → 5 steps
  // Step number for remote: name(1) type(2) url(3) token(4) oauth(5) [clientId(6) clientSecret(7) scopes(8) authServer(9)] → 5-9 steps
  const stepLabels: Record<Step, string> = {
    name: "Server Name",
    type: "Server Type",
    command: "Command",
    args: "Arguments",
    env: "Environment",
    url: "Server URL",
    token: "Bearer Token",
    oauthToggle: "OAuth",
    clientId: "OAuth Client ID",
    clientSecret: "OAuth Secret",
    scopes: "OAuth Scopes",
    authServer: "Auth Server",
    testing: "Testing",
    authenticating: "Authenticating",
    done: "Done",
  };

  const localSteps: Step[] = ["name", "type", "command", "args", "env"];
  const remoteSteps: Step[] = ["name", "type", "url", "token", "oauthToggle"];
  const remoteOauthSteps: Step[] = ["name", "type", "url", "token", "oauthToggle", "clientId", "clientSecret", "scopes", "authServer"];
  const currentSteps = form.serverType === "stdio" ? localSteps
    : form.oauthEnabled ? remoteOauthSteps
    : form.serverType ? remoteSteps
    : localSteps;
  const currentStepIdx = currentSteps.indexOf(step);
  const isFormStep = currentStepIdx >= 0;
  const stepProgress = isFormStep ? `Step ${currentStepIdx + 1}/${currentSteps.length}` : "";

  const titleLabel = isFormStep ? `Add Server — ${stepLabels[step]}` : `Add Server — ${stepLabels[step]}`;

  return (
    <ScreenLayout title={titleLabel} shortcuts={[{ key: "ESC", label: "Go back" }]}>
      {/* Step progress indicator */}
      {isFormStep && (
        <Box marginBottom={1} gap={1}>
          <Text dimColor>{stepProgress}</Text>
          <Text dimColor>
            {currentSteps.map((_s, i) => i <= currentStepIdx ? "●" : "○").join(" ")}
          </Text>
        </Box>
      )}

      {/* Summary of previous answers */}
      {completedFields.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {completedFields.map((field) => (
            <Box key={field.label} gap={1}>
              <Text dimColor>{field.label}:</Text>
              <Text color={theme.colors.success}>{field.value}</Text>
            </Box>
          ))}
        </Box>
      )}

      {step === "name" && (
        <Box flexDirection="column">
          <Text bold>Server name:</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.name}
              onChange={(value) => updateForm({ name: value })}
              onSubmit={handleNameSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "type" && (
        <Box flexDirection="column">
          <Text bold>Server type:</Text>
          <Box marginTop={1}>
            <SelectInput items={SERVER_TYPE_OPTIONS} onSelect={handleTypeSelect} />
          </Box>
        </Box>
      )}

      {step === "command" && (
        <Box flexDirection="column">
          <Text bold>Command executable:</Text>
          <Text dimColor>Examples: npx, node, python, uvx</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.command}
              onChange={(value) => updateForm({ command: value })}
              onSubmit={handleCommandSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "args" && (
        <Box flexDirection="column">
          <Text bold>Arguments (space separated, optional):</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.args}
              onChange={(value) => updateForm({ args: value })}
              onSubmit={handleArgsSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "env" && (
        <Box flexDirection="column">
          <Text bold>Environment variables (optional):</Text>
          <Text dimColor>
            Format: KEY=VALUE pairs, separated by space or comma. Leave blank to skip.
          </Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.env}
              onChange={(value) => updateForm({ env: value })}
              onSubmit={handleEnvSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "url" && (
        <Box flexDirection="column">
          <Text bold>Server URL:</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.url}
              onChange={(value) => updateForm({ url: value })}
              onSubmit={handleUrlSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "token" && (
        <Box flexDirection="column">
          <Text bold>Bearer token (optional):</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.token}
              onChange={(value) => updateForm({ token: value })}
              onSubmit={handleTokenSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "oauthToggle" && (
        <Box flexDirection="column">
          <Text bold>Enable OAuth? (y/N)</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.oauthEnabled ? "y" : ""}
              onChange={(value) =>
                updateForm({ oauthEnabled: value.trim().toLowerCase().startsWith("y") })
              }
              onSubmit={handleOauthToggle}
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Leave blank for 'N'</Text>
          </Box>
        </Box>
      )}

      {step === "clientId" && (
        <Box flexDirection="column">
          <Text bold>OAuth Client ID (optional):</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.clientId}
              onChange={(value) => updateForm({ clientId: value })}
              onSubmit={handleClientIdSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "clientSecret" && (
        <Box flexDirection="column">
          <Text bold>OAuth Client Secret (optional):</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.clientSecret}
              onChange={(value) => updateForm({ clientSecret: value })}
              onSubmit={handleClientSecretSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "scopes" && (
        <Box flexDirection="column">
          <Text bold>OAuth Scopes (comma or space separated, optional):</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.scopes}
              onChange={(value) => updateForm({ scopes: value })}
              onSubmit={handleScopesSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "authServer" && (
        <Box flexDirection="column">
          <Text bold>Auth Server URL (optional, overrides discovery):</Text>
          <Box marginTop={1}>
            <Text color={theme.colors.inputPrompt}>&gt; </Text>
            <TextInput
              value={form.authServerUrl}
              onChange={(value) => updateForm({ authServerUrl: value })}
              onSubmit={handleAuthServerSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "testing" && (
        <Box flexDirection="column" paddingY={1}>
          <Box>
            <Text color={theme.colors.success}>✓</Text>
            <Text> Server '{form.name}' added!</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.primary}>
              <Spinner type="dots" />
            </Text>
            <Text> Testing {form.name}...</Text>
          </Box>
        </Box>
      )}

      {step === "authenticating" && (
        <Box flexDirection="column" paddingY={1}>
          <Box>
            <Text color={theme.colors.success}>✓</Text>
            <Text> Server '{form.name}' added!</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.warning}>○</Text>
            <Text> Server requires authentication</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.colors.primary}>
              <Spinner type="dots" />
            </Text>
            <Text> Opening browser for authentication...</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Complete the authentication in your browser</Text>
          </Box>
        </Box>
      )}

      {step === "done" && (
        <Box flexDirection="column" paddingY={1}>
          <Box>
            <Text color={theme.colors.success}>✓</Text>
            <Text> Server '{form.name}' added!</Text>
          </Box>
          {testResult && (
            <Box flexDirection="column" marginTop={1}>
              {testResult.success ? (
                <Box>
                  <Text color={theme.colors.success}>✓ OK</Text>
                  <Text> ({testResult.toolCount} tools)</Text>
                </Box>
              ) : (
                <Box>
                  <Text color={theme.colors.error}>✗ FAILED</Text>
                  <Text> - {testResult.error}</Text>
                </Box>
              )}
              <Box marginTop={1}>
                <Text dimColor>Press any key to continue...</Text>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color={theme.colors.error}>Error: {error}</Text>
        </Box>
      )}
    </ScreenLayout>
  );
}

export default AddServerScreen;
