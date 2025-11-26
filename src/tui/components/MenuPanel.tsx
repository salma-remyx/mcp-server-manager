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
  highlightedView?: string; // View that's currently active
}

const defaultSections: MenuSection[] = [
  {
    title: "Navigation",
    items: [
      { key: "↑↓", label: "Move" },
      { key: "Enter", label: "Manage" },
      { key: "Q", label: "Back" },
    ],
  },
  {
    title: "Server",
    items: [
      { key: "A", label: "Add" },
      { key: "E", label: "Edit" },
      { key: "D", label: "Delete" },
      { key: "Space", label: "Enable/Disable" },
      { key: "X", label: "Test" },
    ],
  },
  {
    title: "Data",
    items: [
      { key: "T", label: "Tools" },
      { key: "F", label: "Profiles" },
      { key: "I", label: "Import/Export" },
    ],
  },
  {
    title: "Config",
    items: [
      { key: "C", label: "Clients" },
      { key: "G", label: "Settings" },
    ],
  },
  {
    title: "System",
    items: [
      { key: "H", label: "Doctor" },
      { key: "K", label: "Tokens" },
      { key: "O", label: "OAuth" },
    ],
  },
];

export function MenuPanel({ sections = defaultSections, highlightedView }: MenuPanelProps): React.ReactElement {
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
          {section.items.map((item) => {
            const isHighlighted = highlightedView === item.key;
            return (
              <Box key={item.key} gap={1}>
                <Text color={isHighlighted ? "cyan" : "green"} bold={isHighlighted}>
                  {item.key.padEnd(5)}
                </Text>
                <Text color={isHighlighted ? "cyan" : undefined} dimColor={!isHighlighted}>
                  {item.label}
                  {isHighlighted ? " ◄" : ""}
                </Text>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

export default MenuPanel;
