/**
 * Add Server Screen - Interactive server addition
 */

import { colors, clearScreen } from "../../shared/colors.js";
import { promptText, promptSelect, promptConfirm, waitForKey } from "../../shared/prompts.js";
import { getConfigService } from "../../services/config.service.js";
import { getTestingService } from "../../services/testing.service.js";
import type { LocalServer, RemoteServer, TransportType } from "../../types/index.js";

/** Show add server screen */
export async function showAddServerScreen(): Promise<void> {
  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  Add New MCP Server${colors.reset}\n`);

  const configService = getConfigService();

  // Get server name
  const name = await promptText("Server name");
  if (!name) {
    console.log(`${colors.red}Name is required${colors.reset}`);
    await waitForKey();
    return;
  }

  const serverId = configService.generateServerId(name);

  // Select server type
  const serverType = await promptSelect<"stdio" | "http" | "sse">("Server type", [
    {
      label: "Local (STDIO)",
      value: "stdio",
      description: "Run MCP servers locally",
    },
    {
      label: "Remote (HTTP)",
      value: "http",
      description: "Connect to hosted servers",
    },
    {
      label: "Remote (SSE)",
      value: "sse",
      description: "Real-time streaming",
    },
  ]);

  if (!serverType) {
    console.log(`${colors.yellow}Cancelled${colors.reset}`);
    await waitForKey();
    return;
  }

  if (serverType === "stdio") {
    await addLocalServer(serverId, name);
  } else {
    await addRemoteServer(serverId, name, serverType);
  }
}

/** Add a local STDIO server */
async function addLocalServer(serverId: string, name: string): Promise<void> {
  const configService = getConfigService();
  const testingService = getTestingService();

  console.log(`\n${colors.gray}Examples: npx, node, python, uvx${colors.reset}`);

  const command = await promptText("Command executable");
  if (!command) {
    console.log(`${colors.red}Command is required${colors.reset}`);
    await waitForKey();
    return;
  }

  const argsStr = await promptText("Arguments (space separated)", "");
  const args = argsStr ? argsStr.split(/\s+/).filter(Boolean) : [];

  const server: LocalServer = {
    id: serverId,
    name,
    command,
    args,
  };

  const result = configService.addLocalServer(server);
  if (!result.success) {
    console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
    await waitForKey();
    return;
  }

  console.log(`\n${colors.green}✓${colors.reset} Server '${name}' added!`);

  // Offer to test
  const shouldTest = await promptConfirm("Test this server now?");
  if (shouldTest) {
    process.stdout.write(`\n  Testing ${colors.cyan}${name}${colors.reset}... `);
    const testResult = await testingService.testLocalServer(server);
    if (testResult.success) {
      console.log(`${colors.green}✓ OK${colors.reset} (${testResult.toolCount} tools)`);
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} - ${testResult.error}`);
    }
  }

  await waitForKey();
}

/** Add a remote HTTP/SSE server */
async function addRemoteServer(serverId: string, name: string, type: TransportType): Promise<void> {
  const configService = getConfigService();
  const testingService = getTestingService();

  const url = await promptText("Server URL");
  if (!url) {
    console.log(`${colors.red}URL is required${colors.reset}`);
    await waitForKey();
    return;
  }

  const token = await promptText("Bearer token (optional)", "");

  const server: RemoteServer = {
    id: serverId,
    name,
    type,
    url,
  };

  if (token) {
    server.bearerToken = token;
  }

  const result = configService.addRemoteServer(server);
  if (!result.success) {
    console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
    await waitForKey();
    return;
  }

  console.log(`\n${colors.green}✓${colors.reset} Server '${name}' added!`);

  // Offer to test
  const shouldTest = await promptConfirm("Test this server now?");
  if (shouldTest) {
    process.stdout.write(`\n  Testing ${colors.cyan}${name}${colors.reset}... `);
    const testResult = await testingService.testRemoteServer(server);
    if (testResult.success) {
      console.log(`${colors.green}✓ OK${colors.reset} (${testResult.toolCount} tools)`);
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} - ${testResult.error}`);
    }
  }

  await waitForKey();
}

export default showAddServerScreen;
