#!/usr/bin/env node

import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const preferSrc = process.env.MCPSM_USE_SRC === "1";

// Ensure config directory exists in user's home
const configDir =
  process.env.MCP_MANAGER_CONFIG_DIR ||
  path.join(process.env.HOME || process.env.USERPROFILE, ".mcp-manager");
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Set working directory for config files
process.env.MCP_MANAGER_CONFIG_DIR = configDir;

// Check if we're running from source or dist
const distPath = path.join(__dirname, "..", "dist", "cli", "index.js");
const srcPath = path.join(__dirname, "..", "src", "cli", "index.ts");

if (!preferSrc && fs.existsSync(distPath)) {
  // Run from built dist folder (use file URL for Windows compatibility)
  await import(pathToFileURL(distPath).href);
} else if (preferSrc || process.argv[1]?.includes("tsx") || process.argv[1]?.includes("ts-node")) {
  // Running with tsx/ts-node, import TypeScript directly
  await import(pathToFileURL(srcPath).href);
} else {
  console.error("Error: Could not find CLI entry point. Run 'npm run build' first.");
  process.exit(1);
}
