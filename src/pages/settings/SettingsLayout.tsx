import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import { usePermissions } from "@/auth/use-permissions";
import { requiredPermissionFor } from "@/auth/route-permissions";

const SECTIONS = [
  { to: "/settings/business", label: "Business profile" },
  { to: "/settings/team", label: "Users & roles" },
  { to: "/settings/profile", label: "My profile" },
  { to: "/settings/security", label: "Security" },
];

/**
 * B19's settings frame: a white section list down the left — the
 * selected one on a warm tint with a teal bar — and the section's page
 * beside it. Sections the caller's role can't open aren't listed (the
 * same map AppShell guards the routes with).
 */
export function SettingsLayout() {
  const { has } = usePermissions();
  const sections = SECTIONS.filter((section) => {
    const permission = requiredPermissionFor(section.to);
    return !permission || has(permission);
  });

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <nav
        aria-label="Settings"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-tn-card-border bg-tn-paper px-2 md:w-[200px] md:flex-col md:gap-0 md:overflow-visible md:border-r md:border-b-0 md:px-0 md:py-5"
      >
        <span className="hidden px-5 pb-3 font-mono text-[10px] leading-none tracking-[0.1em] text-tn-faint uppercase md:block">
          Settings
        </span>
        {sections.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            className={({ isActive }) =>
              `block shrink-0 border-b-[3px] px-3 py-3 font-sans text-[13px] leading-none whitespace-nowrap no-underline hover:no-underline md:border-b-0 md:border-l-[3px] md:px-5 md:py-[13px] ${
                isActive
                  ? "border-tn-accent bg-tn-subtle font-semibold text-tn-ink hover:text-tn-ink"
                  : "border-transparent text-tn-muted hover:bg-tn-subtle hover:text-tn-ink"
              }`
            }
          >
            {section.label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

/**
 * A settings section's page: B19's 20px bold heading with the section's
 * buttons beside it, an optional line under it, then its cards.
 */
export function SettingsPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="box-border flex max-w-[880px] flex-col gap-4 px-5 py-6 sm:px-[26px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="m-0 font-sans text-xl leading-[1.15] font-bold tracking-[-0.02em] text-tn-ink">
            {title}
          </h1>
          {description && (
            <p className="m-0 font-sans text-[13px] leading-normal text-tn-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export default SettingsLayout;
