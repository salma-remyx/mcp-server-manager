/**
 * ScreenLayout - Standardized screen layout with fixed height and menu
 */

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { Header, ShortcutsBar } from "./index.js";
import type { MenuSection } from "../utils/menu.js";
import type { Shortcut } from "./ShortcutsBar.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";

interface ScreenLayoutProps {
  title: string;
  /** Optional subtitle or status line */
  subtitle?: string;
  /** Menu sections to display */
  menuSections?: MenuSection[];
  /** Highlighted menu item */
  highlightedView?: string;
  /** Custom shortcuts for footer bar */
  shortcuts?: Shortcut[];
  /** Main content area */
  children: React.ReactNode;
  /** Optional footer message */
  footer?: React.ReactNode;
  /** Custom header component (overrides title) */
  customHeader?: React.ReactNode;
}

export function ScreenLayout({
  title,
  subtitle,
  menuSections,
  shortcuts,
  children,
  footer,
  customHeader,
}: ScreenLayoutProps): React.ReactElement {
  const terminalSize = useTerminalSize();
  const isCompactLayout = terminalSize.columns < 90;
  const contentMargin = isCompactLayout ? 0 : 1;

  const derivedShortcuts = useMemo(() => {
    if (shortcuts && shortcuts.length > 0) {
      return shortcuts;
    }
    if (!menuSections) return undefined;
    return menuSections.flatMap((section) =>
      section.items.map((item) => ({
        key: item.key,
        label: item.label,
      }))
    );
  }, [shortcuts, menuSections]);

  return (
    <Box flexDirection="column" paddingX={isCompactLayout ? 0 : 1}>
      <Box marginX={contentMargin}>{customHeader || <Header title={title} />}</Box>

      {subtitle && (
        <Box marginX={contentMargin} marginTop={0}>
          <Text dimColor>{subtitle}</Text>
        </Box>
      )}

      <Box
        marginTop={1}
        marginX={contentMargin}
        flexDirection="column"
        borderStyle="round"
        borderColor="green"
        paddingX={1}
        paddingY={0}
      >
        {children}
      </Box>

      {footer && (
          <Box marginX={contentMargin} marginTop={1}>
          {footer}
        </Box>
      )}

      {derivedShortcuts && derivedShortcuts.length > 0 && (
        <Box marginTop={1} marginX={contentMargin}>
          <ShortcutsBar shortcuts={derivedShortcuts} />
        </Box>
      )}
    </Box>
  );
}

export default ScreenLayout;

