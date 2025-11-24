/**
 * Settings commands - list, get, set, reset
 */

import { Command } from "commander";
import { colors, c } from "../../shared/colors.js";
import { outputJson } from "../../shared/formatters.js";
import { getSettingsService } from "../../services/settings.service.js";
import type { Settings } from "../../types/index.js";

/** Register settings commands */
export function registerSettingsCommands(program: Command): void {
  const settings = program.command("settings").description("Manage application settings");

  // List settings (default)
  settings
    .command("list", { isDefault: true })
    .description("List all settings")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      const settingsService = getSettingsService();
      const allSettings = settingsService.getAll();
      const info = settingsService.getInfo();

      if (options.json) {
        outputJson(allSettings);
        return;
      }

      console.log(`\n${colors.bright}${colors.cyan}Settings${colors.reset}\n`);

      for (const [key, value] of Object.entries(allSettings)) {
        const settingInfo = info[key as keyof Settings];
        const desc = settingInfo?.description || "";
        const isDefault = settingsService.isDefault(key as keyof Settings);

        const valueStr =
          typeof value === "boolean"
            ? value
              ? `${colors.green}true${colors.reset}`
              : `${colors.red}false${colors.reset}`
            : `${colors.cyan}${value}${colors.reset}`;

        const defaultMark = isDefault ? ` ${colors.gray}(default)${colors.reset}` : "";

        console.log(`  ${colors.bright}${key}${colors.reset}: ${valueStr}${defaultMark}`);
        if (desc) {
          console.log(`    ${colors.gray}${desc}${colors.reset}`);
        }
      }

      console.log(
        `\n${colors.gray}Use 'mcpsm settings set <key> <value>' to change a setting${colors.reset}`
      );
    });

  // Get setting
  settings
    .command("get <key>")
    .description("Get a setting value")
    .option("--json", "Output in JSON format")
    .action(async (key: string, options) => {
      const settingsService = getSettingsService();
      const keys = settingsService.getKeys();

      if (!keys.includes(key as keyof Settings)) {
        console.log(`${c.cross} Unknown setting: ${key}`);
        console.log(`Available settings: ${keys.join(", ")}`);
        process.exit(1);
      }

      const value = settingsService.get(key as keyof Settings);

      if (options.json) {
        outputJson({ [key]: value });
      } else {
        console.log(value);
      }
    });

  // Set setting
  settings
    .command("set <key> <value>")
    .description("Set a setting value")
    .action(async (key: string, value: string) => {
      const settingsService = getSettingsService();
      const keys = settingsService.getKeys();

      if (!keys.includes(key as keyof Settings)) {
        console.log(`${c.cross} Unknown setting: ${key}`);
        console.log(`Available settings: ${keys.join(", ")}`);
        process.exit(1);
      }

      const result = settingsService.set(key as keyof Settings, value);

      if (result.success) {
        console.log(`${c.checkmark} ${key} = ${result.value}`);
      } else {
        console.log(`${c.cross} ${result.error}`);
        process.exit(1);
      }
    });

  // Reset settings
  settings
    .command("reset")
    .description("Reset all settings to defaults")
    .action(async () => {
      const settingsService = getSettingsService();
      settingsService.reset();
      console.log(`${c.checkmark} Settings reset to defaults`);
    });
}
