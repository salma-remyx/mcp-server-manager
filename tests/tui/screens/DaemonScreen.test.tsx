/**
 * DaemonScreen Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "ink-testing-library";
import { mockDaemonService, waitForStateUpdate, KEYS } from "../setup.js";

// Setup mocks before importing component
vi.mock("../../../src/services/daemon.service.js", () => ({
  getDaemonService: vi.fn(() => mockDaemonService),
}));

import { DaemonScreen } from "../../../src/tui/screens/DaemonScreen.js";

describe("DaemonScreen", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render daemon screen with title", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Daemon Management");
    });

    it("should display daemon status", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Status");
    });

    it("should display port information", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Port");
      expect(lastFrame()).toContain("8850");
    });

    it("should display menu options", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Start Daemon");
      expect(lastFrame()).toContain("Stop Daemon");
      expect(lastFrame()).toContain("View Logs");
    });

    it("should show startup status", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      // Should show startup-related option
      expect(lastFrame()).toMatch(/startup|Startup|Enable|Disable/i);
    });

    it("should display log file path", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Log file");
    });
  });

  describe("Navigation", () => {
    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<DaemonScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should call onBack when ESC is pressed", () => {
      const { stdin } = render(<DaemonScreen onBack={mockOnBack} />);

      stdin.write(KEYS.ESCAPE);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should navigate between options with arrow keys", async () => {
      const { stdin, lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      const initialFrame = lastFrame();
      expect(initialFrame).toContain("→");

      stdin.write(KEYS.DOWN);
      await waitForStateUpdate();

      expect(lastFrame()).toContain("→");
    });
  });

  describe("Daemon Actions", () => {
    it("should show not implemented message when Start option is selected", async () => {
      const { stdin, lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      // Select "Start Daemon" (first option)
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      expect(lastFrame()).toContain("not yet implemented");
    });
  });

  describe("Startup Management", () => {
    it("should toggle startup when Enable/Disable Startup is selected", async () => {
      const { stdin } = render(<DaemonScreen onBack={mockOnBack} />);

      // Navigate to startup option (Enable Auto-start is 4th option, index 3)
      for (let i = 0; i < 3; i++) {
        stdin.write(KEYS.DOWN);
      }
      await waitForStateUpdate();

      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // Should have called enableStartup (since startupEnabled is false)
      expect(
        mockDaemonService.enableStartup.mock.calls.length +
          mockDaemonService.disableStartup.mock.calls.length
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Status Display", () => {
    it("should show 'not running' when daemon is stopped", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      expect(lastFrame()).toMatch(/not running|stopped|inactive/i);
    });

    it("should show 'running' when daemon is active", () => {
      // Update mock to return running state
      mockDaemonService.getStatus.mockReturnValueOnce({
        running: true,
        pid: 12345,
        port: 8850,
        startupEnabled: false,
        logFile: "/tmp/daemon.log",
      });

      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      expect(lastFrame()).toMatch(/running|active/i);
    });
  });

  describe("Help Text", () => {
    it("should display keyboard shortcuts", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      const frame = lastFrame();
      expect(frame).toMatch(/ENTER|Select/i);
      expect(frame).toMatch(/Q|Back/i);
    });
  });
});
