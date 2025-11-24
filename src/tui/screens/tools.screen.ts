/**
 * Tools Screen - Manage tool filtering per server
 */

import { colors, clearScreen } from "../../shared/colors.js";
import { promptConfirm, waitForKey } from "../../shared/prompts.js";
import { getConfigService } from "../../services/config.service.js";
import type { LocalServer, RemoteServer, ServerToolFilter } from "../../types/index.js";

/** Server list item for tools screen */
interface ServerItem {
  id: string;
  filterId: string;
  name: string;
  type: "local" | "remote";
  server: LocalServer | RemoteServer;
}

/** Tools screen state */
interface ToolsState {
  servers: ServerItem[];
  currentServerIndex: number;
  filter: ServerToolFilter | null;
  tools: string[];
  currentToolIndex: number;
  view: "servers" | "tools";
  running: boolean;
}

/** Show tools management screen */
export async function showToolsScreen(): Promise<void> {
  const configService = getConfigService();

  const localServers = configService.getLocalServers();
  const remoteServers = configService.getRemoteServers();

  // Build server list
  const servers: ServerItem[] = [
    ...localServers.map((s) => ({
      id: s.id,
      filterId: s.id,
      name: s.name,
      type: "local" as const,
      server: s,
    })),
    ...remoteServers.map((s) => ({
      id: s.id,
      filterId: `remote:${s.id}`,
      name: s.name,
      type: "remote" as const,
      server: s,
    })),
  ];

  if (servers.length === 0) {
    clearScreen();
    console.log(`\n${colors.bright}${colors.cyan}  Tool Filters${colors.reset}\n`);
    console.log(`${colors.gray}  No servers configured.${colors.reset}`);
    await waitForKey();
    return;
  }

  const state: ToolsState = {
    servers,
    currentServerIndex: 0,
    filter: null,
    tools: [],
    currentToolIndex: 0,
    view: "servers",
    running: true,
  };

  // Load tools for first server
  loadServerTools(state, configService);

  while (state.running) {
    if (state.view === "servers") {
      renderServersView(state, configService);
    } else {
      renderToolsView(state);
    }

    const key = await waitForKeypress();
    await handleToolsKeypress(state, key, configService);
  }
}

/** Load tools for current server */
function loadServerTools(
  state: ToolsState,
  configService: ReturnType<typeof getConfigService>
): void {
  const server = state.servers[state.currentServerIndex];
  const toolFilters = configService.getToolFilters();
  state.filter = toolFilters[server.filterId] || null;
  state.tools = state.filter?.allTools || [];
  state.currentToolIndex = 0;
}

