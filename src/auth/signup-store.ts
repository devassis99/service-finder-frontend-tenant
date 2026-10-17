import { create } from "zustand";

/**
 * What step one of sign-up collected, held for step two (the business).
 *
 * In memory only, never in storage: it can hold a password, and a Google
 * ID token that would let anyone holding it finish this sign-up. A
 * reload on step two simply sends the visitor back to step one.
 */
export type PendingIdentity =
  | { method: "password"; fullName: string; workEmail: string; password: string }
  | { method: "google"; fullName: string; workEmail: string; googleIdToken: string };

interface SignupState {
  identity: PendingIdentity | null;
  setIdentity: (identity: PendingIdentity) => void;
  clear: () => void;
}

export const useSignupStore = create<SignupState>()((set) => ({
  identity: null,
  setIdentity: (identity) => set({ identity }),
  clear: () => set({ identity: null }),
}));
