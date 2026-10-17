import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui/Wordmark";

interface AuthLayoutProps {
  /** Small mono caps above the title — B20's "STEP 1 OF 2 · YOU". */
  eyebrow?: string;
  /** 0–1: draws B20's progress track under the eyebrow. */
  progress?: number;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** At the foot of the panel — C25's "New here? Create an account". */
  footer?: ReactNode;
}

/**
 * Every signed-out screen (sign-in, sign-up, an invite, the welcome
 * steps): C25's sign-in screen — a 24px bold heading, mono-labelled
 * fields, full-width 50px buttons and a footer line — set in a framed
 * paper panel in the middle of the page, with the wordmark above it.
 */
export function AuthLayout({
  eyebrow,
  progress,
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="box-border flex min-h-screen flex-col items-center justify-center gap-7 bg-tn-chrome px-4 py-10">
      <Wordmark size="lg" />
      <div className="box-border flex w-full max-w-[440px] flex-col gap-6 rounded-[24px] border border-tn-border bg-tn-page px-6 py-8 shadow-frame sm:px-9">
        <div className="flex flex-col gap-2.5">
          {eyebrow && (
            <span className="font-mono text-[11px] leading-none text-tn-faint uppercase">
              {eyebrow}
            </span>
          )}
          {progress !== undefined && (
            <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-tn-neutral-bg">
              <div
                className="h-full bg-tn-accent"
                style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
              />
            </div>
          )}
          <h1 className="m-0 font-sans text-2xl leading-[1.15] font-bold tracking-[-0.02em] text-tn-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="m-0 font-sans text-[13px] leading-[1.5] text-pretty text-tn-muted">
              {subtitle}
            </p>
          )}
        </div>
        {children}
        {footer && (
          <p className="m-0 border-t border-tn-divider pt-5 text-center font-sans text-[13px] text-tn-muted">
            {footer}
          </p>
        )}
      </div>
    </main>
  );
}

/** C25's "OR" rule between Google and the form. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-tn-border" />
      <span className="font-mono text-[11px] leading-none text-tn-faint">OR</span>
      <span className="h-px flex-1 bg-tn-border" />
    </div>
  );
}

export default AuthLayout;
