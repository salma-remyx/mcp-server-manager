/**
 * ToolsScreen Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "../setup.js";
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

  describe("Rendering - No Server Selected", () => {
    it("should render global token view title", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Token Usage");
    });

    it("should show empty global state when no servers", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("No servers configured");
    });
  });

  describe("Rendering - With Server Selected", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
      mockConfigService.getToolFilters.mockReturnValue({
        server1: {
          allTools: ["tool1", "tool2", "tool3"],
          disabledTools: ["tool3"],
        },
      });
    });

    it("should display server name in title when server is selected", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} initialServerId="server1" />);

      expect(lastFrame()).toContain("Server One");
    });

    it("should show tools list when server has tools", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} initialServerId="server1" />);

      expect(lastFrame()).toContain("tool1");
      expect(lastFrame()).toContain("tool2");
      expect(lastFrame()).toContain("tool3");
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

    it("should navigate between tools with arrow keys", async () => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
      mockConfigService.getToolFilters.mockReturnValue({
        server1: {
          allTools: ["tool1", "tool2", "tool3"],
          disabledTools: [],
        },
      });

      const { stdin, lastFrame } = render(<ToolsScreen onBack={mockOnBack} initialServerId="server1" />);

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
          disabledTools: [],
        },
      });
    });

    it("should toggle tool with Space key", async () => {
      const { stdin } = render(<ToolsScreen onBack={mockOnBack} initialServerId="server1" />);

      // Toggle first tool
      stdin.write(KEYS.SPACE);
      await waitForStateUpdate();

      expect(mockConfigService.toggleTool).toHaveBeenCalled();
    });

    it("should enable all tools with A key", async () => {
      const { stdin } = render(<ToolsScreen onBack={mockOnBack} initialServerId="server1" />);

      // Enable all
      stdin.write("a");
      await waitForStateUpdate();

      expect(mockConfigService.enableAllTools).toHaveBeenCalled();
    });

    it("should disable all tools with N key", async () => {
      const { stdin } = render(<ToolsScreen onBack={mockOnBack} initialServerId="server1" />);

      // Disable all
      stdin.write("n");
      await waitForStateUpdate();

      expect(mockConfigService.disableAllTools).toHaveBeenCalled();
    });
  });

  describe("Help Text", () => {
    it("should display keyboard shortcuts", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      const frame = lastFrame();
      expect(frame).toMatch(/Q|Back/i);
    });
  });

  describe("No Tools Discovered", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
      mockConfigService.getToolFilters.mockReturnValue({
        server1: {
          allTools: [],
          disabledTools: [],
        },
      });
    });

    it("should show message when no tools discovered", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} initialServerId="server1" />);

      expect(lastFrame()).toContain("No tools discovered");
    });
  });
});
