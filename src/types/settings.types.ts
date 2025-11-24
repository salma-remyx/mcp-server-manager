/**
 * Settings-related type definitions
 */

/** Application settings */
export interface Settings {
  /** Gateway port */
  port: number;
  /** Preferred editor for config files */
  editor: string;
  /** Auto-sync servers to enabled clients on changes */
  autoSync: boolean;
  /** Auto-test new servers on startup */
  autoTest: boolean;
  /** TUI theme */
  theme: ThemeOption;
  /** Default profile to use on startup */
  defaultProfile: string;
}

/** Available theme options */
export type ThemeOption = "default" | "minimal" | "colorful";

/** Setting value types */
export type SettingType = "number" | "string" | "boolean";

/** Setting info */
export interface SettingInfo {
  /** Human-readable description */
  description: string;
  /** Value type */
  type: SettingType;
  /** Default value */
  default: string | number | boolean;
  /** Available options for string settings */
  options?: string[];
}

/** Settings info map */
export type SettingsInfo = Record<keyof Settings, SettingInfo>;

/** Setting set result */
export interface SettingResult {
  success: boolean;
  error?: string;
  value?: string | number | boolean;
}
