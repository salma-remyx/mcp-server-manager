/**
 * CLI commands for import/export operations
 */

import { Command } from "commander";
import path from "path";
import { colors } from "../../shared/colors.js";
import { outputJson } from "../../shared/formatters.js";
import { getImportExportService } from "../../services/import-export.service.js";
import type { ExportFormat } from "../../services/import-export.service.js";

/** Register import/export commands */
export function registerImportExportCommands(program: Command): void {
  // import command
  program
    .command("import [file]")
    .description("Import servers from file or client")
    .option("--from <client>", "Import from a client (claude, cursor, windsurf)")
    .option("--overwrite", "Overwrite existing servers")
    .option("--force", "Alias for --overwrite")
    .action(async (file: string | undefined, options) => {
      await handleImport(file, options);
    });

  // export command
  program
    .command("export")
    .description("Export server configuration")
    .option("-f, --format <format>", "Export format (mcpsm, claude, cursor)", "mcpsm")
    .option("-o, --output <file>", "Output file path")
    .action(async (options) => {
      await handleExport(options);
    });
}

/** Handle import command */
async function handleImport(
  file: string | undefined,
  options: { from?: string; overwrite?: boolean; force?: boolean }
): Promise<void> {
  const importExportService = getImportExportService();
  const overwrite = options.overwrite || options.force;

  let result;

  if (options.from) {
    // Import from client
    console.log(`Importing from ${options.from}...`);
    result = importExportService.importFromClient(options.from);
  } else if (file) {
    // Import from file
    const filePath = path.resolve(file);
    console.log(`Importing from ${filePath}...`);
    result = importExportService.importFromFile(filePath);
  } else {
    // Show usage
    console.log(`\n${colors.bright}${colors.cyan}Import Servers${colors.reset}\n`);
    console.log(`Usage:`);
    console.log(`  mcpsm import <file.json>           Import from JSON file`);
    console.log(`  mcpsm import --from claude         Import from Claude Desktop`);
    console.log(`  mcpsm import --from cursor         Import from Cursor`);
    console.log(`  mcpsm import --from windsurf       Import from Windsurf`);
    console.log(`\nOptions:`);
    console.log(`  --overwrite                        Overwrite existing servers`);

    // Show available sources
    const sources = importExportService.getAvailableSources();
    if (sources.length > 0) {
      console.log(`\n${colors.bright}Available sources:${colors.reset}`);
      for (const source of sources) {
        console.log(
          `  ${colors.green}${source.clients.join(", ")}${colors.reset} - ${source.description}`
        );
      }
    }
    return;
  }

  if (!result.success) {
    console.error(`${colors.red}Error: ${result.error}${colors.reset}`);
    process.exit(1);
  }

  const servers = result.servers || [];
  console.log(
    `${colors.green}✓${colors.reset} Found ${servers.length} server(s) (${result.format} format)`
  );

  if (servers.length === 0) {
    console.log(`${colors.yellow}No servers to import.${colors.reset}`);
    return;
  }

  // Show preview
  console.log(`\n${colors.bright}Servers to import:${colors.reset}`);
  for (const server of servers) {
    const type =
      server.serverType === "remote"
        ? `${colors.blue}remote${colors.reset}`
        : `${colors.green}local${colors.reset}`;
    console.log(`  - ${colors.cyan}${server.name || server.id}${colors.reset} (${type})`);
  }

  // Merge
  const mergeResult = importExportService.mergeServers(servers, { overwrite });

  console.log(`\n${colors.bright}Result:${colors.reset}`);
  if (mergeResult.added > 0) {
    console.log(`  ${colors.green}Added: ${mergeResult.added}${colors.reset}`);
  }
  if (mergeResult.updated > 0) {
    console.log(`  ${colors.yellow}Updated: ${mergeResult.updated}${colors.reset}`);
  }
  if (mergeResult.skipped > 0) {
    console.log(`  ${colors.gray}Skipped (already exist): ${mergeResult.skipped}${colors.reset}`);
  }
}

/** Handle export command */
async function handleExport(options: { format?: string; output?: string }): Promise<void> {
  const importExportService = getImportExportService();
  const format = (options.format || "mcpsm") as ExportFormat;

  if (options.output) {
    // Export to file
    const filePath = path.resolve(options.output);
    const result = importExportService.exportToFile(filePath, format);

    if (result.success) {
      console.log(`${colors.green}✓${colors.reset} Exported to ${filePath}`);
    } else {
      console.error(`${colors.red}Error: ${result.error}${colors.reset}`);
      process.exit(1);
    }
  } else {
    // Export to stdout
    const exported = importExportService.export(format);
    outputJson(exported);
  }
}

export default registerImportExportCommands;
