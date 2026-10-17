import { Link } from "react-router";
import { LogoTile, Wordmark } from "@/components/ui/Wordmark";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-tn-page px-5 text-center">
      <LogoTile size={44} />
      <Wordmark />
      <span className="font-mono text-[11px] leading-none font-medium tracking-[0.14em] text-tn-faint uppercase">
        404
      </span>
      <h1 className="m-0 font-sans text-2xl leading-[1.15] font-bold tracking-[-0.02em] text-tn-ink">
        Page not found
      </h1>
      <Link to="/home" className="font-sans text-[13px] font-semibold">
        Back to home
      </Link>
    </main>
  );
}

export default NotFoundPage;
