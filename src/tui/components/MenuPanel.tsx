/**
 * MenuPanel component - Keyboard shortcuts in a styled box
 */

import React from "react";
import { Box, Text } from "ink";

interface MenuSection {
  title: string;
  items: Array<{ key: string; label: string }>;
}

interface MenuPanelProps {
  sections?: MenuSection[];
}

const defaultSections: MenuSection[] = [
  {
    title: "Navigation",
    items: [
      { key: "↑↓", label: "Move" },
      { key: "Space", label: "Select" },
      { key: "Enter", label: "Start" },
      { key: "Q", label: "Quit" },
    ],
  },
  {
    title: "Server",
    items: [
      { key: "A", label: "Add" },
      { key: "E", label: "Edit" },
      { key: "D", label: "Delete" },
      { key: "N", label: "Toggle" },
      { key: "X", label: "Test" },
    ],
  },
  {
    title: "Views",
    items: [
      { key: "T", label: "Tools" },
      { key: "C", label: "Clients" },
      { key: "F", label: "Profiles" },
      { key: "G", label: "Settings" },
      { key: "I", label: "Import/Export" },
    ],
  },
  {
    title: "System",
    items: [
      { key: "M", label: "Daemon" },
      { key: "H", label: "Doctor" },
      { key: "K", label: "Tokens" },
      { key: "P", label: "Port" },
    ],
  },
];

export function MenuPanel({ sections = defaultSections }: MenuPanelProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      paddingY={0}
    >
      <Box marginBottom={0}>
        <Text color="cyan" bold>
          Shortcuts
        </Text>
      </Box>

      {sections.map((section, sIdx) => (
        <Box key={section.title} flexDirection="column" marginTop={sIdx === 0 ? 0 : 1}>
          <Text color="yellow" dimColor>
            {section.title}
          </Text>
          {section.items.map((item) => (
            <Box key={item.key} gap={1}>
              <Text color="green" bold>
                {item.key.padEnd(5)}
              </Text>
              <Text dimColor>{item.label}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

export default MenuPanel;
