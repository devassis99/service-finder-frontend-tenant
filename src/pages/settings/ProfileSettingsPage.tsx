import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/auth/use-me";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, InlineError, InlineNotice } from "@/components/ui/Card";
import { Field, formInputClass } from "@/components/ui/FormField";
import { StatusPill } from "@/components/ui/StatusPill";
import { updateOwnProfile, type MeResponse } from "@/lib/accounts-api";
import { errorMessage } from "@/lib/errors";
import { formatDate, timeAgo } from "@/lib/format";
import { SettingsPage } from "./SettingsLayout";

/**
 * Settings → My profile: the caller's own name, open to everyone (PATCH
 * /accounts/me/profile). Email and role are shown, not edited here:
 * email is how they sign in, and a role is someone else's to change.
 */
export function ProfileSettingsPage() {
  const me = useMe();
  if (!me.data) return <LoadingScreen />;
  return <ProfileForm me={me.data} />;
}

function ProfileForm({ me }: { me: MeResponse }) {
  const queryClient = useQueryClient();
  const { staffUser, permissions } = me;
  const [name, setName] = useState(staffUser.name);
  const [saved, setSaved] = useState(false);

  useEffect(() => setName(staffUser.name), [staffUser.name]);

  const save = useMutation({
    mutationFn: () => updateOwnProfile(name.trim()),
    onSuccess: (updated) => {
      setSaved(true);
      queryClient.setQueryData(["me"], updated);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    save.mutate();
  }

  return (
    <SettingsPage title="My profile" description="How you appear to the rest of your team.">
      <Card>
        <div className="flex items-center gap-3.5">
          <Avatar name={name || staffUser.name} size={48} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="truncate font-sans text-[15px] leading-none font-semibold text-tn-ink">
              {staffUser.name}
            </span>
            <span className="truncate font-sans text-[13px] leading-none text-tn-muted">
              {staffUser.email}
            </span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Name">
            <input
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              className={formInputClass}
            />
          </Field>
          <Field label="Email" hint="You sign in with this. Ask an owner if it needs to change.">
            <input value={staffUser.email} readOnly disabled className={formInputClass} />
          </Field>
          {save.isError && <InlineError>{errorMessage(save.error)}</InlineError>}
          {saved && name.trim() === staffUser.name && <InlineNotice>Saved.</InlineNotice>}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!name.trim() || name.trim() === staffUser.name || save.isPending}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Your role">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-sans text-sm font-semibold text-tn-ink">{staffUser.roleName}</span>
          {staffUser.isOwner && <StatusPill tone="success">Owner</StatusPill>}
        </div>
        <p className="m-0 font-sans text-[13px] leading-normal text-tn-muted">
          {permissions.length === 0
            ? "Your role doesn't include any permissions yet."
            : `Includes ${permissions.length} permission${permissions.length === 1 ? "" : "s"}.`}{" "}
          {permissions.includes("roles.view") && (
            <Link to="/settings/team" state={{ tab: "roles" }}>
              See what each role can do
            </Link>
          )}
        </p>
        <dl className="m-0 grid gap-4 border-t border-tn-divider pt-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <dt className="font-mono text-[10px] leading-none text-tn-faint uppercase">Joined</dt>
            <dd className="m-0 font-sans text-[13px] text-tn-ink">
              {formatDate(staffUser.createdAt)}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="font-mono text-[10px] leading-none text-tn-faint uppercase">
              Last sign-in
            </dt>
            <dd className="m-0 font-sans text-[13px] text-tn-ink">
              {timeAgo(staffUser.lastLoginAt)}
            </dd>
          </div>
        </dl>
      </Card>
    </SettingsPage>
  );
}

export default ProfileSettingsPage;
