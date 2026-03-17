/**
 * Header component - App title and status
 */

import React from "react";
import { Box, Text } from "ink";
import { formatTokens } from "../../shared/formatters.js";
import { useTheme } from "../theme/index.js";

interface HeaderProps {
  title?: string;
  version?: string;
  profile?: string;
  port?: number;
  totalTokens?: number | null;
  trailing?: React.ReactNode;
}

export function Header({
  title = "MCP Server Manager",
  version,
  profile,
  port,
  totalTokens,
  trailing,
}: HeaderProps): React.ReactElement {
  const { theme } = useTheme();

  return (
    <Box paddingX={2} paddingY={0} borderStyle="round" borderColor={theme.colors.headerBorder} flexDirection="column">
      <Box gap={1}>
        <Text color={theme.colors.primary} bold>
          {title} {version && `v${version}`}
        </Text>
        {trailing}
      </Box>
      <Box gap={1}>
        {profile && (
          <>
            <Text dimColor>Profile:</Text>
            <Text color={theme.colors.accent} bold> ◀ {profile} ▶</Text>
          </>
        )}
        {profile && port && <Text dimColor>|</Text>}
        {port && <Text dimColor>Port: {port}</Text>}
        {(profile || port) && totalTokens !== undefined && <Text dimColor>|</Text>}
        {totalTokens !== undefined && (
          <Text dimColor>
            {typeof totalTokens === "number" ? `${formatTokens(totalTokens)} tokens` : "— tokens"}
          </Text>
        )}
      </Box>
    </Box>
  );
}

export default Header;
