import type { ReactNode } from "react";

const NOTE_TONES = {
  accent: "text-tn-accent",
  warning: "text-tn-warning",
  danger: "text-tn-danger",
  muted: "text-tn-muted",
} as const;

/**
 * B01's stat tile: a mono caption, a big tight number, one line under it
 * ("4 en route", "2 expire < 10 min").
 */
export function StatCard({
  label,
  value,
  note,
  noteTone = "muted",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  noteTone?: keyof typeof NOTE_TONES;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[13px] border border-tn-card-border bg-tn-paper p-4">
      <span className="font-mono text-[10px] leading-none text-tn-faint uppercase">{label}</span>
      <span className="truncate font-sans text-[28px] leading-none font-bold tracking-[-0.02em] text-tn-ink tabular-nums">
        {value}
      </span>
      {note && (
        <span className={`font-sans text-[11px] leading-tight ${NOTE_TONES[noteTone]}`}>
          {note}
        </span>
      )}
    </div>
  );
}

export default StatCard;
