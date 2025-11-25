/**
 * ImportExportScreen - Import and export server configurations (ink component)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { Header, MenuPanel } from "../components/index.js";
import { createMenuSections } from "../utils/menu.js";
import { getImportExportService } from "../../services/import-export.service.js";
import type { ExportFormat } from "../../services/import-export.service.js";
import { getClientService } from "../../services/client.service.js";
import type { ClientId, ImportedServer, ServerConflict, ConflictResolution } from "../../types/index.js";

type View =
  | "menu"
  | "import-file-path"
  | "import-preview"
  | "import-conflicts"
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
  conflicts: ServerConflict[];
  conflictIndex: number;
  conflictDecisions: Map<string, ConflictResolution>;
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
    conflicts: [],
    conflictIndex: 0,
    conflictDecisions: new Map(),
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

      // Detect conflicts
      const conflictDetection = importExportService.detectConflicts(servers);

      setState((prev) => ({
        ...prev,
        importedServers: servers,
        importFormat: result.format || "unknown",
        conflicts: conflictDetection.conflicts,
        conflictIndex: 0,
        conflictDecisions: new Map(),
        view: conflictDetection.totalConflicts > 0 ? "import-conflicts" : "import-preview",
      }));
    },
    [importExportService]
  );

  // Finalize import with per-server decisions
  const finalizeImport = useCallback((): void => {
    const mergeResult = importExportService.mergeServersWithDecisions(
      state.importedServers,
      state.conflictDecisions
    );

    const details: string[] = [];
    if (mergeResult.added > 0) details.push(`Added: ${mergeResult.added}`);
    if (mergeResult.updated > 0) details.push(`Updated: ${mergeResult.updated}`);
    if (mergeResult.merged && mergeResult.merged > 0) details.push(`Merged: ${mergeResult.merged}`);
    if (mergeResult.skipped > 0) details.push(`Skipped: ${mergeResult.skipped}`);

    setState((prev) => ({
      ...prev,
      view: "result",
      result: {
        success: true,
        message: "Import completed",
        details,
      },
      menuOptions: buildMenuOptions(),
      conflicts: [],
      conflictIndex: 0,
      conflictDecisions: new Map(),
      importedServers: [],
    }));
  }, [state.importedServers, state.conflictDecisions, importExportService]);

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

      // Detect conflicts
      const conflictDetection = importExportService.detectConflicts(servers);

      setState((prev) => ({
        ...prev,
        importedServers: servers,
        importFormat: clientId,
        conflicts: conflictDetection.conflicts,
        conflictIndex: 0,
        conflictDecisions: new Map(),
        view: conflictDetection.totalConflicts > 0 ? "import-conflicts" : "import-preview",
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
        queueMicrotask(() => showExportResult(format));
      }
    },
    [state.menuOptions, state.currentIndex, importExportService, showExportResult]
  );

  // Handle keyboard input
  useInput((input, key) => {
    const { view, currentIndex, menuOptions, conflicts, conflictIndex, conflictDecisions } = state;

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

    // Handle conflict resolution view
    if (view === "import-conflicts") {
      if (conflicts.length === 0) return;

      const currentConflict = conflicts[conflictIndex];

      // Navigation
      if (key.upArrow) {
        setState((prev) => ({
          ...prev,
          conflictIndex: Math.max(0, conflictIndex - 1),
        }));
        return;
      }

      if (key.downArrow) {
        setState((prev) => ({
          ...prev,
          conflictIndex: Math.min(conflicts.length - 1, conflictIndex + 1),
        }));
        return;
      }

      // Resolution options
      if (input === "s" || input === "S") {
        // Skip
        const newDecisions = new Map(conflictDecisions);
        newDecisions.set(currentConflict.id, "skip");

        if (conflictIndex < conflicts.length - 1) {
          setState((prev) => ({
            ...prev,
            conflictIndex: conflictIndex + 1,
            conflictDecisions: newDecisions,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            conflictDecisions: newDecisions,
            view: "import-preview",
          }));
          queueMicrotask(() => finalizeImport());
        }
        return;
      }

      if (input === "o" || input === "O") {
        // Overwrite
        const newDecisions = new Map(conflictDecisions);
        newDecisions.set(currentConflict.id, "overwrite");

        if (conflictIndex < conflicts.length - 1) {
          setState((prev) => ({
            ...prev,
            conflictIndex: conflictIndex + 1,
            conflictDecisions: newDecisions,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            conflictDecisions: newDecisions,
            view: "import-preview",
          }));
          queueMicrotask(() => finalizeImport());
        }
        return;
      }

      if (input === "m" || input === "M") {
        // Merge
        const newDecisions = new Map(conflictDecisions);
        newDecisions.set(currentConflict.id, "merge");

        if (conflictIndex < conflicts.length - 1) {
          setState((prev) => ({
            ...prev,
            conflictIndex: conflictIndex + 1,
            conflictDecisions: newDecisions,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            conflictDecisions: newDecisions,
            view: "import-preview",
          }));
          queueMicrotask(() => finalizeImport());
        }
        return;
      }

      if (key.escape) {
        setState((prev) => ({
          ...prev,
          view: "menu",
          conflicts: [],
          conflictIndex: 0,
          conflictDecisions: new Map(),
          importedServers: [],
        }));
      }
      return;
    }

    // Handle import preview view
    if (view === "import-preview") {
      if (key.return || input === "y" || input === "Y") {
        finalizeImport();
      } else if (input === "n" || input === "N" || key.escape) {
        setState((prev) => ({
          ...prev,
          view: "menu",
          conflicts: [],
          conflictIndex: 0,
          conflictDecisions: new Map(),
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

  const {
    view,
    currentIndex,
    menuOptions,
    filePath,
    importedServers,
    importFormat,
    result,
    conflicts,
    conflictIndex,
    conflictDecisions,
  } = state;

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

  // Import conflicts view
  if (view === "import-conflicts" && conflicts.length > 0) {
    const currentConflict = conflicts[conflictIndex];
    const selectedDecision = conflictDecisions.get(currentConflict.id) || "?";

    return (
      <Box flexDirection="column">
        <Header title="Import - Resolve Conflicts" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text bold>
            Conflict {conflictIndex + 1}/{conflicts.length} - {currentConflict.name} ({currentConflict.type})
          </Text>

          {/* Side-by-side comparison */}
          <Box marginTop={1} gap={4}>
            <Box flexDirection="column" flexGrow={1}>
              <Text bold color="red">Existing</Text>
              <Text dimColor>{JSON.stringify(currentConflict.existing, null, 2)}</Text>
            </Box>

            <Box flexDirection="column" flexGrow={1}>
              <Text bold color="green">Incoming</Text>
              <Text dimColor>{JSON.stringify(currentConflict.incoming, null, 2)}</Text>
            </Box>
          </Box>

          {/* Differences summary */}
          {currentConflict.differences.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold color="yellow">Differences:</Text>
              {currentConflict.differences.map((diff, idx) => (
                <Text key={idx} dimColor>
                  • {diff.field}: {JSON.stringify(diff.existing)} → {JSON.stringify(diff.incoming)}
                </Text>
              ))}
            </Box>
          )}

          {/* Decision options */}
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Decision: {selectedDecision}</Text>
            <Text dimColor>S: Skip (keep existing)</Text>
            <Text dimColor>O: Overwrite (use incoming)</Text>
            <Text dimColor>M: Merge (combine fields)</Text>
          </Box>
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>↑/↓ to navigate, S/O/M to decide, ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Import preview view
  if (view === "import-preview") {
    return (
      <Box flexDirection="column">
        <Header title="Import Servers" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text>
            Found {importedServers.length} server(s)
            {importFormat ? ` (${importFormat} format)` : ""}
          </Text>

          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Servers to import:</Text>
            {importedServers.slice(0, 5).map((server, idx) => (
              <Text key={idx} dimColor>
                • {server.name} ({server.serverType})
              </Text>
            ))}
            {importedServers.length > 5 && (
              <Text dimColor>... and {importedServers.length - 5} more</Text>
            )}
          </Box>
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>ENTER or Y to confirm, N to cancel</Text>
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
  const importExportMenuSections = createMenuSections({
    actions: [{ key: "Enter", label: "Select" }],
    showConfig: false,
    showSystem: false,
  });

  return (
    <Box flexDirection="column">
      <Header title="Import / Export" />

      {/* Main content: Options + Menu side by side */}
      <Box marginTop={1} gap={2}>
        {/* Left panel: Menu options */}
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
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

        {/* Right panel: Menu */}
        <MenuPanel sections={importExportMenuSections} highlightedView="I" />
      </Box>
    </Box>
  );
}

export default ImportExportScreen;
