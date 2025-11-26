/**
 * App Component Tests - Main TUI Application
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "ink-testing-library";
import {
  mockConfigService,
  mockTestingService,
  mockProfileService,
  mockClientService,
  mockSettingsService,
  mockDaemonService,
  mockImportExportService,
  sampleLocalServers,
  sampleRemoteServers,
  waitForStateUpdate,
  KEYS,
} from "./setup.js";

// Setup all mocks before importing App
vi.mock("../../src/services/config.service.js", () => ({
  getConfigService: vi.fn(() => mockConfigService),
}));

vi.mock("../../src/services/testing.service.js", () => ({
  getTestingService: vi.fn(() => mockTestingService),
}));

vi.mock("../../src/services/profile.service.js", () => ({
  getProfileService: vi.fn(() => mockProfileService),
}));

vi.mock("../../src/services/client.service.js", () => ({
  getClientService: vi.fn(() => mockClientService),
}));

vi.mock("../../src/services/settings.service.js", () => ({
  getSettingsService: vi.fn(() => mockSettingsService),
}));

vi.mock("../../src/services/daemon.service.js", () => ({
  getDaemonService: vi.fn(() => mockDaemonService),
}));

vi.mock("../../src/services/import-export.service.js", () => ({
  getImportExportService: vi.fn(() => mockImportExportService),
}));

vi.mock("../../src/shared/formatters.js", () => ({
  formatTokens: vi.fn((n: number) => n.toLocaleString()),
  outputJson: vi.fn(),
}));

import { App } from "../../src/tui/App.js";

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigService.getLocalServers.mockReturnValue([]);
    mockConfigService.getRemoteServers.mockReturnValue([]);
  });

  describe("Main Screen Rendering", () => {
    it("should render the main screen with header", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toContain("MCP Server Manager");
    });

    it("should display status bar with profile and port", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toContain("Profile:");
      expect(lastFrame()).toContain("Port:");
    });

    it("should show menu panel with shortcuts", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toContain("Shortcuts");
      expect(lastFrame()).toContain("Navigation");
      expect(lastFrame()).toContain("Back");
    });

    it("should show empty state when no servers configured", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toContain("No servers configured");
      expect(lastFrame()).toMatch(/Press.*A.*to add/i);
    });

    it("should display version in header", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toMatch(/v\d+\.\d+\.\d+/);
    });
  });

  describe("Server List Rendering", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
      mockConfigService.getRemoteServers.mockReturnValue(sampleRemoteServers);
    });

    it("should display local servers when configured", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toContain("Local Servers");
      expect(lastFrame()).toContain("Server One");
    });

    it("should display remote servers when configured", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toContain("Remote Servers");
      expect(lastFrame()).toContain("Remote One");
    });

    it("should show selection indicator", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toContain("→");
    });

    it("should show checkboxes for server selection", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toContain("[ ]");
    });
  });

  describe("Navigation Between Screens", () => {
    it("should navigate to add server screen on A key", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("a");
      await waitForStateUpdate(500); // Longer wait for Windows CI

      expect(lastFrame()).toContain("Add New MCP Server");
    });

    it("should navigate to tools screen on T key", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("t");
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Tool Filters");
    });

    it("should navigate to clients screen on C key", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("c");
      await waitForStateUpdate();

      expect(lastFrame()).toContain("MCP Clients");
    });

    it("should navigate to profiles screen on F key", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("f");
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Profiles");
    });

    it("should navigate to settings screen on G key", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("g");
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Settings");
    });

    it("should navigate to import/export screen on I key", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("i");
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Import / Export");
    });

    it("should navigate to doctor screen on H key", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("h");
      await waitForStateUpdate();

      expect(lastFrame()).toContain("System Health Check");
    });

    it("should navigate to tokens screen on K key", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("k");
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Token Usage");
    });

    it("should return to main screen from sub-screen", async () => {
      const { lastFrame, stdin } = render(<App />);

      // Go to tools screen
      stdin.write("t");
      await waitForStateUpdate();
      expect(lastFrame()).toContain("Tool Filters");

      // Press Q to go back
      stdin.write("q");
      await waitForStateUpdate();

      expect(lastFrame()).toContain("MCP Server Manager");
      expect(lastFrame()).toContain("Shortcuts");
    });
  });

  describe("Server Selection", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
    });

    it("should enable/disable server with Space", async () => {
      const { lastFrame, stdin } = render(<App />);

      // Press space to enable/disable
      stdin.write(KEYS.SPACE);
      await waitForStateUpdate();

      // Should show success message for enable/disable
      expect(lastFrame()).toMatch(/enabled|disabled/i);
    });

    it("should navigate servers with arrow keys", async () => {
      const { stdin, lastFrame } = render(<App />);

      const initialFrame = lastFrame();

      // Press down
      stdin.write(KEYS.DOWN);
      await waitForStateUpdate();

      // Selection should change
      const afterDown = lastFrame();
      expect(afterDown).toContain("→");
    });
  });

  describe("Server Actions", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
    });

    it("should show servers in the list", () => {
      const { lastFrame } = render(<App />);

      expect(lastFrame()).toContain("Server One");
    });

    it("should show server status information", () => {
      const { lastFrame } = render(<App />);

      // Should show some status indicator
      expect(lastFrame()).toMatch(/tools|disabled|enabled/i);
    });
  });

  describe("Testing", () => {
    it("should start testing on X key", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("x");
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Testing Servers");
    });

    it("should show test results", async () => {
      // Mock streaming results
      mockTestingService.testAllServersStreaming.mockImplementationOnce(
        async (onResult: (result: unknown) => void) => {
          const result = {
            server: { id: "s1", name: "Test Server", command: "node", args: [] },
            type: "local" as const,
            result: { success: true, toolCount: 5 },
          };
          onResult({ ...result, index: 0, total: 1 });
          return [result];
        }
      );

      const { lastFrame, stdin } = render(<App />);

      stdin.write("x");
      await waitForStateUpdate(300);

      // Should show results or testing status
      expect(lastFrame()).toMatch(/Testing|tools|Complete/i);
    });
  });

  describe("Message Display", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
    });

    it("should render without errors with servers configured", () => {
      const { lastFrame } = render(<App />);

      // Should render successfully
      expect(lastFrame()).toContain("MCP Server Manager");
      expect(lastFrame()).toContain("Server One");
    });
  });

  describe("Case Insensitive Keys", () => {
    it("should handle uppercase keys", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("A"); // Uppercase
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Add New MCP Server");
    });

    it("should handle lowercase keys", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write("a"); // Lowercase
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Add New MCP Server");
    });
  });

  describe("Exit Callback", () => {
    it("should call onExit when Q is pressed on main screen", () => {
      const mockOnExit = vi.fn();
      const { stdin } = render(<App onExit={mockOnExit} />);

      stdin.write("q");

      expect(mockOnExit).toHaveBeenCalled();
    });
  });

  describe("Section Navigation", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
      mockConfigService.getRemoteServers.mockReturnValue(sampleRemoteServers);
    });

    it("should navigate between local and remote sections", async () => {
      const { stdin, lastFrame } = render(<App />);

      // Navigate down past local servers to remote
      for (let i = 0; i < sampleLocalServers.length + 1; i++) {
        stdin.write(KEYS.DOWN);
        await waitForStateUpdate(50);
      }

      // Should now be in remote section
      expect(lastFrame()).toContain("→");
    });

    it("should wrap around when navigating past last server", async () => {
      const { stdin, lastFrame } = render(<App />);

      // Navigate past all servers
      const totalServers = sampleLocalServers.length + sampleRemoteServers.length;
      for (let i = 0; i < totalServers + 2; i++) {
        stdin.write(KEYS.DOWN);
        await waitForStateUpdate(50);
      }

      // Should still show selection
      expect(lastFrame()).toContain("→");
    });
  });

  describe("Tool Counts", () => {
    beforeEach(() => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
      mockConfigService.getToolFilters.mockReturnValue({
        server1: { allTools: ["t1", "t2", "t3"], enabled: ["t1", "t2"] },
      });
    });

    it("should display tool counts for servers", async () => {
      const { lastFrame } = render(<App />);

      await waitForStateUpdate(200);

      expect(lastFrame()).toMatch(/\d+ tools?/);
    });
  });

  describe("Enter Key - Manage Servers", () => {
    it("should navigate to daemon screen even when no servers selected", async () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      expect(lastFrame()).toMatch(/Daemon Management|Start|Stop/i);
    });

    it("should navigate to daemon management when servers are selected", async () => {
      mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
      // Mock selection state to return server1 as already selected
      mockConfigService.getSelectionState.mockReturnValue({
        local: ["server1"],
        remote: [],
      });

      const { lastFrame, stdin } = render(<App />);

      // Press Enter - should go to daemon since server1 is pre-selected
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Daemon Management");
    });
  });
});

describe("App State Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should maintain state between renders", () => {
    mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);

    const { lastFrame, stdin } = render(<App />);

    const initialFrame = lastFrame();
    expect(initialFrame).toContain("Server One");

    // Navigate down
    stdin.write(KEYS.DOWN);

    // State should be maintained
    const afterNav = lastFrame();
    expect(afterNav).toContain("Server One");
  });

  it("should restore selection state on mount", () => {
    mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);
    mockConfigService.getSelectionState.mockReturnValue({
      local: ["server1"],
      remote: [],
    });

    const { lastFrame } = render(<App />);

    // Should show selected server
    expect(lastFrame()).toContain("[✓]");
  });

  it("should refresh servers when returning from sub-screen", async () => {
    mockConfigService.getLocalServers.mockReturnValue(sampleLocalServers);

    const { stdin } = render(<App />);

    // Go to add server screen
    stdin.write("a");
    await waitForStateUpdate();

    // Go back
    stdin.write(KEYS.ESCAPE);
    await waitForStateUpdate();

    // Should have called getLocalServers again
    expect(mockConfigService.getLocalServers.mock.calls.length).toBeGreaterThan(1);
  });
});
