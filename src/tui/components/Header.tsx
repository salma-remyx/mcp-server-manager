/**
 * Header component - App title and status
 */

import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  title?: string;
  version?: string;
  profile?: string;
  port?: number;
}

export function Header({ title = "MCP Server Manager", version, profile, port }: HeaderProps): React.ReactElement {
  return (
    <Box paddingX={2} paddingY={0} borderStyle="round" borderColor="cyan" flexDirection="column">
      <Text color="cyan" bold>
        {title} {version && `v${version}`}
      </Text>
      {(profile || port) && (
        <Text dimColor>
          Profile: {profile} | Port: {port}
        </Text>
      )}
    </Box>
  );
}

export default Header;
