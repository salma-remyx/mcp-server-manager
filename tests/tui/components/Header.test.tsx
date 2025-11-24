/**
 * Header Component Tests
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { Header } from "../../../src/tui/components/Header.js";

describe("Header Component", () => {
  describe("Rendering", () => {
    it("should render with default title", () => {
      const { lastFrame } = render(<Header />);

      expect(lastFrame()).toContain("MCP Server Manager");
    });

    it("should render with custom title", () => {
      const { lastFrame } = render(<Header title="Custom Title" />);

      expect(lastFrame()).toContain("Custom Title");
    });

    it("should display version when provided", () => {
      const { lastFrame } = render(<Header version="1.2.3" />);

      expect(lastFrame()).toContain("v1.2.3");
    });

    it("should not display version when not provided", () => {
      const { lastFrame } = render(<Header />);

      // Without version prop, should not show "v1.2.3" pattern
      expect(lastFrame()).not.toMatch(/v\d+\.\d+/);
    });

    it("should render with both title and version", () => {
      const { lastFrame } = render(<Header title="My App" version="2.0.0" />);

      expect(lastFrame()).toContain("My App");
      expect(lastFrame()).toContain("v2.0.0");
    });
  });

});
