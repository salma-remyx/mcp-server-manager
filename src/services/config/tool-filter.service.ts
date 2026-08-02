import type { Result, ServerToolFilter, ToolFilters } from "../../types/index.js";
import { ConfigRepository } from "./config.repository.js";
import {
  computeBudgetGate,
  type BudgetGateOptions,
  type BudgetGateResult,
} from "./tool-budget.service.js";

export class ToolFilterService {
  constructor(private readonly repository: ConfigRepository) {}

  getToolFilters(): ToolFilters {
    return this.repository.getToolFilters();
  }

  getServerToolFilter(serverId: string): ServerToolFilter | undefined {
    return this.repository.getToolFilters()[serverId];
  }

  setServerToolFilter(serverId: string, filter: ServerToolFilter): void {
    this.repository.updateToolFilters((filters) => {
      filters[serverId] = filter;
    });
  }

  removeFilter(filterId: string): void {
    this.repository.updateToolFilters((filters) => {
      delete filters[filterId];
    });
  }

  toggleTool(filterId: string, toolName: string): void {
    this.repository.updateToolFilters((filters) => {
      const filter = filters[filterId];
      if (!filter) return;

      const disabledTools = new Set(filter.disabledTools || []);
      if (disabledTools.has(toolName)) {
        disabledTools.delete(toolName);
      } else {
        disabledTools.add(toolName);
      }

      filter.disabledTools = Array.from(disabledTools);
    });
  }

  enableTool(filterId: string, toolName: string): void {
    this.repository.updateToolFilters((filters) => {
      const filter = filters[filterId];
      if (!filter) return;

      const disabledTools = new Set(filter.disabledTools || []);
      disabledTools.delete(toolName);
      filter.disabledTools = Array.from(disabledTools);
    });
  }

  disableTool(filterId: string, toolName: string): void {
    this.repository.updateToolFilters((filters) => {
      const filter = filters[filterId];
      if (!filter) return;

      const disabledTools = new Set(filter.disabledTools || []);
      disabledTools.add(toolName);
      filter.disabledTools = Array.from(disabledTools);
    });
  }

  enableAllTools(filterId: string): void {
    this.repository.updateToolFilters((filters) => {
      const filter = filters[filterId];
      if (!filter) return;
      filter.disabledTools = [];
    });
  }

  disableAllTools(filterId: string): void {
    this.repository.updateToolFilters((filters) => {
      const filter = filters[filterId];
      if (!filter) return;
      filter.disabledTools = [...(filter.allTools || [])];
    });
  }

  resetToolFilters(filterId: string): Result {
    const filter = this.repository.getToolFilters()[filterId];
    if (!filter) {
      return { success: false, error: `No tool filter found for '${filterId}'` };
    }

    this.repository.updateToolFilters((filters) => {
      const existing = filters[filterId];
      if (existing) {
        existing.disabledTools = [];
      }
    });

    return { success: true };
  }

  isToolEnabled(filterId: string, toolName: string): boolean {
    const filter = this.repository.getToolFilters()[filterId];
    if (!filter) return true;

    return !filter.disabledTools?.includes(toolName);
  }

  getEnabledTools(filterId: string): string[] {
    const filter = this.repository.getToolFilters()[filterId];
    if (!filter) return [];

    const allTools = filter.allTools || [];
    const disabledTools = new Set(filter.disabledTools || []);
    return allTools.filter((t) => !disabledTools.has(t));
  }

  getDisabledTools(filterId: string): string[] {
    const filter = this.repository.getToolFilters()[filterId];
    if (!filter) return [];
    return filter.disabledTools || [];
  }

  /**
   * Auto-gate tools to fit a per-server token budget, cutting the per-turn
   * "tools tax" of eager schema injection. Disables the lowest-value enabled
   * tools (largest schemas first by default) until the enabled-schema token
   * total fits the budget. The gate is written to `disabledTools` — the field
   * the gateway reads at proxy time — so it takes effect live.
   *
   * Adapted from arXiv:2604.21816 (tool-attention gating); see
   * tool-budget.service.ts for the value-proxy rationale.
   */
  applyTokenBudget(
    filterId: string,
    budget: number,
    options?: BudgetGateOptions,
    dryRun = false
  ): Result<BudgetGateResult> {
    const filter = this.repository.getToolFilters()[filterId];
    if (!filter) {
      return { success: false, error: `No tool filter found for '${filterId}'` };
    }

    const gate = computeBudgetGate(filter, budget, options);

    if (!dryRun && gate.disable.length > 0) {
      this.repository.updateToolFilters((filters) => {
        const target = filters[filterId];
        if (!target) return;
        const disabled = new Set(target.disabledTools || []);
        for (const tool of gate.disable) disabled.add(tool);
        target.disabledTools = Array.from(disabled);
      });
    }

    return { success: true, data: gate };
  }
}
