import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useDaemonStatus } from "../hooks/useDaemonStatus.js";
import { useTheme } from "../theme/index.js";

interface DaemonStatusProps {
  compact?: boolean;
  polling?: boolean;
}

export function DaemonStatus({ compact = false, polling = false }: DaemonStatusProps): React.ReactElement {
  const { theme } = useTheme();
  const { status, isLoading } = useDaemonStatus({ polling });

  if (isLoading || !status) {
    return (
      <Box gap={1}>
        <Text color={theme.colors.info}>
          <Spinner type="dots" />
        </Text>
        {!compact && <Text dimColor>Checking daemon...</Text>}
      </Box>
    );
  }

  if (!status.running) {
    return (
      <Box gap={1}>
        <Text color={theme.colors.error}>●</Text>
        <Text color={theme.colors.error}>{compact ? "Stopped" : "Daemon stopped"}</Text>
      </Box>
    );
  }

  if (status.healthy) {
    if (compact) {
      return (
        <Box gap={1}>
          <Text color={theme.colors.success}>●</Text>
          <Text color={theme.colors.success}>
            Healthy ({status.health?.servers ?? 0} srv, {status.health?.tools ?? 0} tools)
          </Text>
        </Box>
      );
    }

    return (
      <Box gap={1}>
        <Text color={theme.colors.success}>●</Text>
        <Text color={theme.colors.success}>
          Healthy (PID: {status.pid}, {status.health?.servers ?? 0} servers,{" "}
          {status.health?.tools ?? 0} tools)
        </Text>
      </Box>
    );
  }

  return (
    <Box gap={1}>
      <Text color={theme.colors.warning}>●</Text>
      <Text color={theme.colors.warning}>
        {compact ? "Unhealthy" : `Running but unhealthy (PID: ${status.pid})`}
      </Text>
      {!compact && (
        <Text color={theme.colors.error}>{status.health?.error || "Not responding"}</Text>
      )}
    </Box>
  );
}
