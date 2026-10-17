import type { ReactNode } from "react";

/**
 * B01's header bar: white, a 17px semibold title, a mono caption under it
 * ("SAT 14 MAR · 11:04 AM · 3 BRANCHES"), the page's buttons on the
 * right.
 */
export function PageHeader({
  title,
  caption,
  actions,
}: {
  title: string;
  caption?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-tn-card-border bg-tn-paper px-5 py-4 sm:px-[26px]">
      <div className="flex min-w-0 flex-col gap-[7px]">
        <h1 className="m-0 truncate font-sans text-[17px] leading-none font-semibold text-tn-ink">
          {title}
        </h1>
        {caption && (
          <span className="font-mono text-[11px] leading-none text-tn-faint uppercase">
            {caption}
          </span>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** The page body under the header — B01's 22px × 26px gutter. */
export function PageBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`box-border flex flex-col gap-4 px-5 py-[22px] sm:px-[26px] ${className}`}>
      {children}
    </div>
  );
}

export default PageHeader;
