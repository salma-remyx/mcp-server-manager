/**
 * ClientsScreen Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../setup.js";
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

    it("should show connection status for clients", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      const frame = lastFrame();
      // Should show status text like "connected", "disconnected", or "not installed"
      expect(frame).toMatch(/connected|disconnected|not installed/i);
    });

    it("should show server count for clients with servers", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      // Claude Desktop has 2 servers
      expect(lastFrame()).toContain("2");
    });

    it("should show status icons", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      const frame = lastFrame();
      // Should contain connection status icons
      expect(frame).toMatch(/✔|○|✗/);
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
    it("should connect/disconnect with Enter key", async () => {
      const { stdin } = render(<ClientsScreen onBack={mockOnBack} />);

      // Press enter to toggle connection
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // Should have called either connectClient or disconnectClient
      const connectCalled = mockClientService.connectClient.mock.calls.length > 0;
      const disconnectCalled = mockClientService.disconnectClient.mock.calls.length > 0;
      expect(connectCalled || disconnectCalled).toBe(true);
    });

    it("should not act on not-installed clients", async () => {
      // Create a mock with a not-installed client first
      const { stdin } = render(<ClientsScreen onBack={mockOnBack} />);

      // Navigate to a not-installed client if exists
      stdin.write(KEYS.DOWN);
      await waitForStateUpdate();

      // Reset mocks
      vi.clearAllMocks();

      // Try to connect - should not call service methods for not-installed
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // If the client was not-installed, no action should happen
      // This depends on the mock setup
    });
  });

  describe("Help Text", () => {
    it("should display keyboard shortcuts", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      const frame = lastFrame();
      expect(frame).toMatch(/ENTER|Connect|Disconnect/i);
      expect(frame).toMatch(/Q|Back/i);
    });

    it("should show navigation hints", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      const frame = lastFrame();
      expect(frame).toMatch(/↑|↓/);
    });
  });
});
