/**
 * TokensScreen - Token usage display (ink component)
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { ScreenLayout } from "../components/index.js";
import { getConfigService } from "../../services/config.service.js";
import { formatTokens } from "../../shared/formatters.js";

interface TokensScreenProps {
  onBack: () => void;
}

interface ServerTokenInfo {
  name: string;
  type: string;
  totalTokens: number;
  toolCount: number;
  tools: Array<{ name: string; tokens: number }>;
}

export function TokensScreen({ onBack }: TokensScreenProps): React.ReactElement {
  const [servers, setServers] = useState<ServerTokenInfo[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  // Load token data on mount
  useEffect(() => {
    const configService = getConfigService();
    const toolFilters = configService.getToolFilters();
    const localServers = configService.getLocalServers();
    const remoteServers = configService.getRemoteServers();

    const serversData: ServerTokenInfo[] = [];
    let total = 0;

    // Process local servers
    for (const server of localServers) {
      const filter = toolFilters[server.id];
      if (!filter?.toolsData) continue;

      const serverInfo: ServerTokenInfo = {
        name: server.name,
        type: "stdio",
        totalTokens: filter.totalTokens || 0,
        toolCount: filter.allTools?.length || 0,
        tools: Object.entries(filter.toolsData).map(([name, data]) => ({
          name,
          tokens: data.tokens || 0,
        })),
      };

      serversData.push(serverInfo);
      total += serverInfo.totalTokens;
    }

    // Process remote servers
    for (const server of remoteServers) {
      const filter = toolFilters[`remote:${server.id}`];
      if (!filter?.toolsData) continue;

      const serverInfo: ServerTokenInfo = {
        name: server.name,
        type: server.type,
        totalTokens: filter.totalTokens || 0,
        toolCount: filter.allTools?.length || 0,
        tools: Object.entries(filter.toolsData).map(([name, data]) => ({
          name,
          tokens: data.tokens || 0,
        })),
      };

      serversData.push(serverInfo);
      total += serverInfo.totalTokens;
    }

    setServers(serversData);
    setGrandTotal(total);
  }, []);

  // Handle keyboard input
  useInput(() => {
    onBack();
  });

  return (
    <ScreenLayout
      title="Token Usage"
      shortcuts={[{ key: "Any", label: "Go back" }]}
    >
      {servers.length === 0 ? (
        <Box flexDirection="column" paddingY={1}>
          <Text dimColor>No token data available.</Text>
          <Text dimColor>Test servers to discover tools and count tokens.</Text>
        </Box>
      ) : (
        <>
          {servers.map((server) => {
            const typeLabel = server.type !== "stdio" ? ` (${server.type})` : "";
            const topTools = server.tools.sort((a, b) => b.tokens - a.tokens).slice(0, 5);

            return (
              <Box key={server.name} flexDirection="column" marginBottom={1}>
                <Box gap={1}>
                  <Text color="cyan">{server.name}</Text>
                  <Text dimColor>{typeLabel}:</Text>
                  <Text color="magenta">{formatTokens(server.totalTokens)}</Text>
                  <Text>tokens ({server.toolCount} tools)</Text>
                </Box>

                {topTools.map((tool) => (
                  <Box key={tool.name} marginLeft={2}>
                    <Text dimColor>
                      {tool.name}: {formatTokens(tool.tokens)}
                    </Text>
                  </Box>
                ))}

                {server.tools.length > 5 && (
                  <Box marginLeft={2}>
                    <Text dimColor>... and {server.tools.length - 5} more</Text>
                  </Box>
                )}
              </Box>
            );
          })}

          {servers.length > 0 && (
            <Box marginTop={1}>
              <Text bold>Total: </Text>
              <Text color="magenta">{formatTokens(grandTotal)}</Text>
              <Text> tokens</Text>
            </Box>
          )}
        </>
      )}
    </ScreenLayout>
  );
}

export default TokensScreen;
