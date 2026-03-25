/**
 * Client Strategy Registry
 * Manages client strategy instances and provides factory functions
 */

import type { ClientId } from "../../types/index.js";
import type { IClientStrategy } from "../../types/client-strategy.types.js";

// Strategy imports
import { ClaudeStrategy } from "./claude.strategy.js";
import { CursorStrategy } from "./cursor.strategy.js";
import { WindsurfStrategy } from "./windsurf.strategy.js";
import { VSCodeStrategy } from "./vscode.strategy.js";
import { ClaudeCodeStrategy } from "./claude-code.strategy.js";
import { CodexStrategy } from "./codex.strategy.js";
import { GeminiStrategy } from "./gemini.strategy.js";
import { ZedStrategy } from "./zed.strategy.js";
import { AntigravityStrategy } from "./antigravity.strategy.js";
import { OpenCodeStrategy } from "./opencode.strategy.js";
import { CopilotStrategy } from "./copilot.strategy.js";

/**
 * Strategy factory - creates strategy instances
 */
const strategyFactories: Record<ClientId, () => IClientStrategy> = {
  claude: () => new ClaudeStrategy(),
  cursor: () => new CursorStrategy(),
  windsurf: () => new WindsurfStrategy(),
  vscode: () => new VSCodeStrategy(),
  "claude-code": () => new ClaudeCodeStrategy(),
  codex: () => new CodexStrategy(),
  gemini: () => new GeminiStrategy(),
  zed: () => new ZedStrategy(),
  antigravity: () => new AntigravityStrategy(),
  opencode: () => new OpenCodeStrategy(),
  copilot: () => new CopilotStrategy(),
};

/**
 * Strategy cache - lazy initialization
 */
const strategyCache = new Map<ClientId, IClientStrategy>();

/**
 * Get a strategy instance for a client
 */
export function getClientStrategy(clientId: ClientId): IClientStrategy | null {
  if (!strategyFactories[clientId]) {
    return null;
  }

  let strategy = strategyCache.get(clientId);
  if (!strategy) {
    strategy = strategyFactories[clientId]();
    strategyCache.set(clientId, strategy);
  }

  return strategy;
}

/**
 * Get all registered client IDs
 */
export function getRegisteredClientIds(): ClientId[] {
  return Object.keys(strategyFactories) as ClientId[];
}

/**
 * Register a new client strategy (for extensibility)
 */
export function registerClientStrategy(clientId: string, factory: () => IClientStrategy): void {
  (strategyFactories as Record<string, () => IClientStrategy>)[clientId] = factory;
  // Clear cache for this client if it exists
  strategyCache.delete(clientId as ClientId);
}

/**
 * Clear strategy cache (useful for testing)
 */
export function clearStrategyCache(): void {
  strategyCache.clear();
}
