import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/auth/use-me";
import { usePermissions } from "@/auth/use-permissions";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardCaption, InlineError } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { listRoles } from "@/lib/roles-api";
import { listStaff, memberStatus, type StaffMember } from "@/lib/staff-api";
import { errorMessage } from "@/lib/errors";
import { firstName, formatDate, greeting, plural, timeAgo, todayLabel } from "@/lib/format";

const STATUS_PILL = {
  active: { tone: "success", label: "Active" },
  invited: { tone: "warning", label: "Invited" },
  deactivated: { tone: "muted", label: "Deactivated" },
} as const;

interface Task {
  id: string;
  title: string;
  detail: string;
  to: string;
}

/**
 * Home — B01's command centre and B02's "things need you", built from
 * what the business app has today: the business, its team, its roles
 * and the caller's own account. Nothing here is sample data.
 *
 * What each person sees follows their role: the team and role figures
 * only for someone with staff.view / roles.view (the endpoints behind
 * them require it), the "invite" prompts only for staff.manage, and the
 * business prompts only for business.manage.
 */
export function HomePage() {
  const navigate = useNavigate();
  const me = useMe();
  const { has } = usePermissions();
  const canViewTeam = has("staff.view");
  const canViewRoles = has("roles.view");

  const staff = useQuery({ queryKey: ["staff"], queryFn: listStaff, enabled: canViewTeam });
  const roles = useQuery({ queryKey: ["roles"], queryFn: listRoles, enabled: canViewRoles });

  if (!me.data) {
    return me.isError ? (
      <PageBody>
        <InlineError>{errorMessage(me.error)}</InlineError>
      </PageBody>
    ) : (
      <LoadingScreen />
    );
  }

  const { staffUser, account, permissions } = me.data;
  const team = staff.data ?? [];
  const counts = {
    active: team.filter((m) => memberStatus(m) === "active").length,
    invited: team.filter((m) => memberStatus(m) === "invited").length,
    deactivated: team.filter((m) => memberStatus(m) === "deactivated").length,
  };

  const tasks: Task[] = [];
  if (!staffUser.mfaEnabled) {
    tasks.push({
      id: "mfa",
      title: "Turn on two-factor authentication",
      detail: "A code from your phone at sign-in, so a leaked password isn't enough.",
      to: "/settings/security",
    });
  }
  if (has("staff.manage") && staff.data && team.length === 1) {
    tasks.push({
      id: "invite",
      title: "Invite your team",
      detail: "Add the people who work with you and choose what each of them can do.",
      to: "/settings/team",
    });
  }
  if (canViewTeam && counts.invited > 0) {
    tasks.push({
      id: "pending",
      title: `${plural(counts.invited, "invite hasn't", "invites haven't")} been accepted`,
      detail: "Resend the email, or copy a fresh link and send it yourself.",
      to: "/settings/team",
    });
  }
  if (has("business.manage") && !account.phone) {
    tasks.push({
      id: "phone",
      title: "Add a phone number for your business",
      detail: "Only the business's contact details — nobody signs in with it.",
      to: "/settings/business",
    });
  }

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName(staffUser.name)}`}
        caption={`${todayLabel()} · ${account.name}`}
        actions={
          has("staff.manage") && (
            <Button
              size="sm"
              onClick={() => navigate("/settings/team", { state: { invite: true } })}
            >
              + Invite person
            </Button>
          )
        }
      />
      <PageBody>
        {tasks.length > 0 ? (
          <section className="flex flex-col gap-3.5 rounded-[14px] border border-tn-warning-border bg-tn-warning-bg p-[18px]">
            <h2 className="m-0 font-sans text-base leading-none font-semibold text-tn-warning-ink">
              {tasks.length === 1 ? "One thing needs you" : `${tasks.length} things need you`}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {tasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-sans text-[13px] leading-snug font-semibold text-tn-warning-ink">
                      {task.title}
                    </span>
                    <span className="font-sans text-xs leading-snug text-tn-warning-ink/85">
                      {task.detail}
                    </span>
                  </span>
                  <Link
                    to={task.to}
                    className="inline-flex h-8 items-center rounded-[10px] bg-tn-ink px-3.5 font-sans text-xs font-semibold text-white no-underline hover:bg-tn-body hover:text-white hover:no-underline"
                  >
                    Do it
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="flex items-center gap-3 rounded-[14px] border border-tn-accent-bg bg-tn-accent-bg px-[18px] py-4">
            <span className="font-sans text-sm font-semibold text-tn-accent-deep">
              You're all set — nothing needs you right now.
            </span>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {canViewTeam && (
            <StatCard
              label="Team"
              value={staff.data ? counts.active : "—"}
              note={
                staff.data
                  ? `${counts.invited} invited · ${counts.deactivated} deactivated`
                  : "Loading…"
              }
              noteTone={counts.invited > 0 ? "warning" : "muted"}
            />
          )}
          {canViewRoles && (
            <StatCard
              label="Roles"
              value={roles.data ? roles.data.length : "—"}
              note={
                roles.data
                  ? `Owner + ${plural(roles.data.filter((r) => !r.isSystem).length, "other", "others")}`
                  : "Loading…"
              }
            />
          )}
          <StatCard
            label="Your role"
            value={staffUser.roleName || "—"}
            note={plural(permissions.length, "permission", "permissions")}
            noteTone="accent"
          />
          <StatCard
            label="Two-factor"
            value={staffUser.mfaEnabled ? "On" : "Off"}
            note={staffUser.mfaEnabled ? "Code required at sign-in" : "Turn on in Security"}
            noteTone={staffUser.mfaEnabled ? "accent" : "warning"}
          />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {canViewTeam ? (
            <Card
              flush
              title="Team"
              aside={
                <Link to="/settings/team" className="font-sans text-xs font-semibold">
                  See everyone
                </Link>
              }
            >
              {staff.isError ? (
                <div className="px-[18px] pb-[18px]">
                  <InlineError>{errorMessage(staff.error)}</InlineError>
                </div>
              ) : (
                <TeamPreview members={team.slice(0, 6)} loading={staff.isPending} />
              )}
            </Card>
          ) : (
            <Card title="Your account">
              <p className="m-0 font-sans text-[13px] leading-normal text-tn-muted">
                You're on {account.name}'s team as {staffUser.roleName}. Your role doesn't include
                seeing the rest of the team — an owner can change that.
              </p>
            </Card>
          )}

          <Card
            title="Your business"
            aside={
              has("business.manage") ? (
                <Link to="/settings/business" className="font-sans text-xs font-semibold">
                  Edit
                </Link>
              ) : (
                <CardCaption>View only</CardCaption>
              )
            }
          >
            <dl className="m-0 flex flex-col gap-3.5">
              <Detail label="Name" value={account.name} />
              <Detail label="Address" value={account.slug} mono />
              <Detail label="Contact email" value={account.email} />
              <Detail label="Phone" value={account.phone ?? "Not set"} muted={!account.phone} />
              <Detail label="On ServiceFinder since" value={formatDate(account.createdAt)} />
            </dl>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

function Detail({
  label,
  value,
  mono = false,
  muted = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-tn-divider pt-3 first:border-t-0 first:pt-0">
      <dt className="font-mono text-[10px] leading-none text-tn-faint uppercase">{label}</dt>
      <dd
        className={`m-0 truncate leading-snug ${mono ? "font-mono text-xs" : "font-sans text-[13px]"} ${muted ? "text-tn-faint" : "text-tn-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}

/** B07's roster table, cut to the first few rows. */
function TeamPreview({ members, loading }: { members: StaffMember[]; loading: boolean }) {
  if (loading) {
    return <p className="m-0 px-[18px] pb-[18px] font-sans text-[13px] text-tn-muted">Loading…</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y border-tn-divider">
            {["Person", "Role", "Status", "Last sign-in"].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="px-[18px] py-3 text-left font-mono text-[10px] leading-none font-normal tracking-[0.06em] text-tn-faint uppercase"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const status = memberStatus(member);
            const pill = STATUS_PILL[status];
            return (
              <tr key={member.id} className="border-b border-tn-divider last:border-b-0">
                <td className="px-[18px] py-3">
                  <span className="flex items-center gap-2.5">
                    <Avatar
                      name={member.name}
                      size={28}
                      tone={status === "active" ? "accent" : "muted"}
                    />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate font-sans text-[13px] leading-none font-medium text-tn-ink">
                        {member.name}
                      </span>
                      <span className="truncate font-sans text-[11px] leading-none text-tn-muted">
                        {member.email}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="px-[18px] py-3 font-sans text-[13px] text-tn-muted">
                  {member.roleName}
                </td>
                <td className="px-[18px] py-3">
                  <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                </td>
                <td className="px-[18px] py-3 font-sans text-[13px] whitespace-nowrap text-tn-muted">
                  {member.claimed ? timeAgo(member.lastLoginAt) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default HomePage;
