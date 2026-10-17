import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionMember } from "./types";

interface AuthState {
  /**
   * "unknown" for the one tick zustand/persist takes to rehydrate from
   * storage, so route guards don't flash the sign-in page at someone who
   * is signed in.
   */
  status: "unknown" | "authenticated" | "anonymous";
  member: SessionMember | null;
  /**
   * The business-app session from service-finder-backend's /accounts:
   * a 15-minute access token and a 30-day, single-use refresh token that
   * rotates on every POST /accounts/refresh (lib/http.ts does that).
   *
   * Persisted to localStorage, as iGroom's tenant app does — the simple
   * choice for now. An httpOnly-cookie session is the safer one, and
   * worth moving to before this holds anything a stolen token would
   * really hurt.
   */
  accessToken: string | null;
  refreshToken: string | null;
  /**
   * The caller's permission keys, mirrored from GET /accounts/me by
   * use-permissions.ts and persisted, so a reload builds the nav on the
   * first frame instead of popping items in a moment later. Never the
   * enforcement boundary — the backend checks every route itself.
   */
  permissions: string[];
  hydrate: () => void;
  signIn: (params: {
    member: SessionMember;
    permissions: string[];
    accessToken: string;
    refreshToken: string;
  }) => void;
  /** A freshly rotated pair, from http.ts's silent refresh. Leaves everything else alone. */
  setTokens: (params: { accessToken: string; refreshToken: string }) => void;
  /** What /accounts/me just said — called whenever it's fetched. */
  setMe: (params: { member: SessionMember; permissions: string[] }) => void;
  logOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: "unknown",
      member: null,
      accessToken: null,
      refreshToken: null,
      permissions: [],
      hydrate: () =>
        set((state) => ({ status: state.accessToken ? "authenticated" : "anonymous" })),
      signIn: ({ member, permissions, accessToken, refreshToken }) =>
        set({ member, permissions, accessToken, refreshToken, status: "authenticated" }),
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      setMe: ({ member, permissions }) => set({ member, permissions }),
      logOut: () =>
        set({
          member: null,
          accessToken: null,
          refreshToken: null,
          // Cleared, so the next person to sign in on this browser never
          // sees a nav built from someone else's role.
          permissions: [],
          status: "anonymous",
        }),
    }),
    {
      name: "service-finder-business-session",
      partialize: (state) => ({
        member: state.member,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        permissions: state.permissions,
      }),
      onRehydrateStorage: () => (state) => {
        state?.hydrate();
      },
    },
  ),
);
