import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/Card";
import { Field, formInputClass } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/errors";
import {
  createRole,
  updateRole,
  updateRolePermissions,
  type Permission,
  type Role,
} from "@/lib/roles-api";

interface RoleEditorModalProps {
  open: boolean;
  /** The role being edited, or null to create one. */
  role: Role | null;
  catalog: Permission[];
  /** What the caller holds — anyone but an owner can only grant these. */
  caller: { isOwner: boolean; permissions: readonly string[] };
  onClose: () => void;
  onSaved: (role: Role) => void;
}

/** "staff.view" → "staff" — the catalog is grouped by the area before the dot. */
const AREA_LABELS: Record<string, string> = {
  staff: "Team",
  roles: "Roles & permissions",
  business: "Business",
};

/**
 * Creates a role, or renames one and changes what it grants — B20's
 * selectable cards, one per permission, grouped by area.
 *
 * Permissions the caller doesn't hold are shown but can't be ticked
 * (unless they're an owner): the backend refuses to let anyone grant
 * more than they have, and the list says so up front rather than at
 * Save.
 */
export function RoleEditorModal({
  open,
  role,
  catalog,
  caller,
  onClose,
  onSaved,
}: RoleEditorModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setSelected(new Set(role?.permissions ?? []));
    setError(null);
  }, [open, role]);

  const grantable = (key: string) => caller.isOwner || caller.permissions.includes(key);

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the role a name.");
    setError(null);
    setBusy(true);
    const permissionKeys = [...selected];
    try {
      if (!role) {
        onSaved(
          await createRole({
            name: name.trim(),
            description: description.trim() || undefined,
            permissionKeys,
          }),
        );
        return;
      }
      let saved = role;
      if (name.trim() !== role.name || (description.trim() || null) !== role.description) {
        saved = await updateRole(role.id, {
          name: name.trim(),
          description: description.trim() || null,
        });
      }
      const unchanged =
        permissionKeys.length === role.permissions.length &&
        role.permissions.every((key) => selected.has(key));
      if (!unchanged) {
        saved = await updateRolePermissions(role.id, permissionKeys);
      }
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const areas = [...new Set(catalog.map((p) => p.key.split(".")[0] ?? p.key))];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={role ? `Edit ${role.name}` : "New role"}
      description="Choose what people with this role can do. Changes apply to everyone who has it, straight away."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Name">
          <input
            placeholder="Dispatcher"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={formInputClass}
          />
        </Field>
        <Field
          label="Description"
          aside={<span className="font-sans text-xs text-tn-faint">Optional</span>}
        >
          <input
            placeholder="What this role is for"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={formInputClass}
          />
        </Field>

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2 p-0 font-mono text-[11px] leading-none font-medium tracking-[0.04em] text-tn-faint uppercase">
            Permissions
          </legend>
          {areas.map((area) => (
            <div key={area} className="flex flex-col gap-2">
              <span className="font-sans text-xs font-semibold text-tn-muted">
                {AREA_LABELS[area] ?? area}
              </span>
              {catalog
                .filter((p) => (p.key.split(".")[0] ?? p.key) === area)
                .map((permission) => {
                  const checked = selected.has(permission.key);
                  const allowed = grantable(permission.key);
                  return (
                    <label
                      key={permission.key}
                      className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-[14px] bg-tn-paper px-4 py-3 ${
                        checked
                          ? "border-2 border-tn-accent px-[15px] py-[11px]"
                          : "border border-tn-card-border"
                      } ${allowed ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!allowed}
                        onChange={() => toggle(permission.key)}
                        className="row-span-2 mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-tn-accent disabled:cursor-not-allowed"
                      />
                      <span className="font-sans text-[13px] leading-snug font-semibold text-tn-ink">
                        {permission.name}
                      </span>
                      <span className="font-sans text-xs leading-snug text-tn-muted">
                        {allowed
                          ? permission.description
                          : "Not in your own role, so you can't give it out."}
                      </span>
                    </label>
                  );
                })}
            </div>
          ))}
        </fieldset>

        {error && <InlineError>{error}</InlineError>}
        <div className="flex justify-end gap-2.5 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : role ? "Save role" : "Create role"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RoleEditorModal;
