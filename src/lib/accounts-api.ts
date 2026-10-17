import { useAuthStore } from "@/auth/auth-store";
import { request } from "./http";

/**
 * service-finder-backend's /accounts module: the business, signing in
 * and out, and the caller's own profile and security. Types mirror the
 * backend's zod schemas (modules/accounts/accounts.validators.ts).
 */

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Password or Google identity confirmed, but two-factor is on: finish with confirmMfaChallenge. */
export interface MfaChallengeRequired {
  status: "mfa_challenge_required";
  challengeToken: string;
}

export type LoginOutcome = ({ status: "ok" } & TokenPair) | MfaChallengeRequired;

export type GoogleLoginOutcome =
  | LoginOutcome
  /** Nobody signs in with this Google account yet — sign-up carries on with the same token. */
  | { status: "no_account"; email: string; name?: string };

export function login(email: string, password: string): Promise<LoginOutcome> {
  return request("/accounts/login", { method: "POST", body: { email, password } });
}

export function loginWithGoogle(idToken: string): Promise<GoogleLoginOutcome> {
  return request("/accounts/google", { method: "POST", body: { idToken } });
}

export function confirmMfaChallenge(challengeToken: string, code: string): Promise<TokenPair> {
  return request("/accounts/mfa/challenge", { method: "POST", body: { challengeToken, code } });
}

export interface SignupPayload {
  fullName: string;
  workEmail: string;
  /** One of password and googleIdToken is required. */
  password?: string;
  googleIdToken?: string;
  businessName: string;
  phone?: string;
}

export function signup(payload: SignupPayload): Promise<TokenPair> {
  return request("/accounts/signup", { method: "POST", body: payload });
}

export interface RedeemedInvite extends TokenPair {
  /** True while the member has neither a password nor Google — the welcome screen must not let them leave without one. */
  needsSignInMethod: boolean;
}

export function redeemInvite(token: string): Promise<RedeemedInvite> {
  return request("/accounts/invite/redeem", { method: "POST", body: { token } });
}

/** Revokes the refresh token server-side. Never throws — signing out locally must not wait on the network. */
export async function logout(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;
  await request("/accounts/logout", { method: "POST", body: { refreshToken } }).catch(() => {});
}

export interface Account {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export interface MeResponse {
  staffUser: {
    id: string;
    accountId: string;
    name: string;
    email: string;
    roleId: string | null;
    roleName: string;
    /** Holds the business's Owner role — a fact about the role, not its name. */
    isOwner: boolean;
    /** False for someone who has only ever signed in with Google — Security offers "Set password". */
    hasPassword: boolean;
    hasGoogle: boolean;
    /** Decides whether a password change asks for an emailed code or an authenticator code. */
    mfaEnabled: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  };
  /** Permission keys the caller's role grants — see use-permissions.ts. */
  permissions: string[];
  account: Account;
}

/**
 * GET /accounts/me. `accessToken` is passed explicitly only by the flows
 * that have just been handed a session and haven't stored it yet (sign-in,
 * sign-up, an invite); everything else uses the stored one.
 */
export function getMe(accessToken?: string): Promise<MeResponse> {
  return accessToken
    ? request("/accounts/me", { headers: { Authorization: `Bearer ${accessToken}` } })
    : request("/accounts/me", { auth: true });
}

export function updateOwnProfile(name: string): Promise<MeResponse> {
  return request("/accounts/me/profile", { method: "PATCH", auth: true, body: { name } });
}

export interface UpdateBusinessPayload {
  name?: string;
  email?: string;
  phone?: string | null;
}

export function updateBusiness(payload: UpdateBusinessPayload): Promise<{ account: Account }> {
  return request("/accounts/settings/business", { method: "PATCH", auth: true, body: payload });
}

// --- Security ----------------------------------------------------------------

/** The caller's own refresh token, sent so the backend can tell which session is "this device". */
function currentSessionHeader(): Record<string, string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  return refreshToken ? { "X-Refresh-Token": refreshToken } : {};
}

/** A first password, for someone who has none — no code needed (the welcome screen, a Google-only member). */
export function setInitialPassword(newPassword: string): Promise<void> {
  return request("/accounts/me/password/initial", {
    method: "POST",
    auth: true,
    body: { newPassword },
  });
}

/** Emails a 6-digit code — the identity check for a password change without two-factor. */
export function requestPasswordCode(): Promise<void> {
  return request("/accounts/security/password/request-code", { method: "POST", auth: true });
}

/** Sets the new password. Every other session is signed out; this one is kept. */
export function confirmPasswordChange(
  payload: { newPassword: string } & ({ code: string } | { totpCode: string }),
): Promise<void> {
  return request("/accounts/security/password/confirm", {
    method: "POST",
    auth: true,
    headers: currentSessionHeader(),
    body: payload,
  });
}

export interface MfaSetup {
  secret: string;
  qrCodeDataUrl: string;
}

export function beginMfaSetup(): Promise<MfaSetup> {
  return request("/accounts/security/mfa/setup", { method: "POST", auth: true });
}

export function confirmMfaSetup(code: string): Promise<void> {
  return request("/accounts/security/mfa/confirm", { method: "POST", auth: true, body: { code } });
}

export function disableMfa(code: string): Promise<void> {
  return request("/accounts/security/mfa/disable", { method: "POST", auth: true, body: { code } });
}

export interface Session {
  id: string;
  userAgent: string | null;
  /** When its current token was issued — "last active". */
  createdAt: string;
  isCurrent: boolean;
}

export async function listSessions(): Promise<Session[]> {
  const { sessions } = await request<{ sessions: Session[] }>("/accounts/security/sessions", {
    auth: true,
    headers: currentSessionHeader(),
  });
  return sessions;
}

export function revokeSession(sessionId: string): Promise<void> {
  return request(`/accounts/security/sessions/${encodeURIComponent(sessionId)}/revoke`, {
    method: "POST",
    auth: true,
  });
}

export function revokeOtherSessions(): Promise<void> {
  return request("/accounts/security/sessions/revoke-others", {
    method: "POST",
    auth: true,
    body: { currentRefreshToken: useAuthStore.getState().refreshToken ?? "" },
  });
}
