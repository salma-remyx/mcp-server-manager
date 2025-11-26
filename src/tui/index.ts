#!/usr/bin/env node
/**
 * TUI - Interactive Terminal User Interface
 * Main entry point for the interactive mode (ink-based)
 */

import React from "react";
import { render } from "ink";
import { App } from "./App.js";

const ENTER_ALT_SCREEN = "\x1b[?1049h";
const EXIT_ALT_SCREEN = "\x1b[?1049l";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_SCREEN = "\x1b[2J";
const CURSOR_HOME = "\x1b[H";

function enableAlternateScreen(): void {
  process.stdout.write(`${ENTER_ALT_SCREEN}${HIDE_CURSOR}${CLEAR_SCREEN}${CURSOR_HOME}`);
}

function disableAlternateScreen(): void {
  process.stdout.write(`${CLEAR_SCREEN}${CURSOR_HOME}${SHOW_CURSOR}${EXIT_ALT_SCREEN}`);
}

/** Start the TUI */
export async function startTui(): Promise<void> {
  // Clear terminal before rendering TUI (gemini-cli behavior)
  process.stdout.write("\x1B[2J\x1B[0f");

  const shouldUseAlternateScreen = process.env.MCPSM_ALT_SCREEN === "1";
  if (shouldUseAlternateScreen) {
    enableAlternateScreen();
  }

  let cleanedUp = false;
  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (shouldUseAlternateScreen) {
      disableAlternateScreen();
    }
  };

  const signals = ["SIGINT", "SIGTERM"] as const;
  type SignalName = (typeof signals)[number];

  const handleSignal = (signal: SignalName): void => {
    cleanup();
    // Re-emit signal with default behavior after cleanup
    process.kill(process.pid, signal);
  };

  signals.forEach((signal) => process.once(signal, handleSignal));
  process.once("exit", cleanup);

  const { waitUntilExit } = render(React.createElement(App));

  const handleResize = (): void => {
    if (shouldUseAlternateScreen) {
      process.stdout.write(`${CLEAR_SCREEN}${CURSOR_HOME}`);
    }
  };

  if (shouldUseAlternateScreen) {
    process.stdout.on("resize", handleResize);
  }

  try {
    await waitUntilExit();
  } finally {
    if (shouldUseAlternateScreen) {
      process.stdout.off("resize", handleResize);
    }
    signals.forEach((signal) => process.removeListener(signal, handleSignal));
    cleanup();
  }
}

export default startTui;
