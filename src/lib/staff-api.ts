import { request } from "./http";

/** service-finder-backend's /staff — the business's team. Mirrors modules/staff-users/staff.validators.ts. */

export interface StaffMember {
  id: string;
  accountId: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string;
  isOwner: boolean;
  isActive: boolean;
  /** False until they've set up a password or linked Google through their invite. */
  claimed: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * What became of an invite email. "logged" means the API has no email
 * provider configured and printed the email to its console instead — it
 * never reached them, so the app offers the link to pass on by hand.
 */
export interface InviteOutcome {
  emailed: boolean;
  delivery: "sent" | "logged" | "failed";
  expiresAt: string;
}

export interface InviteLink {
  url: string;
  expiresAt: string;
}

export type MemberStatus = "active" | "invited" | "deactivated";

/** The one status a roster row shows. */
export function memberStatus(member: Pick<StaffMember, "isActive" | "claimed">): MemberStatus {
  if (!member.isActive) return "deactivated";
  return member.claimed ? "active" : "invited";
}

export async function listStaff(): Promise<StaffMember[]> {
  const { staff } = await request<{ staff: StaffMember[] }>("/staff", { auth: true });
  return staff;
}

export function inviteStaff(payload: {
  name: string;
  email: string;
  roleId: string;
}): Promise<{ staff: StaffMember; invite: InviteOutcome }> {
  return request("/staff", { method: "POST", auth: true, body: payload });
}

export async function updateStaff(
  staffId: string,
  patch: { name?: string; roleId?: string },
): Promise<StaffMember> {
  const { staff } = await request<{ staff: StaffMember }>(`/staff/${staffId}`, {
    method: "PATCH",
    auth: true,
    body: patch,
  });
  return staff;
}

export async function setStaffActive(staffId: string, isActive: boolean): Promise<StaffMember> {
  const { staff } = await request<{ staff: StaffMember }>(`/staff/${staffId}/active`, {
    method: "PATCH",
    auth: true,
    body: { isActive },
  });
  return staff;
}

export async function resendInvite(staffId: string): Promise<InviteOutcome> {
  const { invite } = await request<{ invite: InviteOutcome }>(`/staff/${staffId}/invite/resend`, {
    method: "POST",
    auth: true,
  });
  return invite;
}

/** Mints a fresh setup link to pass on by hand. Retires the one that was emailed. */
export async function createInviteLink(staffId: string): Promise<InviteLink> {
  const { invite } = await request<{ invite: InviteLink }>(`/staff/${staffId}/invite/link`, {
    method: "POST",
    auth: true,
  });
  return invite;
}
