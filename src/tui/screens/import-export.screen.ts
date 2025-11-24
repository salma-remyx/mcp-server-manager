/**
 * Import/Export Screen - Import and export server configurations
 */

import { colors, clearScreen } from "../../shared/colors.js";
import { promptText, promptConfirm, promptSelect, waitForKey } from "../../shared/prompts.js";
import { getImportExportService } from "../../services/import-export.service.js";
import type { ExportFormat } from "../../services/import-export.service.js";
import { outputJson } from "../../shared/formatters.js";

/** Import/Export screen state */
interface ImportExportState {
  currentIndex: number;
  running: boolean;
}

const MENU_OPTIONS = [
  { id: "import-file", label: "Import from File", description: "Import servers from JSON file" },
  {
    id: "import-claude",
    label: "Import from Claude Desktop",
    description: "Import from Claude config",
  },
  { id: "import-cursor", label: "Import from Cursor", description: "Import from Cursor config" },
  {
    id: "import-windsurf",
    label: "Import from Windsurf",
    description: "Import from Windsurf config",
  },
  { id: "export-file", label: "Export to File", description: "Export servers to JSON file" },
  { id: "export-show", label: "Show Export", description: "Display export in terminal" },
];

/** Show import/export screen */
export async function showImportExportScreen(): Promise<void> {
  const state: ImportExportState = {
    currentIndex: 0,
    running: true,
  };

  while (state.running) {
    renderImportExportScreen(state);
    const key = await waitForKeypress();
    await handleImportExportKeypress(state, key);
  }
}

/** Render the import/export screen */
function renderImportExportScreen(state: ImportExportState): void {
  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  Import / Export${colors.reset}\n`);

  for (let i = 0; i < MENU_OPTIONS.length; i++) {
    const option = MENU_OPTIONS[i];
    const isCurrent = i === state.currentIndex;
    const cursor = isCurrent ? `${colors.cyan}→${colors.reset}` : " ";
    const label = isCurrent
      ? `${colors.bright}${colors.white}${option.label}${colors.reset}`
      : option.label;

    console.log(`  ${cursor} ${label}`);
    console.log(`      ${colors.gray}${option.description}${colors.reset}`);
  }

  console.log();
  console.log(`${colors.gray}  ↑/↓ Navigate  ENTER Select  Q Back${colors.reset}`);
}

/** Wait for a keypress */
async function waitForKeypress(): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (key: string): void => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      resolve(key);
    };

    stdin.on("data", onData);
  });
}

/** Handle keypress */
async function handleImportExportKeypress(state: ImportExportState, key: string): Promise<void> {
  // Quit
  if (key === "q" || key === "Q" || key === "\u001b") {
    state.running = false;
    return;
  }

  // Navigation
  if (key === "\u001b[A" || key === "k") {
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    return;
  }

  if (key === "\u001b[B" || key === "j") {
    state.currentIndex = Math.min(MENU_OPTIONS.length - 1, state.currentIndex + 1);
    return;
  }

  // Select
  if (key === "\r" || key === "\n") {
    const option = MENU_OPTIONS[state.currentIndex];
    await handleMenuOption(option.id);
  }
}

/** Handle menu option selection */
async function handleMenuOption(optionId: string): Promise<void> {
  const importExportService = getImportExportService();

  clearScreen();
  console.log();

  switch (optionId) {
    case "import-file": {
      const filePath = await promptText("Enter file path:");
      if (!filePath) {
        console.log(`  ${colors.yellow}Cancelled${colors.reset}`);
        break;
      }

      const result = importExportService.importFromFile(filePath);
      if (!result.success) {
        console.log(`  ${colors.red}✗${colors.reset} ${result.error}`);
        break;
      }

      const servers = result.servers || [];
      console.log(`  Found ${servers.length} server(s) (${result.format} format)`);

      if (servers.length > 0) {
        const overwrite = await promptConfirm("Overwrite existing servers with same ID?");
        const mergeResult = importExportService.mergeServers(servers, { overwrite });

        console.log(`\n  ${colors.green}Added: ${mergeResult.added}${colors.reset}`);
        console.log(`  ${colors.yellow}Updated: ${mergeResult.updated}${colors.reset}`);
        console.log(`  ${colors.gray}Skipped: ${mergeResult.skipped}${colors.reset}`);
      }
      break;
    }

    case "import-claude":
    case "import-cursor":
    case "import-windsurf": {
      const client = optionId.replace("import-", "");
      console.log(`  Importing from ${client}...`);

      const result = importExportService.importFromClient(client);
      if (!result.success) {
        console.log(`  ${colors.red}✗${colors.reset} ${result.error}`);
        break;
      }

      const servers = result.servers || [];
      console.log(`  Found ${servers.length} server(s)`);

      if (servers.length > 0) {
        const overwrite = await promptConfirm("Overwrite existing servers with same ID?");
        const mergeResult = importExportService.mergeServers(servers, { overwrite });

        console.log(`\n  ${colors.green}Added: ${mergeResult.added}${colors.reset}`);
        console.log(`  ${colors.yellow}Updated: ${mergeResult.updated}${colors.reset}`);
        console.log(`  ${colors.gray}Skipped: ${mergeResult.skipped}${colors.reset}`);
      }
      break;
    }

    case "export-file": {
      const format = await promptSelect<ExportFormat>("Select format:", [
        { value: "mcpsm", label: "MCPSM (native)" },
        { value: "claude", label: "Claude Desktop format" },
        { value: "cursor", label: "Cursor format" },
      ]);

      const filePath = await promptText("Enter output file path:");
      if (!filePath) {
        console.log(`  ${colors.yellow}Cancelled${colors.reset}`);
        break;
      }

      const result = importExportService.exportToFile(filePath, format ?? undefined);
      if (result.success) {
        console.log(`  ${colors.green}✓${colors.reset} Exported to ${filePath}`);
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${result.error}`);
      }
      break;
    }

    case "export-show": {
      const format = await promptSelect<ExportFormat>("Select format:", [
        { value: "mcpsm", label: "MCPSM (native)" },
        { value: "claude", label: "Claude Desktop format" },
        { value: "cursor", label: "Cursor format" },
      ]);

      console.log(`\n${colors.gray}--- Export (${format}) ---${colors.reset}\n`);
      const exported = importExportService.export(format ?? undefined);
      outputJson(exported);
      console.log(`\n${colors.gray}--- End Export ---${colors.reset}`);
      break;
    }
  }

  console.log(`\n${colors.gray}  Press any key to continue...${colors.reset}`);
  await waitForKey();
}
