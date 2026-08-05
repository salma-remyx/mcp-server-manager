/**
 * Lazy tool-schema loading for the MCP gateway.
 *
 * Adapted from "Tool Attention Is All You Need: Dynamic Tool Gating and Lazy
 * Schema Loading for Eliminating the MCP/Tools Tax in Scalable Agentic
 * Workflows" (arXiv:2604.21816v1).
 *
 * The paper's core observation is the "MCP/Tools Tax": MCP clients eagerly
 * inject the *full* JSON schema of every tool on every `tools/list` turn,
 * bloating the context by 10k-60k tokens. Its second pillar — lazy schema
 * loading — replaces that eager full-schema injection with a lightweight
 * summary per tool and hydrates the full schema on demand.
 *
 * This module implements that lazy-loading mechanism for the gateway's
 * `tools/list` response:
 *   - `summarizeTool` strips each tool down to name + short description and a
 *     minimal valid `inputSchema`, cutting the per-turn token payload.
 *   - `buildLazyToolListing` produces the summarized listing and appends a
 *     single on-demand hydration meta-tool (`__mcpsm_get_tool_schema`).
 *   - `buildHydrationResponse` is the lazy round-trip: it returns the full
 *     schema of one requested tool when the model is ready to call it.
 *
 * This is a Mode 2 (adapted) port. The paper's full method adds a learned
 * "tool attention" router that decides *which* subset of tools to expose per
 * turn; we substitute that learned router with an explicit operator toggle
 * (the `lazyToolSchemas` setting, applied uniformly at the gateway). The
 * token cost is estimated with the repo's existing chars-per-4 proxy rather
 * than a learned estimator. The orthogonal static token-budget gate
 * (`mcpsm tools budget` → disabledTools) from a prior dispatch is
 * untouched and composes with this runtime layer.
 */

import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Name of the on-demand hydration meta-tool appended to a lazy listing.
 * The `__mcpsm_` prefix avoids collisions with upstream tool names.
 */
export const LAZY_SCHEMA_TOOL_NAME = "__mcpsm_get_tool_schema";

/** Maximum characters retained from a tool description in a lazy summary. */
export const LAZY_DESCRIPTION_MAX_LENGTH = 160;

/** Minimal valid MCP input schema — no per-property definitions. */
const MINIMAL_INPUT_SCHEMA: Tool["inputSchema"] = {
  type: "object",
  properties: {},
};

/** Rough chars-per-token factor (matches the repo's testing.service heuristic). */
const CHARS_PER_TOKEN = 4;

/**
 * Truncate a string to `max` characters, appending an ellipsis when trimmed.
 */
export function truncateDescription(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * Estimate the token cost of a tool using the repo's chars-per-4 proxy.
 * This is a parameter-free approximation of the per-tool MCP Tax.
 */
export function estimateTokenCost(tool: Tool): number {
  return Math.ceil(JSON.stringify(tool).length / CHARS_PER_TOKEN);
}

/**
 * Summarize a single tool for a lazy `tools/list` response: keep the name,
 * trim the description, and replace the bulky `inputSchema` with a minimal
 * stub. The full schema is recoverable later via the hydration meta-tool.
 */
export function summarizeTool(
  tool: Tool,
  maxDescriptionLength = LAZY_DESCRIPTION_MAX_LENGTH
): Tool {
  const summarized: Tool = {
    ...tool,
    inputSchema: MINIMAL_INPUT_SCHEMA,
  };
  if (tool.description) {
    summarized.description = truncateDescription(tool.description, maxDescriptionLength);
  }
  return summarized;
}

/**
 * Build the hydration meta-tool entry that lets a client pull a full tool
 * schema on demand. Its own schema is intentionally small.
 */
export function buildHydrationMetaTool(): Tool {
  return {
    name: LAZY_SCHEMA_TOOL_NAME,
    description:
      "Lazy schema loader: call this with { toolName } to fetch the full input schema of a tool before invoking it. Only present when the gateway is in lazy-tool-schema mode.",
    inputSchema: {
      type: "object",
      properties: {
        toolName: {
          type: "string",
          description: "Fully-qualified (server-prefixed) tool name to hydrate.",
        },
      },
      required: ["toolName"],
    },
  };
}

/**
 * Build a lazy `tools/list` payload: every tool summarized, plus the
 * hydration meta-tool. This is the on-the-wire replacement for eager
 * full-schema injection.
 */
export function buildLazyToolListing(tools: Tool[]): Tool[] {
  return [...tools.map((tool) => summarizeTool(tool)), buildHydrationMetaTool()];
}

/**
 * Look up the full (unsummarized) tool by name across the aggregated set.
 */
export function hydrateToolSchema(tools: Tool[], toolName: string): Tool | undefined {
  return tools.find((tool) => tool.name === toolName);
}

/**
 * Build the on-demand hydration response for a `tools/call` against the
 * meta-tool: returns the full schema of the requested tool as JSON text, or
 * an error result when the tool is unknown.
 */
export function buildHydrationResponse(tools: Tool[], toolName: string): CallToolResult {
  const full = hydrateToolSchema(tools, toolName);
  if (!full) {
    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${toolName}`,
        },
      ],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(full, null, 2),
      },
    ],
  };
}

/**
 * Quantify the MCP Tax reduction from lazy loading across a tool set:
 * the eager (full-schema) cost vs. the lazy (summarized + one meta-tool)
 * cost, and the tokens saved per turn.
 */
export function estimateTokenSavings(tools: Tool[]): {
  full: number;
  lazy: number;
  saved: number;
} {
  const full = tools.reduce((sum, tool) => sum + estimateTokenCost(tool), 0);
  const lazyListing = buildLazyToolListing(tools);
  const lazy = lazyListing.reduce((sum, tool) => sum + estimateTokenCost(tool), 0);
  return { full, lazy, saved: Math.max(0, full - lazy) };
}
