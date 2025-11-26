/**
 * MenuPanel Component Tests
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { MenuPanel } from "../../../src/tui/components/MenuPanel.js";

describe("MenuPanel Component", () => {
  describe("Default Rendering", () => {
    it("should render with title", () => {
      const { lastFrame } = render(<MenuPanel />);

      expect(lastFrame()).toContain("Shortcuts");
    });

    it("should display navigation section", () => {
      const { lastFrame } = render(<MenuPanel />);

      expect(lastFrame()).toContain("Navigation");
      expect(lastFrame()).toContain("Move");
      expect(lastFrame()).toContain("Back");
    });

    it("should display server section", () => {
      const { lastFrame } = render(<MenuPanel />);

      expect(lastFrame()).toContain("Server");
      expect(lastFrame()).toContain("Add");
      expect(lastFrame()).toContain("Delete");
    });

    it("should display views section", () => {
      const { lastFrame } = render(<MenuPanel />);

      expect(lastFrame()).toContain("Data");
      expect(lastFrame()).toContain("Config");
      expect(lastFrame()).toContain("Tools");
      expect(lastFrame()).toContain("Clients");
      expect(lastFrame()).toContain("Profiles");
    });

    it("should display system section", () => {
      const { lastFrame } = render(<MenuPanel />);

      expect(lastFrame()).toContain("System");
      expect(lastFrame()).toContain("Doctor");
      expect(lastFrame()).toContain("OAuth");
    });
  });

  describe("Custom Sections", () => {
    it("should accept custom sections", () => {
      const customSections = [
        {
          title: "Custom",
          items: [
            { key: "X", label: "Action" },
            { key: "Y", label: "Button" },
          ],
        },
      ];
      const { lastFrame } = render(<MenuPanel sections={customSections} />);

      expect(lastFrame()).toContain("Custom");
      expect(lastFrame()).toContain("X");
      expect(lastFrame()).toContain("Action");
      expect(lastFrame()).toContain("Y");
      expect(lastFrame()).toContain("Button");
    });

    it("should render multiple custom sections", () => {
      const customSections = [
        {
          title: "Section1",
          items: [{ key: "A", label: "Item1" }],
        },
        {
          title: "Section2",
          items: [{ key: "B", label: "Item2" }],
        },
      ];
      const { lastFrame } = render(<MenuPanel sections={customSections} />);

      expect(lastFrame()).toContain("Section1");
      expect(lastFrame()).toContain("Section2");
      expect(lastFrame()).toContain("A");
      expect(lastFrame()).toContain("B");
    });

    it("should handle section with empty items", () => {
      const customSections = [
        {
          title: "Empty",
          items: [],
        },
      ];
      const { lastFrame } = render(<MenuPanel sections={customSections} />);

      expect(lastFrame()).toContain("Empty");
    });
  });

  describe("Key Display", () => {
    it("should display shortcut keys", () => {
      const { lastFrame } = render(<MenuPanel />);

      // Should show various keys
      expect(lastFrame()).toMatch(/[A-Z]/);
    });

    it("should display arrow keys for navigation", () => {
      const { lastFrame } = render(<MenuPanel />);

      expect(lastFrame()).toMatch(/↑|↓|Move/);
    });
  });

});
