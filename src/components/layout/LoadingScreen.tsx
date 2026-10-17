import { LogoTile } from "@/components/ui/Wordmark";

/** The one tick while a stored session rehydrates — the sign-in screen's tile over a small teal ring. */
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-tn-page">
      <LogoTile size={52} />
      <div
        className="h-7 w-7 rounded-full border-[3px] border-tn-neutral-bg border-t-tn-accent"
        style={{ animation: "tn-spin 0.9s linear infinite" }}
        aria-hidden
      />
      <span className="font-mono text-[11px] leading-none font-medium tracking-[0.14em] text-tn-faint uppercase">
        Loading
      </span>
    </div>
  );
}

export default LoadingScreen;
