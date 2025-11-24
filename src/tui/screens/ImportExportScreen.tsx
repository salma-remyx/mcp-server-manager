/**
 * ImportExportScreen - Import and export server configurations (ink component)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { Header } from "../components/index.js";
import { getImportExportService } from "../../services/import-export.service.js";
import type { ExportFormat, ImportedServer } from "../../services/import-export.service.js";
import { getClientService } from "../../services/client.service.js";
import type { ClientId } from "../../types/index.js";

type View =
  | "menu"
  | "import-file-path"
  | "import-file-confirm"
  | "import-client-select"
  | "export-format"
  | "export-file-path"
  | "result";

interface MenuOption {
  id: string;
  label: string;
  description: string;
}

interface ImportExportScreenProps {
  onBack: () => void;
}

interface ImportExportState {
  currentIndex: number;
  view: View;
  menuOptions: MenuOption[];
  filePath: string;
  selectedFormat: ExportFormat | null;
  importedServers: ImportedServer[];
  importFormat: string | null;
  result: { success: boolean; message: string; details?: string[] } | null;
  overwrite: boolean;
}

/** Build menu options dynamically based on installed clients */
function buildMenuOptions(): MenuOption[] {
  const clientService = getClientService();
  const detected = clientService.detectClients();

  // Base options
  const options: MenuOption[] = [
    { id: "import-file", label: "Import from File", description: "Import servers from JSON file" },
  ];

  // Get installed clients that have configs
  const installedClients = detected.filter((c) => c.installed && c.hasConfig);

  if (installedClients.length > 0) {
    // Add individual client options
    for (const client of installedClients) {
      options.push({
        id: `import-${client.id}`,
        label: `Import from ${client.name}`,
        description: `Import ${client.serverCount} server(s) from ${client.name}`,
      });
    }
  }

  // Export options
  options.push(
    { id: "export-file", label: "Export to File", description: "Export servers to JSON file" },
    { id: "export-show", label: "Show Export", description: "Display export in terminal" }
  );

  return options;
}

const FORMAT_OPTIONS = [
  { label: "MCPSM (native)", value: "mcpsm" },
  { label: "Claude Desktop format", value: "claude" },
  { label: "Cursor format", value: "cursor" },
];

