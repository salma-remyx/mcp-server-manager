/**
 * ImportExportScreen Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "ink-testing-library";
import { mockImportExportService, mockClientService, waitForStateUpdate, KEYS } from "../setup.js";

// Setup mocks before importing component
vi.mock("../../../src/services/import-export.service.js", () => ({
  getImportExportService: vi.fn(() => mockImportExportService),
}));

vi.mock("../../../src/services/client.service.js", () => ({
  getClientService: vi.fn(() => mockClientService),
}));

import { ImportExportScreen } from "../../../src/tui/screens/ImportExportScreen.js";

describe("ImportExportScreen", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render import/export screen with title", () => {
      const { lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Import / Export");
    });

    it("should display import options", () => {
      const { lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Import from File");
    });

    it("should display export options", () => {
      const { lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Export to File");
      expect(lastFrame()).toContain("Show Export");
    });

    it("should display client import options for installed clients", () => {
      const { lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Import from Claude Desktop");
    });
  });

  describe("Navigation", () => {
    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<ImportExportScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should call onBack when ESC is pressed", () => {
      const { stdin } = render(<ImportExportScreen onBack={mockOnBack} />);

      stdin.write(KEYS.ESCAPE);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should navigate between options with arrow keys", async () => {
      const { stdin, lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      const initialFrame = lastFrame();
      expect(initialFrame).toContain("→");

      stdin.write(KEYS.DOWN);
      await waitForStateUpdate();

      expect(lastFrame()).toContain("→");
    });
  });

  describe("Import from File", () => {
    it("should show file path input when Import from File is selected", async () => {
      const { stdin, lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      expect(lastFrame()).toContain("Enter file path");
    });

    it("should show file path input view", async () => {
      const { stdin, lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      // Select Import from File
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // Should show file path prompt
      expect(lastFrame()).toContain("Enter file path");
    });

    it("should cancel import with ESC", async () => {
      const { stdin, lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      // Select Import from File
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      // Press ESC
      stdin.write(KEYS.ESCAPE);
      await waitForStateUpdate();

      // Should be back at menu
      expect(lastFrame()).toContain("Import from File");
    });
  });

  describe("Import from Client", () => {
    it("should import from client when client option is selected", async () => {
      const { stdin } = render(<ImportExportScreen onBack={mockOnBack} />);

      // Navigate to Claude Desktop import option (second option)
      stdin.write(KEYS.DOWN);
      await waitForStateUpdate();

      // Select
      stdin.write(KEYS.ENTER);
      await waitForStateUpdate();

      expect(mockImportExportService.importFromClient).toHaveBeenCalledWith("claude");
    });
  });

  describe("Export Options", () => {
    it("should show export options in menu", () => {
      const { lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Export to File");
      expect(lastFrame()).toContain("Show Export");
    });

    it("should navigate through menu options", async () => {
      const { stdin, lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      // Navigate down
      stdin.write(KEYS.DOWN);
      await waitForStateUpdate();

      // Should still show menu with selection
      expect(lastFrame()).toContain("→");
    });
  });
});
