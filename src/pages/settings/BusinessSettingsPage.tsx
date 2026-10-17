import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/auth/use-me";
import { usePermissions } from "@/auth/use-permissions";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { Card, InlineError, InlineNotice } from "@/components/ui/Card";
import { Field, formInputClass } from "@/components/ui/FormField";
import { updateBusiness, type Account } from "@/lib/accounts-api";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { SettingsPage } from "./SettingsLayout";

/**
 * Settings → Business profile: the business's name and contact details.
 * Everyone can read it; changing it takes business.manage (the backend's
 * PATCH /accounts/settings/business checks the same key). The address
 * (slug) is fixed at sign-up — links built on it must not move when the
 * business is renamed.
 */
export function BusinessSettingsPage() {
  const me = useMe();
  if (!me.data) return <LoadingScreen />;
  return <BusinessForm account={me.data.account} />;
}

function BusinessForm({ account }: { account: Account }) {
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canEdit = has("business.manage");

  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [phone, setPhone] = useState(account.phone ?? "");
  const [saved, setSaved] = useState(false);

  // Someone else's change, picked up by a refetch, replaces the form.
  useEffect(() => {
    setName(account.name);
    setEmail(account.email);
    setPhone(account.phone ?? "");
  }, [account]);

  const save = useMutation({
    mutationFn: () =>
      updateBusiness({ name: name.trim(), email: email.trim(), phone: phone.trim() || null }),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const dirty =
    name.trim() !== account.name ||
    email.trim().toLowerCase() !== account.email ||
    (phone.trim() || null) !== account.phone;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    save.mutate();
  }

  return (
    <SettingsPage
      title="Business profile"
      description={
        canEdit
          ? "How your business appears to your team, and where account email goes."
          : "Only someone whose role includes Manage business profile can change these."
      }
    >
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Business name">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              disabled={!canEdit}
              className={formInputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Contact email"
              hint="Where account email goes. Changing it doesn't change how anyone signs in."
            >
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSaved(false);
                }}
                disabled={!canEdit}
                className={formInputClass}
              />
            </Field>
            <Field label="Phone" hint="Optional.">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSaved(false);
                }}
                disabled={!canEdit}
                className={formInputClass}
              />
            </Field>
          </div>
          {save.isError && <InlineError>{errorMessage(save.error)}</InlineError>}
          {saved && !dirty && <InlineNotice>Saved.</InlineNotice>}
          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={!dirty || !name.trim() || save.isPending}>
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </form>
      </Card>

      <Card title="Account">
        <dl className="m-0 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <dt className="font-mono text-[10px] leading-none text-tn-faint uppercase">Address</dt>
            <dd className="m-0 font-mono text-[13px] text-tn-ink">{account.slug}</dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="font-mono text-[10px] leading-none text-tn-faint uppercase">Created</dt>
            <dd className="m-0 font-sans text-[13px] text-tn-ink">
              {formatDate(account.createdAt)}
            </dd>
          </div>
        </dl>
        <p className="m-0 font-sans text-xs leading-normal text-tn-muted">
          Your business's address is set when it signs up and stays the same if you rename it, so
          anything that links to it keeps working.
        </p>
      </Card>
    </SettingsPage>
  );
}

export default BusinessSettingsPage;
