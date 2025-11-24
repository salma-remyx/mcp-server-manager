/**
 * TUI - Interactive Terminal User Interface
 * Main entry point for the interactive mode
 */

import { colors, clearScreen, showCursor } from "../shared/colors.js";
import { promptText, promptConfirm, waitForKey } from "../shared/prompts.js";
import { getConfigService, getTestingService, getProfileService } from "../services/index.js";
import type { RemoteServer } from "../types/index.js";

// Screen imports
import { showAddServerScreen } from "./screens/add-server.screen.js";
import { showClientsScreen } from "./screens/clients.screen.js";
import { showProfilesScreen } from "./screens/profiles.screen.js";
import { showSettingsScreen } from "./screens/settings.screen.js";
import { showToolsScreen } from "./screens/tools.screen.js";
import { showDaemonScreen } from "./screens/daemon.screen.js";
import { showImportExportScreen } from "./screens/import-export.screen.js";
import { showDoctorScreen, showTokensScreen } from "./screens/utilities.screen.js";

/** Version */
const VERSION = "2.0.0";

/** TUI State */
interface TuiState {
  currentIndex: number;
  currentSection: "local" | "remote";
  selectedLocalIndexes: Set<number>;
  selectedRemoteIndexes: Set<number>;
  running: boolean;
}

/** Initialize TUI state */
function createState(): TuiState {
  const configService = getConfigService();
  const localServers = configService.getLocalServers();
  const remoteServers = configService.getRemoteServers();

  // Restore selection state
  const savedState = configService.getSelectionState();
  const selectedLocal = new Set<number>();
  const selectedRemote = new Set<number>();

  savedState.local.forEach((id) => {
    const index = localServers.findIndex((s) => s.id === id);
    if (index !== -1) selectedLocal.add(index);
  });

  savedState.remote.forEach((id) => {
    const index = remoteServers.findIndex((s) => s.id === id);
    if (index !== -1) selectedRemote.add(index);
  });

  return {
    currentIndex: localServers.length > 0 ? 0 : remoteServers.length > 0 ? 0 : -1,
    currentSection: localServers.length > 0 ? "local" : "remote",
    selectedLocalIndexes: selectedLocal,
    selectedRemoteIndexes: selectedRemote,
    running: true,
  };
}

