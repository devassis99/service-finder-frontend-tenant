import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/auth/use-me";
import { usePermissions } from "@/auth/use-permissions";
import { InviteLinkModal } from "@/components/settings/InviteLinkModal";
import { InviteMemberModal } from "@/components/settings/InviteMemberModal";
import { MembersPanel } from "@/components/settings/MembersPanel";
import { RoleEditorModal } from "@/components/settings/RoleEditorModal";
import { RolesPanel } from "@/components/settings/RolesPanel";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { errorMessage } from "@/lib/errors";
import { canReachRole, listPermissions, listRoles, type Role } from "@/lib/roles-api";
import {
  createInviteLink,
  listStaff,
  type InviteLink,
  type InviteOutcome,
  type StaffMember,
} from "@/lib/staff-api";
import { SettingsPage } from "./SettingsLayout";

type Tab = "members" | "roles";

interface TeamLocationState {
  tab?: Tab;
  /** Set by Home's "+ Invite person" — opens the invite dialog on arrival. */
  invite?: boolean;
}

/**
 * Settings → Users & roles (B19's section of the same name): the team on
 * one tab, its roles on the other — iGroom's Staff Management page, with
 * none of its salon fields.
 *
 * Gated on staff.view (auth/route-permissions.ts). The Roles tab needs
 * roles.view as well, and the role pickers need it to list roles at all.
 */
export function TeamSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const state = (location.state ?? {}) as TeamLocationState;
  const me = useMe();
  const { has, isOwner, permissions } = usePermissions();
  const canViewRoles = has("roles.view");

  const [tab, setTab] = useState<Tab>(state.tab === "roles" && canViewRoles ? "roles" : "members");
  const [inviting, setInviting] = useState(state.invite === true && has("staff.manage"));
  const [editingRole, setEditingRole] = useState<Role | "new" | null>(null);
  const [invited, setInvited] = useState<{
    member: StaffMember;
    delivery: InviteOutcome["delivery"];
  } | null>(null);
  const [link, setLink] = useState<InviteLink | null>(null);
  const [linkError, setLinkError] = useState<unknown>(null);

  const staff = useQuery({ queryKey: ["staff"], queryFn: listStaff });
  const roles = useQuery({ queryKey: ["roles"], queryFn: listRoles, enabled: canViewRoles });
  const catalog = useQuery({
    queryKey: ["permissions-catalog"],
    queryFn: listPermissions,
    enabled: canViewRoles,
    staleTime: Infinity,
  });

  const caller = { isOwner, permissions };
  const assignable = roles.data ? roles.data.filter((role) => canReachRole(role, caller)) : null;

  // The arrival state (open the invite dialog, start on Roles) is for
  // arriving only — read once above, then cleared so a reload or Back
  // later doesn't replay it.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const header =
    tab === "members"
      ? has("staff.manage") && (
          <Button size="sm" onClick={() => setInviting(true)}>
            + Invite person
          </Button>
        )
      : has("roles.manage") && (
          <Button size="sm" onClick={() => setEditingRole("new")} disabled={!catalog.data}>
            + New role
          </Button>
        );

  const loading = staff.isPending || (canViewRoles && (roles.isPending || catalog.isPending));
  const failure = staff.error ?? roles.error ?? catalog.error;

  return (
    <SettingsPage
      title="Users & roles"
      description="Who's on your team, and what each role lets them do."
      actions={header}
    >
      {canViewRoles && (
        <Tabs
          label="Users and roles"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "members", label: "Members", count: staff.data?.length },
            { value: "roles", label: "Roles", count: roles.data?.length },
          ]}
        />
      )}

      {invited && (
        <output className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tn-accent-bg bg-tn-accent-bg px-3.5 py-2.5">
          <span className="font-sans text-[13px] font-medium text-tn-accent-deep">
            {invited.delivery === "sent"
              ? `Invite sent to ${invited.member.email}.`
              : invited.delivery === "logged"
                ? `${invited.member.name} is added. Email isn't set up on the server, so the invite was only written to its log.`
                : `${invited.member.name} is added, but the invite email couldn't be sent.`}
          </span>
          {invited.delivery !== "sent" && (
            <Button
              variant="link"
              onClick={() => {
                setLinkError(null);
                createInviteLink(invited.member.id).then(setLink, setLinkError);
              }}
            >
              Get a link to send yourself
            </Button>
          )}
        </output>
      )}
      {linkError !== null && <InlineError>{errorMessage(linkError)}</InlineError>}

      {failure ? (
        <InlineError>{errorMessage(failure)}</InlineError>
      ) : loading || !me.data ? (
        <div className="flex justify-center py-10">
          <Spinner size={24} />
        </div>
      ) : tab === "members" ? (
        <MembersPanel
          members={staff.data ?? []}
          roles={roles.data ?? null}
          me={{ id: me.data.staffUser.id, isOwner, permissions }}
          canManage={has("staff.manage")}
        />
      ) : (
        <RolesPanel
          roles={roles.data ?? []}
          catalog={catalog.data ?? []}
          me={caller}
          canManage={has("roles.manage")}
          onEdit={setEditingRole}
        />
      )}

      <InviteMemberModal
        open={inviting}
        onClose={() => setInviting(false)}
        roles={assignable}
        onInvited={(member, invite) => {
          setInviting(false);
          setInvited({ member, delivery: invite.delivery });
          void queryClient.invalidateQueries({ queryKey: ["staff"] });
          void queryClient.invalidateQueries({ queryKey: ["roles"] });
        }}
      />
      <InviteLinkModal
        link={link}
        name={invited?.member.name ?? ""}
        onClose={() => setLink(null)}
      />
      <RoleEditorModal
        open={editingRole !== null}
        role={editingRole === "new" ? null : editingRole}
        catalog={catalog.data ?? []}
        caller={caller}
        onClose={() => setEditingRole(null)}
        onSaved={() => {
          setEditingRole(null);
          void queryClient.invalidateQueries({ queryKey: ["roles"] });
          // A changed role may be the caller's own.
          void queryClient.invalidateQueries({ queryKey: ["me"] });
        }}
      />
    </SettingsPage>
  );
}

export default TeamSettingsPage;
