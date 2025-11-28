/**
 * MCP Server Manager
 * Main entry point - routes to CLI or TUI based on arguments
 */

// Re-export services for programmatic use
export * from "./services/index.js";

// Re-export types
export * from "./types/index.js";

// Version
export { VERSION } from "./shared/version.js";
