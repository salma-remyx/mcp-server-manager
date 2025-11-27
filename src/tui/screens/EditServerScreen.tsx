/**
 * EditServerScreen - Lightweight editor for existing MCP servers.
 * Supports both local (stdio) and remote servers with token redaction.
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { ScreenLayout } from "../components/index.js";
import { getConfigService } from "../../services/config.service.js";
import { getDaemonService } from "../../services/daemon.service.js";
import type { LocalServer, RemoteServer, TransportType } from "../../types/index.js";
import { REDACTED_PLACEHOLDER } from "../../shared/redaction.js";
import { parseEnvInput, normalizeEnv } from "../../shared/env.js";

type Step = "name" | "type" | "command" | "args" | "env" | "url" | "token";

interface EditServerScreenProps {
  server: LocalServer | RemoteServer;
  type: "local" | "remote";
  onBack: () => void;
  onSaved: (server: LocalServer | RemoteServer) => void;
}

const REMOTE_TYPE_OPTIONS = [
  { label: "HTTP", value: "http" },
  { label: "SSE (streaming)", value: "sse" },
];

export function EditServerScreen({
  server,
  type,
  onBack,
  onSaved,
}: EditServerScreenProps): React.ReactElement {
  const configService = getConfigService();
  const daemonService = getDaemonService();

  const [step, setStep] = useState<Step>(type === "local" ? "name" : "name");
  const [name, setName] = useState(server.name);
  const [command, setCommand] = useState(type === "local" ? (server as LocalServer).command : "");
  const [args, setArgs] = useState(type === "local" ? (server as LocalServer).args.join(" ") : "");
  const [env, setEnv] = useState(
    type === "local" && (server as LocalServer).env
      ? Object.entries((server as LocalServer).env!)
          .map(([k, v]) => `${k}=${v}`)
          .join(" ")
      : ""
  );
  const [transport, setTransport] = useState<TransportType>(
    type === "remote" ? (server as RemoteServer).type : "http"
  );
  const [url, setUrl] = useState(type === "remote" ? (server as RemoteServer).url : "");
  const [token, setToken] = useState(
    type === "remote" && (server as RemoteServer).bearerToken ? REDACTED_PLACEHOLDER : ""
  );
  const [error, setError] = useState<string | null>(null);

  const refreshDaemonIfRunning = useCallback(() => {
    if (daemonService.isDaemonRunning().running) {
      daemonService.refreshDaemon().catch(() => {
        // TUI feedback not critical here; swallow errors to avoid breaking UX.
      });
    }
  }, [daemonService]);

  // Escape/back navigation between steps
  useInput((_input, key) => {
    if (!key.escape) return;

    if (step === "name") {
      onBack();
      return;
    }

    if (type === "local") {
      if (step === "command") {
        setStep("name");
      } else if (step === "args") {
        setStep("command");
      } else if (step === "env") {
        setStep("args");
      }
    } else {
      if (step === "type") {
        setStep("name");
      } else if (step === "url") {
        setStep("type");
      } else if (step === "token") {
        setStep("url");
      }
    }
  });

  const saveLocalServer = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedCommand = command.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }
    if (!trimmedCommand) {
      setError("Command is required");
      return;
    }

    const parsedEnv = parseEnvInput(env.trim());
    if (!parsedEnv.success) {
      setError(parsedEnv.error || "Invalid environment variable");
      return;
    }
    const normalizedEnv = normalizeEnv(parsedEnv.data);

    const updates: Partial<LocalServer> = {
      name: trimmedName,
      command: trimmedCommand,
      args: args.trim() ? args.trim().split(/\s+/).filter(Boolean) : [],
      env: normalizedEnv && Object.keys(normalizedEnv).length > 0 ? normalizedEnv : undefined,
    };

    const result = configService.updateLocalServer(server.id, updates);
    if (!result.success) {
      setError(result.error || "Failed to update server");
      return;
    }

    refreshDaemonIfRunning();
    onSaved({ ...(server as LocalServer), ...updates });
  }, [args, command, configService, env, name, onSaved, refreshDaemonIfRunning, server]);

  const saveRemoteServer = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }
    if (!trimmedUrl) {
      setError("URL is required");
      return;
    }

    const updates: Partial<RemoteServer> = {
      name: trimmedName,
      url: trimmedUrl,
      type: transport,
    };

    const trimmedToken = token.trim();
    if (trimmedToken && trimmedToken !== REDACTED_PLACEHOLDER) {
      updates.bearerToken = trimmedToken;
    } else if (!trimmedToken && (server as RemoteServer).bearerToken) {
      updates.bearerToken = undefined;
    }

    const result = configService.updateRemoteServer(server.id, updates);
    if (!result.success) {
      setError(result.error || "Failed to update server");
      return;
    }

    refreshDaemonIfRunning();
    onSaved({ ...(server as RemoteServer), ...updates });
  }, [configService, name, onSaved, refreshDaemonIfRunning, server, token, transport, url]);

  const handleSubmit = useCallback(() => {
    if (type === "local") {
      saveLocalServer();
    } else {
      saveRemoteServer();
    }
  }, [saveLocalServer, saveRemoteServer, type]);

  return (
    <ScreenLayout
      title="Edit MCP Server"
      subtitle={`Editing '${server.name}' (${type === "local" ? "stdio" : (server as RemoteServer).type})`}
      shortcuts={[{ key: "ESC", label: "Back" }]}
      footer={
        type === "remote" ? (
          <Text dimColor>
            Tokens are masked. Leave '{REDACTED_PLACEHOLDER}' to keep the existing token or clear the field to remove it.
          </Text>
        ) : undefined
      }
    >
      <Box flexDirection="column" gap={1}>
        {step === "name" && (
          <>
            <Text color="green">Server name</Text>
            <TextInput value={name} onChange={setName} onSubmit={() => setStep(type === "local" ? "command" : "type")} />
          </>
        )}

        {type === "local" && step === "command" && (
          <>
            <Text color="green">Command</Text>
            <TextInput
              value={command}
              onChange={setCommand}
              onSubmit={() => setStep("args")}
            />
          </>
        )}

        {type === "local" && step === "args" && (
          <>
            <Text color="green">Arguments</Text>
            <TextInput
              value={args}
              onChange={setArgs}
              onSubmit={() => setStep("env")}
            />
          </>
        )}

        {type === "local" && step === "env" && (
          <>
            <Text color="green">Environment variables</Text>
            <Text dimColor>Format: KEY=VALUE pairs, separated by space or comma. Leave blank to clear.</Text>
            <TextInput
              value={env}
              onChange={setEnv}
              onSubmit={handleSubmit}
            />
          </>
        )}

        {type === "remote" && step === "type" && (
          <>
            <Text color="green">Transport</Text>
            <SelectInput
              items={REMOTE_TYPE_OPTIONS}
              initialIndex={REMOTE_TYPE_OPTIONS.findIndex((opt) => opt.value === transport)}
              onSelect={(item) => {
                setTransport(item.value as TransportType);
                setStep("url");
              }}
            />
          </>
        )}

        {type === "remote" && step === "url" && (
          <>
            <Text color="green">URL</Text>
            <TextInput value={url} onChange={setUrl} onSubmit={() => setStep("token")} />
          </>
        )}

        {type === "remote" && step === "token" && (
          <>
            <Text color="green">Bearer token (optional)</Text>
            <TextInput value={token} onChange={setToken} onSubmit={handleSubmit} />
          </>
        )}

        {error && (
          <Text color="red">
            ✗ {error}
          </Text>
        )}

        <Text dimColor>
          ENTER to continue • ESC to go back
        </Text>
      </Box>
    </ScreenLayout>
  );
}

export default EditServerScreen;
