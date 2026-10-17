import type { ReactNode } from "react";

/**
 * B01's content card ("Needs you", "Live operations"): white, hairline
 * border, 14px radius. With `title`, a 14px semibold heading and an
 * optional mono aside ("AUTO-REFRESH") or link on the right.
 *
 * `flush` drops the padding, for a card that holds a table edge to edge.
 */
export function Card({
  title,
  aside,
  children,
  flush = false,
  className = "",
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
}) {
  const header = (title || aside) && (
    <div
      className={`flex min-h-[18px] items-center justify-between gap-3 ${flush ? "px-[18px] pt-[18px] pb-3.5" : ""}`}
    >
      {title && (
        <h2 className="m-0 font-sans text-sm leading-none font-semibold text-tn-ink">{title}</h2>
      )}
      {aside}
    </div>
  );
  return (
    <section
      className={`box-border flex min-w-0 flex-col rounded-[14px] border border-tn-card-border bg-tn-paper ${
        flush ? "overflow-hidden" : "gap-3.5 p-[18px]"
      } ${className}`}
    >
      {header}
      {children}
    </section>
  );
}

/** A mono, uppercase aside for a card header ("AUTO-REFRESH", "3 PENDING"). */
export function CardCaption({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] leading-none text-tn-faint uppercase">{children}</span>
  );
}

/** One row inside a card — B01's "Needs you" items and B19's service areas, divided by a hairline. */
export function CardRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-t border-tn-divider pt-3.5 first:border-t-0 first:pt-0 ${className}`}
    >
      {children}
    </div>
  );
}

/** A red line for a failed request, placed above whatever it concerns. */
export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="m-0 rounded-xl border border-tn-danger-bg bg-tn-danger-bg px-3.5 py-2.5 font-sans text-[13px] leading-[1.45] font-medium text-tn-danger"
    >
      {children}
    </p>
  );
}

/** A green line for something that worked and is worth saying ("Saved"). */
export function InlineNotice({ children }: { children: ReactNode }) {
  return (
    <output className="block rounded-xl border border-tn-accent-bg bg-tn-accent-bg px-3.5 py-2.5 font-sans text-[13px] leading-[1.45] font-medium text-tn-accent-deep">
      {children}
    </output>
  );
}

/** A dashed placeholder for a list with nothing in it yet. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-tn-input-border-hover px-6 py-10 text-center">
      <span className="font-sans text-sm leading-[1.45] font-medium text-tn-muted">{children}</span>
      {action}
    </div>
  );
}

export default Card;
