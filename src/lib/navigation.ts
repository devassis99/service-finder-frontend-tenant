/**
 * A one-slot registry for the app's navigate function — iGroom's tenant
 * app's design, kept for the same reason.
 *
 * `http.ts` has to send the browser to /login when a session dies, but it
 * sits outside the component tree, so it can't use `useNavigate`.
 * Importing the router there instead would make every `*-api.ts` depend
 * on the whole route tree, while the route tree depends on pages that
 * call those APIs — an import cycle oxlint refuses.
 *
 * So the dependency is inverted: this module imports nothing, `http.ts`
 * reads from it, and `routes/router.tsx` fills it in.
 */
type NavigateFn = (path: string) => void;

let navigate: NavigateFn | null = null;

/** Called once by routes/router.tsx, as soon as the router object exists. */
export function setAppNavigate(fn: NavigateFn): void {
  navigate = fn;
}

/** Soft-navigate through the router when it has registered itself, or fall back to a full page load. */
export function navigateTo(path: string): void {
  if (navigate) {
    navigate(path);
  } else {
    window.location.assign(path);
  }
}
