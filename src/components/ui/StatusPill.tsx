import type { ReactNode } from "react";

/**
 * The screens' state pills (B01's EN ROUTE / WORKING / NEEDS DISPATCH /
 * EXCEPTION / COMPLETE, B19's ACTIVE / LIMITED COVER): small, uppercase,
 * Roboto Mono, fully rounded, one colour pair per tone.
 */
const TONE_CLASSES = {
  success: "bg-tn-accent-bg text-tn-accent",
  neutral: "bg-tn-neutral-bg text-tn-ink",
  muted: "bg-tn-neutral-bg text-tn-muted",
  warning: "bg-tn-warning-bg text-tn-warning",
  danger: "bg-tn-danger-bg text-tn-danger",
} as const;

export type PillTone = keyof typeof TONE_CLASSES;

export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex w-fit items-center whitespace-nowrap rounded-full px-2 py-[5px] font-mono text-[10px] leading-none font-medium tracking-[0.03em] uppercase ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export default StatusPill;
