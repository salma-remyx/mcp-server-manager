/**
 * Clients Screen - Manage MCP client sync
 */

import { colors, clearScreen } from "../../shared/colors.js";
import { waitForKey } from "../../shared/prompts.js";
import { getClientService } from "../../services/client.service.js";
import type { DetectedClient } from "../../types/index.js";

/** Client screen state */
interface ClientsState {
  clients: DetectedClient[];
  currentIndex: number;
  running: boolean;
}

/** Show clients management screen */
export async function showClientsScreen(): Promise<void> {
  const clientService = getClientService();

  const state: ClientsState = {
    clients: clientService.detectClients(),
    currentIndex: 0,
    running: true,
  };

  while (state.running) {
    renderClientsScreen(state);

    const key = await waitForKeypress();
    await handleClientsKeypress(state, key, clientService);
  }
}

/** Render the clients screen */
function renderClientsScreen(state: ClientsState): void {
  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  MCP Clients${colors.reset}\n`);

  if (state.clients.length === 0) {
    console.log(`${colors.gray}  No clients detected.${colors.reset}`);
  } else {
    for (let i = 0; i < state.clients.length; i++) {
      const client = state.clients[i];
      const isCurrent = i === state.currentIndex;
      const cursor = isCurrent ? `${colors.cyan}→${colors.reset}` : " ";

      const statusIcon = client.installed
        ? client.synced
          ? `${colors.green}✔${colors.reset}`
          : `${colors.yellow}○${colors.reset}`
        : `${colors.gray}✗${colors.reset}`;

      const syncStatus = client.enabled
        ? `${colors.green}sync ON${colors.reset}`
        : `${colors.gray}sync OFF${colors.reset}`;

      const installStatus = client.installed
        ? client.hasConfig
          ? `${colors.green}configured${colors.reset}`
          : `${colors.yellow}installed${colors.reset}`
        : `${colors.gray}not installed${colors.reset}`;

      const name = isCurrent
        ? `${colors.bright}${colors.cyan}${client.name}${colors.reset}`
        : client.name;

      console.log(`  ${cursor} ${statusIcon} ${name} [${client.id}]`);
      console.log(`      ${installStatus} | ${syncStatus}`);
      if (client.hasConfig) {
        console.log(`      ${colors.gray}${client.serverCount} servers${colors.reset}`);
      }
    }
  }

  console.log();
  console.log(`${colors.gray}  ↑/↓ Navigate  SPACE Toggle sync  S Sync all  Q Back${colors.reset}`);
}

/** Wait for a keypress */
async function waitForKeypress(): Promise<string> {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.once("data", (data: string) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(data);
    });
  });
}

/** Handle keypress in clients screen */
async function handleClientsKeypress(
  state: ClientsState,
  key: string,
  clientService: ReturnType<typeof getClientService>
): Promise<void> {
  // Quit
  if (key === "q" || key === "\u0003" || key === "\u001B") {
    state.running = false;
    return;
  }

  // Navigation - Up
  if (key === "\u001B[A" && state.clients.length > 0) {
    state.currentIndex = (state.currentIndex - 1 + state.clients.length) % state.clients.length;
    return;
  }

  // Navigation - Down
  if (key === "\u001B[B" && state.clients.length > 0) {
    state.currentIndex = (state.currentIndex + 1) % state.clients.length;
    return;
  }

  // Toggle sync - Space
  if (key === " " && state.clients.length > 0) {
    const client = state.clients[state.currentIndex];
    if (client.enabled) {
      clientService.disableClient(client.id);
    } else {
      clientService.enableClient(client.id);
    }
    state.clients = clientService.detectClients();
    return;
  }

  // Sync all - S
  if (key.toLowerCase() === "s") {
    clearScreen();
    console.log(`\n${colors.bright}${colors.cyan}  Syncing to clients...${colors.reset}\n`);

    const results = clientService.syncToAllClients();

    if (results.length === 0) {
      console.log(`${colors.yellow}  No clients enabled for sync.${colors.reset}`);
    } else {
      for (const result of results) {
        if (result.success) {
          console.log(
            `  ${colors.green}✓${colors.reset} ${result.clientName}: ${result.addedCount} servers`
          );
        } else {
          console.log(`  ${colors.red}✗${colors.reset} ${result.clientName}: ${result.error}`);
        }
      }
    }

    await waitForKey();
    state.clients = clientService.detectClients();
    return;
  }
}

export default showClientsScreen;
