import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button, confirmPillClass } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { errorMessage } from "@/lib/errors";
import { plural } from "@/lib/format";
import { canReachRole, deleteRole, type Permission, type Role } from "@/lib/roles-api";
import { useTwoStepConfirm } from "@/lib/use-two-step-confirm";

interface RolesPanelProps {
  roles: Role[];
  catalog: Permission[];
  me: { isOwner: boolean; permissions: readonly string[] };
  canManage: boolean;
  onEdit: (role: Role) => void;
}

/**
 * Settings → Users & roles → Roles: one card per role, Owner first —
 * what it's for, what it grants and who has it. Edit and Delete appear
 * only for roles.manage, and only on roles within the caller's reach;
 * Owner is never editable (it always has every permission), and a role
 * someone still holds can't be deleted until they're moved off it.
 */
export function RolesPanel({ roles, catalog, me, canManage, onEdit }: RolesPanelProps) {
  const queryClient = useQueryClient();
  const confirm = useTwoStepConfirm();
  const [error, setError] = useState<unknown>(null);
  const names = new Map(catalog.map((p) => [p.key, p.name]));
  // Chips in the catalog's order — each area's view before its manage —
  // rather than the API's alphabetical one.
  const inCatalogOrder = (keys: string[]) => [
    ...catalog.map((p) => p.key).filter((key) => keys.includes(key)),
    ...keys.filter((key) => !names.has(key)),
  ];

  const remove = useMutation({
    mutationFn: (role: Role) => deleteRole(role.id),
    onMutate: () => setError(null),
    onError: setError,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  return (
    <>
      {error !== null && <InlineError>{errorMessage(error)}</InlineError>}
      <div className="grid gap-3 md:grid-cols-2">
        {roles.map((role) => {
          const editable = canManage && !role.isSystem && canReachRole(role, me);
          return (
            <section
              key={role.id}
              className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-tn-card-border bg-tn-paper p-[18px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 truncate font-sans text-sm leading-none font-semibold text-tn-ink">
                      {role.name}
                    </h3>
                    {role.isSystem && <StatusPill tone="success">System</StatusPill>}
                  </span>
                  {role.description && (
                    <p className="m-0 font-sans text-xs leading-snug text-tn-muted">
                      {role.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[10px] leading-none whitespace-nowrap text-tn-faint uppercase">
                  {plural(role.memberCount, "person", "people")}
                </span>
              </div>

              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {role.isSystem ? (
                  <li className="font-sans text-xs text-tn-muted">Every permission, always.</li>
                ) : role.permissions.length === 0 ? (
                  <li className="font-sans text-xs text-tn-faint">No permissions yet.</li>
                ) : (
                  inCatalogOrder(role.permissions).map((key) => (
                    <li
                      key={key}
                      className="rounded-md bg-tn-neutral-bg px-2 py-1 font-sans text-[11px] leading-none text-tn-body"
                    >
                      {names.get(key) ?? key}
                    </li>
                  ))
                )}
              </ul>

              {editable && (
                <div className="mt-auto flex items-center gap-4 border-t border-tn-divider pt-3">
                  <Button variant="link" onClick={() => onEdit(role)}>
                    Edit
                  </Button>
                  {role.memberCount > 0 ? (
                    <span className="font-sans text-xs text-tn-faint">
                      Move its {plural(role.memberCount, "person", "people")} off it to delete
                    </span>
                  ) : confirm.isArmed(role.id) ? (
                    <button
                      type="button"
                      className={confirmPillClass}
                      disabled={remove.isPending}
                      onClick={() => confirm.ask(role.id) && remove.mutate(role)}
                    >
                      Confirm delete
                    </button>
                  ) : (
                    <Button variant="linkDanger" onClick={() => confirm.ask(role.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

export default RolesPanel;
