import { describe, it, expect } from "vitest";
import { getTheme, defaultTheme } from "../src/tui/theme/palettes.js";
import type { ThemeColors } from "../src/tui/theme/types.js";

describe("Theme System", () => {
  describe("getTheme", () => {
    it("should return default theme for 'default'", () => {
      const theme = getTheme("default");
      expect(theme).toEqual(defaultTheme);
      expect(theme.name).toBe("default");
    });
  });

  describe("Theme Palettes", () => {
    const requiredColorKeys: (keyof ThemeColors)[] = [
      // Primary colors
      "primary",
      "secondary",
      "accent",
      // Status colors
      "success",
      "error",
      "warning",
      "info",
      // UI elements
      "border",
      "headerBorder",
      "text",
      "dimText",
      "highlightText",
      "selectedText",
      // Server list
      "serverName",
      "serverNameDisabled",
      "serverCheckEnabled",
      "serverCheckDisabled",
      "serverArrowLocal",
      "serverArrowRemote",
      "serverArrowSelected",
      "serverStatus",
      "serverStatusError",
      "serverNeedsAuth",
      // Interactive elements
      "inputPrompt",
      "inputText",
      "link",
      // Special
      "disabled",
    ];

    it("should have complete ThemeColors structure in default theme", () => {
      const theme = defaultTheme;

      // Check all required keys are present
      requiredColorKeys.forEach((key) => {
        expect(theme.colors[key]).toBeDefined();
        expect(typeof theme.colors[key]).toBe("string");
      });

      // Verify specific colors
      expect(theme.colors.primary).toBe("cyan");
      expect(theme.colors.success).toBe("green");
      expect(theme.colors.error).toBe("red");
    });

    it("should have valid Ink color types for default theme", () => {
      const validColors = [
        "black",
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
        "gray",
        "grey",
        "blackBright",
        "redBright",
        "greenBright",
        "yellowBright",
        "blueBright",
        "magentaBright",
        "cyanBright",
        "whiteBright",
      ];

      Object.values(defaultTheme.colors).forEach((color) => {
        expect(validColors).toContain(color);
      });
    });
  });

  describe("Theme Properties", () => {
    it("should have correct theme name", () => {
      expect(defaultTheme.name).toBe("default");
    });

    it("should have consistent critical status colors", () => {
      // Error and success colors should be clear
      expect(defaultTheme.colors.error).toBe("red");
      expect(defaultTheme.colors.success).toBe("green");
    });
  });
});
