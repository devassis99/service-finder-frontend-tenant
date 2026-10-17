import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/Avatar";
import { Button, confirmPillClass } from "@/components/ui/Button";
import { Card, EmptyState, InlineError, InlineNotice } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { errorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { canReachRole, type Role } from "@/lib/roles-api";
import {
  createInviteLink,
  memberStatus,
  resendInvite,
  setStaffActive,
  type InviteLink,
  type StaffMember,
} from "@/lib/staff-api";
import { useFlash } from "@/lib/use-flash";
import { useTwoStepConfirm } from "@/lib/use-two-step-confirm";
import { EditMemberModal } from "./EditMemberModal";
import { InviteLinkModal } from "./InviteLinkModal";

const STATUS_PILL = {
  active: { tone: "success", label: "Active" },
  invited: { tone: "warning", label: "Invited" },
  deactivated: { tone: "muted", label: "Deactivated" },
} as const;

interface MembersPanelProps {
  members: StaffMember[];
  /** All of the business's roles, when the caller may list them; null otherwise. */
  roles: Role[] | null;
  me: { id: string; isOwner: boolean; permissions: readonly string[] };
  canManage: boolean;
}

/**
 * Settings → Users & roles → Members: B07's roster table. Everyone with
 * staff.view sees it; the row actions appear only for staff.manage, and
 * only on rows within the caller's reach — a member whose role grants
 * something the caller doesn't hold (or an owner, for anyone but an
 * owner) is the backend's to refuse, so the row doesn't offer it.
 */
export function MembersPanel({ members, roles, me, canManage }: MembersPanelProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [link, setLink] = useState<{ link: InviteLink; name: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const confirm = useTwoStepConfirm();
  const sent = useFlash(2400);

  const assignable = roles?.filter((role) => canReachRole(role, me)) ?? null;
  const roleById = new Map((roles ?? []).map((r) => [r.id, r]));

  function canAct(member: StaffMember): boolean {
    if (!canManage) return false;
    const role = member.roleId ? roleById.get(member.roleId) : undefined;
    // Without the roles list, reach can't be worked out here — offer the
    // action to anyone who isn't an owner and let the backend decide.
    if (!role) return me.isOwner || !member.isOwner;
    return canReachRole(role, me);
  }

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["staff"] }),
      queryClient.invalidateQueries({ queryKey: ["roles"] }),
    ]);

  const toggleActive = useMutation({
    mutationFn: ({ member, isActive }: { member: StaffMember; isActive: boolean }) =>
      setStaffActive(member.id, isActive),
    onMutate: () => {
      setNotice(null);
      setFailure(null);
    },
    onError: setFailure,
    onSuccess: async (member) => {
      setNotice(
        member.isActive
          ? `${member.name} can sign in again.`
          : `${member.name} has been deactivated and signed out everywhere.`,
      );
      await refresh();
    },
  });

  const resend = useMutation({
    mutationFn: (member: StaffMember) => resendInvite(member.id),
    onMutate: () => {
      setNotice(null);
      setFailure(null);
    },
    onError: setFailure,
    onSuccess: (invite, member) => {
      sent.flash(member.id);
      setNotice(
        invite.delivery === "sent"
          ? `A new invite is on its way to ${member.email}.`
          : invite.delivery === "logged"
            ? "Email isn't set up on the server, so the invite was only logged there. Use Copy link to send it yourself."
            : "We couldn't email the invite. Use Copy link to send it yourself.",
      );
    },
  });

  const mintLink = useMutation({
    mutationFn: (member: StaffMember) => createInviteLink(member.id),
    onMutate: () => {
      setNotice(null);
      setFailure(null);
    },
    onError: setFailure,
    onSuccess: (newLink, member) => setLink({ link: newLink, name: member.name }),
  });

  if (members.length === 0) {
    return <EmptyState>Nobody's on the team yet.</EmptyState>;
  }

  return (
    <>
      {notice && <InlineNotice>{notice}</InlineNotice>}
      {failure !== null && <InlineError>{errorMessage(failure)}</InlineError>}

      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-tn-divider">
                {["Person", "Role", "Status", "Two-factor", "Last sign-in", ""].map(
                  (heading, i) => (
                    <th
                      // eslint-disable-next-line react/no-array-index-key -- a fixed header row
                      key={i}
                      scope="col"
                      className={`px-[18px] py-3.5 text-left font-mono text-[10px] leading-none font-normal tracking-[0.06em] whitespace-nowrap text-tn-faint uppercase ${
                        heading === "" ? "w-px" : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const status = memberStatus(member);
                const pill = STATUS_PILL[status];
                const isSelf = member.id === me.id;
                const actionable = canAct(member);
                return (
                  <tr
                    key={member.id}
                    className="border-b border-tn-divider last:border-b-0 hover:bg-tn-subtle"
                  >
                    <td className="px-[18px] py-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar
                          name={member.name}
                          size={30}
                          tone={status === "active" ? "accent" : "muted"}
                        />
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="flex items-center gap-1.5 truncate font-sans text-[13px] leading-none font-medium text-tn-ink">
                            {member.name}
                            {isSelf && (
                              <span className="font-mono text-[10px] leading-none text-tn-faint uppercase">
                                You
                              </span>
                            )}
                          </span>
                          <span className="truncate font-sans text-[11px] leading-none text-tn-muted">
                            {member.email}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-[18px] py-3 font-sans text-[13px] whitespace-nowrap text-tn-muted">
                      {member.roleName || "—"}
                    </td>
                    <td className="px-[18px] py-3">
                      <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                    </td>
                    <td className="px-[18px] py-3 font-mono text-[11px] text-tn-muted uppercase">
                      {member.mfaEnabled ? "On" : "Off"}
                    </td>
                    <td className="px-[18px] py-3 font-sans text-[13px] whitespace-nowrap text-tn-muted">
                      {member.claimed ? timeAgo(member.lastLoginAt) : "—"}
                    </td>
                    <td className="w-px px-[18px] py-3 whitespace-nowrap">
                      {actionable && (
                        <span className="flex items-center justify-end gap-3.5">
                          {status === "invited" && (
                            <>
                              <Button
                                variant="link"
                                disabled={resend.isPending}
                                onClick={() => resend.mutate(member)}
                              >
                                {sent.is(member.id) ? "Sent" : "Resend"}
                              </Button>
                              <Button
                                variant="link"
                                disabled={mintLink.isPending}
                                onClick={() => mintLink.mutate(member)}
                              >
                                Copy link
                              </Button>
                            </>
                          )}
                          <Button variant="link" onClick={() => setEditing(member)}>
                            Edit
                          </Button>
                          {!isSelf &&
                            (member.isActive ? (
                              confirm.isArmed(member.id) ? (
                                <button
                                  type="button"
                                  className={confirmPillClass}
                                  disabled={toggleActive.isPending}
                                  onClick={() =>
                                    confirm.ask(member.id) &&
                                    toggleActive.mutate({ member, isActive: false })
                                  }
                                >
                                  Confirm
                                </button>
                              ) : (
                                <Button variant="linkDanger" onClick={() => confirm.ask(member.id)}>
                                  Deactivate
                                </Button>
                              )
                            ) : (
                              <Button
                                variant="link"
                                disabled={toggleActive.isPending}
                                onClick={() => toggleActive.mutate({ member, isActive: true })}
                              >
                                Reactivate
                              </Button>
                            ))}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <EditMemberModal
        member={editing}
        isSelf={editing?.id === me.id}
        roles={assignable}
        onClose={() => setEditing(null)}
        onSaved={(member) => {
          setEditing(null);
          setNotice(`${member.name} is saved.`);
          void refresh();
          if (member.id === me.id) void queryClient.invalidateQueries({ queryKey: ["me"] });
        }}
      />
      <InviteLinkModal
        link={link?.link ?? null}
        name={link?.name ?? ""}
        onClose={() => setLink(null)}
      />
    </>
  );
}

export default MembersPanel;
