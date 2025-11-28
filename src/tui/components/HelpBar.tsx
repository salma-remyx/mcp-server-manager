/**
 * HelpBar component - Shows keyboard shortcuts organized by category
 */

import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../theme/index.js";

interface ShortcutGroup {
  label: string;
  shortcuts: string[];
}

interface HelpBarProps {
  groups?: ShortcutGroup[];
}

const defaultGroups: ShortcutGroup[] = [
  { label: "Navigation", shortcuts: ["↑/↓ Move", "Enter Start", "Q Quit"] },
  { label: "Server", shortcuts: ["A Add", "E Edit", "D Delete", "Space Enable/Disable", "X Test", "T Tools"] },
  {
    label: "Global",
    shortcuts: ["C Clients", "F Profiles", "G Settings", "I Import", "H Doctor", "P Port", "M Daemon"],
  },
];

export function HelpBar({ groups = defaultGroups }: HelpBarProps): React.ReactElement {
  const { theme } = useTheme();
  return (
    <Box flexDirection="column" marginTop={1} paddingX={1}>
      {groups.map((group) => (
        <Box key={group.label} gap={1}>
          <Text color={theme.colors.primary} bold>
            {group.label}:
          </Text>
          <Text dimColor>{group.shortcuts.join("  ")}</Text>
        </Box>
      ))}
    </Box>
  );
}

export default HelpBar;
