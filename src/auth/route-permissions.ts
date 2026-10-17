/**
 * Which permission each gated page needs, in one place. The sidebar and
 * the settings nav both filter their items through this, and AppShell
 * guards the route with the same map — so a hidden menu item and a
 * blocked page can't disagree, and typing the URL gets you nothing the
 * menu wouldn't.
 *
 * Each key mirrors the requireAccountPermission(...) guard on the
 * endpoint the page reads. Pages with no entry are open to everyone
 * signed in, on purpose:
 *
 * - Home — everyone needs somewhere to land.
 * - Business profile — anyone can see their business's details; only
 *   business.manage can change them, and the page says so.
 * - My profile, Security — the caller's own name, password, two-factor
 *   and sessions. The backend scopes those to the caller with no
 *   permission check at all.
 */
export interface GatedRoute {
  /** Route path prefix. A pathname matches it exactly, or as a sub-route. */
  to: string;
  /** staff_permissions.key — see service-finder-backend's DEFAULT_PERMISSIONS. */
  permission: string;
}

export const ROUTE_PERMISSIONS: GatedRoute[] = [{ to: "/settings/team", permission: "staff.view" }];

function matchesRoute(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** The permission `pathname` needs, or null if it's open to anyone signed in. Longest match wins. */
export function requiredPermissionFor(pathname: string): string | null {
  let best: GatedRoute | null = null;
  for (const entry of ROUTE_PERMISSIONS) {
    if (matchesRoute(pathname, entry.to) && (!best || entry.to.length > best.to.length)) {
      best = entry;
    }
  }
  return best?.permission ?? null;
}
