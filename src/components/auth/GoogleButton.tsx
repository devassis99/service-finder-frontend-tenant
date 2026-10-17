import { useEffect, useRef, useState } from "react";
import { env } from "@/lib/env";
import { renderGoogleButton } from "@/lib/google-identity";

interface GoogleButtonProps {
  /** Fires with Google's ID token each time the visitor completes Google's flow. */
  onCredential: (idToken: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}

/**
 * Google's own rendered button (see lib/google-identity.ts for why not a
 * custom one), sized to the auth panel. If Google's script can't load —
 * an ad blocker, no network to accounts.google.com — it says so in place
 * rather than leaving a gap.
 */
export function GoogleButton({ onCredential, text = "continue_with" }: GoogleButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  // The latest callback, without re-rendering Google's button for it.
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const width = Math.min(366, Math.max(200, Math.floor(container.getBoundingClientRect().width)));
    renderGoogleButton(
      container,
      env.VITE_GOOGLE_CLIENT_ID,
      (token) => callbackRef.current(token),
      {
        text,
        width,
      },
    ).catch(() => setFailed(true));
  }, [text]);

  if (failed) {
    return (
      <p className="m-0 rounded-xl border border-tn-card-border bg-tn-paper px-4 py-3 text-center font-sans text-[13px] text-tn-muted">
        Google sign-in couldn't load here. Use your email instead, or try another browser.
      </p>
    );
  }
  return <div ref={containerRef} className="flex min-h-[44px] w-full justify-center" />;
}

export default GoogleButton;
