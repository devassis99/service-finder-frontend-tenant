import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./http";

/**
 * Same tuning as the back office's: staleTime above 0 so moving between
 * screens that share a query doesn't refetch on every mount, and 401 /
 * 403 / 404 skip retries since they're never transient (a 401 from an
 * expired token is already handled once, inside http.ts).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
