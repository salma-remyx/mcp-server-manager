/**
 * SettingsScreen - Manage application settings (ink component)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { ScreenLayout } from "../components/index.js";
import { createMenuSections } from "../utils/menu.js";
import { getSettingsService } from "../../services/settings.service.js";
import { getClientService } from "../../services/client.service.js";
import type { Settings, ClientId } from "../../types/index.js";

type View = "list" | "edit" | "confirmReset";

interface SettingsScreenProps {
  onBack: () => void;
}

interface SettingsState {
  settings: Settings;
  keys: (keyof Settings)[];
  currentIndex: number;
  view: View;
  editValue: string;
  message: string | null;
  messageType: "success" | "error" | "info";
}

export function SettingsScreen({ onBack }: SettingsScreenProps): React.ReactElement {
  const settingsService = getSettingsService();

  const [state, setState] = useState<SettingsState>({
    settings: settingsService.getAll(),
    keys: settingsService.getKeys(),
    currentIndex: 0,
    view: "list",
    editValue: "",
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

  // Handle edit setting
  const handleEditSetting = useCallback(
    (value: string) => {
      const key = state.keys[state.currentIndex];
      if (!key) {
        setState((prev) => ({ ...prev, view: "list", editValue: "" }));
        return;
      }

      if (value.trim()) {
        const result = settingsService.set(key, value.trim());
        if (result.success) {
          showMessage(`Setting '${key}' updated`, "success");

          // If port was changed, update all connected clients
          if (key === "port") {
            const clientService = getClientService();
            const detectedClients = clientService.detectClients();
            const connectedClients = detectedClients.filter((c) => c.status === "connected");

            // Reconnect all clients to update the port in their configs
            for (const client of connectedClients) {
              clientService.disconnectClient(client.id as ClientId);
              clientService.connectClient(client.id as ClientId);
            }

            if (connectedClients.length > 0) {
              showMessage(
                `Updated port for ${connectedClients.length} client${connectedClients.length === 1 ? "" : "s"}`,
                "success"
              );
            }
          }
        } else {
          showMessage(result.error || "Failed to update setting", "error");
        }
      }

      setState((prev) => ({
        ...prev,
        settings: settingsService.getAll(),
        view: "list",
        editValue: "",
      }));
    },
    [state.keys, state.currentIndex, settingsService, showMessage]
  );

  // Handle reset all
  const handleResetAll = useCallback(
    (confirm: boolean) => {
      if (confirm) {
        settingsService.reset();
        showMessage("Settings reset to defaults", "success");
        setState((prev) => ({
          ...prev,
          settings: settingsService.getAll(),
          view: "list",
        }));
      } else {
        setState((prev) => ({ ...prev, view: "list" }));
      }
    },
    [settingsService, showMessage]
  );

  // Handle keyboard input
  useInput((input, key) => {
    const { keys, currentIndex, view, settings } = state;

    // Handle confirm reset view
    if (view === "confirmReset") {
      if (input === "y" || input === "Y") {
        handleResetAll(true);
      } else if (input === "n" || input === "N" || key.escape) {
        handleResetAll(false);
      }
      return;
    }

    // Handle edit view
    if (view === "edit") {
      if (key.escape) {
        setState((prev) => ({ ...prev, view: "list", editValue: "" }));
      }
      return;
    }

    // List view
    // Quit
    if (input === "q" || key.escape) {
      onBack();
      return;
    }

    // Navigation - Up
    if (key.upArrow) {
      setState((prev) => ({
        ...prev,
        currentIndex: (currentIndex - 1 + keys.length) % keys.length,
      }));
      return;
    }

    // Navigation - Down
    if (key.downArrow) {
      setState((prev) => ({
        ...prev,
        currentIndex: (currentIndex + 1) % keys.length,
      }));
      return;
    }

    // Toggle boolean / Edit - Space or Enter
    if (input === " " || key.return) {
      const settingKey = keys[currentIndex];
      if (!settingKey) return;

      const currentValue = settings[settingKey];
      const info = settingsService.getInfo()[settingKey];

      if (typeof currentValue === "boolean") {
        // Toggle boolean
        settingsService.set(settingKey, !currentValue);
        setState((prev) => ({
          ...prev,
          settings: settingsService.getAll(),
        }));
      } else if (info?.options) {
        // Cycle through options
        const options = info.options;
        const currentIdx = options.indexOf(String(currentValue));
        const nextIdx = (currentIdx + 1) % options.length;
        settingsService.set(settingKey, options[nextIdx]);
        setState((prev) => ({
          ...prev,
          settings: settingsService.getAll(),
        }));
      } else {
        // Open edit view
        setState((prev) => ({
          ...prev,
          view: "edit",
          editValue: String(currentValue),
        }));
      }
      return;
    }

    // Reset all - R
    if (input.toLowerCase() === "r") {
      setState((prev) => ({ ...prev, view: "confirmReset" }));
      return;
    }
  });

  const { settings, keys, currentIndex, view, editValue, message, messageType } = state;
  const info = settingsService.getInfo();

  const settingsMenuSections = createMenuSections({
    actions: [
      { key: "Enter", label: "Edit" },
      { key: "Space", label: "Toggle" },
      { key: "R", label: "Reset all" },
    ],
    showData: false,
    showConfig: false,
    showSystem: false,
  });

  // Edit view
  if (view === "edit") {
    const settingKey = keys[currentIndex];
    return (
      <ScreenLayout title="Edit Setting" menuSections={settingsMenuSections}>
        <Box flexDirection="column" paddingY={1}>
          <Text>{settingKey}:</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; </Text>
            <TextInput
              value={editValue}
              onChange={(value) => setState((prev) => ({ ...prev, editValue: value }))}
              onSubmit={handleEditSetting}
            />
          </Box>
        </Box>

        <Box marginTop={2}>
          <Text dimColor>ENTER to save, ESC to cancel</Text>
        </Box>
      </ScreenLayout>
    );
  }

  // Confirm reset view
  if (view === "confirmReset") {
    return (
      <ScreenLayout title="Reset Settings" menuSections={settingsMenuSections}>
        <Box flexDirection="column" paddingY={1}>
          <Text color="yellow">Reset all settings to defaults?</Text>
          <Box marginTop={1}>
            <Text>Press Y to confirm, N to cancel</Text>
          </Box>
        </Box>
      </ScreenLayout>
    );
  }

  // List view
  return (
    <ScreenLayout title="Settings" menuSections={settingsMenuSections}>
      {message && (
        <Box marginBottom={1}>
          <Text color={messageType === "success" ? "green" : messageType === "error" ? "red" : "yellow"}>
            {messageType === "success" ? "✓" : messageType === "error" ? "✗" : "ℹ"} {message}
          </Text>
        </Box>
      )}

      {keys.map((settingKey, idx) => {
        const isCurrent = idx === currentIndex;
        const value = settings[settingKey];
        const settingInfo = info[settingKey];
        const isDefault = settingsService.isDefault(settingKey);

        let valueDisplay: React.ReactElement;
        if (typeof value === "boolean") {
          valueDisplay = <Text color={value ? "green" : "red"}>{value ? "true" : "false"}</Text>;
        } else {
          valueDisplay = <Text color="cyan">{String(value)}</Text>;
        }

        return (
          <Box key={settingKey} flexDirection="column" marginBottom={1}>
            <Box gap={1}>
              <Text color={isCurrent ? "magenta" : "green"}>{isCurrent ? "→" : " "}</Text>
              <Text color={isCurrent ? "magenta" : undefined} bold={isCurrent}>
                {settingKey}:
              </Text>
              {valueDisplay}
              {isDefault && <Text dimColor>(default)</Text>}
            </Box>
            {settingInfo?.description && (
              <Box marginLeft={4}>
                <Text dimColor>{settingInfo.description}</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </ScreenLayout>
  );
}

export default SettingsScreen;
