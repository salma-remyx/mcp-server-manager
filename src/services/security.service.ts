/**
 * Security analysis service - flags MCP-specific risks in discovered tool metadata.
 *
 * Adapted from the MCP Security Bench (MSB) attack taxonomy
 *   Zhang et al., "MCP Security Bench (MSB): Benchmarking Attacks Against
 *   Model Context Protocol in LLM Agents", arXiv:2510.15994v2.
 *
 * MSB measures how well an LLM agent resists MCP-specific attacks across the
 * full tool-use pipeline using an LLM-driven attacker and a benchmark harness.
 * That evaluation machinery does not fit this manager. What DOES transfer is
 * MSB's central observation - that MCP tools are first-class, composable
 * objects whose natural-language metadata (name, description, input schema)
 * is itself the attack surface. This service ports the paper's *taxonomy* of
 * metadata-borne risks into a parameter-free, deterministic analyzer that runs
 * over the exact tool list the TestingService already discovers
 * (`{ name, description?, inputSchema? }` - no new data shape). It is invoked
 * live during `mcpsm test` (see TestingService.updateToolFilter) and surfaced by
 * `mcpsm doctor`. The LLM attacker agent, the benchmark eval framework, and the
 * reported ASR numbers are MSB's auxiliary components and are intentionally out
 * of scope here - a downstream benchmark PR would host them.
 */

/** Risk category drawn from the MSB taxonomy of MCP tool-metadata attacks. */
export type SecurityCategory =
  | "prompt-injection"
  | "system-impersonation"
  | "cross-tool-interference"
  | "overly-broad-access"
  | "opaque-metadata";

/** Severity, ordered low -> critical. */
export type SecuritySeverity = "low" | "medium" | "high" | "critical";

/** A single risk finding for one tool. */
export interface SecurityFinding {
  toolName: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  message: string;
  /** Short snippet of the offending metadata, when applicable. */
  evidence?: string;
}

/** The contract this analyzer consumes - identical to the discovered tool list. */
export interface AnalyzableTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/** Aggregated view of a set of findings. */
export interface SecuritySummary {
  total: number;
  worst: SecuritySeverity | null;
  bySeverity: Record<SecuritySeverity, number>;
  byCategory: Partial<Record<SecurityCategory, number>>;
}

const SEVERITY_RANK: Record<SecuritySeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const SEVERITY_ORDER: readonly SecuritySeverity[] = ["critical", "high", "medium", "low"];

/** Prompt-injection patterns and the severity they warrant. */
const INJECTION_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  severity: SecuritySeverity;
  message: string;
}> = [
  {
    pattern:
      /(reveal|leak|exfiltrate|send|post|upload|print|log)[\s\S]{0,40}(api[ _-]?key|secret|token|password|credential|\.?env\b)/i,
    severity: "critical",
    message: "Description appears to instruct the agent to exfiltrate secrets or credentials.",
  },
  {
    pattern:
      /ignore[\s\S]{0,20}\b(instructions?|rules?|prompts?|previous|prior|above|earlier|all)\b/i,
    severity: "high",
    message: "Description attempts to override the agent's prior instructions.",
  },
  {
    pattern:
      /\b(disregard|forget|override|jailbreak|bypass)\b[\s\S]{0,30}\b(instructions?|rules?|prompts?|system|previous|prior|above|safety|restrict)/i,
    severity: "high",
    message: "Description attempts to override the agent's instructions or safety constraints.",
  },
  {
    pattern: /\byou are now (a|an)\b/i,
    severity: "high",
    message: "Description attempts to re-assign the agent's role.",
  },
  {
    pattern: /<\/?(system|developer|assistant|tool)\s*>/i,
    severity: "high",
    message: "Description embeds role/control tags used to spoof structured prompts.",
  },
  {
    pattern:
      /\bdo not (follow|use|obey)\b[\s\S]{0,30}\b(system|previous|prior|above|your|original)\b/i,
    severity: "high",
    message: "Description attempts to suppress the agent's own instructions.",
  },
];

/** Name patterns that mimic internal / privileged namespaces. */
const IMPERSONATION_NAME_PATTERNS: readonly RegExp[] = [
  /^_{2,}/,
  /^mcp__/i,
  /(^|[_\-.])(claude|anthropic|computer|desktop|system|admin|sudo|root|kernel|developer|guardrail|safety)(_|\b|[.-]$)/i,
];

/** Patterns that steer the agent toward one tool and away from others. */
const INTERFERENCE_PATTERNS: readonly RegExp[] = [
  /\b(use|call|run|invoke) this (tool )?(instead|first|rather than)/i,
  /\binstead of (using|calling|running)/i,
  /\b(always|must|should|please) (use|call|prefer) this (tool )?(over|instead of|before)/i,
  /\bdo not (use|call|run|invoke) the\b/i,
  /\bignore the\b[\s\S]{0,20}\btool\b/i,
];

/** Name tokens implying broad or dangerous capability. */
const DANGEROUS_TOKENS: ReadonlySet<string> = new Set([
  "exec",
  "execute",
  "shell",
  "bash",
  "sh",
  "eval",
  "system",
  "cmd",
  "command",
  "run",
  "delete",
  "drop",
  "wipe",
  "rm",
  "sudo",
  "fetch",
  "http",
  "curl",
  "wget",
  "terminal",
  "powershell",
  "process",
  "kill",
  "reboot",
  "format",
  "chmod",
  "chown",
  "ssh",
  "scp",
]);

