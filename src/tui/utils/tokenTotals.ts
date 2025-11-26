import type { ServerToolFilter } from "../../types/index.js";

/** Sum enabled tool tokens for a server (returns null if unknown) */
export function getEnabledTokenTotal(filter?: ServerToolFilter | null): number | null {
  if (!filter) return null;

  if (filter.toolsData) {
    const disabled = new Set(filter.disabledTools || []);
    let total = 0;

    for (const [toolName, data] of Object.entries(filter.toolsData)) {
      if (!disabled.has(toolName)) {
        total += data.tokens || 0;
      }
    }

    return total;
  }

  if (typeof filter.totalTokens === "number") {
    return filter.totalTokens;
  }

  return null;
}
