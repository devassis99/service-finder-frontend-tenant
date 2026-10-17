import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { startSession } from "@/auth/session";
import { useSignupStore } from "@/auth/signup-store";
import { AuthLayout, OrDivider } from "@/components/layout/AuthLayout";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Field, formInputClass } from "@/components/ui/FormField";
import { InlineError } from "@/components/ui/Card";
import { OtpInput } from "@/components/ui/OtpInput";
import {
  confirmMfaChallenge,
  login,
  loginWithGoogle,
  type LoginOutcome,
  type TokenPair,
} from "@/lib/accounts-api";
import { errorMessage } from "@/lib/errors";

interface LoginState {
  /** Where the visitor was going before ProtectedRoute sent them here. */
  from?: string;
  /** Handed over by sign-up when the Google account used there already has a business with 2FA on. */
  challengeToken?: string;
}

/**
 * Sign-in for someone who already has a business account — C25's
 * screen: Google, or email and password. With two-factor on, either path
 * stops at a code step before the session exists.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LoginState;
  const setIdentity = useSignupStore((s) => s.setIdentity);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(state.challengeToken ?? null);
  const [code, setCode] = useState("");
  const [codeInvalid, setCodeInvalid] = useState(false);
  /** A Google account with no business behind it — offered sign-up with it. */
  const [unknownGoogle, setUnknownGoogle] = useState<{
    email: string;
    name?: string;
    idToken: string;
  } | null>(null);

  async function finish(tokens: TokenPair) {
    await startSession(tokens);
    const destination = state.from && state.from.startsWith("/") ? state.from : "/home";
    navigate(destination, { replace: true });
  }

  async function handleOutcome(outcome: LoginOutcome) {
    if (outcome.status === "mfa_challenge_required") {
      setChallengeToken(outcome.challengeToken);
      setCode("");
      return;
    }
    await finish(outcome);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    setUnknownGoogle(null);
    setSubmitting(true);
    try {
      await handleOutcome(await login(email.trim(), password));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle(idToken: string) {
    setError(null);
    setUnknownGoogle(null);
    setSubmitting(true);
    try {
      const outcome = await loginWithGoogle(idToken);
      if (outcome.status === "no_account") {
        setUnknownGoogle({ email: outcome.email, name: outcome.name, idToken });
        return;
      }
      await handleOutcome(outcome);
    } catch (err) {
      setError(errorMessage(err, "Google sign-in failed. Try again."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCode(value: string) {
    if (!challengeToken || value.length !== 6 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await finish(await confirmMfaChallenge(challengeToken, value));
    } catch (err) {
      setError(errorMessage(err));
      setCodeInvalid(true);
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  if (challengeToken) {
    return (
      <AuthLayout
        title="Enter your code"
        subtitle="Two-factor authentication is on for this account. Open your authenticator app and enter the 6-digit code for ServiceFinder."
        footer={
          <button
            type="button"
            onClick={() => {
              setChallengeToken(null);
              setError(null);
              setCode("");
            }}
            className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[13px] font-medium text-tn-accent hover:underline"
          >
            Back to sign in
          </button>
        }
      >
        <OtpInput
          value={code}
          onChange={(value) => {
            setCode(value);
            setCodeInvalid(false);
          }}
          onComplete={(value) => void submitCode(value)}
          disabled={submitting}
          invalid={codeInvalid}
        />
        {error && <InlineError>{error}</InlineError>}
        <Button
          size="lg"
          onClick={() => void submitCode(code)}
          disabled={submitting || code.length !== 6}
        >
          {submitting ? "Checking…" : "Verify and sign in"}
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to run your business on ServiceFinder."
      footer={
        <>
          New here? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <GoogleButton onCredential={(token) => void handleGoogle(token)} text="signin_with" />

      {unknownGoogle && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-tn-warning-border bg-tn-warning-bg p-4">
          <p className="m-0 font-sans text-[13px] leading-normal text-tn-warning-ink">
            There's no business on ServiceFinder for <strong>{unknownGoogle.email}</strong> yet.
          </p>
          <Button
            variant="dark"
            className="self-start"
            onClick={() => {
              setIdentity({
                method: "google",
                fullName: unknownGoogle.name ?? "",
                workEmail: unknownGoogle.email,
                googleIdToken: unknownGoogle.idToken,
              });
              navigate("/signup/business");
            }}
          >
            Create one with this Google account
          </Button>
        </div>
      )}

      <OrDivider />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            placeholder="you@yourbusiness.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={formInputClass}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={formInputClass}
          />
        </Field>
        {error && <InlineError>{error}</InlineError>}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
