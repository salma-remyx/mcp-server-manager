/**
 * Shared prompts for CLI and TUI
 */

import * as readline from "readline";
import { colors, c, hideCursor, showCursor } from "./colors.js";

/** Create a readline interface */
function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/** Prompt for text input */
export async function promptText(message: string, defaultValue?: string): Promise<string> {
  const rl = createReadline();

  const prompt = defaultValue
    ? `${colors.yellow}?${colors.reset} ${message} ${colors.gray}[${defaultValue}]${colors.reset}: `
    : `${colors.yellow}?${colors.reset} ${message}: `;

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

/** Prompt for password (hidden input) */
export async function promptPassword(message: string): Promise<string> {
  const rl = createReadline();

  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(`${colors.yellow}?${colors.reset} ${message}: `);

    let password = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char: string): void => {
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        rl.close();
        resolve(password);
      } else if (char === "\u0003") {
        // Ctrl+C
        stdin.setRawMode(false);
        process.exit(0);
      } else if (char === "\u007F" || char === "\b" || char === "\x7f" || char === "\x08") {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          stdout.write("\b \b");
        }
      } else {
        password += char;
        stdout.write("*");
      }
    };

    stdin.on("data", onData);
  });
}

/** Prompt for confirmation (Y/n) */
export async function promptConfirm(
  message: string,
  defaultValue: boolean = true
): Promise<boolean> {
  const hint = defaultValue ? "Y/n" : "y/N";
  const prompt = `${colors.yellow}?${colors.reset} ${message} ${colors.gray}(${hint})${colors.reset}: `;

  return new Promise((resolve) => {
    process.stdout.write(prompt);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.once("data", (key: string) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();

      const char = key.toLowerCase();

      if (char === "\r" || char === "\n") {
        console.log(defaultValue ? "yes" : "no");
        resolve(defaultValue);
      } else if (char === "y") {
        console.log("yes");
        resolve(true);
      } else if (char === "n") {
        console.log("no");
        resolve(false);
      } else if (char === "\u0003") {
        // Ctrl+C
        console.log();
        process.exit(0);
      } else {
        console.log(defaultValue ? "yes" : "no");
        resolve(defaultValue);
      }
    });
  });
}

/** Option for select prompts */
export interface SelectOption<T = string> {
  label: string;
  value: T;
  description?: string;
}

/** Prompt for single selection */
export async function promptSelect<T = string>(
  message: string,
  options: SelectOption<T>[]
): Promise<T | null> {
  let selectedIndex = 0;

  function render(): void {
    // Move cursor up to rewrite
    if (selectedIndex > 0 || options.length > 1) {
      process.stdout.write(`\x1b[${options.length + 2}A`);
    }

    console.log(`\n${colors.yellow}?${colors.reset} ${message}`);

    options.forEach((option, index) => {
      const isSelected = index === selectedIndex;
      const prefix = isSelected
        ? `${colors.cyan}❯${colors.reset}`
        : `${colors.gray} ${colors.reset}`;
      const label = isSelected ? `${colors.cyan}${option.label}${colors.reset}` : option.label;
      const desc = option.description
        ? ` ${colors.gray}- ${option.description}${colors.reset}`
        : "";

      console.log(`  ${prefix} ${label}${desc}`);
    });
  }

  return new Promise((resolve) => {
    hideCursor();
    render();

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (key: string): void => {
      if (key === "\u001B[A") {
        // Up arrow
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        render();
      } else if (key === "\u001B[B") {
        // Down arrow
        selectedIndex = (selectedIndex + 1) % options.length;
        render();
      } else if (key === "\r" || key === "\n") {
        // Enter
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        showCursor();
        console.log(`${colors.cyan}Selected: ${options[selectedIndex].label}${colors.reset}`);
        resolve(options[selectedIndex].value);
      } else if (key === "\u0003" || key === "q") {
        // Ctrl+C or q
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        showCursor();
        console.log(`${colors.yellow}Cancelled${colors.reset}`);
        resolve(null);
      }
    };

    process.stdin.on("data", onData);
  });
}

/** Wait for any key press */
export async function waitForKey(message: string = "Press any key to continue..."): Promise<void> {
  console.log(`${colors.gray}${message}${colors.reset}`);

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.once("data", () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve();
    });
  });
}

/** Wait for Enter key */
export async function waitForEnter(message: string = "Press Enter to continue..."): Promise<void> {
  console.log(`${colors.gray}${message}${colors.reset}`);

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onData = (key: string): void => {
      if (key === "\r" || key === "\n") {
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      } else if (key === "\u0003") {
        process.stdin.setRawMode(false);
        process.exit(0);
      }
    };

    process.stdin.on("data", onData);
  });
}

/** Spinner for async operations */
export class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private frameIndex = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    hideCursor();
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${colors.cyan}${frame}${colors.reset} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  stop(success: boolean = true, finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    const icon = success ? c.checkmark : c.cross;
    const msg = finalMessage || this.message;

    process.stdout.write(`\r${icon} ${msg}\n`);
    showCursor();
  }

  update(message: string): void {
    this.message = message;
  }
}