export function ImportExportScreen({ onBack }: ImportExportScreenProps): React.ReactElement {
  const importExportService = getImportExportService();

  const [state, setState] = useState<ImportExportState>({
    currentIndex: 0,
    view: "menu",
    menuOptions: buildMenuOptions(),
    filePath: "",
    selectedFormat: null,
    importedServers: [],
    importFormat: null,
    result: null,
    overwrite: false,
  });

  // Handle import from file
  const handleImportFile = useCallback(
    (path: string) => {
      if (!path.trim()) {
        setState((prev) => ({ ...prev, view: "menu", filePath: "" }));
        return;
      }

      const result = importExportService.importFromFile(path.trim());
      if (!result.success) {
        setState((prev) => ({
          ...prev,
          view: "result",
          result: { success: false, message: result.error || "Import failed" },
        }));
        return;
      }

      const servers = result.servers || [];
      if (servers.length === 0) {
        setState((prev) => ({
          ...prev,
          view: "result",
          result: { success: true, message: "No servers found in file" },
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        importedServers: servers,
        importFormat: result.format || "unknown",
        view: "import-file-confirm",
      }));
    },
    [importExportService]
  );

  // Handle import confirmation (with overwrite choice)
  const handleImportConfirm = useCallback(
    (overwrite: boolean) => {
      const mergeResult = importExportService.mergeServers(state.importedServers, { overwrite });

      setState((prev) => ({
        ...prev,
        view: "result",
        result: {
          success: true,
          message: "Import completed",
          details: [
            `Added: ${mergeResult.added}`,
            `Updated: ${mergeResult.updated}`,
            `Skipped: ${mergeResult.skipped}`,
          ],
        },
        menuOptions: buildMenuOptions(),
      }));
    },
    [state.importedServers, importExportService]
  );

  // Handle import from client
  const handleImportClient = useCallback(
    (clientId: string) => {
      const result = importExportService.importFromClient(clientId as ClientId);
      if (!result.success) {
        setState((prev) => ({
          ...prev,
          view: "result",
          result: { success: false, message: result.error || "Import failed" },
        }));
        return;
      }

      const servers = result.servers || [];
      if (servers.length === 0) {
        setState((prev) => ({
          ...prev,
          view: "result",
          result: { success: true, message: "No servers found in client config" },
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        importedServers: servers,
        importFormat: clientId,
        view: "import-file-confirm",
      }));
    },
    [importExportService]
  );

  // Handle export to file
  const handleExportFile = useCallback(
    (path: string) => {
      if (!path.trim() || !state.selectedFormat) {
        setState((prev) => ({ ...prev, view: "menu", filePath: "" }));
        return;
      }

      const result = importExportService.exportToFile(path.trim(), state.selectedFormat);
      setState((prev) => ({
        ...prev,
        view: "result",
        result: result.success
          ? { success: true, message: `Exported to ${path.trim()}` }
          : { success: false, message: result.error || "Export failed" },
      }));
    },
    [state.selectedFormat, importExportService]
  );

  // Helper to show export result
  const showExportResult = useCallback(
    (format: ExportFormat) => {
      const exported = importExportService.export(format);
      const jsonStr = JSON.stringify(exported, null, 2);

      setState((prev) => ({
        ...prev,
        view: "result",
        result: {
          success: true,
          message: `Export (${format})`,
          details: jsonStr.split("\n"),
        },
      }));
    },
    [importExportService]
  );

  // Handle format selection
  const handleFormatSelect = useCallback(
    (item: { value: string }) => {
      const format = item.value as ExportFormat;
      const currentOption = state.menuOptions[state.currentIndex];

      if (currentOption?.id === "export-file") {
        setState((prev) => ({
          ...prev,
          selectedFormat: format,
          view: "export-file-path",
          filePath: "",
        }));
      } else if (currentOption?.id === "export-show") {
        setState((prev) => ({ ...prev, selectedFormat: format }));
        // Call showExportResult after state update
        setTimeout(() => showExportResult(format), 0);
      }
    },
    [state.menuOptions, state.currentIndex, importExportService, showExportResult]
  );

  // Handle keyboard input
  useInput((input, key) => {
    const { view, currentIndex, menuOptions } = state;

    // Handle result view - any key goes back
    if (view === "result") {
      setState((prev) => ({
        ...prev,
        view: "menu",
        result: null,
        filePath: "",
        importedServers: [],
      }));
      return;
    }

    // Handle confirm import view
    if (view === "import-file-confirm") {
      if (input === "y" || input === "Y") {
        handleImportConfirm(true);
      } else if (input === "n" || input === "N") {
        handleImportConfirm(false);
      } else if (key.escape) {
        setState((prev) => ({
          ...prev,
          view: "menu",
          importedServers: [],
        }));
      }
      return;
    }

    // Handle text input views - ESC to cancel
    if (view === "import-file-path" || view === "export-file-path") {
      if (key.escape) {
        setState((prev) => ({ ...prev, view: "menu", filePath: "" }));
      }
      return;
    }

    // Handle format selection view - ESC to cancel
    if (view === "export-format") {
      if (key.escape) {
        setState((prev) => ({ ...prev, view: "menu" }));
      }
      return;
    }

    // Menu view
    if (view === "menu") {
      // Quit
      if (input === "q" || key.escape) {
        onBack();
        return;
      }

      // Navigation - Up
      if (key.upArrow) {
        setState((prev) => ({
          ...prev,
          currentIndex: Math.max(0, currentIndex - 1),
        }));
        return;
      }

      // Navigation - Down
      if (key.downArrow) {
        setState((prev) => ({
          ...prev,
          currentIndex: Math.min(menuOptions.length - 1, currentIndex + 1),
        }));
        return;
      }

      // Select - Enter
      if (key.return) {
        const option = menuOptions[currentIndex];
        if (!option) return;

        if (option.id === "import-file") {
          setState((prev) => ({ ...prev, view: "import-file-path", filePath: "" }));
        } else if (option.id.startsWith("import-")) {
          const clientId = option.id.replace("import-", "");
          handleImportClient(clientId);
        } else if (option.id === "export-file" || option.id === "export-show") {
          setState((prev) => ({ ...prev, view: "export-format" }));
        }
        return;
      }
    }
  });

  const { view, currentIndex, menuOptions, filePath, importedServers, importFormat, result } = state;

  // Result view
  if (view === "result" && result) {
    return (
      <Box flexDirection="column">
        <Header title="Import / Export" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Box gap={1}>
            <Text color={result.success ? "green" : "red"}>{result.success ? "✓" : "✗"}</Text>
            <Text>{result.message}</Text>
          </Box>

          {result.details && (
            <Box flexDirection="column" marginTop={1}>
              {result.details.map((line, idx) => (
                <Text key={idx} dimColor={!result.success || !line.startsWith("{")}>
                  {line}
                </Text>
              ))}
            </Box>
          )}
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  // Import file path view
  if (view === "import-file-path") {
    return (
      <Box flexDirection="column">
        <Header title="Import from File" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text>Enter file path:</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; </Text>
            <TextInput
              value={filePath}
              onChange={(value) => setState((prev) => ({ ...prev, filePath: value }))}
              onSubmit={handleImportFile}
            />
          </Box>
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>ENTER to import, ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Import confirm view
  if (view === "import-file-confirm") {
    return (
      <Box flexDirection="column">
        <Header title="Import Servers" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text>
            Found {importedServers.length} server(s)
            {importFormat ? ` (${importFormat} format)` : ""}
          </Text>

          <Box marginTop={1}>
            <Text>Overwrite existing servers with same ID? [y/N]</Text>
          </Box>
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>Y to overwrite, N to skip duplicates, ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Export format selection view
  if (view === "export-format") {
    return (
      <Box flexDirection="column">
        <Header title="Select Export Format" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text>Select format:</Text>
          <Box marginTop={1}>
            <SelectInput items={FORMAT_OPTIONS} onSelect={handleFormatSelect} />
          </Box>
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Export file path view
  if (view === "export-file-path") {
    return (
      <Box flexDirection="column">
        <Header title="Export to File" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text>Enter output file path:</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; </Text>
            <TextInput
              value={filePath}
              onChange={(value) => setState((prev) => ({ ...prev, filePath: value }))}
              onSubmit={handleExportFile}
            />
          </Box>
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>ENTER to export, ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Menu view
  return (
    <Box flexDirection="column">
      <Header title="Import / Export" />

      <Box flexDirection="column" paddingX={1} marginTop={1}>
        {menuOptions.map((option, idx) => {
          const isCurrent = idx === currentIndex;

          return (
            <Box key={option.id} flexDirection="column" marginBottom={1}>
              <Box gap={1}>
                <Text color="cyan">{isCurrent ? "→" : " "}</Text>
                <Text color={isCurrent ? "white" : undefined} bold={isCurrent}>
                  {option.label}
                </Text>
              </Box>
              <Box marginLeft={4}>
                <Text dimColor>{option.description}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text dimColor>↑/↓ Navigate ENTER Select Q Back</Text>
      </Box>
    </Box>
  );
}

export default ImportExportScreen;
