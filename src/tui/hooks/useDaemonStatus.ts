import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDaemonService, type DaemonHealthResponse } from "../../services/daemon.service.js";

interface DaemonStatusData {
  running: boolean;
  pid?: number;
  startupEnabled: boolean;
  port: number;
  logFile: string;
  healthy: boolean;
  health?: DaemonHealthResponse;
}

interface UseDaemonStatusResult {
  status: DaemonStatusData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
}

const POLL_INTERVAL_MS = 2000;

export function useDaemonStatus(): UseDaemonStatusResult {
  const daemonService = getDaemonService();

  const {
    data: status,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<DaemonStatusData>({
    queryKey: ["daemon-status"],
    queryFn: () => daemonService.getStatus(),
  });

  // refetchInterval doesn't work in Ink, so poll manually
  useEffect((): (() => void) => {
    const interval = setInterval((): void => {
      void refetch();
    }, POLL_INTERVAL_MS);
    return (): void => clearInterval(interval);
  }, [refetch]);

  return { status, isLoading, isFetching, refetch: (): void => void refetch() };
}
