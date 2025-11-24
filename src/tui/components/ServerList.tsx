/**
 * ServerList component - Displays servers with selection state
 */

import React from "react";
import { Box, Text } from "ink";
import type { LocalServer, RemoteServer } from "../../types/index.js";

interface ServerListProps {
  title: string;
  servers: (LocalServer | RemoteServer)[];
  selectedIndex: number;
  isActiveSection: boolean;
  selectedServers: Set<string>;
  toolCounts?: Map<string, number>;
  isRemote?: boolean;
}

export function ServerList({
  title,
  servers,
  selectedIndex,
  isActiveSection,
  selectedServers,
  toolCounts = new Map(),
  isRemote = false,
}: ServerListProps): React.ReactElement | null {
  if (servers.length === 0) return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          {title}
        </Text>
      </Box>

      {servers.map((server, idx) => {
        const isCurrent = isActiveSection && idx === selectedIndex;
        const serverId = isRemote ? `remote:${server.id}` : server.id;
        const isSelected = selectedServers.has(serverId);
        const isDisabled = server.disabled;
        const toolCount = toolCounts.get(serverId) ?? 0;

        // Determine checkbox style
        const checkbox = isSelected ? "[✓]" : "[ ]";
        const checkboxColor = isSelected ? "green" : "gray";

        // Determine name style
        const nameColor = isDisabled ? "gray" : isCurrent ? "white" : undefined;

        // Tool count or disabled label
        const statusText = isDisabled ? "disabled" : `${toolCount} tools`;
        const statusColor = isDisabled ? "yellow" : "gray";

        return (
          <Box key={server.id} gap={1}>
            <Text color="cyan">{isCurrent ? "→" : " "}</Text>
            <Text color={checkboxColor}>{checkbox}</Text>
            <Text color={nameColor} bold={isCurrent}>
              {server.name || server.id}
            </Text>
            <Text dimColor>-</Text>
            <Text color={statusColor}>{statusText}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

export default ServerList;
