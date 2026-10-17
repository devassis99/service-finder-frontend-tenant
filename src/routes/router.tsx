import { createBrowserRouter, Navigate } from "react-router";
import { setAppNavigate } from "@/lib/navigation";
import { GuestRoute, ProtectedRoute } from "./ProtectedRoute";

/**
 * Route-level code splitting via react-router's `lazy`, as in the back
 * office and iGroom's tenant app — someone who only ever signs in never
 * downloads the settings screens until they open one.
 */
export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/home" replace /> },

  // Signed-out screens. A signed-in visitor is sent home instead.
  {
    element: <GuestRoute />,
    children: [
      {
        path: "/login",
        lazy: () => import("@/pages/LoginPage").then((m) => ({ Component: m.default })),
      },
      // Sign-up, two steps: you (Google, or name/email/password), then
      // the business. The business is created at the end of step two.
      {
        path: "/signup",
        lazy: () => import("@/pages/SignupPage").then((m) => ({ Component: m.default })),
      },
      {
        path: "/signup/business",
        lazy: () => import("@/pages/SignupBusinessPage").then((m) => ({ Component: m.default })),
      },
    ],
  },

  // Where an invited team member lands from their email. Outside both
  // gates: there is no session until the token in the URL fragment is
  // redeemed — and if someone else is signed in on this browser, opening
  // an invite replaces their session rather than bouncing off it.
  {
    path: "/invite",
    lazy: () => import("@/pages/InvitePage").then((m) => ({ Component: m.default })),
  },

  {
    element: <ProtectedRoute />,
    children: [
      // The invited member's first stop: choose how to sign in again.
      // Outside the shell, so the one thing they must do isn't buried
      // under a nav.
      {
        path: "/welcome",
        lazy: () => import("@/pages/WelcomePage").then((m) => ({ Component: m.default })),
      },
      {
        lazy: () => import("@/components/layout/AppShell").then((m) => ({ Component: m.default })),
        children: [
          {
            path: "/home",
            lazy: () => import("@/pages/HomePage").then((m) => ({ Component: m.default })),
          },
          {
            path: "/settings",
            lazy: () =>
              import("@/pages/settings/SettingsLayout").then((m) => ({ Component: m.default })),
            children: [
              { index: true, element: <Navigate to="/settings/business" replace /> },
              {
                path: "business",
                lazy: () =>
                  import("@/pages/settings/BusinessSettingsPage").then((m) => ({
                    Component: m.default,
                  })),
              },
              {
                path: "team",
                lazy: () =>
                  import("@/pages/settings/TeamSettingsPage").then((m) => ({
                    Component: m.default,
                  })),
              },
              {
                path: "profile",
                lazy: () =>
                  import("@/pages/settings/ProfileSettingsPage").then((m) => ({
                    Component: m.default,
                  })),
              },
              {
                path: "security",
                lazy: () =>
                  import("@/pages/settings/SecuritySettingsPage").then((m) => ({
                    Component: m.default,
                  })),
              },
            ],
          },
        ],
      },
    ],
  },

  {
    path: "*",
    lazy: () => import("@/pages/NotFoundPage").then((m) => ({ Component: m.default })),
  },
]);

// http.ts sends the browser to /login when a session dies, but lives
// outside the component tree. Handing it the navigate function here —
// rather than letting it import this module — keeps src/lib free of the
// route tree. See lib/navigation.ts.
setAppNavigate((path) => {
  void router.navigate(path);
});
