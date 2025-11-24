/**
 * Utilities Screen - Doctor, Tokens, and other utilities
 */

import { execSync } from "child_process";
import fs from "fs";
import { colors, clearScreen } from "../../shared/colors.js";
import { waitForKey } from "../../shared/prompts.js";
import { getConfigService } from "../../services/config.service.js";
import { formatTokens } from "../../shared/formatters.js";

/** Check if a command exists */
function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Get command version */
function getVersion(cmd: string): string | null {
  try {
    const result = execSync(`${cmd} --version`, { encoding: "utf8" });
    return result.trim().split("\n")[0];
  } catch {
    return null;
  }
}

/** Show doctor (health check) screen */
export async function showDoctorScreen(): Promise<void> {
  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  System Health Check${colors.reset}\n`);

  const checks: Array<{ name: string; status: boolean; info: string }> = [];

  // Node.js
  const nodeVersion = process.version;
  const nodeOk = parseInt(nodeVersion.slice(1)) >= 18;
  checks.push({
    name: "Node.js",
    status: nodeOk,
    info: nodeOk ? nodeVersion : `${nodeVersion} (requires >= 18.0.0)`,
  });

  // Python
  const pythonExists = commandExists("python3") || commandExists("python");
  const pythonVersion = pythonExists ? getVersion("python3") || getVersion("python") : null;
  checks.push({
    name: "Python",
    status: pythonExists,
    info: pythonVersion || "not found",
  });

  // uv
  const uvExists = commandExists("uv");
  const uvVersion = uvExists ? getVersion("uv") : null;
  checks.push({
    name: "uv",
    status: uvExists,
    info: uvVersion || "not found (optional)",
  });

  // uvx
  const uvxExists = commandExists("uvx");
  checks.push({
    name: "uvx",
    status: uvxExists,
    info: uvxExists ? "available" : "not found (optional)",
  });

  // npm
  const npmExists = commandExists("npm");
  const npmVersion = npmExists ? getVersion("npm") : null;
  checks.push({
    name: "npm",
    status: npmExists,
    info: npmVersion || "not found",
  });

  // Config directory
  const configService = getConfigService();
  const paths = configService.getPaths();
  const configExists = fs.existsSync(paths.configDir);
  checks.push({
    name: "Config directory",
    status: configExists,
    info: configExists ? paths.configDir : "not created",
  });

  // Config file
  const configFileExists = fs.existsSync(paths.configPath);
  checks.push({
    name: "Config file",
    status: configFileExists,
    info: configFileExists ? "exists" : "not found",
  });

  // Servers count
  const localServers = configService.getLocalServers();
  const remoteServers = configService.getRemoteServers();
  const totalServers = localServers.length + remoteServers.length;
  checks.push({
    name: "Servers configured",
    status: true,
    info: `${totalServers} (${localServers.length} local, ${remoteServers.length} remote)`,
  });

  // Print results
  for (const check of checks) {
    const icon = check.status
      ? `${colors.green}✓${colors.reset}`
      : `${colors.yellow}✗${colors.reset}`;
    const infoColor = check.status ? colors.green : colors.yellow;
    console.log(`  ${icon} ${check.name}: ${infoColor}${check.info}${colors.reset}`);
  }

  const allOk = checks.every((c) => c.status || c.name.includes("uv"));
  console.log();
  if (allOk) {
    console.log(`  ${colors.green}✓${colors.reset} All checks passed!`);
  } else {
    console.log(`  ${colors.yellow}⚠${colors.reset} Some checks failed. See above for details.`);
  }

  console.log(`\n${colors.gray}  Press any key to continue...${colors.reset}`);
  await waitForKey();
}

/** Show token usage screen */
export async function showTokensScreen(): Promise<void> {
  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  Token Usage${colors.reset}\n`);

  const configService = getConfigService();
  const toolFilters = configService.getToolFilters();
  const localServers = configService.getLocalServers();
  const remoteServers = configService.getRemoteServers();

  interface ServerTokenInfo {
    name: string;
    type: string;
    totalTokens: number;
    toolCount: number;
    tools: Array<{ name: string; tokens: number }>;
  }

  const servers: ServerTokenInfo[] = [];
  let grandTotal = 0;

  // Process local servers
  for (const server of localServers) {
    const filter = toolFilters[server.id];
    if (!filter?.toolsData) continue;

    const serverInfo: ServerTokenInfo = {
      name: server.name,
      type: "stdio",
      totalTokens: filter.totalTokens || 0,
      toolCount: filter.allTools?.length || 0,
      tools: Object.entries(filter.toolsData).map(([name, data]) => ({
        name,
        tokens: data.tokens || 0,
      })),
    };

    servers.push(serverInfo);
    grandTotal += serverInfo.totalTokens;
  }

  // Process remote servers
  for (const server of remoteServers) {
    const filter = toolFilters[`remote:${server.id}`];
    if (!filter?.toolsData) continue;

    const serverInfo: ServerTokenInfo = {
      name: server.name,
      type: server.type,
      totalTokens: filter.totalTokens || 0,
      toolCount: filter.allTools?.length || 0,
      tools: Object.entries(filter.toolsData).map(([name, data]) => ({
        name,
        tokens: data.tokens || 0,
      })),
    };

    servers.push(serverInfo);
    grandTotal += serverInfo.totalTokens;
  }

  if (servers.length === 0) {
    console.log(`  ${colors.gray}No token data available.${colors.reset}`);
    console.log(`  ${colors.gray}Test servers to discover tools and count tokens.${colors.reset}`);
  } else {
    for (const server of servers) {
      const typeLabel = server.type !== "stdio" ? ` (${server.type})` : "";
      console.log(
        `  ${colors.cyan}${server.name}${colors.reset}${typeLabel}: ${colors.magenta}${formatTokens(server.totalTokens)}${colors.reset} tokens (${server.toolCount} tools)`
      );

      // Show top 5 tools by tokens
      const topTools = server.tools.sort((a, b) => b.tokens - a.tokens).slice(0, 5);
      for (const tool of topTools) {
        console.log(`    ${colors.gray}${tool.name}${colors.reset}: ${formatTokens(tool.tokens)}`);
      }
      if (server.tools.length > 5) {
        console.log(`    ${colors.gray}... and ${server.tools.length - 5} more${colors.reset}`);
      }
      console.log();
    }

    console.log(
      `  ${colors.bright}Total: ${colors.magenta}${formatTokens(grandTotal)}${colors.reset} tokens`
    );
  }

  console.log(`\n${colors.gray}  Press any key to continue...${colors.reset}`);
  await waitForKey();
}
