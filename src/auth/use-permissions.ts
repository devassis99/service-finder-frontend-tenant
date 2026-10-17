import { useAuthStore } from "./auth-store";
import { useMe } from "./use-me";

/**
 * The caller's permission keys (their role's, from GET /accounts/me) —
 * used to show only the nav items, pages and buttons that will actually
 * work, the same keys the backend's requireAccountPermission checks.
 *
 * This is UX only. Hiding a button doesn't stop a direct API call; the
 * backend checks every route itself, and on top of that refuses anyone
 * but an owner a role beyond their own permissions.
 *
 * Answers come from /accounts/me when it has landed and from the
 * persisted store until then, so a reload draws the right nav on its
 * first frame. Worst case is one frame of a stale item that 403s.
 */
export function usePermissions() {
  const me = useMe();
  const cached = useAuthStore((s) => s.permissions);
  const cachedOwner = useAuthStore((s) => s.member?.isOwner ?? false);

  const permissions = me.data?.permissions ?? cached;
  const isOwner = me.data?.staffUser.isOwner ?? cachedOwner;

  return {
    permissions,
    has: (key: string) => permissions.includes(key),
    isOwner,
    /**
     * Whether `permissions` can be trusted. False only on a first-ever
     * load with nothing cached — the one case where a route guard should
     * wait rather than deny.
     */
    isReady: !me.isPending || cached.length > 0,
  };
}
