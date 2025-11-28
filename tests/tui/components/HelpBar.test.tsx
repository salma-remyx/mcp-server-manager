/**
 * HelpBar Component Tests
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "../setup.js";
import { HelpBar } from "../../../src/tui/components/HelpBar.js";

describe("HelpBar Component", () => {
  describe("Default Rendering", () => {
    it("should render default shortcuts", () => {
      const { lastFrame } = render(<HelpBar />);

      expect(lastFrame()).toContain("Navigation:");
      expect(lastFrame()).toContain("Server:");
      expect(lastFrame()).toContain("Global:");
    });

    it("should display navigation shortcuts", () => {
      const { lastFrame } = render(<HelpBar />);

      expect(lastFrame()).toContain("↑/↓ Move");
      expect(lastFrame()).toContain("Enter Start");
      expect(lastFrame()).toContain("Q Quit");
    });

    it("should display server shortcuts", () => {
      const { lastFrame } = render(<HelpBar />);

      expect(lastFrame()).toContain("A Add");
      expect(lastFrame()).toContain("D Delete");
      expect(lastFrame()).toContain("X Test");
    });

    it("should display global shortcuts", () => {
      const { lastFrame } = render(<HelpBar />);

      expect(lastFrame()).toContain("C Clients");
      expect(lastFrame()).toContain("F Profiles");
      expect(lastFrame()).toContain("G Settings");
    });
  });

  describe("Custom Groups", () => {
    it("should accept custom shortcut groups", () => {
      const customGroups = [{ label: "Custom", shortcuts: ["A Action", "B Button"] }];
      const { lastFrame } = render(<HelpBar groups={customGroups} />);

      expect(lastFrame()).toContain("Custom:");
      expect(lastFrame()).toContain("A Action");
      expect(lastFrame()).toContain("B Button");
    });

    it("should render multiple custom groups", () => {
      const customGroups = [
        { label: "Group1", shortcuts: ["X Action1"] },
        { label: "Group2", shortcuts: ["Y Action2"] },
      ];
      const { lastFrame } = render(<HelpBar groups={customGroups} />);

      expect(lastFrame()).toContain("Group1:");
      expect(lastFrame()).toContain("Group2:");
      expect(lastFrame()).toContain("X Action1");
      expect(lastFrame()).toContain("Y Action2");
    });

    it("should handle empty shortcuts array", () => {
      const customGroups = [{ label: "Empty", shortcuts: [] }];
      const { lastFrame } = render(<HelpBar groups={customGroups} />);

      expect(lastFrame()).toContain("Empty:");
    });
  });

});
