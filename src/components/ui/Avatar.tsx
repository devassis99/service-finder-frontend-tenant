import { initials } from "@/lib/format";

/**
 * Initials in a rounded square — the business screens' logo tile (B01's
 * teal square) used for people too, so a member's avatar and the
 * business's mark are the same family. `tone` dims it for someone
 * invited or deactivated.
 */
export function Avatar({
  name,
  size = 32,
  tone = "accent",
}: {
  name: string;
  size?: number;
  tone?: "accent" | "muted" | "dark";
}) {
  const tones = {
    accent: "bg-tn-accent-bg text-tn-accent-deep",
    muted: "bg-tn-neutral-bg text-tn-muted",
    dark: "bg-tn-side-active text-white",
  } as const;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[9px] font-sans font-semibold ${tones[tone]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}

export default Avatar;