/** Render servers view */
function renderServersView(
  state: ToolsState,
  configService: ReturnType<typeof getConfigService>
): void {
  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  Tool Filters${colors.reset}\n`);
  console.log(`${colors.gray}  Select a server to manage its tools${colors.reset}\n`);

  const toolFilters = configService.getToolFilters();

  for (let i = 0; i < state.servers.length; i++) {
    const server = state.servers[i];
    const isCurrent = i === state.currentServerIndex;
    const cursor = isCurrent ? `${colors.cyan}→${colors.reset}` : " ";

    const filter = toolFilters[server.filterId];
    const totalTools = filter?.allTools?.length || 0;
    const disabledCount = filter?.disabledTools?.length || 0;
    const enabledCount = totalTools - disabledCount;

    const typeLabel =
      server.type === "remote"
        ? ` ${colors.gray}(${(server.server as RemoteServer).type})${colors.reset}`
        : "";

    const name = isCurrent
      ? `${colors.bright}${colors.cyan}${server.name}${colors.reset}`
      : server.name;

    let toolsInfo: string;
    if (totalTools === 0) {
      toolsInfo = `${colors.gray}no tools discovered${colors.reset}`;
    } else if (disabledCount === 0) {
      toolsInfo = `${colors.green}${enabledCount}/${totalTools} tools enabled${colors.reset}`;
    } else {
      toolsInfo = `${colors.yellow}${enabledCount}/${totalTools} tools enabled${colors.reset}`;
    }

    console.log(`  ${cursor} ${name}${typeLabel}`);
    console.log(`      ${toolsInfo}`);
  }

  console.log();
  console.log(
    `${colors.gray}  ↑/↓ Navigate  ENTER View tools  R Reset filters  Q Back${colors.reset}`
  );
}

/** Render tools view for selected server */
function renderToolsView(state: ToolsState): void {
  clearScreen();
  const server = state.servers[state.currentServerIndex];
  console.log(`\n${colors.bright}${colors.cyan}  Tools: ${server.name}${colors.reset}\n`);

  if (state.tools.length === 0) {
    console.log(`${colors.gray}  No tools discovered for this server.${colors.reset}`);
    console.log(`${colors.gray}  Run a test to discover tools.${colors.reset}`);
  } else {
    const disabledTools = new Set(state.filter?.disabledTools || []);

    for (let i = 0; i < state.tools.length; i++) {
      const tool = state.tools[i];
      const isCurrent = i === state.currentToolIndex;
      const isEnabled = !disabledTools.has(tool);

      const cursor = isCurrent ? `${colors.cyan}→${colors.reset}` : " ";
      const checkbox = isEnabled
        ? `${colors.green}[✓]${colors.reset}`
        : `${colors.red}[ ]${colors.reset}`;

      const name = isCurrent
        ? `${colors.bright}${isEnabled ? colors.white : colors.gray}${tool}${colors.reset}`
        : isEnabled
          ? tool
          : `${colors.gray}${tool}${colors.reset}`;

      console.log(`  ${cursor} ${checkbox} ${name}`);
    }
  }

  console.log();
  console.log(
    `${colors.gray}  ↑/↓ Navigate  SPACE Toggle  A Enable all  N Disable all  ESC Back${colors.reset}`
  );
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

/** Handle keypress in tools screen */
async function handleToolsKeypress(
  state: ToolsState,
  key: string,
  configService: ReturnType<typeof getConfigService>
): Promise<void> {
  if (state.view === "servers") {
    await handleServersKeypress(state, key, configService);
  } else {
    await handleToolsListKeypress(state, key, configService);
  }
}

/** Handle keypress in servers view */
async function handleServersKeypress(
  state: ToolsState,
  key: string,
  configService: ReturnType<typeof getConfigService>
): Promise<void> {
  // Quit
  if (key === "q" || key === "\u0003" || key === "\u001B") {
    state.running = false;
    return;
  }

  // Navigation - Up
  if (key === "\u001B[A" && state.servers.length > 0) {
    state.currentServerIndex =
      (state.currentServerIndex - 1 + state.servers.length) % state.servers.length;
    loadServerTools(state, configService);
    return;
  }

  // Navigation - Down
  if (key === "\u001B[B" && state.servers.length > 0) {
    state.currentServerIndex = (state.currentServerIndex + 1) % state.servers.length;
    loadServerTools(state, configService);
    return;
  }

  // View tools - Enter
  if ((key === "\r" || key === "\n") && state.tools.length > 0) {
    state.view = "tools";
    state.currentToolIndex = 0;
    return;
  }

  // Reset filters - R
  if (key.toLowerCase() === "r") {
    const server = state.servers[state.currentServerIndex];
    clearScreen();
    console.log(`\n${colors.bright}${colors.yellow}  Reset Tool Filters${colors.reset}\n`);

    const confirmed = await promptConfirm(`Reset filters for '${server.name}'?`, false);
    if (confirmed) {
      const result = configService.resetToolFilters(server.filterId);
      if (result.success) {
        console.log(`${colors.green}✓${colors.reset} Filters reset`);
        loadServerTools(state, configService);
      } else {
        console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
      }
      await waitForKey();
    }
    return;
  }
}

/** Handle keypress in tools list view */
async function handleToolsListKeypress(
  state: ToolsState,
  key: string,
  configService: ReturnType<typeof getConfigService>
): Promise<void> {
  const server = state.servers[state.currentServerIndex];

  // Back to servers
  if (key === "\u001B" || key === "q") {
    state.view = "servers";
    return;
  }

  // Navigation - Up
  if (key === "\u001B[A" && state.tools.length > 0) {
    state.currentToolIndex = (state.currentToolIndex - 1 + state.tools.length) % state.tools.length;
    return;
  }

  // Navigation - Down
  if (key === "\u001B[B" && state.tools.length > 0) {
    state.currentToolIndex = (state.currentToolIndex + 1) % state.tools.length;
    return;
  }

  // Toggle tool - Space
  if (key === " " && state.tools.length > 0) {
    const tool = state.tools[state.currentToolIndex];
    configService.toggleTool(server.filterId, tool);
    loadServerTools(state, configService);
    return;
  }

  // Enable all - A
  if (key.toLowerCase() === "a" && state.tools.length > 0) {
    configService.enableAllTools(server.filterId);
    loadServerTools(state, configService);
    return;
  }

  // Disable all - N
  if (key.toLowerCase() === "n" && state.tools.length > 0) {
    configService.disableAllTools(server.filterId);
    loadServerTools(state, configService);
    return;
  }
}

export default showToolsScreen;
