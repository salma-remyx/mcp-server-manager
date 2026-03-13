/**
 * Profile service - manages server profiles
 *
 * Each profile owns its own embedded server objects.
 * When switching profiles, the profile's servers are loaded into config.json.
 * After any server mutation, syncFromConfig() copies config.json servers back into the active profile.
 */

import fs from "fs";
import type {
  Profile,
  ProfilesConfig,
  ProfileListItem,
  ProfileResult,
  LocalServer,
  RemoteServer,
} from "../types/index.js";
import { getConfigService } from "./config.service.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("ProfileService");

/** Default profiles configuration */
const DEFAULT_PROFILES: ProfilesConfig = {
  activeProfile: "default",
  profiles: {
    default: {
      name: "Default",
      servers: [],
      remoteServers: [],
    },
  },
};

/** Profile service class */
export class ProfileService {
  private profilesPath: string;
  private profiles: ProfilesConfig;

  constructor() {
    const configService = getConfigService();
    this.profilesPath = configService.getPaths().profilesPath;
    this.profiles = this.load();
    this.migrateIfNeeded();
  }

  /** Load profiles from file */
  private load(): ProfilesConfig {
    try {
      if (fs.existsSync(this.profilesPath)) {
        const data = fs.readFileSync(this.profilesPath, "utf8");
        const parsed = JSON.parse(data) as Partial<ProfilesConfig>;
        return { ...DEFAULT_PROFILES, ...parsed };
      }
    } catch (error) {
      log.debug("Failed to load profiles, using defaults:", error);
    }
    return { ...DEFAULT_PROFILES };
  }

  /** Migrate old string-ID profiles to embedded server objects */
  private migrateIfNeeded(): void {
    const configService = getConfigService();
    let changed = false;

    for (const [_id, profile] of Object.entries(this.profiles.profiles)) {
      // Detect old format: servers array contains strings instead of objects
      if (profile.servers.length > 0 && typeof profile.servers[0] === "string") {
        const serverIds = profile.servers as unknown as string[];
        const remoteIds = profile.remoteServers as unknown as string[];
        profile.servers = configService
          .getLocalServers()
          .filter((s) => serverIds.includes(s.id))
          .map((s) => ({ ...s }));
        profile.remoteServers = configService
          .getRemoteServers()
          .filter((s) => remoteIds.includes(s.id))
          .map((s) => ({ ...s }));
        changed = true;
      } else if (profile.servers.length === 0 && profile.remoteServers.length === 0) {
        // Old "include all" semantic — populate from config.json
        const localServers = configService.getLocalServers();
        const remoteServers = configService.getRemoteServers();
        if (localServers.length > 0 || remoteServers.length > 0) {
          profile.servers = localServers.map((s) => ({ ...s }));
          profile.remoteServers = remoteServers.map((s) => ({ ...s }));
          changed = true;
        }
      }
    }

    if (changed) {
      this.save();
    }
  }

  /** Save profiles to file */
  private save(): void {
    fs.writeFileSync(this.profilesPath, JSON.stringify(this.profiles, null, 2));
  }

  /** Get active profile ID */
  getActiveProfileId(): string {
    return this.profiles.activeProfile;
  }

  /** Get active profile */
  getActiveProfile(): Profile | undefined {
    return this.profiles.profiles[this.profiles.activeProfile];
  }

  /** Get profile by ID */
  getProfile(id: string): Profile | undefined {
    return this.profiles.profiles[id];
  }

  /** List all profiles */
  list(): ProfileListItem[] {
    return Object.entries(this.profiles.profiles).map(([id, profile]) => ({
      id,
      name: profile.name,
      serverCount: profile.servers.length + profile.remoteServers.length,
      isActive: id === this.profiles.activeProfile,
    }));
  }

  /** Create a new profile (starts with no servers) */
  create(id: string, name?: string): ProfileResult {
    if (this.profiles.profiles[id]) {
      return { success: false, error: "Profile already exists" };
    }

    this.profiles.profiles[id] = {
      name: name || id,
      servers: [],
      remoteServers: [],
    };

    this.save();
    return { success: true };
  }

