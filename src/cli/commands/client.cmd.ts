/**
 * Client commands - list, sync, enable, disable, open
 */

import { Command } from "commander";
import { colors, c } from "../../shared/colors.js";
import { outputJson } from "../../shared/formatters.js";
import { getClientService } from "../../services/client.service.js";
import type { ClientId } from "../../types/index.js";

/** Register client commands */
export function registerClientCommands(program: Command): void {
  const clients = program.command("clients").description("Manage MCP client sync");

  // List clients (default)
  clients
    .command("list", { isDefault: true })
    .description("List detected MCP clients")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      const clientService = getClientService();
      const detectedClients = clientService.detectClients();

      if (options.json) {
        outputJson(detectedClients);
        return;
      }

      console.log(`\n${colors.bright}${colors.cyan}MCP Clients${colors.reset}\n`);

      if (detectedClients.length === 0) {
        console.log(`${colors.gray}No clients detected.${colors.reset}`);
        return;
      }

      for (const client of detectedClients) {
        const statusIcon = client.installed
          ? client.synced
            ? `${colors.green}✔${colors.reset}`
            : `${colors.yellow}○${colors.reset}`
          : `${colors.gray}✗${colors.reset}`;

        const syncStatus = client.enabled
          ? `${colors.green}sync enabled${colors.reset}`
          : `${colors.gray}sync disabled${colors.reset}`;

        const installStatus = client.installed
          ? client.hasConfig
            ? `${colors.green}configured${colors.reset}`
            : `${colors.yellow}installed${colors.reset}`
          : `${colors.gray}not installed${colors.reset}`;

        console.log(`  ${statusIcon} ${colors.cyan}${client.name}${colors.reset} [${client.id}]`);
        console.log(`    Status: ${installStatus} | ${syncStatus}`);
        if (client.hasConfig) {
          console.log(`    Servers: ${client.serverCount}`);
        }
        console.log(`    ${colors.gray}${client.configPath}${colors.reset}`);
        console.log();
      }

      console.log(
        `${colors.gray}Use 'mcpsm clients sync' to sync servers to enabled clients${colors.reset}`
      );
    });

  // Sync to clients
  clients
    .command("sync [client]")
    .description("Sync servers to client(s)")
    .action(async (clientId?: string) => {
      const clientService = getClientService();

      if (clientId) {
        // Sync to specific client
        if (!clientService.clientExists(clientId)) {
          console.log(`${c.cross} Unknown client '${clientId}'`);
          console.log(`Available clients: ${clientService.getSupportedClients().join(", ")}`);
          process.exit(1);
        }

        console.log(`Syncing to ${clientService.getClientName(clientId as ClientId)}...`);
        const result = clientService.syncToClient(clientId as ClientId);

        if (result.success) {
          console.log(`${c.checkmark} Synced ${result.addedCount} servers`);
          if (result.skippedCount && result.skippedCount > 0) {
            console.log(
              `${c.warning_icon} Skipped ${result.skippedCount} servers (unsupported format)`
            );
          }
        } else {
          console.log(`${c.cross} Failed: ${result.error}`);
          process.exit(1);
        }
        return;
      }

      // Sync to all enabled clients
      const results = clientService.syncToAllClients();

      if (results.length === 0) {
        console.log(`${colors.yellow}No clients enabled for sync.${colors.reset}`);
        console.log(`Use 'mcpsm clients enable <client>' to enable sync for a client.`);
        return;
      }

      console.log(`\n${colors.bright}Syncing to ${results.length} client(s)...${colors.reset}\n`);

      for (const result of results) {
        if (result.success) {
          console.log(`  ${c.checkmark} ${result.clientName}: ${result.addedCount} servers`);
        } else {
          console.log(`  ${c.cross} ${result.clientName}: ${result.error}`);
        }
      }
    });

  // Enable client sync
  clients
    .command("enable <client>")
    .description("Enable sync for a client")
    .action(async (clientId: string) => {
      const clientService = getClientService();

      if (!clientService.clientExists(clientId)) {
        console.log(`${c.cross} Unknown client '${clientId}'`);
        console.log(`Available clients: ${clientService.getSupportedClients().join(", ")}`);
        process.exit(1);
      }

      const result = clientService.enableClient(clientId as ClientId);

      if (result.success) {
        console.log(
          `${c.checkmark} Sync enabled for ${clientService.getClientName(clientId as ClientId)}`
        );
        console.log(`${colors.gray}Run 'mcpsm clients sync' to sync servers now.${colors.reset}`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });

  // Disable client sync
  clients
    .command("disable <client>")
    .description("Disable sync for a client")
    .action(async (clientId: string) => {
      const clientService = getClientService();

      if (!clientService.clientExists(clientId)) {
        console.log(`${c.cross} Unknown client '${clientId}'`);
        process.exit(1);
      }

      const result = clientService.disableClient(clientId as ClientId);

      if (result.success) {
        console.log(
          `${c.checkmark} Sync disabled for ${clientService.getClientName(clientId as ClientId)}`
        );
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });

  // Open client config
  clients
    .command("open <client>")
    .description("Open client config in editor")
    .action(async (clientId: string) => {
      const clientService = getClientService();

      if (!clientService.clientExists(clientId)) {
        console.log(`${c.cross} Unknown client '${clientId}'`);
        console.log(`Available clients: ${clientService.getSupportedClients().join(", ")}`);
        process.exit(1);
      }

      const configPath = clientService.getClientConfigPath(clientId as ClientId);
      if (!configPath) {
        console.log(`${c.cross} Could not determine config path`);
        process.exit(1);
      }

      console.log(`Opening ${configPath}...`);
      const result = clientService.openClientConfig(clientId as ClientId);

      if (!result.success) {
        console.log(`${c.cross} ${result.error}`);
        console.log(`Config file: ${configPath}`);
        process.exit(1);
      }
    });
}
