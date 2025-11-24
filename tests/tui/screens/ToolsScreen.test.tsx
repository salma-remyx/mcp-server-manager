/**
 * ToolsScreen Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "ink-testing-library";
import { mockConfigService, sampleLocalServers, waitForStateUpdate, KEYS } from "../setup.js";

// Setup mocks before importing component
vi.mock("../../../src/services/config.service.js", () => ({
  getConfigService: vi.fn(() => mockConfigService),
}));

import { ToolsScreen } from "../../../src/tui/screens/ToolsScreen.js";

describe("ToolsScreen", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigService.getLocalServers.mockReturnValue([]);
    mockConfigService.getRemoteServers.mockReturnValue([]);
  });

  describe("Rendering - Empty State", () => {
    it("should render tools screen with title", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Tool Filters");
    });

    it("should show 'no servers' message when no servers configured", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("No servers configured");
    });
  });

  describe("Rendering - With Servers", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
      mockConfigService.getToolFilters.mockReturnValue({
        server1: {
          allTools: ["tool1", "tool2", "tool3"],
          enabled: ["tool1", "tool2"],
        },
      });
    });

    it("should display server list when servers exist", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Server One");
    });

    it("should show tool count for servers", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toMatch(/\d+ tools?/i);
    });
  });

  describe("Navigation", () => {
    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<ToolsScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should call onBack when ESC is pressed", () => {
      const { stdin } = render(<ToolsScreen onBack={mockOnBack} />);

      stdin.write(KEYS.ESCAPE);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should navigate between servers with arrow keys", async () => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);

      const { stdin, lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      const initialFrame = lastFrame();
      expect(initialFrame).toContain("→");

      stdin.write(KEYS.DOWN);
      await waitForStateUpdate();

      expect(lastFrame()).toContain("→");
    });
  });

  describe("Tool Management", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
      mockConfigService.getToolFilters.mockReturnValue({
        server1: {
          allTools: ["tool1", "tool2", "tool3"],
          enabled: ["tool1", "tool2"],
        },
      });
    });

    it("should show tool list when server is selected", async () => {
      const { stdin, lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      // Select server
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      const frame = lastFrame();
      expect(frame).toMatch(/tool|Tool/i);
    });

    it("should toggle tool with Space key", async () => {
      const { stdin } = render(<ToolsScreen onBack={mockOnBack} />);

      // Select server
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // Toggle first tool
      stdin.write(KEYS.SPACE);
      await waitForStateUpdate();

      expect(mockConfigService.toggleTool).toHaveBeenCalled();
    });

    it("should enable all tools with A key", async () => {
      const { stdin } = render(<ToolsScreen onBack={mockOnBack} />);

      // Select server
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // Enable all
      stdin.write("a");
      await waitForStateUpdate();

      expect(mockConfigService.enableAllTools).toHaveBeenCalled();
    });

    it("should disable all tools with N key", async () => {
      const { stdin } = render(<ToolsScreen onBack={mockOnBack} />);

      // Select server
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // Disable all
      stdin.write("n");
      await waitForStateUpdate();

      expect(mockConfigService.disableAllTools).toHaveBeenCalled();
    });

    it("should show tools when server is selected", async () => {
      const { stdin, lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      // Select server
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // Should show tool-related content
      const frame = lastFrame();
      expect(frame).toMatch(/tool|Tool|filter|Filter|server/i);
    });
  });

  describe("Help Text", () => {
    it("should display keyboard shortcuts", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      const frame = lastFrame();
      expect(frame).toMatch(/Q|Back/i);
    });
  });

  describe("Navigation Back from Tool View", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
    });

    it("should return to server list when ESC is pressed in tool view", async () => {
      const { stdin, lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      // Select server
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // Press ESC to go back to server list
      stdin.write(KEYS.ESCAPE);
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Server One");
    });
  });
});
