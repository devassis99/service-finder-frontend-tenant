/**
 * The back office's lock-up — "ServiceFinder" in heavy, tightly tracked
 * Libre Franklin with a small teal mono tag beside it — tagged "Business"
 * here, the same word the business app's emails carry under their
 * wordmark (service-finder-backend's shared/email.ts).
 */
export function Wordmark({
  size = "md",
  tone = "ink",
}: {
  size?: "md" | "lg";
  tone?: "ink" | "light";
}) {
  const name = size === "lg" ? "text-[30px]" : "text-[19px]";
  const tag = size === "lg" ? "text-[11px]" : "text-[9.5px]";
  return (
    <span className="flex items-baseline gap-2">
      <span
        className={`font-sans font-bold leading-none tracking-[-0.04em] ${name} ${tone === "ink" ? "text-tn-ink" : "text-white"}`}
      >
        ServiceFinder
      </span>
      <span
        className={`font-mono font-medium leading-none tracking-[0.14em] uppercase text-tn-accent ${tag}`}
      >
        Business
      </span>
    </span>
  );
}

/**
 * C25's app tile: a teal rounded square. With a `label`, the label's
 * first letter sits in it — B01's tile beside the business name.
 */
export function LogoTile({ size = 52, label }: { size?: number; label?: string }) {
  const letter = label?.trim()[0]?.toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center bg-tn-accent font-sans font-bold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        fontSize: Math.round(size * 0.5),
      }}
    >
      {letter ?? (
        <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 24 24" fill="none">
          <circle cx="10.5" cy="10.5" r="6" stroke="white" strokeWidth="2.6" />
          <path d="M15 15l5 5" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

export default Wordmark;
