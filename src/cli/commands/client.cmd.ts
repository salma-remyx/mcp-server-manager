/**
 * Client commands - list, connect, disconnect, open
 */

import { Command } from "commander";
import { colors, c } from "../../shared/colors.js";
import { outputJson } from "../../shared/formatters.js";
import { getClientService } from "../../services/client.service.js";
import type { ClientId } from "../../types/index.js";

/** Register client commands */
export function registerClientCommands(program: Command): void {
  const clients = program.command("clients").description("Manage MCP clients");

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
        const statusIcon =
          client.status === "connected"
            ? `${colors.green}✔${colors.reset}`
            : client.status === "disconnected"
              ? `${colors.yellow}○${colors.reset}`
              : `${colors.gray}✗${colors.reset}`;

        const statusText =
          client.status === "connected"
            ? `${colors.green}connected${colors.reset}`
            : client.status === "disconnected"
              ? `${colors.yellow}disconnected${colors.reset}`
              : `${colors.gray}not installed${colors.reset}`;

        console.log(`  ${statusIcon} ${colors.cyan}${client.name}${colors.reset} [${client.id}]`);
        console.log(`    Status: ${statusText}`);
        if (client.serverCount > 0) {
          console.log(`    Servers: ${client.serverCount}`);
        }
        if (client.configPath) {
          console.log(`    ${colors.gray}${client.configPath}${colors.reset}`);
        }
        console.log();
      }
    });

  // Connect client
  clients
    .command("connect <client>")
    .description("Connect servers to a client")
    .action(async (clientId: string) => {
      const clientService = getClientService();

      if (!clientService.clientExists(clientId)) {
        console.log(`${c.cross} Unknown client '${clientId}'`);
        console.log(`Available clients: ${clientService.getSupportedClients().join(", ")}`);
        process.exit(1);
      }

      if (!clientService.isClientInstalled(clientId as ClientId)) {
        console.log(
          `${c.cross} ${clientService.getClientName(clientId as ClientId)} is not installed`
        );
        process.exit(1);
      }

      console.log(`Connecting servers to ${clientService.getClientName(clientId as ClientId)}...`);
      const result = clientService.connectClient(clientId as ClientId);

      if (result.success) {
        console.log(
          `${c.checkmark} Successfully connected servers to ${clientService.getClientName(
            clientId as ClientId
          )}`
        );
      } else {
        console.log(`${c.cross} Failed: ${result.error}`);
        process.exit(1);
      }
    });

  // Disconnect client
  clients
    .command("disconnect <client>")
    .description("Disconnect servers from a client")
    .action(async (clientId: string) => {
      const clientService = getClientService();

      if (!clientService.clientExists(clientId)) {
        console.log(`${c.cross} Unknown client '${clientId}'`);
        console.log(`Available clients: ${clientService.getSupportedClients().join(", ")}`);
        process.exit(1);
      }

      if (!clientService.isClientInstalled(clientId as ClientId)) {
        console.log(
          `${c.cross} ${clientService.getClientName(clientId as ClientId)} is not installed`
        );
        process.exit(1);
      }

      console.log(
        `Disconnecting servers from ${clientService.getClientName(clientId as ClientId)}...`
      );
      const result = clientService.disconnectClient(clientId as ClientId);

      if (result.success) {
        console.log(
          `${c.checkmark} Successfully disconnected servers from ${clientService.getClientName(
            clientId as ClientId
          )}`
        );
      } else {
        console.log(`${c.cross} Failed: ${result.error}`);
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
