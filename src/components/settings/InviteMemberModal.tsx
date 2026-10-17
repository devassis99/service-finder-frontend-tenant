import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/Card";
import { Field, Select, formInputClass } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/errors";
import type { Role } from "@/lib/roles-api";
import { inviteStaff, type InviteOutcome, type StaffMember } from "@/lib/staff-api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  /** Roles the caller may hand out — already filtered by canReachRole. Null when their role can't list roles. */
  roles: Role[] | null;
  onInvited: (member: StaffMember, invite: InviteOutcome) => void;
}

/**
 * Invites someone: their name, the email they'll sign in with, and their
 * role. They get an email with a single-use setup link (POST /staff);
 * until they open it they show as Invited.
 */
export function InviteMemberModal({ open, onClose, roles, onInvited }: InviteMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setError(null);
    // The least-privileged default: "Member" when it's offered.
    const fallback = roles?.find((r) => r.name === "Member") ?? roles?.find((r) => !r.isSystem);
    setRoleId(fallback?.id ?? roles?.[0]?.id ?? "");
  }, [open, roles]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Enter their name.");
    if (!EMAIL.test(email.trim())) return setError("Enter a valid email address.");
    if (!roleId) return setError("Choose a role.");
    setError(null);
    setBusy(true);
    try {
      const { staff, invite } = await inviteStaff({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        roleId,
      });
      onInvited(staff, invite);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const selected = roles?.find((r) => r.id === roleId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite someone"
      description="They'll get an email with a link to set up their sign-in. It works once, for 7 days."
    >
      {roles && roles.length === 0 ? (
        <InlineError>There's no role you're able to give. Ask an owner to invite them.</InlineError>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Name">
            <input
              autoComplete="off"
              placeholder="Jordan Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={formInputClass}
            />
          </Field>
          <Field label="Email" hint="They'll sign in with this.">
            <input
              type="email"
              autoComplete="off"
              placeholder="jordan@yourbusiness.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={formInputClass}
            />
          </Field>
          {roles ? (
            <Field label="Role" hint={selected?.description ?? "You can change it later."}>
              <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <InlineError>
              Choosing a role needs the "View roles & permissions" permission, which your role
              doesn't have.
            </InlineError>
          )}
          {error && <InlineError>{error}</InlineError>}
          <div className="flex justify-end gap-2.5 pt-1">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !roles}>
              {busy ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default InviteMemberModal;
