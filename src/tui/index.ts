#!/usr/bin/env node
/**
 * TUI - Interactive Terminal User Interface
 * Main entry point for the interactive mode (ink-based)
 */

import React from "react";
import { render } from "ink";
import { App } from "./App.js";

/** Start the TUI */
export async function startTui(): Promise<void> {
  // Clear terminal before rendering TUI (like gemini-cli does)
  // This prevents layout issues and provides a clean interface
  process.stdout.write('\x1B[2J\x1B[0f'); // Clear screen and move cursor to top
  
  const { waitUntilExit } = render(React.createElement(App));
  await waitUntilExit();
}

export default startTui;
