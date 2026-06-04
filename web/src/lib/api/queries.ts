import { useMutation, useQuery } from "@tanstack/react-query";

import { executeQuery } from "./http";
import { fetchHealth, fetchPing } from "./health";
import type { ExecuteQueryInput } from "./types";

export const healthQueryKey = ["api", "health"] as const;
export const pingQueryKey = ["api", "ping"] as const;

export function useHealthQuery() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: fetchHealth,
    staleTime: 30_000,
    retry: 1,
  });
}

export function usePingQuery() {
  return useQuery({
    queryKey: pingQueryKey,
    queryFn: fetchPing,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useExecuteQuery() {
  return useMutation({
    mutationFn: (input: ExecuteQueryInput) => executeQuery(input),
  });
}
