import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/auth/auth-store";
import { useMe } from "@/auth/use-me";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { PasswordModal } from "@/components/settings/PasswordModal";
import { TwoFactorModal } from "@/components/settings/TwoFactorModal";
import { Button, confirmPillClass } from "@/components/ui/Button";
import { Card, CardRow, InlineError, InlineNotice } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { listSessions, revokeOtherSessions, revokeSession } from "@/lib/accounts-api";
import { errorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { describeUserAgent } from "@/lib/user-agent";
import { useTwoStepConfirm } from "@/lib/use-two-step-confirm";
import { SettingsPage } from "./SettingsLayout";

/**
 * Settings → Security: the caller's own password, two-factor and
 * signed-in devices. Everything here acts on the caller alone — the
 * backend scopes each endpoint to them with no permission check.
 */
export function SecuritySettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const logOut = useAuthStore((s) => s.logOut);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [twoFactor, setTwoFactor] = useState<"enable" | "disable" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const confirm = useTwoStepConfirm();

  const sessions = useQuery({ queryKey: ["sessions"], queryFn: listSessions });

  const revokeOne = useMutation({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: async (_data, id) => {
      // Signing out the session you're using is just signing out.
      if (sessions.data?.find((s) => s.id === id)?.isCurrent) {
        logOut();
        queryClient.clear();
        navigate("/login", { replace: true });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const revokeOthers = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: async () => {
      setNotice("Every other device has been signed out.");
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  if (!me.data) return <LoadingScreen />;
  const { staffUser } = me.data;
  const others = (sessions.data ?? []).filter((s) => !s.isCurrent).length;

  async function refreshAfter(message: string) {
    setNotice(message);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me"] }),
      queryClient.invalidateQueries({ queryKey: ["sessions"] }),
    ]);
  }

  return (
    <SettingsPage title="Security" description="How you sign in, and where you're signed in.">
      {notice && <InlineNotice>{notice}</InlineNotice>}

      <Card>
        <CardRow>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="font-sans text-sm leading-none font-medium text-tn-ink">Password</span>
            <span className="font-sans text-xs leading-snug text-tn-muted">
              {staffUser.hasPassword
                ? "Sign in with your email and password."
                : "You sign in with Google. Add a password to have another way in."}
            </span>
          </div>
          <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
            {staffUser.hasPassword ? "Change" : "Set password"}
          </Button>
        </CardRow>
        <CardRow>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center gap-2 font-sans text-sm leading-none font-medium text-tn-ink">
              Two-factor authentication
              <StatusPill tone={staffUser.mfaEnabled ? "success" : "muted"}>
                {staffUser.mfaEnabled ? "On" : "Off"}
              </StatusPill>
            </span>
            <span className="font-sans text-xs leading-snug text-tn-muted">
              {staffUser.mfaEnabled
                ? "Signing in also needs a code from your authenticator app."
                : "Ask for a code from your phone at sign-in, so a password alone isn't enough."}
            </span>
          </div>
          <Button
            variant={staffUser.mfaEnabled ? "secondary" : "primary"}
            onClick={() => setTwoFactor(staffUser.mfaEnabled ? "disable" : "enable")}
          >
            {staffUser.mfaEnabled ? "Turn off" : "Turn on"}
          </Button>
        </CardRow>
        <CardRow>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="font-sans text-sm leading-none font-medium text-tn-ink">Google</span>
            <span className="font-sans text-xs leading-snug text-tn-muted">
              {staffUser.hasGoogle
                ? `Linked — you can sign in with ${staffUser.email}'s Google account.`
                : `Not linked. Sign in with Google once, using ${staffUser.email}, to link it.`}
            </span>
          </div>
          <StatusPill tone={staffUser.hasGoogle ? "success" : "muted"}>
            {staffUser.hasGoogle ? "Linked" : "Not linked"}
          </StatusPill>
        </CardRow>
      </Card>

      <Card
        title="Where you're signed in"
        aside={
          others > 0 && (
            <Button
              variant="link"
              onClick={() => revokeOthers.mutate()}
              disabled={revokeOthers.isPending}
            >
              Sign out everywhere else
            </Button>
          )
        }
      >
        {sessions.isError && <InlineError>{errorMessage(sessions.error)}</InlineError>}
        {revokeOne.isError && <InlineError>{errorMessage(revokeOne.error)}</InlineError>}
        {revokeOthers.isError && <InlineError>{errorMessage(revokeOthers.error)}</InlineError>}
        {sessions.isPending && (
          <p className="m-0 font-sans text-[13px] text-tn-muted">Loading your sessions…</p>
        )}
        {sessions.data?.map((session) => (
          <CardRow key={session.id}>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="flex flex-wrap items-center gap-2 font-sans text-[13px] leading-none font-medium text-tn-ink">
                {describeUserAgent(session.userAgent)}
                {session.isCurrent && <StatusPill tone="success">This device</StatusPill>}
              </span>
              <span className="font-sans text-xs leading-none text-tn-muted">
                Active {timeAgo(session.createdAt).toLowerCase()}
              </span>
            </div>
            {confirm.isArmed(session.id) ? (
              <button
                type="button"
                className={confirmPillClass}
                disabled={revokeOne.isPending}
                onClick={() => confirm.ask(session.id) && revokeOne.mutate(session.id)}
              >
                {session.isCurrent ? "Confirm sign out" : "Confirm"}
              </button>
            ) : (
              <Button variant="linkDanger" onClick={() => confirm.ask(session.id)}>
                Sign out
              </Button>
            )}
          </CardRow>
        ))}
      </Card>

      <PasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onDone={() => {
          setPasswordOpen(false);
          void refreshAfter(
            staffUser.hasPassword
              ? "Password changed. Your other devices have been signed out."
              : "Password set. Your other devices have been signed out.",
          );
        }}
        email={staffUser.email}
        hasPassword={staffUser.hasPassword}
        mfaEnabled={staffUser.mfaEnabled}
      />
      <TwoFactorModal
        open={twoFactor !== null}
        mode={twoFactor ?? "enable"}
        onClose={() => setTwoFactor(null)}
        onDone={() => {
          const turnedOn = twoFactor === "enable";
          setTwoFactor(null);
          void refreshAfter(
            turnedOn ? "Two-factor authentication is on." : "Two-factor authentication is off.",
          );
        }}
      />
    </SettingsPage>
  );
}

export default SecuritySettingsPage;
