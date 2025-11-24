/**
 * Settings Screen - Manage application settings
 */

import { colors, clearScreen } from "../../shared/colors.js";
import { promptText, promptConfirm, waitForKey } from "../../shared/prompts.js";
import { getSettingsService } from "../../services/settings.service.js";
import type { Settings } from "../../types/index.js";

/** Settings screen state */
interface SettingsState {
  settings: Settings;
  keys: (keyof Settings)[];
  currentIndex: number;
  running: boolean;
}

/** Show settings management screen */
export async function showSettingsScreen(): Promise<void> {
  const settingsService = getSettingsService();

  const state: SettingsState = {
    settings: settingsService.getAll(),
    keys: settingsService.getKeys(),
    currentIndex: 0,
    running: true,
  };

  while (state.running) {
    renderSettingsScreen(state, settingsService);

    const key = await waitForKeypress();
    await handleSettingsKeypress(state, key, settingsService);
  }
}

/** Render the settings screen */
function renderSettingsScreen(
  state: SettingsState,
  settingsService: ReturnType<typeof getSettingsService>
): void {
  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  Settings${colors.reset}\n`);

  const info = settingsService.getInfo();

  for (let i = 0; i < state.keys.length; i++) {
    const key = state.keys[i];
    const value = state.settings[key];
    const settingInfo = info[key];
    const isCurrent = i === state.currentIndex;
    const cursor = isCurrent ? `${colors.cyan}→${colors.reset}` : " ";

    const isDefault = settingsService.isDefault(key);
    const defaultMark = isDefault ? ` ${colors.gray}(default)${colors.reset}` : "";

    const valueStr =
      typeof value === "boolean"
        ? value
          ? `${colors.green}true${colors.reset}`
          : `${colors.red}false${colors.reset}`
        : `${colors.cyan}${value}${colors.reset}`;

    const keyStr = isCurrent ? `${colors.bright}${colors.white}${key}${colors.reset}` : key;

    console.log(`  ${cursor} ${keyStr}: ${valueStr}${defaultMark}`);
    if (settingInfo?.description) {
      console.log(`      ${colors.gray}${settingInfo.description}${colors.reset}`);
    }
  }

  console.log();
  console.log(
    `${colors.gray}  ↑/↓ Navigate  ENTER Edit  SPACE Toggle (bool)  R Reset all  Q Back${colors.reset}`
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

/** Handle keypress in settings screen */
async function handleSettingsKeypress(
  state: SettingsState,
  key: string,
  settingsService: ReturnType<typeof getSettingsService>
): Promise<void> {
  // Quit
  if (key === "q" || key === "\u0003" || key === "\u001B") {
    state.running = false;
    return;
  }

  // Navigation - Up
  if (key === "\u001B[A") {
    state.currentIndex = (state.currentIndex - 1 + state.keys.length) % state.keys.length;
    return;
  }

  // Navigation - Down
  if (key === "\u001B[B") {
    state.currentIndex = (state.currentIndex + 1) % state.keys.length;
    return;
  }

  // Toggle boolean / Edit - Space or Enter
  if (key === " " || key === "\r" || key === "\n") {
    const settingKey = state.keys[state.currentIndex];
    const currentValue = state.settings[settingKey];
    const info = settingsService.getInfo()[settingKey];

    if (typeof currentValue === "boolean") {
      // Toggle boolean
      settingsService.set(settingKey, !currentValue);
      state.settings = settingsService.getAll();
    } else if (info?.options) {
      // Cycle through options
      const options = info.options;
      const currentIdx = options.indexOf(String(currentValue));
      const nextIdx = (currentIdx + 1) % options.length;
      settingsService.set(settingKey, options[nextIdx]);
      state.settings = settingsService.getAll();
    } else {
      // Prompt for new value
      clearScreen();
      console.log(`\n${colors.bright}${colors.cyan}  Edit Setting${colors.reset}\n`);

      const newValue = await promptText(`${settingKey}`, String(currentValue));
      if (newValue) {
        const result = settingsService.set(settingKey, newValue);
        if (!result.success) {
          console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
          await waitForKey();
        }
        state.settings = settingsService.getAll();
      }
    }
    return;
  }

  // Reset all - R
  if (key.toLowerCase() === "r") {
    clearScreen();
    console.log(`\n${colors.bright}${colors.yellow}  Reset Settings${colors.reset}\n`);

    const confirmed = await promptConfirm("Reset all settings to defaults?", false);
    if (confirmed) {
      settingsService.reset();
      state.settings = settingsService.getAll();
      console.log(`${colors.green}✓${colors.reset} Settings reset`);
      await waitForKey();
    }
    return;
  }
}

export default showSettingsScreen;
