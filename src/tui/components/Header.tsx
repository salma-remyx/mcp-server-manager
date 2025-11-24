/**
 * Header component - App title and status
 */

import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  title?: string;
  version?: string;
}

export function Header({ title = "MCP Server Manager", version }: HeaderProps): React.ReactElement {
  return (
    <Box paddingX={1} paddingY={1} borderStyle="round" borderColor="cyan">
      <Text color="cyan" bold>
        {title}
      </Text>
      {version && (
        <Text dimColor> v{version}</Text>
      )}
    </Box>
  );
}

export default Header;
