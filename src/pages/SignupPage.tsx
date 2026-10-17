import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { startSession } from "@/auth/session";
import { useSignupStore } from "@/auth/signup-store";
import { AuthLayout, OrDivider } from "@/components/layout/AuthLayout";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Field, formInputClass } from "@/components/ui/FormField";
import { InlineError } from "@/components/ui/Card";
import { loginWithGoogle } from "@/lib/accounts-api";
import { errorMessage } from "@/lib/errors";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign-up, step 1 of 2: who you are. Google (which answers for your name
 * and email), or a name, work email and password. Nothing is created
 * yet — the business and its owner are created together at the end of
 * step 2 (SignupBusinessPage), so an abandoned sign-up leaves nothing
 * behind.
 *
 * A Google account that already has a business just signs in.
 */
export function SignupPage() {
  const navigate = useNavigate();
  const identity = useSignupStore((s) => s.identity);
  const setIdentity = useSignupStore((s) => s.setIdentity);

  const [fullName, setFullName] = useState(identity?.fullName ?? "");
  const [workEmail, setWorkEmail] = useState(identity?.workEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return setError("Enter your name.");
    if (!EMAIL.test(workEmail.trim())) return setError("Enter a valid work email.");
    if (password.length < 8) return setError("Choose a password of at least 8 characters.");
    setError(null);
    setIdentity({
      method: "password",
      fullName: fullName.trim(),
      workEmail: workEmail.trim().toLowerCase(),
      password,
    });
    navigate("/signup/business");
  }

  async function handleGoogle(idToken: string) {
    setError(null);
    setBusy(true);
    try {
      const outcome = await loginWithGoogle(idToken);
      if (outcome.status === "no_account") {
        setIdentity({
          method: "google",
          fullName: outcome.name ?? "",
          workEmail: outcome.email,
          googleIdToken: idToken,
        });
        navigate("/signup/business");
        return;
      }
      // Already has a business — this is a sign-in, not a sign-up.
      if (outcome.status === "mfa_challenge_required") {
        navigate("/login", { state: { challengeToken: outcome.challengeToken } });
        return;
      }
      await startSession(outcome);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Google sign-up failed. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Step 1 of 2 · You"
      progress={0.5}
      title="Create your business account"
      subtitle="You'll be its owner. You can invite your team once it's set up."
      footer={
        <>
          Already on ServiceFinder? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <GoogleButton onCredential={(token) => void handleGoogle(token)} text="signup_with" />
      <OrDivider />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Your name">
          <input
            autoComplete="name"
            placeholder="Amara Okafor"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={formInputClass}
          />
        </Field>
        <Field label="Work email">
          <input
            type="email"
            autoComplete="email"
            placeholder="you@yourbusiness.com"
            value={workEmail}
            onChange={(e) => setWorkEmail(e.target.value)}
            className={formInputClass}
          />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={formInputClass}
          />
        </Field>
        {error && <InlineError>{error}</InlineError>}
        <Button type="submit" size="lg" disabled={busy}>
          Continue
        </Button>
      </form>
    </AuthLayout>
  );
}

export default SignupPage;
