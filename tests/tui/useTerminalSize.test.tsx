import React from "react";
import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import { render } from "./setup.js";

const mockStdout = new (class extends EventEmitter {
  columns = 80;
  rows = 24;
  isTTY = true;
  write() {
    return true;
  }
})();

vi.mock("ink", async () => {
  const actual = await vi.importActual<typeof import("ink")>("ink");
  return {
    ...actual,
    useStdout: () => ({ stdout: mockStdout }),
  };
});

import { Text } from "ink";
import { useTerminalSize } from "../../src/tui/hooks/useTerminalSize.js";

function TestComponent(): React.ReactElement {
  const { columns, rows } = useTerminalSize();
  return <Text>{`${columns}x${rows}`}</Text>;
}

describe("useTerminalSize", () => {
  it("updates when stdout emits resize", async () => {
    const { lastFrame } = render(<TestComponent />, {
      exitOnCtrlC: false,
    });

    mockStdout.columns = 120;
    mockStdout.rows = 40;
    mockStdout.emit("resize");

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(lastFrame()).toContain("120x40");
  });
});


