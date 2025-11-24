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
  const { waitUntilExit } = render(React.createElement(App));
  await waitUntilExit();
}

export default startTui;
