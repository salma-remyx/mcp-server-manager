import { describe, it, expect } from "vitest";
import { getTheme, defaultTheme, minimalTheme, colorfulTheme } from "../src/tui/theme/palettes.js";
import type { Theme, ThemeColors } from "../src/tui/theme/types.js";

describe("Theme System", () => {
  describe("getTheme", () => {
    it("should return default theme for 'default'", () => {
      const theme = getTheme("default");
      expect(theme).toEqual(defaultTheme);
      expect(theme.name).toBe("default");
    });

    it("should return minimal theme for 'minimal'", () => {
      const theme = getTheme("minimal");
      expect(theme).toEqual(minimalTheme);
      expect(theme.name).toBe("minimal");
    });

    it("should return colorful theme for 'colorful'", () => {
      const theme = getTheme("colorful");
      expect(theme).toEqual(colorfulTheme);
      expect(theme.name).toBe("colorful");
    });

    it("should default to default theme for invalid name", () => {
      // TypeScript won't allow invalid values, but test runtime behavior
      const theme = getTheme("invalid" as any);
      expect(theme).toEqual(defaultTheme);
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

    it("should have complete ThemeColors structure in minimal theme", () => {
      const theme = minimalTheme;

      // Check all required keys are present
      requiredColorKeys.forEach((key) => {
        expect(theme.colors[key]).toBeDefined();
        expect(typeof theme.colors[key]).toBe("string");
      });

      // Verify minimal theme uses subdued colors
      expect(theme.colors.primary).toBe("white");
      expect(theme.colors.secondary).toBe("gray");
    });

    it("should have complete ThemeColors structure in colorful theme", () => {
      const theme = colorfulTheme;

      // Check all required keys are present
      requiredColorKeys.forEach((key) => {
        expect(theme.colors[key]).toBeDefined();
        expect(typeof theme.colors[key]).toBe("string");
      });

      // Verify colorful theme uses vibrant colors
      expect(theme.colors.primary).toBe("cyan");
      expect(theme.colors.accent).toBe("yellow");
      expect(theme.colors.border).toBe("magenta");
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

    it("should have valid Ink color types for minimal theme", () => {
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

      Object.values(minimalTheme.colors).forEach((color) => {
        expect(validColors).toContain(color);
      });
    });

    it("should have valid Ink color types for colorful theme", () => {
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

      Object.values(colorfulTheme.colors).forEach((color) => {
        expect(validColors).toContain(color);
      });
    });
  });

  describe("Theme Properties", () => {
    it("should have correct theme names", () => {
      expect(defaultTheme.name).toBe("default");
      expect(minimalTheme.name).toBe("minimal");
      expect(colorfulTheme.name).toBe("colorful");
    });

    it("should have different color schemes across themes", () => {
      // Themes should differ in their primary color approach
      expect(defaultTheme.colors.primary).not.toBe(minimalTheme.colors.primary);
      expect(defaultTheme.colors.border).not.toBe(colorfulTheme.colors.border);
    });

    it("should maintain consistency for critical status colors", () => {
      // Error and success colors should be consistent across themes
      expect(defaultTheme.colors.error).toBe("red");
      expect(minimalTheme.colors.error).toBe("red");
      expect(colorfulTheme.colors.error).toBe("red");

      expect(defaultTheme.colors.success).toBe("green");
      expect(minimalTheme.colors.success).toBe("green");
      expect(colorfulTheme.colors.success).toBe("green");
    });
  });
});
