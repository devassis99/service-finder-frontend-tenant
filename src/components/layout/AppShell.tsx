import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useAuthStore } from "@/auth/auth-store";
import { usePermissions } from "@/auth/use-permissions";
import { useMe } from "@/auth/use-me";
import { requiredPermissionFor } from "@/auth/route-permissions";
import { logout } from "@/lib/accounts-api";
import { queryClient } from "@/lib/query-client";
import { Avatar } from "@/components/ui/Avatar";
import { LogoTile } from "@/components/ui/Wordmark";
import { LoadingScreen } from "./LoadingScreen";

interface NavItem {
  to: string;
  label: string;
  /** Active for these path prefixes too — Settings covers every settings page but Team. */
  activeWhen?: (pathname: string) => boolean;
}

/**
 * The business app's navigation. Deliberately short: the app has no
 * business features yet — Service Finder's own areas arrive later and
 * each adds its row here (and its key to auth/route-permissions.ts).
 */
const NAV: NavItem[] = [
  { to: "/home", label: "Home" },
  { to: "/settings/team", label: "Team" },
  {
    to: "/settings",
    label: "Settings",
    activeWhen: (path) => path.startsWith("/settings") && !path.startsWith("/settings/team"),
  },
];

/**
 * The signed-in frame — B01: a near-black sidebar (the business's tile
 * and name, then the nav, then who's signed in) beside the page. Each
 * page draws its own white header bar (PageHeader) and body.
 *
 * Also the route guard: a page whose permission the caller lacks
 * (auth/route-permissions.ts) renders a "not for your role" panel instead
 * of making a request it would be refused. The backend refuses it either
 * way; this just says so first.
 */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const me = useMe();
  const member = useAuthStore((s) => s.member);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logOut = useAuthStore((s) => s.logOut);
  const { has, isReady } = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);

  // A new page closes the mobile menu.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  async function signOut() {
    const token = refreshToken;
    logOut();
    queryClient.clear();
    navigate("/login", { replace: true });
    await logout(token);
  }

  const required = requiredPermissionFor(location.pathname);
  const visibleNav = NAV.filter((item) => {
    const permission = requiredPermissionFor(item.to);
    return !permission || has(permission);
  });

  if (!member && me.isPending) return <LoadingScreen />;

  const businessName = me.data?.account.name ?? member?.businessName ?? "Your business";
  const name = me.data?.staffUser.name ?? member?.name ?? "";
  const roleName = me.data?.staffUser.roleName ?? member?.roleName ?? "";

  const sidebar = (
    <nav
      aria-label="Main"
      className="box-border flex h-full w-[220px] shrink-0 flex-col bg-tn-side px-3.5 py-5"
    >
      <div className="flex items-center gap-2.5 px-2 pb-6">
        <LogoTile size={26} label={businessName} />
        <span
          className="truncate font-sans text-sm leading-tight font-semibold text-white"
          title={businessName}
        >
          {businessName}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={!item.activeWhen && item.to === "/home"}
            className={({ isActive }) => {
              const active = item.activeWhen ? item.activeWhen(location.pathname) : isActive;
              return `block rounded-[9px] px-3 py-[11px] font-sans text-[13px] leading-none no-underline hover:no-underline ${
                active
                  ? "bg-tn-side-active font-semibold text-white hover:text-white"
                  : "text-tn-side-text hover:bg-tn-side-active/60 hover:text-white"
              }`;
            }}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2.5 px-1">
        <span className="font-mono text-[10px] leading-none font-medium tracking-[0.1em] text-tn-side-label uppercase">
          Signed in
        </span>
        <div className="flex flex-col gap-2 rounded-[9px] bg-tn-side-active p-[3px]">
          <NavLink
            to="/settings/profile"
            className="flex items-center gap-2.5 rounded-[7px] px-2 py-2 no-underline hover:bg-tn-ink/40 hover:no-underline"
          >
            <Avatar name={name || "?"} size={28} tone="dark" />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-sans text-xs leading-none font-semibold text-white">
                {name}
              </span>
              <span className="truncate font-sans text-[11px] leading-none text-tn-side-text">
                {roleName}
              </span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={() => void signOut()}
            className="cursor-pointer rounded-[7px] border-0 bg-tn-side-chip px-2 py-2 font-sans text-[11px] leading-none font-semibold text-tn-ink hover:bg-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );

  let content;
  if (required && !isReady) {
    content = <LoadingScreen />;
  } else if (required && !has(required)) {
    content = (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex max-w-[380px] flex-col items-center gap-2 text-center">
          <h1 className="m-0 font-sans text-xl font-bold tracking-[-0.02em] text-tn-ink">
            Not part of your role
          </h1>
          <p className="m-0 font-sans text-sm leading-normal text-tn-muted">
            This page needs a permission your role doesn't have. Ask an owner of {businessName} if
            you need it.
          </p>
        </div>
      </div>
    );
  } else {
    content = <Outlet />;
  }

  return (
    <div className="flex h-screen bg-tn-page">
      <div className="hidden lg:flex">{sidebar}</div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {sidebar}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="flex-1 cursor-pointer border-0 bg-tn-backdrop"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-tn-card-border bg-tn-side px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-tn-side-active text-white"
          >
            <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
              <path
                d="M1 1h14M1 6h14M1 11h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <LogoTile size={22} label={businessName} />
          <span className="truncate font-sans text-sm font-semibold text-white">
            {businessName}
          </span>
        </div>
        {content}
      </div>
    </div>
  );
}

export default AppShell;
