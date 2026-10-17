import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { startSession } from "@/auth/session";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { redeemInvite } from "@/lib/accounts-api";
import { errorMessage } from "@/lib/errors";

/**
 * Where an invite email's link lands: /invite#<token>. The token is in
 * the fragment so it never reaches a server log (see the backend's
 * staff-invites.service.ts); it's read once, wiped from the address bar
 * so it can't be bookmarked or shared from there, and exchanged for a
 * session.
 *
 * Links are single-use: opening one twice, an older one after "Resend",
 * or one past its 7 days all end on the same screen, deliberately
 * without saying which.
 */
export function InvitePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // Effects run twice in development (StrictMode), and a second redeem of
  // a single-use token would fail — so the token is taken exactly once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = window.location.hash.replace(/^#/, "").trim();
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setError("This link is missing its invite code.");
      return;
    }

    redeemInvite(token)
      .then(async ({ needsSignInMethod, ...tokens }) => {
        await startSession(tokens);
        return navigate(needsSignInMethod ? "/welcome" : "/home", { replace: true });
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [navigate]);

  if (!error) return <LoadingScreen />;

  return (
    <AuthLayout
      title="This invite link doesn't work"
      subtitle="Invite links work once and expire after 7 days, and sending a new one retires the old. Ask whoever invited you to send a fresh link."
      footer={
        <>
          Already set up? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <p className="m-0 rounded-xl border border-tn-card-border bg-tn-paper px-4 py-3 font-sans text-[13px] leading-normal text-tn-muted">
        {error}
      </p>
    </AuthLayout>
  );
}

export default InvitePage;
