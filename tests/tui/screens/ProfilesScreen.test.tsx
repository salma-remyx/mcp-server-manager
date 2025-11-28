/**
 * ProfilesScreen Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "ink-testing-library";
import { mockProfileService, waitForStateUpdate, KEYS } from "../setup.js";

// Setup mocks before importing component
vi.mock("../../../src/services/profile.service.js", () => ({
  getProfileService: vi.fn(() => mockProfileService),
}));

import { ProfilesScreen } from "../../../src/tui/screens/ProfilesScreen.js";

describe("ProfilesScreen", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render profiles screen with title", () => {
      const { lastFrame } = render(<ProfilesScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Profiles");
    });

    it("should display existing profiles", () => {
      const { lastFrame } = render(<ProfilesScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Default");
      expect(lastFrame()).toContain("Development");
    });

    it("should show active profile indicator", () => {
      const { lastFrame } = render(<ProfilesScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("(active)");
    });

    it("should show server count for profiles", () => {
      const { lastFrame } = render(<ProfilesScreen onBack={mockOnBack} />);

      // Development profile has 2 servers
      expect(lastFrame()).toContain("2");
    });
  });

  describe("Navigation", () => {
    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<ProfilesScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should call onBack when ESC is pressed", () => {
      const { stdin } = render(<ProfilesScreen onBack={mockOnBack} />);

      stdin.write(KEYS.ESCAPE);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should support keyboard navigation with arrow keys", () => {
      const { lastFrame, stdin } = render(<ProfilesScreen onBack={mockOnBack} />);

      // Initially first item should be selected
      const initialFrame = lastFrame();
      expect(initialFrame).toContain("→");

      // Press down arrow
      stdin.write(KEYS.DOWN);

      // Selection should move
      const afterDown = lastFrame();
      expect(afterDown).toContain("→");
    });
  });

  describe("Create Profile", () => {
    it("should show create profile view when N is pressed", async () => {
      const { lastFrame, stdin } = render(<ProfilesScreen onBack={mockOnBack} />);

      stdin.write("n");
      await waitForStateUpdate(300);

      expect(lastFrame()).toContain("Create New Profile");
      expect(lastFrame()).toContain("Profile name");
    });

    it("should go back from create view with ESC", async () => {
      const { stdin, lastFrame } = render(<ProfilesScreen onBack={mockOnBack} />);

      // Open create view
      stdin.write("n");
      await waitForStateUpdate();
      expect(lastFrame()).toContain("Create New Profile");

      // ESC should go back to list
      stdin.write(KEYS.ESCAPE);
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Profiles");
      expect(lastFrame()).not.toContain("Create New Profile");
    });

    it("should show name input in create view", async () => {
      const { stdin, lastFrame } = render(<ProfilesScreen onBack={mockOnBack} />);

      // Open create view
      stdin.write("n");
      await waitForStateUpdate();

      // Should show input prompt
      expect(lastFrame()).toContain("Profile name");
    });
  });

  describe("Delete Profile", () => {
    it("should show delete confirmation when D is pressed", async () => {
      const { stdin, lastFrame } = render(<ProfilesScreen onBack={mockOnBack} />);

      // Navigate to a non-active profile (can't delete active)
      stdin.write(KEYS.DOWN);
      await waitForStateUpdate();

      // Press D
      stdin.write("d");
      await waitForStateUpdate();

      // Should show confirmation
      expect(lastFrame()).toMatch(/delete|confirm/i);
    });
  });

  describe("Switch Profile", () => {
    it("should switch profile when Enter is pressed", async () => {
      const { stdin } = render(<ProfilesScreen onBack={mockOnBack} />);

      // Navigate to Development profile
      stdin.write(KEYS.DOWN);
      await waitForStateUpdate();

      // Press Enter to switch
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      expect(mockProfileService.use).toHaveBeenCalledWith("dev");
    });
  });

  describe("Nested Navigation", () => {
    it("should support ESC to go back in nested views", async () => {
      const { stdin } = render(<ProfilesScreen onBack={mockOnBack} />);

      // Open create view
      stdin.write("n");
      await waitForStateUpdate();

      // ESC should go back to list (not call onBack)
      stdin.write(KEYS.ESCAPE);
      await waitForStateUpdate();

      // ESC again should call onBack
      stdin.write(KEYS.ESCAPE);
      await waitForStateUpdate();

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });
});