/** Render the main menu */
function renderMainMenu(state: TuiState): void {
  clearScreen();

  const configService = getConfigService();
  const profileService = getProfileService();
  const localServers = configService.getLocalServers();
  const remoteServers = configService.getRemoteServers();
  const toolFilters = configService.getToolFilters();
  const port = configService.getPort();
  const activeProfile = profileService.getActiveProfileId();

  // Header
  console.log(
    `\n${colors.bright}${colors.cyan}  MCP Server Manager${colors.reset} ${colors.gray}v${VERSION}${colors.reset}`
  );
  console.log(`${colors.gray}  Profile: ${activeProfile} | Port: ${port}${colors.reset}\n`);

  // Local servers
  if (localServers.length > 0) {
    console.log(`${colors.bright}  Local Servers (STDIO)${colors.reset}`);

    localServers.forEach((server, index) => {
      const isSelected = state.selectedLocalIndexes.has(index);
      const isCurrent = state.currentSection === "local" && state.currentIndex === index;
      const filter = toolFilters[server.id];
      const toolCount = filter?.allTools?.length || 0;

      const checkbox = isSelected
        ? `${colors.green}[✓]${colors.reset}`
        : `${colors.gray}[ ]${colors.reset}`;
      const cursor = isCurrent ? `${colors.cyan}→${colors.reset}` : " ";
      const name = isCurrent
        ? `${colors.bright}${colors.cyan}${server.name}${colors.reset}`
        : server.name;
      const status = server.disabled
        ? `${colors.red}disabled${colors.reset}`
        : `${colors.green}${toolCount} tools${colors.reset}`;

      console.log(`  ${cursor} ${checkbox} ${name} - ${status}`);
    });
  }

  // Remote servers
  if (remoteServers.length > 0) {
    if (localServers.length > 0) console.log();
    console.log(`${colors.bright}  Remote Servers${colors.reset}`);

    remoteServers.forEach((server, index) => {
      const isSelected = state.selectedRemoteIndexes.has(index);
      const isCurrent = state.currentSection === "remote" && state.currentIndex === index;
      const filter = toolFilters[`remote:${server.id}`];
      const toolCount = filter?.allTools?.length || 0;

      const checkbox = isSelected
        ? `${colors.green}[✓]${colors.reset}`
        : `${colors.gray}[ ]${colors.reset}`;
      const cursor = isCurrent ? `${colors.cyan}→${colors.reset}` : " ";
      const name = isCurrent
        ? `${colors.bright}${colors.cyan}${server.name}${colors.reset}`
        : server.name;
      const typeLabel = `${colors.gray}(${server.type})${colors.reset}`;
      const status = server.disabled
        ? `${colors.red}disabled${colors.reset}`
        : `${colors.green}${toolCount} tools${colors.reset}`;

      console.log(`  ${cursor} ${checkbox} ${name} ${typeLabel} - ${status}`);
    });
  }

  if (localServers.length === 0 && remoteServers.length === 0) {
    console.log(`${colors.gray}  No servers configured.${colors.reset}`);
    console.log(`${colors.gray}  Press A to add a new server.${colors.reset}`);
  }

  // Help bar
  console.log();
  console.log(
    `${colors.gray}  ↑/↓ Navigate  SPACE Select  A Add  D Delete  E Edit  N Enable/Disable${colors.reset}`
  );
  console.log(
    `${colors.gray}  X Test  T Tools  C Clients  F Profiles  G Settings  M Daemon  I Import/Export${colors.reset}`
  );
  console.log(`${colors.gray}  H Doctor  K Tokens  P Port  ENTER Start  Q Quit${colors.reset}`);
}

/** Handle keyboard input */
async function handleKeypress(state: TuiState, key: string): Promise<boolean> {
  const configService = getConfigService();
  const localServers = configService.getLocalServers();
  const remoteServers = configService.getRemoteServers();
  const totalLocal = localServers.length;
  const totalRemote = remoteServers.length;

  // Quit
  if (key === "q" || key === "\u0003") {
    return false;
  }

  // Navigation - Up
  if (key === "\u001B[A") {
    if (state.currentSection === "local") {
      if (state.currentIndex > 0) {
        state.currentIndex--;
      } else if (totalRemote > 0) {
        state.currentSection = "remote";
        state.currentIndex = totalRemote - 1;
      }
    } else {
      if (state.currentIndex > 0) {
        state.currentIndex--;
      } else if (totalLocal > 0) {
        state.currentSection = "local";
        state.currentIndex = totalLocal - 1;
      }
    }
    return true;
  }

  // Navigation - Down
  if (key === "\u001B[B") {
    if (state.currentSection === "local") {
      if (state.currentIndex < totalLocal - 1) {
        state.currentIndex++;
      } else if (totalRemote > 0) {
        state.currentSection = "remote";
        state.currentIndex = 0;
      }
    } else {
      if (state.currentIndex < totalRemote - 1) {
        state.currentIndex++;
      } else if (totalLocal > 0) {
        state.currentSection = "local";
        state.currentIndex = 0;
      }
    }
    return true;
  }

  // Selection - Space
  if (key === " ") {
    if (state.currentSection === "local" && state.currentIndex >= 0) {
      if (state.selectedLocalIndexes.has(state.currentIndex)) {
        state.selectedLocalIndexes.delete(state.currentIndex);
      } else {
        state.selectedLocalIndexes.add(state.currentIndex);
      }
      saveSelectionState(state);
    } else if (state.currentSection === "remote" && state.currentIndex >= 0) {
      if (state.selectedRemoteIndexes.has(state.currentIndex)) {
        state.selectedRemoteIndexes.delete(state.currentIndex);
      } else {
        state.selectedRemoteIndexes.add(state.currentIndex);
      }
      saveSelectionState(state);
    }
    return true;
  }

  // Add server
  if (key.toLowerCase() === "a") {
    await showAddServerScreen();
    return true;
  }

  // Delete server
  if (key.toLowerCase() === "d") {
    await handleDeleteServer(state);
    return true;
  }

  // Test all servers
  if (key.toLowerCase() === "x") {
    await showTestAllScreen();
    return true;
  }

  // Tools management
  if (key.toLowerCase() === "t") {
    await showToolsScreen();
    return true;
  }

  // Clients management
  if (key.toLowerCase() === "c") {
    await showClientsScreen();
    return true;
  }

  // Profiles management
  if (key.toLowerCase() === "f") {
    await showProfilesScreen();
    return true;
  }

  // Settings
  if (key.toLowerCase() === "g") {
    await showSettingsScreen();
    return true;
  }

  // Port configuration
  if (key.toLowerCase() === "p") {
    await handlePortConfig();
    return true;
  }

  // Daemon management
  if (key.toLowerCase() === "m") {
    await showDaemonScreen();
    return true;
  }

  // Import/Export
  if (key.toLowerCase() === "i") {
    await showImportExportScreen();
    return true;
  }

  // Doctor (health check)
  if (key.toLowerCase() === "h") {
    await showDoctorScreen();
    return true;
  }

  // Tokens usage
  if (key.toLowerCase() === "k") {
    await showTokensScreen();
    return true;
  }

  // Edit server
  if (key.toLowerCase() === "e") {
    await handleEditServer(state);
    return true;
  }

  // Enable/disable server
  if (key.toLowerCase() === "n") {
    await handleToggleServerEnabled(state);
    return true;
  }

  // Start gateway - Enter
  if (key === "\r" || key === "\n") {
    await handleStartGateway(state);
    return true;
  }

  return true;
}

