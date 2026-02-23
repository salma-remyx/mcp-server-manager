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

interface UseDaemonStatusOptions {
  polling?: boolean;
}

interface UseDaemonStatusResult {
  status: DaemonStatusData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
}

const POLL_INTERVAL_MS = 2000;

export function useDaemonStatus(options?: UseDaemonStatusOptions): UseDaemonStatusResult {
  const daemonService = getDaemonService();
  const polling = options?.polling ?? false;

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
  useEffect((): (() => void) | void => {
    if (!polling) return;
    const interval = setInterval((): void => {
      void refetch();
    }, POLL_INTERVAL_MS);
    return (): void => clearInterval(interval);
  }, [refetch, polling]);

  return { status, isLoading, isFetching, refetch: (): void => void refetch() };
}
