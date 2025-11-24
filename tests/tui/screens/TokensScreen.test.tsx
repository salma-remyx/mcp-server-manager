/**
 * TokensScreen Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "ink-testing-library";
import { waitForStateUpdate, KEYS } from "../setup.js";

// Mock formatters
vi.mock("../../../src/shared/formatters.js", () => ({
  formatTokens: vi.fn((n: number) => n.toLocaleString()),
  outputJson: vi.fn(),
}));

import { TokensScreen } from "../../../src/tui/screens/TokensScreen.js";

describe("TokensScreen", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render tokens screen with title", () => {
      const { lastFrame } = render(<TokensScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Token Usage");
    });

    it("should show 'no data' message when no token data available", () => {
      const { lastFrame } = render(<TokensScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("No token data available");
    });
  });

  describe("Navigation", () => {
    it("should call onBack when any key is pressed", () => {
      const { stdin } = render(<TokensScreen onBack={mockOnBack} />);

      stdin.write(KEYS.SPACE);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<TokensScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should call onBack when ESC is pressed", () => {
      const { stdin } = render(<TokensScreen onBack={mockOnBack} />);

      stdin.write(KEYS.ESCAPE);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should call onBack when Enter is pressed", () => {
      const { stdin } = render(<TokensScreen onBack={mockOnBack} />);

      stdin.write(KEYS.ENTER);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe("Help Text", () => {
    it("should show press any key message", () => {
      const { lastFrame } = render(<TokensScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Press any key");
    });
  });
});
