/**
 * Profile commands - list, create, delete, use, add, remove
 */

import { Command } from "commander";
import { colors, c } from "../../shared/colors.js";
import { outputJson } from "../../shared/formatters.js";
import { getProfileService } from "../../services/profile.service.js";

/** Register profile commands */
export function registerProfileCommands(program: Command): void {
  const profile = program.command("profile").description("Manage server profiles");

  // List profiles (default)
  profile
    .command("list", { isDefault: true })
    .description("List all profiles")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      const profileService = getProfileService();
      const profiles = profileService.list();

      if (options.json) {
        outputJson(profiles);
        return;
      }

      console.log(`\n${colors.bright}${colors.cyan}Profiles${colors.reset}\n`);

      for (const p of profiles) {
        const active = p.isActive ? ` ${colors.green}(active)${colors.reset}` : "";
        const servers = p.includesAll
          ? `${colors.gray}all servers${colors.reset}`
          : `${p.serverCount} server(s)`;

        console.log(`  ${colors.cyan}${p.id}${colors.reset} - ${p.name}${active}`);
        console.log(`    ${servers}`);
      }

      console.log(
        `\n${colors.gray}Use 'mcpsm profile use <name>' to switch profiles${colors.reset}`
      );
    });

  // Create profile
  profile
    .command("create <name> [displayName]")
    .description("Create a new profile")
    .action(async (name: string, displayName?: string) => {
      const profileService = getProfileService();
      const id = name.toLowerCase().replace(/\s+/g, "-");

      const result = profileService.create(id, displayName || name);

      if (result.success) {
        console.log(`${c.checkmark} Profile '${displayName || name}' created`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });

  // Delete profile
  profile
    .command("delete <name>")
    .alias("rm")
    .description("Delete a profile")
    .option("-y, --yes", "Confirm deletion (required for non-interactive mode)")
    .action(async (name: string, options) => {
      const isInteractive = process.stdin.isTTY;
      if (!options.yes && !isInteractive) {
        console.log(`${c.cross} Confirmation required in non-interactive mode`);
        console.log(`${colors.gray}Please run with --yes or -y to confirm deletion${colors.reset}`);
        console.log(`${colors.gray}Example: mcpsm profile delete ${name} --yes${colors.reset}`);
        process.exit(1);
      }

      const profileService = getProfileService();
      const result = profileService.delete(name);

      if (result.success) {
        console.log(`${c.checkmark} Profile deleted`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });

  // Use profile
  profile
    .command("use <name>")
    .description("Switch to a profile")
    .action(async (name: string) => {
      const profileService = getProfileService();
      const result = profileService.use(name);

      if (result.success) {
        console.log(`${c.checkmark} Switched to profile '${name}'`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });

  // Add server to profile
  profile
    .command("add <profile> <server>")
    .description("Add a server to a profile")
    .action(async (profileId: string, serverId: string) => {
      const profileService = getProfileService();
      const result = profileService.addServer(profileId, serverId);

      if (result.success) {
        console.log(`${c.checkmark} Server '${serverId}' added to profile '${profileId}'`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });

  // Remove server from profile
  profile
    .command("remove <profile> <server>")
    .description("Remove a server from a profile")
    .action(async (profileId: string, serverId: string) => {
      const profileService = getProfileService();
      const result = profileService.removeServer(profileId, serverId);

      if (result.success) {
        console.log(`${c.checkmark} Server '${serverId}' removed from profile '${profileId}'`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });

  // Rename profile
  profile
    .command("rename <profile> <newName>")
    .description("Rename a profile")
    .action(async (profileId: string, newName: string) => {
      const profileService = getProfileService();
      const result = profileService.rename(profileId, newName);

      if (result.success) {
        console.log(`${c.checkmark} Profile renamed to '${newName}'`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });

  // Clone profile
  profile
    .command("clone <source> <target> [displayName]")
    .description("Clone an existing profile")
    .action(async (source: string, target: string, displayName?: string) => {
      const profileService = getProfileService();
      const result = profileService.clone(source, target, displayName);

      if (result.success) {
        const name = displayName || profileService.getProfile(target)?.name;
        console.log(`${c.checkmark} Profile cloned: ${source} → ${target} ('${name}')`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });
}
