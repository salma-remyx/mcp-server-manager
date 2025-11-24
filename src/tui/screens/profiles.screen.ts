/**
 * Profiles Screen - Manage server profiles
 */

import { colors, clearScreen } from "../../shared/colors.js";
import { promptText, promptConfirm, waitForKey } from "../../shared/prompts.js";
import { getProfileService } from "../../services/profile.service.js";
import type { ProfileListItem } from "../../types/index.js";

/** Profiles screen state */
interface ProfilesState {
  profiles: ProfileListItem[];
  currentIndex: number;
  running: boolean;
}

/** Show profiles management screen */
export async function showProfilesScreen(): Promise<void> {
  const profileService = getProfileService();

  const state: ProfilesState = {
    profiles: profileService.list(),
    currentIndex: 0,
    running: true,
  };

  while (state.running) {
    renderProfilesScreen(state);

    const key = await waitForKeypress();
    await handleProfilesKeypress(state, key, profileService);
  }
}

/** Render the profiles screen */
function renderProfilesScreen(state: ProfilesState): void {
  clearScreen();
  console.log(`\n${colors.bright}${colors.cyan}  Profiles${colors.reset}\n`);

  for (let i = 0; i < state.profiles.length; i++) {
    const profile = state.profiles[i];
    const isCurrent = i === state.currentIndex;
    const cursor = isCurrent ? `${colors.cyan}→${colors.reset}` : " ";

    const active = profile.isActive ? ` ${colors.green}(active)${colors.reset}` : "";
    const servers = profile.includesAll
      ? `${colors.gray}all servers${colors.reset}`
      : `${profile.serverCount} server(s)`;

    const name = isCurrent
      ? `${colors.bright}${colors.cyan}${profile.name}${colors.reset}`
      : profile.name;

    console.log(`  ${cursor} ${name} [${profile.id}]${active}`);
    console.log(`      ${servers}`);
  }

  console.log();
  console.log(`${colors.gray}  ↑/↓ Navigate  ENTER Use  N New  D Delete  Q Back${colors.reset}`);
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

/** Handle keypress in profiles screen */
async function handleProfilesKeypress(
  state: ProfilesState,
  key: string,
  profileService: ReturnType<typeof getProfileService>
): Promise<void> {
  // Quit
  if (key === "q" || key === "\u0003" || key === "\u001B") {
    state.running = false;
    return;
  }

  // Navigation - Up
  if (key === "\u001B[A" && state.profiles.length > 0) {
    state.currentIndex = (state.currentIndex - 1 + state.profiles.length) % state.profiles.length;
    return;
  }

  // Navigation - Down
  if (key === "\u001B[B" && state.profiles.length > 0) {
    state.currentIndex = (state.currentIndex + 1) % state.profiles.length;
    return;
  }

  // Use profile - Enter
  if ((key === "\r" || key === "\n") && state.profiles.length > 0) {
    const profile = state.profiles[state.currentIndex];
    const result = profileService.use(profile.id);
    if (result.success) {
      state.profiles = profileService.list();
    }
    return;
  }

  // New profile - N
  if (key.toLowerCase() === "n") {
    clearScreen();
    console.log(`\n${colors.bright}${colors.cyan}  Create New Profile${colors.reset}\n`);

    const name = await promptText("Profile name");
    if (name) {
      const id = name.toLowerCase().replace(/\s+/g, "-");
      const result = profileService.create(id, name);
      if (result.success) {
        console.log(`${colors.green}✓${colors.reset} Profile '${name}' created`);
      } else {
        console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
      }
      await waitForKey();
      state.profiles = profileService.list();
    }
    return;
  }

  // Delete profile - D
  if (key.toLowerCase() === "d" && state.profiles.length > 0) {
    const profile = state.profiles[state.currentIndex];

    if (profile.id === "default") {
      clearScreen();
      console.log(`\n${colors.red}Cannot delete the default profile${colors.reset}`);
      await waitForKey();
      return;
    }

    clearScreen();
    console.log(`\n${colors.bright}${colors.red}  Delete Profile${colors.reset}\n`);

    const confirmed = await promptConfirm(`Delete profile '${profile.name}'?`, false);
    if (confirmed) {
      const result = profileService.delete(profile.id);
      if (result.success) {
        console.log(`${colors.green}✓${colors.reset} Profile deleted`);
        state.currentIndex = Math.max(0, state.currentIndex - 1);
      } else {
        console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
      }
      await waitForKey();
      state.profiles = profileService.list();
    }
    return;
  }
}

export default showProfilesScreen;
