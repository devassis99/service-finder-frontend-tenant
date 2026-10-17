import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/auth/auth-store";
import { startSession } from "@/auth/session";
import { useMe } from "@/auth/use-me";
import { AuthLayout, OrDivider } from "@/components/layout/AuthLayout";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Field, formInputClass } from "@/components/ui/FormField";
import { InlineError } from "@/components/ui/Card";
import { loginWithGoogle, logout, setInitialPassword } from "@/lib/accounts-api";
import { errorMessage } from "@/lib/errors";

/**
 * An invited member's first screen, straight after their invite link.
 *
 * The link has just been used up, so before they go anywhere they need a
 * way back in: a password, or their Google account (the one with the
 * email they were invited at). Until they have one, this screen is the
 * only way forward — leaving with neither would lock them out.
 */
export function WelcomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const previousRefreshToken = useAuthStore((s) => s.refreshToken);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!me.data) return <LoadingScreen />;
  const { staffUser, account } = me.data;
  const needsSignInMethod = !staffUser.hasPassword && !staffUser.hasGoogle;

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Choose a password of at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setError(null);
    setBusy(true);
    try {
      await setInitialPassword(password);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Signing in with Google links it to this member when the Google
   * account's email is the one they were invited at (the backend matches
   * by email, then binds the Google identity). That sign-in is a new
   * session; the invite's own is retired.
   */
  async function handleGoogle(idToken: string) {
    if (!me.data) return;
    setError(null);
    setBusy(true);
    try {
      const outcome = await loginWithGoogle(idToken);
      if (outcome.status === "no_account") {
        setError(
          `That Google account (${outcome.email}) isn't the one you were invited at. Use ${me.data.staffUser.email}'s Google account, or set a password.`,
        );
        return;
      }
      if (outcome.status === "mfa_challenge_required") {
        // Not reachable for a brand-new member, but never strand anyone.
        navigate("/login", { state: { challengeToken: outcome.challengeToken } });
        return;
      }
      await startSession(outcome);
      await logout(previousRefreshToken);
    } catch (err) {
      setError(errorMessage(err, "Google sign-in failed. Try again."));
    } finally {
      setBusy(false);
    }
  }

  if (!needsSignInMethod) {
    return (
      <AuthLayout
        eyebrow={account.name}
        title={`You're all set, ${staffUser.name.split(/\s+/)[0]}`}
        subtitle={
          <>
            You've joined <strong className="font-semibold text-tn-ink">{account.name}</strong> as{" "}
            <strong className="font-semibold text-tn-ink">{staffUser.roleName}</strong>. Next time,
            sign in with {staffUser.hasGoogle ? "Google" : "your email and password"}.
          </>
        }
      >
        <Button size="lg" onClick={() => navigate("/home", { replace: true })}>
          Go to {account.name}
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow={account.name}
      title={`Welcome, ${staffUser.name.split(/\s+/)[0]}`}
      subtitle={
        <>
          You've been added to <strong className="font-semibold text-tn-ink">{account.name}</strong>{" "}
          as <strong className="font-semibold text-tn-ink">{staffUser.roleName}</strong>. Choose how
          you'll sign in from now on — your invite link has been used up.
        </>
      }
    >
      <GoogleButton onCredential={(token) => void handleGoogle(token)} text="continue_with" />
      <OrDivider />
      <form onSubmit={handlePassword} className="flex flex-col gap-4" noValidate>
        <Field label="Email">
          <input value={staffUser.email} readOnly disabled className={formInputClass} />
        </Field>
        <Field label="Choose a password" hint="At least 8 characters.">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={formInputClass}
          />
        </Field>
        <Field label="Confirm password">
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={formInputClass}
          />
        </Field>
        {error && <InlineError>{error}</InlineError>}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Saving…" : "Set password"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default WelcomePage;
