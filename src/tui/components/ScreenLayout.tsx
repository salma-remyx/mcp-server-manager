/**
 * ScreenLayout - Standardized screen layout with fixed height and menu
 */

import React from "react";
import { Box, Text } from "ink";
import { Header, MenuPanel } from "./index.js";
import type { MenuSection } from "../utils/menu.js";

interface ScreenLayoutProps {
  title: string;
  /** Optional subtitle or status line */
  subtitle?: string;
  /** Menu sections to display */
  menuSections?: MenuSection[];
  /** Highlighted menu item */
  highlightedView?: string;
  /** Main content area */
  children: React.ReactNode;
  /** Optional footer message */
  footer?: React.ReactNode;
  /** Custom header component (overrides title) */
  customHeader?: React.ReactNode;
}

/** Fixed height for screen content area */
const CONTENT_HEIGHT = 20; // Lines available for content

export function ScreenLayout({
  title,
  subtitle,
  menuSections,
  highlightedView,
  children,
  footer,
  customHeader,
}: ScreenLayoutProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {/* Header */}
      {customHeader || <Header title={title} />}

      {/* Subtitle/Status */}
      {subtitle && (
        <Box paddingX={1} marginTop={0}>
          <Text dimColor>{subtitle}</Text>
        </Box>
      )}

      {/* Main content area with fixed height */}
      <Box marginTop={1} gap={2}>
        {/* Left panel: Content */}
        <Box flexDirection="column" flexGrow={1} minHeight={CONTENT_HEIGHT}>
          {children}
        </Box>

        {/* Right panel: Menu */}
        {menuSections && menuSections.length > 0 && (
          <MenuPanel sections={menuSections} highlightedView={highlightedView} />
        )}
      </Box>

      {/* Footer */}
      {footer && (
        <Box paddingX={1} marginTop={1}>
          {footer}
        </Box>
      )}
    </Box>
  );
}

export default ScreenLayout;

