declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              logo_alignment?: "left" | "center";
            },
          ) => void;
        };
      };
    };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise: Promise<void> | null = null;

/** Loads Google Identity Services once and caches the in-flight/resolved promise. */
function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Identity Services")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Google Identity Services")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return scriptPromise;
}

let initializedClientId: string | null = null;
// Google Identity Services only keeps the callback from the *last*
// initialize() call — calling it more than once for the same client
// silently drops every earlier registration (the "initialize() is
// called multiple times" console warning this used to trigger, one full
// initialize() per signInWithGoogle() call, previously). Initializing
// exactly once and routing every rendered button's clicks through this
// single mutable callback avoids that — see renderGoogleButton below.
// Only one Google button is ever mounted at a time in this app (the
// sign-in, sign-up and welcome pages are separate routes), so a single
// global slot is enough; the most recently rendered button owns it.
let currentCallback: ((idToken: string) => void) | null = null;

function ensureInitialized(clientId: string) {
  if (initializedClientId === clientId) return;
  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => currentCallback?.(response.credential),
  });
  initializedClientId = clientId;
}

/**
 * Renders Google's own "Sign in / Continue with Google" button into
 * `container`; `onCredential` fires with the signed ID token every time
 * the visitor completes Google's flow (the button stays clickable, so it
 * can fire again — a retry after the follow-up API call failed). That
 * token is only a carrier: the backend verifies it (modules/auth/google.ts)
 * before trusting a word of it.
 *
 * Google's rendered button rather than a custom one driving One Tap's
 * prompt(): Google silently suppresses prompt() in plenty of ordinary
 * situations (blocked third-party cookies, frequency caps, incognito),
 * which iGroom found the hard way. A real click on Google's own button
 * has no such risk.
 */
export async function renderGoogleButton(
  container: HTMLElement,
  clientId: string,
  onCredential: (idToken: string) => void,
  options?: { text?: "signin_with" | "signup_with" | "continue_with"; width?: number },
): Promise<void> {
  await loadGoogleIdentityScript();
  if (!window.google) throw new Error("Google Identity Services failed to load");
  ensureInitialized(clientId);
  currentCallback = onCredential;

  window.google.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    shape: "rectangular",
    text: options?.text ?? "continue_with",
    width: options?.width ?? 400,
    logo_alignment: "left",
  });
}