/** Save selection state */
function saveSelectionState(state: TuiState): void {
  const configService = getConfigService();
  const localServers = configService.getLocalServers();
  const remoteServers = configService.getRemoteServers();

  configService.saveSelectionState({
    local: Array.from(state.selectedLocalIndexes)
      .map((i) => localServers[i]?.id)
      .filter(Boolean) as string[],
    remote: Array.from(state.selectedRemoteIndexes)
      .map((i) => remoteServers[i]?.id)
      .filter(Boolean) as string[],
  });
}

/** Handle delete server */
async function handleDeleteServer(state: TuiState): Promise<void> {
  const configService = getConfigService();
  const localServers = configService.getLocalServers();
  const remoteServers = configService.getRemoteServers();

  let server: { id: string; name: string } | null = null;
  let serverType: "local" | "remote" = "local";

  if (
    state.currentSection === "local" &&
    state.currentIndex >= 0 &&
    state.currentIndex < localServers.length
  ) {
    server = localServers[state.currentIndex];
    serverType = "local";
  } else if (
    state.currentSection === "remote" &&
    state.currentIndex >= 0 &&
    state.currentIndex < remoteServers.length
  ) {
    server = remoteServers[state.currentIndex];
    serverType = "remote";
  }

  if (!server) {
    return;
  }

  clearScreen();
  console.log(`\n${colors.bright}${colors.red}  Delete Server${colors.reset}\n`);

  const confirmed = await promptConfirm(`Delete server '${server.name}'?`, false);
  if (confirmed) {
    const result =
      serverType === "local"
        ? configService.removeLocalServer(server.id)
        : configService.removeRemoteServer(server.id);

    if (result.success) {
      console.log(`${colors.green}✓${colors.reset} Server deleted`);
      // Update selection
      if (serverType === "local") {
        state.selectedLocalIndexes.delete(state.currentIndex);
        // Adjust indexes
        const newSelected = new Set<number>();
        state.selectedLocalIndexes.forEach((idx) => {
          if (idx > state.currentIndex) {
            newSelected.add(idx - 1);
          } else {
            newSelected.add(idx);
          }
        });
        state.selectedLocalIndexes = newSelected;
      } else {
        state.selectedRemoteIndexes.delete(state.currentIndex);
        const newSelected = new Set<number>();
        state.selectedRemoteIndexes.forEach((idx) => {
          if (idx > state.currentIndex) {
            newSelected.add(idx - 1);
          } else {
            newSelected.add(idx);
          }
        });
        state.selectedRemoteIndexes = newSelected;
      }
      // Adjust current index
      const newLocalCount = configService.getLocalServers().length;
      const newRemoteCount = configService.getRemoteServers().length;
      if (state.currentSection === "local") {
        if (state.currentIndex >= newLocalCount) {
          state.currentIndex = Math.max(0, newLocalCount - 1);
          if (newLocalCount === 0 && newRemoteCount > 0) {
            state.currentSection = "remote";
            state.currentIndex = 0;
          }
        }
      } else {
        if (state.currentIndex >= newRemoteCount) {
          state.currentIndex = Math.max(0, newRemoteCount - 1);
          if (newRemoteCount === 0 && newLocalCount > 0) {
            state.currentSection = "local";
            state.currentIndex = 0;
          }
        }
      }
    } else {
      console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
    }
    await waitForKey();
  }
}

