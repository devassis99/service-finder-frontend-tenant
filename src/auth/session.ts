import { getMe, type MeResponse, type TokenPair } from "@/lib/accounts-api";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "./auth-store";
import type { SessionMember } from "./types";

/** The slice of /accounts/me the shell keeps between reloads. */
export function memberFromMe(me: MeResponse): SessionMember {
  return {
    id: me.staffUser.id,
    name: me.staffUser.name,
    email: me.staffUser.email,
    roleName: me.staffUser.roleName,
    isOwner: me.staffUser.isOwner,
    businessName: me.account.name,
  };
}

/**
 * Every way in ends here — password, Google, two-factor, sign-up, an
 * invite. Fetches /accounts/me with the new token *before* storing the
 * session, so the first screen after signing in draws its nav from this
 * person's real permissions rather than an empty list, and a token the
 * API won't honour never gets stored at all.
 *
 * Anything cached from whoever was signed in on this browser before is
 * dropped first.
 */
export async function startSession(tokens: TokenPair): Promise<MeResponse> {
  const me = await getMe(tokens.accessToken);
  queryClient.clear();
  useAuthStore.getState().signIn({
    member: memberFromMe(me),
    permissions: me.permissions,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
  queryClient.setQueryData(["me"], me);
  return me;
}
