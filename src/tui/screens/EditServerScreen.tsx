/**
 * EditServerScreen - Lightweight editor for existing MCP servers.
 * Supports both local (stdio) and remote servers with token redaction.
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { ScreenLayout } from "../components/index.js";
import { getConfigService } from "../../services/config.service.js";
import { getDaemonService } from "../../services/daemon.service.js";
import type { LocalServer, RemoteServer, TransportType } from "../../types/index.js";
import { REDACTED_PLACEHOLDER } from "../../shared/redaction.js";
import {
  createServerFormFields,
  prepareLocalServerUpdates,
  prepareRemoteServerUpdates,
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
  | "authServer";

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

  const initialForm = useMemo(
    () =>
      createServerFormFields({
        name: server.name,
        serverId: server.id,
        serverType: type === "local" ? "stdio" : (server as RemoteServer).type,
        command: type === "local" ? (server as LocalServer).command : "",
        args: type === "local" ? (server as LocalServer).args.join(" ") : "",
        env:
          type === "local" && (server as LocalServer).env
            ? Object.entries((server as LocalServer).env!)
                .map(([k, v]) => `${k}=${v}`)
                .join(" ")
            : "",
        url: type === "remote" ? (server as RemoteServer).url : "",
        token:
          type === "remote" && (server as RemoteServer).bearerToken
            ? REDACTED_PLACEHOLDER
            : "",
        oauthEnabled: type === "remote" ? Boolean((server as RemoteServer).oauth?.enabled) : false,
        clientId: type === "remote" ? (server as RemoteServer).oauth?.clientId || "" : "",
        clientSecret: type === "remote" ? (server as RemoteServer).oauth?.clientSecret || "" : "",
        scopes:
          type === "remote" && (server as RemoteServer).oauth?.scopes
            ? (server as RemoteServer).oauth!.scopes!.join(" ")
            : "",
        authServerUrl: type === "remote" ? (server as RemoteServer).oauth?.authServerUrl || "" : "",
      }),
    [server, type]
  );

  const [form, setForm] = useState(initialForm);
  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);
  const [step, setStep] = useState<Step>("name");
  const [error, setError] = useState<string | null>(null);

  const refreshDaemonIfRunning = useCallback(() => {
    if (daemonService.isDaemonRunning().running) {
      daemonService.refreshDaemon().catch(() => {
        // Swallow to avoid breaking the editor.
      });
    }
  }, [daemonService]);

  const updateForm = useCallback((changes: Partial<ServerFormFields>) => {
    setForm((prev) => ({ ...prev, ...changes }));
  }, []);

  const saveLocalServer = useCallback(() => {
    const prepared = prepareLocalServerUpdates(form);
    if (!prepared.success || !prepared.data) {
      setError(prepared.error || "Failed to update server");
      return;
    }

    const result = configService.updateLocalServer(server.id, prepared.data);
    if (!result.success) {
      setError(result.error || "Failed to update server");
      return;
    }

    refreshDaemonIfRunning();
    onSaved({ ...(server as LocalServer), ...prepared.data });
  }, [configService, form, onSaved, refreshDaemonIfRunning, server]);

  const saveRemoteServer = useCallback(() => {
    const prepared = prepareRemoteServerUpdates(form);
    if (!prepared.success || !prepared.data) {
      setError(prepared.error || "Failed to update server");
      return;
    }

    const result = configService.updateRemoteServer(server.id, prepared.data);
    if (!result.success) {
      setError(result.error || "Failed to update server");
      return;
    }

    refreshDaemonIfRunning();
    onSaved({ ...(server as RemoteServer), ...prepared.data });
  }, [configService, form, onSaved, refreshDaemonIfRunning, server]);

  const handleSubmit = useCallback(() => {
    if (type === "local") {
      saveLocalServer();
    } else {
      saveRemoteServer();
    }
  }, [saveLocalServer, saveRemoteServer, type]);

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
      } else if (step === "oauthToggle") {
        setStep("token");
      } else if (step === "clientId") {
        setStep("oauthToggle");
      } else if (step === "clientSecret") {
        setStep("clientId");
      } else if (step === "scopes") {
        setStep("clientSecret");
      } else if (step === "authServer") {
        setStep("scopes");
      }
    }
  });

  return (
    <ScreenLayout
      title="Edit MCP Server"
      subtitle={`Editing '${server.name}' (${type === "local" ? "stdio" : (server as RemoteServer).type})`}
      shortcuts={[{ key: "ESC", label: "Back" }]}
      footer={
        type === "remote" ? (
          <Text dimColor>
            Tokens are masked. Leave '{REDACTED_PLACEHOLDER}' to keep the existing token or clear the
            field to remove it.
          </Text>
        ) : undefined
      }
    >
      <Box flexDirection="column" gap={1}>
        {step === "name" && (
          <>
            <Text color="green">Server name</Text>
            <TextInput
              value={form.name}
              onChange={(value) => updateForm({ name: value })}
              onSubmit={() => setStep(type === "local" ? "command" : "type")}
            />
          </>
        )}

        {type === "local" && step === "command" && (
          <>
            <Text color="green">Command</Text>
            <TextInput
              value={form.command}
              onChange={(value) => updateForm({ command: value })}
              onSubmit={() => setStep("args")}
            />
          </>
        )}

        {type === "local" && step === "args" && (
          <>
            <Text color="green">Arguments</Text>
            <TextInput
              value={form.args}
              onChange={(value) => updateForm({ args: value })}
              onSubmit={() => setStep("env")}
            />
          </>
        )}

        {type === "local" && step === "env" && (
          <>
            <Text color="green">Environment variables</Text>
            <Text dimColor>Format: KEY=VALUE pairs, separated by space or comma. Leave blank to clear.</Text>
            <TextInput value={form.env} onChange={(value) => updateForm({ env: value })} onSubmit={handleSubmit} />
          </>
        )}

        {type === "remote" && step === "type" && (
          <>
            <Text color="green">Transport</Text>
            <SelectInput
              items={REMOTE_TYPE_OPTIONS}
              initialIndex={REMOTE_TYPE_OPTIONS.findIndex(
                (opt) => opt.value === form.serverType
              )}
              onSelect={(item) => {
                updateForm({ serverType: item.value as TransportType });
                setStep("url");
              }}
            />
          </>
        )}

        {type === "remote" && step === "url" && (
          <>
            <Text color="green">URL</Text>
            <TextInput
              value={form.url}
              onChange={(value) => updateForm({ url: value })}
              onSubmit={() => setStep("token")}
            />
          </>
        )}

        {type === "remote" && step === "token" && (
          <>
            <Text color="green">Bearer token (optional)</Text>
            <TextInput
              value={form.token}
              onChange={(value) => updateForm({ token: value })}
              onSubmit={() => setStep("oauthToggle")}
            />
          </>
        )}

        {type === "remote" && step === "oauthToggle" && (
          <>
            <Text color="green">Enable OAuth? (y/N)</Text>
            <TextInput
              value={form.oauthEnabled ? "y" : ""}
              onChange={(value) => updateForm({ oauthEnabled: value.trim().toLowerCase().startsWith("y") })}
              onSubmit={(value) => {
                const enable = value.trim().toLowerCase().startsWith("y");
                updateForm({ oauthEnabled: enable });
                setStep(enable ? "clientId" : "name");
                if (!enable) {
                  saveRemoteServer();
                }
              }}
            />
          </>
        )}

        {type === "remote" && step === "clientId" && (
          <>
            <Text color="green">OAuth Client ID (optional)</Text>
            <TextInput
              value={form.clientId}
              onChange={(value) => updateForm({ clientId: value })}
              onSubmit={() => setStep("clientSecret")}
            />
          </>
        )}

        {type === "remote" && step === "clientSecret" && (
          <>
            <Text color="green">OAuth Client Secret (optional)</Text>
            <TextInput
              value={form.clientSecret}
              onChange={(value) => updateForm({ clientSecret: value })}
              onSubmit={() => setStep("scopes")}
            />
          </>
        )}

        {type === "remote" && step === "scopes" && (
          <>
            <Text color="green">OAuth Scopes (comma or space separated, optional)</Text>
            <TextInput
              value={form.scopes}
              onChange={(value) => updateForm({ scopes: value })}
              onSubmit={() => setStep("authServer")}
            />
          </>
        )}

        {type === "remote" && step === "authServer" && (
          <>
            <Text color="green">Auth Server URL (optional)</Text>
            <TextInput
              value={form.authServerUrl}
              onChange={(value) => updateForm({ authServerUrl: value })}
              onSubmit={handleSubmit}
            />
          </>
        )}

        {error && (
          <Text color="red">
            ✗ {error}
          </Text>
        )}

        <Text dimColor>ENTER to continue • ESC to go back</Text>
      </Box>
    </ScreenLayout>
  );
}

export default EditServerScreen;