/** Handle port configuration */
async function handlePortConfig(): Promise<void> {
  const configService = getConfigService();
  const currentPort = configService.getPort();

  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  Configure Port${colors.reset}\n`);
  console.log(`${colors.gray}  Current port: ${currentPort}${colors.reset}\n`);

  const newPort = await promptText("New port", String(currentPort));
  if (newPort && newPort !== String(currentPort)) {
    const port = parseInt(newPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.log(`${colors.red}Invalid port number${colors.reset}`);
    } else {
      configService.setPort(port);
      console.log(`${colors.green}✓${colors.reset} Port set to ${port}`);
    }
    await waitForKey();
  }
}

/** Handle start gateway */
async function handleStartGateway(state: TuiState): Promise<void> {
  const configService = getConfigService();
  const localServers = configService.getLocalServers();
  const remoteServers = configService.getRemoteServers();

  // Get selected servers
  const selectedLocal = Array.from(state.selectedLocalIndexes)
    .map((i) => localServers[i])
    .filter(Boolean);
  const selectedRemote = Array.from(state.selectedRemoteIndexes)
    .map((i) => remoteServers[i])
    .filter(Boolean);

  if (selectedLocal.length === 0 && selectedRemote.length === 0) {
    clearScreen();
    console.log(`\n${colors.yellow}No servers selected.${colors.reset}`);
    console.log(`${colors.gray}Use SPACE to select servers before starting.${colors.reset}`);
    await waitForKey();
    return;
  }

  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  Start Gateway${colors.reset}\n`);
  console.log(`${colors.gray}  Selected servers:${colors.reset}`);
  selectedLocal.forEach((s) => console.log(`    - ${s.name} (local)`));
  selectedRemote.forEach((s) => console.log(`    - ${s.name} (${s.type})`));
  console.log();
  console.log(`${colors.yellow}Gateway feature is being migrated.${colors.reset}`);
  console.log(`${colors.gray}For now, use: mcpsm daemon start${colors.reset}`);
  await waitForKey();
}

