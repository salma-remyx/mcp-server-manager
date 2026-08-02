import { describe, expect, it } from "vitest";
import { ToolFilterService } from "../src/services/config/tool-filter.service.js";
import type { ConfigRepository } from "../src/services/config/config.repository.js";
import { getEnabledTokenTotal } from "../src/tui/utils/tokenTotals.js";
import { computeBudgetGate, parseTokenBudget } from "../src/services/config/tool-budget.service.js";
import type { ServerToolFilter, ToolFilters } from "../src/types/index.js";

class FakeToolFilterRepository {
  constructor(private filters: ToolFilters = {}) {}

  getToolFilters(): ToolFilters {
    return this.filters;
  }

  updateToolFilters(update: (filters: ToolFilters) => void): void {
    update(this.filters);
  }
}

function createService(initialFilters: ToolFilters = {}): {
  service: ToolFilterService;
  repository: FakeToolFilterRepository;
} {
  const repository = new FakeToolFilterRepository(initialFilters);
  return {
    service: new ToolFilterService(repository as unknown as ConfigRepository),
    repository,
  };
}

// toolsData mirrors what `mcpsm tools discover` records: per-tool schema tokens.
const filterWithTokens = (overrides: Partial<ServerToolFilter> = {}): ServerToolFilter => ({
  allTools: ["read", "search", "fetch", "analyze"],
  disabledTools: [],
  toolsData: {
    read: { tokens: 200 },
    search: { tokens: 3000 },
    fetch: { tokens: 800 },
    analyze: { tokens: 5000 },
  },
  ...overrides,
});

describe("parseTokenBudget", () => {
  it("parses plain integers and k/m suffixes", () => {
    expect(parseTokenBudget("8000")).toBe(8000);
    expect(parseTokenBudget("8k")).toBe(8000);
    expect(parseTokenBudget("2.5k")).toBe(2500);
    expect(parseTokenBudget("1m")).toBe(1_000_000);
    expect(parseTokenBudget(" 12K ")).toBe(12_000);
  });

  it("rejects unparseable input", () => {
    expect(parseTokenBudget("lots")).toBeNull();
    expect(parseTokenBudget("")).toBeNull();
    expect(parseTokenBudget("8gb")).toBeNull();
  });
});

describe("computeBudgetGate", () => {
  it("drops the largest-schema tools first until the budget fits", () => {
    // Enabled total = 200 + 3000 + 800 + 5000 = 9000
    const gate = computeBudgetGate(filterWithTokens(), 4000);

    // largest-first: drop analyze (5000) -> 4000, fits exactly.
    expect(gate.disable).toEqual(["analyze"]);
    expect(gate.afterTokens).toBe(4000);
    expect(gate.withinBudget).toBe(true);
    expect(gate.enabled).toEqual(["read", "search", "fetch"]);
  });

  it("disables nothing when already within budget", () => {
    const gate = computeBudgetGate(filterWithTokens(), 9000);
    expect(gate.disable).toEqual([]);
    expect(gate.withinBudget).toBe(true);
    expect(gate.beforeTokens).toBe(9000);
  });

  it("respects pinned tools even when they are the single largest", () => {
    // Pin analyze (5000). Budget 5000 means we drop every other tool to fit,
    // but analyze is never disabled.
    const gate = computeBudgetGate(filterWithTokens(), 5000, { keep: ["analyze"] });

    expect(gate.disable).toEqual(["search", "fetch", "read"]);
    expect(gate.disable).not.toContain("analyze");
    expect(gate.enabled).toEqual(["analyze"]);
    expect(gate.withinBudget).toBe(true);
    expect(gate.afterTokens).toBe(5000);
  });

  it("uses smallest-first strategy when requested", () => {
    // Budget 8800: only 200 over. smallest-first drops read (200) -> 8800, fits.
    const gate = computeBudgetGate(filterWithTokens(), 8800, { strategy: "smallest-first" });
    expect(gate.disable).toEqual(["read"]);
    expect(gate.withinBudget).toBe(true);
  });

  it("cannot rank tools without per-tool token data", () => {
    const gate = computeBudgetGate({ allTools: ["a", "b"], totalTokens: 9000 }, 4000);
    expect(gate.disable).toEqual([]);
    expect(gate.withinBudget).toBe(false);
    expect(gate.beforeTokens).toBe(9000);
  });
});

describe("ToolFilterService.applyTokenBudget (wiring)", () => {
  it("writes gated tools to disabledTools so the gateway cuts them", () => {
    const { service, repository } = createService({ srv: filterWithTokens() });

    const res = service.applyTokenBudget("srv", 4000);

    expect(res.success).toBe(true);
    expect(res.data?.disable).toEqual(["analyze"]);
    expect(res.data?.withinBudget).toBe(true);

    const stored = repository.getToolFilters()["srv"];
    expect(stored?.disabledTools).toEqual(["analyze"]);
  });

  it("dry-run reports the plan without writing disabledTools", () => {
    const { service, repository } = createService({ srv: filterWithTokens() });

    const res = service.applyTokenBudget("srv", 4000, undefined, true);

    expect(res.success).toBe(true);
    expect(res.data?.disable).toEqual(["analyze"]);
    // Nothing was persisted.
    expect(repository.getToolFilters()["srv"]?.disabledTools).toEqual([]);
  });

  it("keeps the gated total consistent with the repo's token measure", () => {
    const { service, repository } = createService({ srv: filterWithTokens() });

    service.applyTokenBudget("srv", 4000);

    const stored = repository.getToolFilters()["srv"];
    // The canonical per-turn measure (used by the gateway/TUI) must agree
    // with the gate's reported after-total once applied.
    expect(getEnabledTokenTotal(stored)).toBe(4000);
  });

  it("reports an error for an unknown filter", () => {
    const { service } = createService();
    const res = service.applyTokenBudget("missing", 4000);
    expect(res).toEqual({ success: false, error: "No tool filter found for 'missing'" });
  });
});
