import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { startSession } from "@/auth/session";
import { useSignupStore } from "@/auth/signup-store";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Field, formInputClass } from "@/components/ui/FormField";
import { InlineError } from "@/components/ui/Card";
import { signup } from "@/lib/accounts-api";
import { errorMessage } from "@/lib/errors";
import { ApiError } from "@/lib/http";

/**
 * Sign-up, step 2 of 2: the business. Submitting creates the business,
 * its default roles (Owner, Manager, Member) and its owner in one go —
 * POST /accounts/signup — and signs the owner in.
 *
 * Reached without step 1's answers (a reload — they're never stored, see
 * signup-store.ts), it sends the visitor back to step 1.
 */
export function SignupBusinessPage() {
  const navigate = useNavigate();
  const identity = useSignupStore((s) => s.identity);
  const clear = useSignupStore((s) => s.clear);

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState(identity?.fullName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!identity) return <Navigate to="/signup" replace />;
  // Google may not give a name; then it's asked for here.
  const needsName = identity.method === "google" && !identity.fullName.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!identity) return;
    if (needsName && !fullName.trim()) return setError("Enter your name.");
    if (!businessName.trim()) return setError("Enter your business's name.");
    setError(null);
    setEmailTaken(false);
    setSubmitting(true);
    try {
      const tokens = await signup({
        fullName: (needsName ? fullName : identity.fullName).trim(),
        workEmail: identity.workEmail,
        businessName: businessName.trim(),
        phone: phone.trim() || undefined,
        ...(identity.method === "password"
          ? { password: identity.password }
          : { googleIdToken: identity.googleIdToken }),
      });
      await startSession(tokens);
      clear();
      navigate("/home", { replace: true });
    } catch (err) {
      setEmailTaken(err instanceof ApiError && err.status === 409);
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Step 2 of 2 · Your business"
      progress={1}
      title="Tell us about your business"
      subtitle={
        <>
          Signing up as <strong className="font-semibold text-tn-ink">{identity.workEmail}</strong>
          {identity.method === "google" ? " with Google" : ""}. <Link to="/signup">Change</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {needsName && (
          <Field label="Your name">
            <input
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={formInputClass}
            />
          </Field>
        )}
        <Field
          label="Business name"
          hint="How your team and customers will know you. You can change it later."
        >
          <input
            autoComplete="organization"
            placeholder="BrightFix Repairs"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={formInputClass}
          />
        </Field>
        <Field
          label="Phone"
          aside={<span className="font-sans text-xs text-tn-faint">Optional</span>}
        >
          <input
            type="tel"
            autoComplete="tel"
            placeholder="Business phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={formInputClass}
          />
        </Field>
        {error && (
          <InlineError>
            {error}
            {emailTaken && (
              <>
                {" "}
                <Link to="/login">Sign in</Link>
              </>
            )}
          </InlineError>
        )}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Creating your business…" : "Create business"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default SignupBusinessPage;