const VAGUE_DESCRIPTION_RE = /\b(any|arbitrary|all|everything|unlimited|whatever|raw)\b/i;

/** Upper bound at which a description is suspiciously long (possible hidden payload). */
const MAX_SANE_DESCRIPTION_LENGTH = 1500;
/** Below this a description is too terse to convey intent. */
const MIN_USEFUL_DESCRIPTION_LENGTH = 20;

/** Tokenize a tool name into comparable lowercase segments. */
function tokenizeName(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[_\-.]+/)
    .filter(Boolean);
}

/** Extract a short evidence snippet around the first match of a pattern. */
function evidenceFor(pattern: RegExp, text: string): string | undefined {
  const match = pattern.exec(text);
  if (!match) {
    return undefined;
  }
  const start = Math.max(0, match.index - 20);
  const end = Math.min(text.length, match.index + match[0].length + 20);
  const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  return snippet.length > 0 ? `…${snippet}…` : undefined;
}

/** Sort findings most-severe first. */
function bySeverityDesc(a: SecurityFinding, b: SecurityFinding): number {
  return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
}

/** Security service - stateless, parameter-free analyzer over tool metadata. */
export class SecurityService {
  /** Analyze a single tool, optionally aware of its sibling tool names. */
  analyzeTool(tool: AnalyzableTool, siblingNames: readonly string[] = []): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const name = (tool.name || "").trim();
    const description = (tool.description || "").trim();

    // 1. Prompt injection carried in the natural-language description.
    for (const rule of INJECTION_PATTERNS) {
      if (description.length > 0 && rule.pattern.test(description)) {
        findings.push({
          toolName: name,
          category: "prompt-injection",
          severity: rule.severity,
          message: rule.message,
          evidence: evidenceFor(rule.pattern, description),
        });
      }
    }

    // 2. Name impersonating an internal / privileged namespace.
    if (name.length > 0 && IMPERSONATION_NAME_PATTERNS.some((re) => re.test(name))) {
      findings.push({
        toolName: name,
        category: "system-impersonation",
        severity: "high",
        message: "Tool name mimics an internal/system namespace an agent may treat as trusted.",
        evidence: name,
      });
    }

    // 3. Cross-tool interference - steering the agent away from sibling tools.
    if (INTERFERENCE_PATTERNS.some((re) => re.test(description))) {
      findings.push({
        toolName: name,
        category: "cross-tool-interference",
        severity: "medium",
        message: "Description tries to steer the agent toward this tool and away from others.",
      });
    } else if (description.length > 0) {
      const sibling = siblingNames.find(
        (candidate) => candidate !== name && candidate.length > 0 && description.includes(candidate)
      );
      if (sibling && /\b(instead|not|never|prefer|over|before|rather)\b/i.test(description)) {
        findings.push({
          toolName: name,
          category: "cross-tool-interference",
          severity: "medium",
          message: `Description references sibling tool "${sibling}" with preferential or suppressive language.`,
          evidence: sibling,
        });
      }
    }

    // 4. Overly broad access implied by the name, weighted by description clarity.
    if (name.length > 0 && tokenizeName(name).some((token) => DANGEROUS_TOKENS.has(token))) {
      const vague =
        description.length < MIN_USEFUL_DESCRIPTION_LENGTH ||
        VAGUE_DESCRIPTION_RE.test(description);
      findings.push({
        toolName: name,
        category: "overly-broad-access",
        severity: vague ? "medium" : "low",
        message: vague
          ? "Tool name implies broad or dangerous capabilities with a vague description that hides its blast radius."
          : "Tool name implies broad or dangerous capabilities; review the effective permissions before enabling.",
      });
    }

    // 5. Opaque metadata - missing or suspiciously large description.
    if (description.length === 0) {
      findings.push({
        toolName: name,
        category: "opaque-metadata",
        severity: "low",
        message:
          "Tool exposes no description; the agent cannot judge its intent before calling it.",
      });
    } else if (description.length > MAX_SANE_DESCRIPTION_LENGTH) {
      findings.push({
        toolName: name,
        category: "opaque-metadata",
        severity: "low",
        message: "Tool description is unusually long and could conceal injected instructions.",
        evidence: `${description.length} chars`,
      });
    }

    return findings;
  }

  /** Analyze a full tool list, including cross-tool awareness. */
  analyzeTools(tools: readonly AnalyzableTool[]): SecurityFinding[] {
    const names = tools.map((tool) => (tool.name || "").trim()).filter(Boolean);
    return tools.flatMap((tool) => this.analyzeTool(tool, names)).sort(bySeverityDesc);
  }

  /** Reduce a set of findings to counts and the worst severity present. */
  summarize(findings: readonly SecurityFinding[]): SecuritySummary {
    const bySeverity: Record<SecuritySeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    const byCategory: Partial<Record<SecurityCategory, number>> = {};
    for (const finding of findings) {
      bySeverity[finding.severity] += 1;
      byCategory[finding.category] = (byCategory[finding.category] ?? 0) + 1;
    }
    const worst = SEVERITY_ORDER.find((level) => bySeverity[level] > 0) ?? null;
    return { total: findings.length, worst, bySeverity, byCategory };
  }
}

/** Singleton instance. */
let instance: SecurityService | null = null;

/** Get or create the security service instance. */
export function getSecurityService(): SecurityService {
  if (!instance) {
    instance = new SecurityService();
  }
  return instance;
}

/** Reset the singleton instance (for testing). */
export function resetSecurityService(): void {
  instance = null;
}

export default SecurityService;
