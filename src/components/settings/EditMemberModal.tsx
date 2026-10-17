import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/Card";
import { Field, Select, formInputClass } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/errors";
import type { Role } from "@/lib/roles-api";
import { updateStaff, type StaffMember } from "@/lib/staff-api";

interface EditMemberModalProps {
  member: StaffMember | null;
  /** Whether `member` is the caller — nobody changes their own role. */
  isSelf: boolean;
  /** Roles the caller may give. Null when their role can't list roles: then only the name is editable. */
  roles: Role[] | null;
  onClose: () => void;
  onSaved: (member: StaffMember) => void;
}

/** Changes a member's name or role (PATCH /staff/{id}). */
export function EditMemberModal({ member, isSelf, roles, onClose, onSaved }: EditMemberModalProps) {
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return;
    setName(member.name);
    setRoleId(member.roleId ?? "");
    setError(null);
  }, [member]);

  if (!member) return null;
  const roleLocked = isSelf || !roles;
  // The member's current role is always listed, so the select shows it
  // even when the caller couldn't give it out themselves.
  const options =
    roles && member.roleId && !roles.some((r) => r.id === member.roleId)
      ? [{ id: member.roleId, name: member.roleName }, ...roles]
      : (roles ?? [{ id: member.roleId ?? "", name: member.roleName }]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!member) return;
    if (!name.trim()) return setError("Enter their name.");
    setError(null);
    setBusy(true);
    try {
      const patch: { name?: string; roleId?: string } = {};
      if (name.trim() !== member.name) patch.name = name.trim();
      if (!roleLocked && roleId && roleId !== member.roleId) patch.roleId = roleId;
      onSaved(Object.keys(patch).length > 0 ? await updateStaff(member.id, patch) : member);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Edit ${member.name}`} description={member.email}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={formInputClass}
          />
        </Field>
        <Field
          label="Role"
          hint={
            isSelf
              ? "You can't change your own role — another owner or manager can."
              : !roles
                ? "Changing a role needs the View roles & permissions permission."
                : undefined
          }
        >
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={roleLocked}>
            {options.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>
        {error && <InlineError>{error}</InlineError>}
        <div className="flex justify-end gap-2.5 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default EditMemberModal;
