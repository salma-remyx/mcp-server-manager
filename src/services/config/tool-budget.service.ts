/**
 * Token-budget tool gating.
 *
 * Adapted from "Tool Attention Is All You Need: Dynamic Tool Gating and
 * Lazy Schema Loading for Eliminating the MCP/Tools Tax in Scalable Agentic
 * Workflows" (arXiv:2604.21816).
 *
 * The MCP gateway injects every enabled tool's schema into each client turn
 * (the per-turn "tools tax" the paper measures at ~10k-60k tokens in
 * multi-server deployments). This module auto-gates tools to fit a per-server
 * token budget: it ranks the currently-enabled tools and disables the
 * lowest-value ones until the enabled-schema token total fits the budget.
 *
 * It reuses the existing ServerToolFilter contract end-to-end — the gate is
 * applied by adding tools to `disabledTools`, which is the exact field the
 * gateway reads when proxying a client's tool list (see gateway.service.ts),
 * so a budgeted gate directly cuts the live per-turn schema payload.
 *
 * Mode 2 (adapted port). The paper ranks tools with a learned / attention
 * value signal acquired per query. This gateway is a static, config-time
 * proxy with no conversation history, so there is no per-query attention
 * signal to reuse. We substitute a parameter-free value proxy: assuming
 * uniform per-tool value, the best value-per-token ranking keeps the cheapest
 * schemas, so we drop the largest-token tools first — which maximizes the
 * number of tools retained for a given token budget. Callers can pin
 * known-critical tools via `keep` to inject a value signal the static gateway
 * cannot infer on its own.
 */

import type { ServerToolFilter } from "../../types/index.js";

/** Drop order when fitting a budget. */
export type BudgetStrategy = "largest-first" | "smallest-first";

/** Options for {@link computeBudgetGate}. */
export interface BudgetGateOptions {
  /** Tools that must stay enabled regardless of cost (user-pinned "high value"). */
  keep?: string[];
  /** Drop order. Defaults to "largest-first" (retain maximum tool coverage). */
  strategy?: BudgetStrategy;
}

/** Result of fitting a server's enabled tools to a token budget. */
export interface BudgetGateResult {
  /** The token budget the gate was fit to. */
  budget: number;
  /** Enabled-schema token total before gating (the current "tools tax"). */
  beforeTokens: number;
  /** Tools to disable (in drop order) so the result fits the budget. */
  disable: string[];
  /** Resulting enabled tool set after applying the gate. */
  enabled: string[];
  /** Enabled-schema token total after gating. */
  afterTokens: number;
  /** Whether the resulting total fits within the budget. */
  withinBudget: boolean;
}

/**
 * Sum schema tokens for currently-enabled tools. Mirrors the semantics of
 * `getEnabledTokenTotal` (tui/utils/tokenTotals.ts); duplicated locally so the
 * services layer does not depend on the TUI layer.
 */
function sumEnabledTokens(filter: ServerToolFilter | undefined): number {
  if (!filter?.toolsData) {
    return typeof filter?.totalTokens === "number" ? filter.totalTokens : 0;
  }

  const disabled = new Set(filter.disabledTools || []);
  let total = 0;
  for (const [name, data] of Object.entries(filter.toolsData)) {
    if (!disabled.has(name)) {
      total += data.tokens || 0;
    }
  }
  return total;
}

/**
 * Decide which tools to gate out so the enabled-schema token total fits
 * `budget`. Pure: it does not mutate the filter. Apply the result by adding
 * the returned `disable` list to the filter's `disabledTools`.
 *
 * Tools without per-tool token data (`toolsData` absent) cannot be ranked, so
 * the gate returns an empty disable list and reports whether the server's
 * `totalTokens` already fits.
 */
export function computeBudgetGate(
  filter: ServerToolFilter | undefined,
  budget: number,
  options: BudgetGateOptions = {}
): BudgetGateResult {
  const limit = Math.max(0, Math.floor(budget));
  const strategy: BudgetStrategy = options.strategy ?? "largest-first";
  const keep = new Set(options.keep || []);

  const allTools = filter?.allTools || [];
  const disabled = new Set(filter?.disabledTools || []);
  const enabledTools = allTools.filter((t) => !disabled.has(t));

  const beforeTokens = sumEnabledTokens(filter);

  // Without per-tool token data we cannot rank individual tools for gating.
  if (!filter?.toolsData) {
    return {
      budget: limit,
      beforeTokens,
      disable: [],
      enabled: enabledTools,
      afterTokens: beforeTokens,
      withinBudget: beforeTokens <= limit,
    };
  }

  const toolsData = filter.toolsData;
  const tokensOf = (name: string): number => toolsData[name]?.tokens || 0;

  // Candidates are enabled, non-pinned tools we are allowed to drop.
  const droppable = enabledTools.filter((t) => !keep.has(t));
  const sorted = [...droppable].sort((a, b) => {
    const diff =
      strategy === "largest-first" ? tokensOf(b) - tokensOf(a) : tokensOf(a) - tokensOf(b);
    // Deterministic tiebreak so identical-cost tools gate in a stable order.
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  const toDisable: string[] = [];
  let running = beforeTokens;
  for (const tool of sorted) {
    if (running <= limit) break;
    toDisable.push(tool);
    running -= tokensOf(tool);
  }

  const disabledAfter = new Set([...disabled, ...toDisable]);
  const enabledAfter = allTools.filter((t) => !disabledAfter.has(t));

  return {
    budget: limit,
    beforeTokens,
    disable: toDisable,
    enabled: enabledAfter,
    afterTokens: running,
    withinBudget: running <= limit,
  };
}

/**
 * Parse a human-friendly token budget string into a token count.
 * Accepts plain integers ("8000") or k/m suffixes ("8k", "2.5k", "1m").
 * Returns null when the input cannot be parsed.
 */
export function parseTokenBudget(input: string): number | null {
  const match = input
    .trim()
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)\s*([km]?)$/);
  if (!match || match[1] === undefined) return null;

  const value = parseFloat(match[1]);
  const suffix = match[2];
  const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1;
  return Math.floor(value * multiplier);
}
