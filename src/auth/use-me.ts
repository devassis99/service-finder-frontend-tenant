import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/accounts-api";
import { useAuthStore } from "./auth-store";
import { memberFromMe } from "./session";

/**
 * GET /accounts/me — who the caller is, what their role lets them do,
 * and their business. Cached for a minute and shared by every screen;
 * invalidate ["me"] after anything that changes it (a name, the
 * business profile, two-factor).
 *
 * Each answer is mirrored into the auth store, which persists it, so a
 * reload draws the shell from the last known answer while this
 * refetches.
 */
export function useMe() {
  const signedIn = useAuthStore((s) => s.accessToken !== null);
  const setMe = useAuthStore((s) => s.setMe);

  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const data = query.data;
  useEffect(() => {
    if (data) setMe({ member: memberFromMe(data), permissions: data.permissions });
  }, [data, setMe]);

  return query;
}
