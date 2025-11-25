/**
 * Server commands - list, add, remove, edit, test, enable, disable
 */

import { Command } from "commander";
import { colors, c } from "../../shared/colors.js";
import { outputJson } from "../../shared/formatters.js";
import { getConfigService } from "../../services/config.service.js";
import { getTestingService } from "../../services/testing.service.js";
import type { LocalServer, RemoteServer, TransportType } from "../../types/index.js";

/** Register server commands */
export function registerServerCommands(program: Command): void {
  // List servers
  program
    .command("list")
    .alias("ls")
    .description("List all configured servers")
    .option("--json", "Output in JSON format")
    .option("--tokens", "Show token counts per server")
    .action(async (options) => {
      const configService = getConfigService();
      const servers = configService.getLocalServers();
      const remoteServers = configService.getRemoteServers();
      const toolFilters = configService.getToolFilters();

      if (options.json) {
        outputJson({
          servers: servers.map((s) => ({
            ...s,
            type: "stdio",
            toolCount: toolFilters[s.id]?.allTools?.length || 0,
            tokens: toolFilters[s.id]?.totalTokens || 0,
          })),
          remoteServers: remoteServers.map((s) => ({
            ...s,
            toolCount: toolFilters[`remote:${s.id}`]?.allTools?.length || 0,
            tokens: toolFilters[`remote:${s.id}`]?.totalTokens || 0,
          })),
        });
        return;
      }

      console.log(`\n${colors.bright}${colors.cyan}MCP Servers${colors.reset}\n`);

      if (servers.length === 0 && remoteServers.length === 0) {
        console.log(`${colors.gray}No servers configured.${colors.reset}`);
        console.log(`${colors.gray}Use 'mcpsm add' to add a new server.${colors.reset}`);
        return;
      }

      if (servers.length > 0) {
        console.log(`${colors.bright}Local Servers (STDIO):${colors.reset}`);
        for (const server of servers) {
          const filter = toolFilters[server.id];
          const status = server.disabled
            ? `${colors.red}disabled${colors.reset}`
            : `${colors.green}enabled${colors.reset}`;
          const toolCount = filter?.allTools?.length || 0;
          const tokens =
            options.tokens && filter?.totalTokens
              ? ` · ${colors.magenta}${filter.totalTokens} tokens${colors.reset}`
              : "";

          console.log(
            `  ${colors.cyan}${server.name}${colors.reset} [${server.id}] - ${status} · ${toolCount} tools${tokens}`
          );
          console.log(
            `    ${colors.gray}${server.command} ${server.args.join(" ")}${colors.reset}`
          );
        }
      }

      if (remoteServers.length > 0) {
        if (servers.length > 0) console.log();
        console.log(`${colors.bright}Remote Servers:${colors.reset}`);
        for (const server of remoteServers) {
          const filter = toolFilters[`remote:${server.id}`];
          const status = server.disabled
            ? `${colors.red}disabled${colors.reset}`
            : `${colors.green}enabled${colors.reset}`;
          const toolCount = filter?.allTools?.length || 0;
          const tokens =
            options.tokens && filter?.totalTokens
              ? ` · ${colors.magenta}${filter.totalTokens} tokens${colors.reset}`
              : "";

          console.log(
            `  ${colors.cyan}${server.name}${colors.reset} [${server.id}] (${server.type}) - ${status} · ${toolCount} tools${tokens}`
          );
          console.log(`    ${colors.gray}${server.url}${colors.reset}`);
        }
      }
    });

  // Add server
  program
    .command("add <name>")
    .description("Add a new MCP server")
    .option("-t, --type <type>", "Server type: stdio, http, sse")
    .option("-c, --command <command>", "Command to run (for stdio)")
    .option("-a, --args <args>", "Command arguments (for stdio)")
    .option("-u, --url <url>", "Server URL (for http/sse)")
    .option("--token <token>", "Bearer token (for http/sse)")
    .option("--test", "Test the server after adding")
    .action(async (name, options) => {
      const configService = getConfigService();

      const serverId = configService.generateServerId(name);

      // Determine type
      const serverType: "stdio" | "http" | "sse" | undefined =
        options.type === "stdio" || options.type === "http" || options.type === "sse"
          ? options.type
          : undefined;
      if (!serverType) {
        console.log(`${c.cross} Server type is required`);
        console.log(
          `${colors.gray}Use: mcpsm add <name> -t <stdio|http|sse> [options]${colors.reset}`
        );
        process.exit(1);
      }

      if (serverType === "stdio") {
        // Local server
        const command = options.command;
        if (!command) {
          console.log(`${c.cross} Command is required for stdio servers`);
          console.log(
            `${colors.gray}Use: mcpsm add <name> -t stdio -c <command> [-a <args>]${colors.reset}`
          );
          process.exit(1);
        }

        let args: string[] = [];
        if (options.args) {
          args = options.args.split(/[\s,]+/).filter(Boolean);
        }

        const server: LocalServer = {
          id: serverId,
          name,
          command,
          args,
        };

        const result = configService.addLocalServer(server);
        if (!result.success) {
          console.log(`${c.cross} ${result.error}`);
          process.exit(1);
        }

        console.log(`${c.checkmark} Server '${name}' added successfully!`);

        // Test if --test flag provided
        if (options.test) {
          process.stdout.write(`  Testing ${colors.cyan}${name}${colors.reset}... `);
          const testingService = getTestingService();
          const testResult = await testingService.testLocalServer(server);
          if (testResult.success) {
            console.log(`${c.checkmark} OK (${testResult.toolCount} tools)`);
          } else {
            console.log(`${c.cross} FAILED - ${testResult.error}`);
          }
        }
      } else {
        // Remote server
        const url = options.url;
        if (!url) {
          console.log(`${c.cross} URL is required for remote servers`);
          console.log(
            `${colors.gray}Use: mcpsm add <name> -t <http|sse> -u <url> [--token <token>]${colors.reset}`
          );
          process.exit(1);
        }

        const server: RemoteServer = {
          id: serverId,
          name,
          type: serverType as TransportType,
          url,
        };

        if (options.token) {
          server.bearerToken = options.token;
        }

        const result = configService.addRemoteServer(server);
        if (!result.success) {
          console.log(`${c.cross} ${result.error}`);
          process.exit(1);
        }

        console.log(`${c.checkmark} Server '${name}' added successfully!`);

        // Test if --test flag provided
        if (options.test) {
          process.stdout.write(`  Testing ${colors.cyan}${name}${colors.reset}... `);
          const testingService = getTestingService();
          const testResult = await testingService.testRemoteServer(server);
          if (testResult.success) {
            console.log(`${c.checkmark} OK (${testResult.toolCount} tools)`);
          } else {
            console.log(`${c.cross} FAILED - ${testResult.error}`);
          }
        }
      }
    });

  // Remove server
  program
    .command("remove <nameOrId>")
    .aliases(["rm", "delete"])
    .description("Remove a server")
    .option("-y, --yes", "Confirm deletion (required for CLI usage)")
    .action(async (nameOrId, options) => {
      if (!options.yes) {
        console.log(`${c.cross} Confirmation required`);
        console.log(`${colors.gray}Please run with --yes or -y to confirm deletion${colors.reset}`);
        console.log(`${colors.gray}Example: mcpsm remove ${nameOrId} --yes${colors.reset}`);
        process.exit(1);
      }

      const configService = getConfigService();
      const result = configService.findServer(nameOrId);

      if (!result) {
        console.log(`${c.cross} Server '${nameOrId}' not found`);
        process.exit(1);
      }

      const { server } = result;

      const deleteResult = configService.deleteServer(server.id);
      if (deleteResult.success) {
        console.log(`${c.checkmark} Server '${server.name}' deleted`);
      } else {
        console.log(`${c.cross} ${deleteResult.error}`);
        process.exit(1);
      }
    });

  // Edit server
  program
    .command("edit <nameOrId>")
    .description("Edit a server")
    .option("-n, --name <name>", "New name")
    .option("-u, --url <url>", "New URL (remote only)")
    .option("-t, --type <type>", "New type: http or sse (remote only)")
    .option("--token <token>", "New bearer token (remote only)")
    .option("-c, --command <command>", "New command (local only)")
    .option("-a, --args <args>", "New arguments (local only)")
    .action(async (nameOrId, options) => {
      const configService = getConfigService();
      const result = configService.findServer(nameOrId);

      if (!result) {
        console.log(`${c.cross} Server '${nameOrId}' not found`);
        process.exit(1);
      }

      const { server, type } = result;

      if (type === "local") {
        const updates: Partial<LocalServer> = {};
        if (options.name) updates.name = options.name;
        if (options.command) updates.command = options.command;
        if (options.args) updates.args = options.args.split(/[\s,]+/).filter(Boolean);

        if (Object.keys(updates).length === 0) {
          console.log(`${colors.yellow}No changes specified${colors.reset}`);
          return;
        }

        const updateResult = configService.updateLocalServer(server.id, updates);
        if (updateResult.success) {
          console.log(`${c.checkmark} Server '${server.name}' updated`);
        } else {
          console.log(`${c.cross} ${updateResult.error}`);
          process.exit(1);
        }
      } else {
        const updates: Partial<RemoteServer> = {};
        if (options.name) updates.name = options.name;
        if (options.url) updates.url = options.url;
        if (options.type) updates.type = options.type as TransportType;
        if (options.token) updates.bearerToken = options.token;

        if (Object.keys(updates).length === 0) {
          console.log(`${colors.yellow}No changes specified${colors.reset}`);
          return;
        }

        const updateResult = configService.updateRemoteServer(server.id, updates);
        if (updateResult.success) {
          console.log(`${c.checkmark} Server '${server.name}' updated`);
        } else {
          console.log(`${c.cross} ${updateResult.error}`);
          process.exit(1);
        }
      }
    });

  // Test server
  program
    .command("test [nameOrId]")
    .description("Test a server or all servers")
    .option("--json", "Output in JSON format")
    .action(async (nameOrId, options) => {
      const configService = getConfigService();
      const testingService = getTestingService();

      if (nameOrId) {
        // Test specific server
        const result = configService.findServer(nameOrId);
        if (!result) {
          console.log(`${c.cross} Server '${nameOrId}' not found`);
          process.exit(1);
        }

        const { server, type } = result;
        process.stdout.write(`Testing ${colors.cyan}${server.name}${colors.reset}... `);

        const testResult = await testingService.testServer(server, type);

        if (options.json) {
          outputJson({ server: server.name, ...testResult });
        } else if (testResult.success) {
          console.log(`${c.checkmark} OK (${testResult.toolCount} tools)`);
        } else {
          console.log(`${c.cross} FAILED - ${testResult.error}`);
        }
      } else {
        // Test all servers
        console.log(`\n${colors.bright}${colors.cyan}Testing All Servers${colors.reset}\n`);

        const results = await testingService.testAllServers();

        if (options.json) {
          outputJson(
            results.map((r) => ({
              server: r.server.name,
              type: r.type,
              ...r.result,
            }))
          );
          return;
        }

        for (const { server, type, result } of results) {
          const typeLabel = type === "local" ? "" : ` (${(server as RemoteServer).type})`;
          if (result.success) {
            console.log(
              `  ${c.checkmark} ${colors.cyan}${server.name}${colors.reset}${typeLabel} - ${result.toolCount} tools`
            );
          } else {
            console.log(
              `  ${c.cross} ${colors.cyan}${server.name}${colors.reset}${typeLabel} - ${result.error}`
            );
          }
        }

        const passed = results.filter((r) => r.result.success).length;
        const failed = results.filter((r) => !r.result.success).length;
        const totalTools = results.reduce((sum, r) => sum + (r.result.toolCount || 0), 0);

        console.log(`\n${colors.bright}Summary:${colors.reset}`);
        console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
        if (failed > 0) {
          console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
        }
        console.log(`  ${colors.magenta}Total tools: ${totalTools}${colors.reset}`);
      }
    });

  // Enable server
  program
    .command("enable <nameOrId>")
    .description("Enable a server")
    .action(async (nameOrId) => {
      const configService = getConfigService();
      const result = configService.enableServer(nameOrId);

      if (result.success) {
        console.log(`${c.checkmark} Server '${nameOrId}' enabled`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });

  // Disable server
  program
    .command("disable <nameOrId>")
    .description("Disable a server")
    .action(async (nameOrId) => {
      const configService = getConfigService();
      const result = configService.disableServer(nameOrId);

      if (result.success) {
        console.log(`${c.checkmark} Server '${nameOrId}' disabled`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });
}
