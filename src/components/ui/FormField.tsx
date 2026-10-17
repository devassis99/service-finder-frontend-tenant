import type { ReactNode, SelectHTMLAttributes } from "react";

/**
 * A labelled form control — the label in the screens' small mono caps
 * (C25's "MOBILE OR EMAIL"), so a form reads as part of the same system
 * as a table header.
 */
export function Field({
  label,
  hint,
  aside,
  children,
}: {
  label: string;
  hint?: ReactNode;
  /** Right-aligned beside the label — "Optional". Visual only; say it in the hint if it matters. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  // The hint sits outside the <label>, so a control's accessible name is
  // just its label — "Email", not "Email They'll sign in with this."
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[11px] leading-none font-medium tracking-[0.04em] text-tn-faint uppercase">
            {label}
          </span>
          {aside && <span aria-hidden="true">{aside}</span>}
        </span>
        {children}
      </label>
      {hint && <span className="font-sans text-xs leading-snug text-tn-muted">{hint}</span>}
    </div>
  );
}

/**
 * C25's input: white, 12px radius, 14px text — and its focused state, the
 * teal 2px border, drawn as a 1px border plus a 1px ring so focusing
 * never shifts the layout.
 */
export const formInputClass =
  "box-border h-[48px] w-full rounded-xl border border-tn-input-border bg-tn-paper px-4 font-sans text-sm text-tn-ink outline-none placeholder:text-tn-faint hover:border-tn-input-border-hover focus:border-tn-accent focus:shadow-[0_0_0_1px_var(--color-tn-accent)] disabled:cursor-not-allowed disabled:bg-tn-subtle disabled:text-tn-faint";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

/**
 * The native select with its arrow replaced by a drawn chevron, so it
 * looks the same in every browser while keeping native keyboard and
 * screen-reader behaviour.
 */
export function Select({ className = "", children, ...rest }: SelectProps) {
  return (
    <span className="relative flex w-full">
      <select
        className={`${formInputClass} cursor-pointer appearance-none pr-10 ${className}`}
        {...rest}
      >
        {children}
      </select>
      <svg
        width="12"
        height="8"
        viewBox="0 0 12 8"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-tn-muted"
      >
        <path
          d="M1 1.5l5 5 5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default Field;
