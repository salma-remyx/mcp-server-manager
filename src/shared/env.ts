/**
 * Helpers for working with environment variable inputs
 */

import type { Result } from "../types/index.js";

/**
 * Parse user-provided environment variable input into an object.
 * Accepts strings or string arrays (e.g., commander variadic options),
 * and splits entries on commas or whitespace.
 */
export function parseEnvInput(input?: string | string[]): Result<Record<string, string>> {
  if (input === undefined) {
    return { success: true, data: {} };
  }

  const env: Record<string, string> = {};
  const entries = Array.isArray(input) ? input : [input];

  for (const rawEntry of entries) {
    const parts = rawEntry
      .split(/[,\s]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      const eqIndex = part.indexOf("=");
      if (eqIndex <= 0) {
        return {
          success: false,
          error: `Invalid environment variable '${part}'. Use KEY=VALUE format.`,
        };
      }

      const key = part.slice(0, eqIndex).trim();
      const value = part.slice(eqIndex + 1);

      if (!key) {
        return {
          success: false,
          error: `Environment variable key is missing in '${part}'.`,
        };
      }

      env[key] = value;
    }
  }

  return { success: true, data: env };
}

/**
 * Normalize parsed env object: return undefined when empty for cleaner configs.
 */
export function normalizeEnv(env?: Record<string, string>): Record<string, string> | undefined {
  if (!env || Object.keys(env).length === 0) {
    return undefined;
  }
  return env;
}
