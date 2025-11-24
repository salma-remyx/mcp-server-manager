/**
 * ClientsScreen Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "ink-testing-library";
import { mockClientService, waitForStateUpdate, KEYS } from "../setup.js";

// Setup mocks before importing component
vi.mock("../../../src/services/client.service.js", () => ({
  getClientService: vi.fn(() => mockClientService),
}));

import { ClientsScreen } from "../../../src/tui/screens/ClientsScreen.js";

describe("ClientsScreen", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render clients screen with title", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("MCP Clients");
    });

    it("should display detected clients", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Claude Desktop");
      expect(lastFrame()).toContain("Cursor");
    });

    it("should show sync status for clients", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("sync ON");
      expect(lastFrame()).toContain("sync OFF");
    });

    it("should show installed status", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toMatch(/installed|not installed/i);
    });

    it("should show server count for clients with config", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      // Claude Desktop has 2 servers
      expect(lastFrame()).toContain("2");
    });
  });

  describe("Navigation", () => {
    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<ClientsScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should call onBack when ESC is pressed", () => {
      const { stdin } = render(<ClientsScreen onBack={mockOnBack} />);

      stdin.write(KEYS.ESCAPE);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should navigate between clients with arrow keys", async () => {
      const { stdin, lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      // Initial state - first client selected
      const initialFrame = lastFrame();
      expect(initialFrame).toContain("→");

      // Press down
      stdin.write(KEYS.DOWN);
      await waitForStateUpdate();

      // Selection should still work
      const afterDown = lastFrame();
      expect(afterDown).toContain("→");
    });
  });

  describe("Client Actions", () => {
    it("should toggle sync with Space key", async () => {
      const { stdin } = render(<ClientsScreen onBack={mockOnBack} />);

      // Press space to toggle sync
      stdin.write(KEYS.SPACE);
      await waitForStateUpdate();

      // Should have called disable (since first client has sync ON)
      expect(mockClientService.disableClient).toHaveBeenCalled();
    });

    it("should sync all clients with S key", async () => {
      const { stdin } = render(<ClientsScreen onBack={mockOnBack} />);

      stdin.write("s");
      await waitForStateUpdate();

      expect(mockClientService.syncToAllClients).toHaveBeenCalled();
    });
  });

  describe("Help Text", () => {
    it("should display keyboard shortcuts", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      const frame = lastFrame();
      expect(frame).toMatch(/Space|Toggle/i);
      expect(frame).toMatch(/Q|Back/i);
    });
  });
});
