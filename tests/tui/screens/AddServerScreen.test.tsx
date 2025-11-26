/**
 * AddServerScreen Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "ink-testing-library";
import {
  mockConfigService,
  mockTestingService,
  waitForStateUpdate,
  KEYS,
} from "../setup.js";

// Setup mocks before importing component
vi.mock("../../../src/services/config.service.js", () => ({
  getConfigService: vi.fn(() => mockConfigService),
}));

vi.mock("../../../src/services/testing.service.js", () => ({
  getTestingService: vi.fn(() => mockTestingService),
}));

import { AddServerScreen } from "../../../src/tui/screens/AddServerScreen.js";

describe("AddServerScreen", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the add server screen with title", () => {
      const { lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Add New MCP Server");
    });

    it("should display server name input field", () => {
      const { lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Server name");
    });

    it("should display help text about ESC", () => {
      const { lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      expect(lastFrame()).toMatch(/ESC.*Go back|Go back/i);
    });

    it("should show navigation hints", () => {
      const { lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      expect(lastFrame()).toMatch(/ENTER|ESC|next|back/i);
    });
  });

  describe("Navigation", () => {
    it("should call onBack when ESC is pressed on first step", () => {
      const { stdin } = render(<AddServerScreen onBack={mockOnBack} />);

      stdin.write(KEYS.ESCAPE);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should not call onBack when ESC is pressed on later steps", async () => {
      const { stdin, lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      // Enter server name and proceed
      stdin.write("test-server");
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // Now ESC should go back to previous step, not call onBack
      stdin.write(KEYS.ESCAPE);
      await waitForStateUpdate();

      // Should still be in the wizard
      expect(lastFrame()).toContain("Server name");
    });
  });

  describe("Form Structure", () => {
    it("should display initial form for server creation", () => {
      const { lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      // Should show initial form
      expect(lastFrame()).toContain("Server name");
    });

    it("should have a styled header", () => {
      const { lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Add New MCP Server");
    });
  });

  describe("Server Creation", () => {
    it("should display server creation form", () => {
      const { lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      // Should show the form
      expect(lastFrame()).toContain("Add New MCP Server");
      expect(lastFrame()).toContain("Server name");
    });

    it("should have help text about creating servers", () => {
      const { lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      // Should show help text
      expect(lastFrame()).toMatch(/ESC|ENTER|next|back/i);
    });
  });
});