  /** Clone a profile (deep copies server objects) */
  clone(sourceId: string, newId: string, newName?: string): ProfileResult {
    const source = this.profiles.profiles[sourceId];
    if (!source) {
      return { success: false, error: "Source profile not found" };
    }

    if (this.profiles.profiles[newId]) {
      return { success: false, error: "Profile already exists" };
    }

    this.profiles.profiles[newId] = {
      name: newName || `${source.name} (Copy)`,
      servers: JSON.parse(JSON.stringify(source.servers)),
      remoteServers: JSON.parse(JSON.stringify(source.remoteServers)),
      toolFilters: source.toolFilters ? JSON.parse(JSON.stringify(source.toolFilters)) : undefined,
    };

    this.save();
    return { success: true };
  }

  /** Delete a profile */
  delete(id: string): ProfileResult {
    if (id === this.profiles.activeProfile) {
      return { success: false, error: "Cannot delete active profile" };
    }

    if (!this.profiles.profiles[id]) {
      return { success: false, error: "Profile not found" };
    }

    delete this.profiles.profiles[id];

    this.save();
    return { success: true };
  }

  /** Switch to a profile — loads profile's servers into config.json */
  use(id: string): ProfileResult {
    if (!this.profiles.profiles[id]) {
      return { success: false, error: "Profile not found" };
    }

    // Save current config into the currently active profile before switching
    this.syncFromConfig();

    this.profiles.activeProfile = id;
    this.save();

    // Load the new profile's servers into config.json
    const profile = this.profiles.profiles[id];
    const configService = getConfigService();
    const config = configService.getConfig();
    config.servers = JSON.parse(JSON.stringify(profile.servers));
    config.remoteServers = JSON.parse(JSON.stringify(profile.remoteServers));
    configService.saveConfig();
    configService.reload();

    return { success: true };
  }

  /** Sync current config.json servers into the active profile */
  syncFromConfig(): void {
    const profile = this.getActiveProfile();
    if (!profile) return;

    const configService = getConfigService();
    profile.servers = configService.getLocalServers().map((s) => ({ ...s }));
    profile.remoteServers = configService.getRemoteServers().map((s) => ({ ...s }));
    this.save();
  }

  /** Get servers for active profile (returns the embedded arrays directly) */
  getServersForActiveProfile(): { servers: LocalServer[]; remoteServers: RemoteServer[] } {
    const profile = this.getActiveProfile();
    if (!profile) {
      const configService = getConfigService();
      return {
        servers: configService.getLocalServers(),
        remoteServers: configService.getRemoteServers(),
      };
    }

    return {
      servers: profile.servers,
      remoteServers: profile.remoteServers,
    };
  }

  /** Get servers for a specific profile */
  getServersForProfile(
    profileId: string
  ): { servers: LocalServer[]; remoteServers: RemoteServer[] } | null {
    const profile = this.getProfile(profileId);
    if (!profile) {
      return null;
    }

    return {
      servers: profile.servers,
      remoteServers: profile.remoteServers,
    };
  }

  /** Rename a profile */
  rename(id: string, newName: string): ProfileResult {
    const profile = this.profiles.profiles[id];
    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    profile.name = newName;
    this.save();
    return { success: true };
  }

  /** Reload profiles from disk */
  reload(): void {
    this.profiles = this.load();
  }

  /** Check if profile exists */
  exists(id: string): boolean {
    return !!this.profiles.profiles[id];
  }
}

/** Singleton instance */
let instance: ProfileService | null = null;

/** Get or create the profile service instance */
export function getProfileService(): ProfileService {
  if (!instance) {
    instance = new ProfileService();
  }
  return instance;
}

/** Reset the singleton instance (for testing) */
export function resetProfileService(): void {
  instance = null;
}

export default ProfileService;
