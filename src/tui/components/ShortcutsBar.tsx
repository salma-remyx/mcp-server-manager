/**
 * ShortcutsBar component - Bottom shortcuts bar with fluid responsive layout
 */

import React from "react";
import { Box, Text } from "ink";

export interface Shortcut {
  key: string;
  label: string;
}

interface ShortcutsBarProps {
  shortcuts?: Shortcut[];
}

const defaultShortcuts: Shortcut[] = [
  { key: "F", label: "Profiles" },
  { key: "I", label: "Import/Export" },
  { key: "H", label: "Doctor" },
];

export function ShortcutsBar({ shortcuts = defaultShortcuts }: ShortcutsBarProps): React.ReactElement {
  const renderShortcut = (shortcut: Shortcut) => (
    <Box key={shortcut.key} marginRight={1}>
      <Text color="green" bold>
        •{shortcut.key}
      </Text>
      <Text dimColor> {shortcut.label}</Text>
    </Box>
  );

  return (
    <Box paddingX={1} paddingY={0} borderStyle="round" borderColor="gray" width="100%">
      <Box flexWrap="wrap">
        {shortcuts.map(renderShortcut)}
      </Box>
    </Box>
  );
}

export default ShortcutsBar;