/** Handle edit server */
async function handleEditServer(state: TuiState): Promise<void> {
  const configService = getConfigService();
  const remoteServers = configService.getRemoteServers();

  // Only remote servers can be edited in TUI
  if (
    state.currentSection !== "remote" ||
    state.currentIndex < 0 ||
    state.currentIndex >= remoteServers.length
  ) {
    clearScreen();
    console.log(`\n${colors.yellow}  Edit is only available for remote servers.${colors.reset}`);
    console.log(
      `${colors.gray}  Local servers should be edited via their config files.${colors.reset}`
    );
    await waitForKey();
    return;
  }

  const server = remoteServers[state.currentIndex];
  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  Edit Server: ${server.name}${colors.reset}\n`);

  // Get new values
  const newName = await promptText("Name", server.name);
  const newUrl = await promptText("URL", server.url);

  let newToken = server.bearerToken || "";
  if (server.type === "http") {
    const tokenInput = await promptText("Bearer Token (leave empty to keep current)", "");
    if (tokenInput) {
      newToken = tokenInput;
    }
  }

  // Update server
  const updates: Partial<typeof server> = {};
  if (newName && newName !== server.name) updates.name = newName;
  if (newUrl && newUrl !== server.url) updates.url = newUrl;
  if (newToken && newToken !== server.bearerToken) updates.bearerToken = newToken;

  if (Object.keys(updates).length > 0) {
    const result = configService.updateRemoteServer(server.id, updates);
    if (result.success) {
      console.log(`\n${colors.green}✓${colors.reset} Server updated`);
    } else {
      console.log(`\n${colors.red}✗${colors.reset} ${result.error}`);
    }
  } else {
    console.log(`\n${colors.gray}No changes made${colors.reset}`);
  }

  await waitForKey();
}

/** Handle enable/disable server */
async function handleToggleServerEnabled(state: TuiState): Promise<void> {
  const configService = getConfigService();
  const localServers = configService.getLocalServers();
  const remoteServers = configService.getRemoteServers();

  let serverId: string | null = null;
  let serverName: string | null = null;
  let currentlyDisabled = false;

  if (
    state.currentSection === "local" &&
    state.currentIndex >= 0 &&
    state.currentIndex < localServers.length
  ) {
    const server = localServers[state.currentIndex];
    serverId = server.id;
    serverName = server.name;
    currentlyDisabled = server.disabled || false;
  } else if (
    state.currentSection === "remote" &&
    state.currentIndex >= 0 &&
    state.currentIndex < remoteServers.length
  ) {
    const server = remoteServers[state.currentIndex];
    serverId = server.id;
    serverName = server.name;
    currentlyDisabled = server.disabled || false;
  }

  if (!serverId || !serverName) {
    return;
  }

  const action = currentlyDisabled ? "enable" : "disable";
  const result = currentlyDisabled
    ? configService.enableServer(serverId)
    : configService.disableServer(serverId);

  clearScreen();
  if (result.success) {
    console.log(`\n${colors.green}✓${colors.reset} Server '${serverName}' ${action}d`);
  } else {
    console.log(`\n${colors.red}✗${colors.reset} ${result.error}`);
  }
  await waitForKey();
}

/** Test all servers screen */
async function showTestAllScreen(): Promise<void> {
  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  Testing All Servers${colors.reset}\n`);

  const testingService = getTestingService();
  const results = await testingService.testAllServers();

  for (const { server, type, result } of results) {
    const typeLabel = type === "remote" ? ` (${(server as RemoteServer).type})` : "";
    if (result.success) {
      console.log(
        `  ${colors.green}✓${colors.reset} ${server.name}${typeLabel} - ${result.toolCount} tools`
      );
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${server.name}${typeLabel} - ${result.error}`);
    }
  }

  const passed = results.filter((r) => r.result.success).length;
  const failed = results.filter((r) => !r.result.success).length;

  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  }

  await waitForKey();
}

/** Main TUI loop */
export async function startTui(): Promise<void> {
  const state = createState();

  // Auto-test unknown servers
  const testingService = getTestingService();
  await testingService.autoTestUnknownServers();

  // Main loop
  while (state.running) {
    renderMainMenu(state);

    // Wait for keypress
    const key = await new Promise<string>((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      process.stdin.once("data", (data: string) => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(data);
      });
    });

    state.running = await handleKeypress(state, key);
  }

  // Cleanup
  clearScreen();
  showCursor();
  console.log(`${colors.cyan}Goodbye!${colors.reset}`);
}

export default startTui;
