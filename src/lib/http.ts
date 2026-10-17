import { useAuthStore } from "@/auth/auth-store";
import { env } from "./env";
import { navigateTo } from "./navigation";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** The backend's machine-readable marker, when it sent one ("TOKEN_INVALID", "TOO_MANY_ATTEMPTS"). */
  get code(): string | undefined {
    const code =
      this.body && typeof this.body === "object" ? (this.body as { code?: unknown }).code : null;
    return typeof code === "string" ? code : undefined;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /**
   * Send the signed-in member's access token. Every route behind the
   * backend's requireAccountAuth needs it; sign-in, sign-up, refresh and
   * the invite/2FA hand-offs don't.
   */
  auth?: boolean;
  /** Internal — set on the one retry after a refresh, so a 401 there fails for good. */
  isRetryAttempt?: boolean;
}

/** The fetch itself: base URL, JSON in and out, typed errors. No refresh handling. */
async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, auth, isRetryAttempt: _isRetryAttempt, ...rest } = options;
  const accessToken = auth ? useAuthStore.getState().accessToken : null;

  const response = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    // The backend's errorHandler shapes every failure as `{ error }`;
    // `message` is read as a fallback only.
    const payloadMessage =
      payload && typeof payload === "object"
        ? ((payload as { error?: unknown; message?: unknown }).error ??
          (payload as { error?: unknown; message?: unknown }).message)
        : undefined;
    const message =
      typeof payloadMessage === "string" && payloadMessage.length > 0
        ? payloadMessage
        : `Request to ${path} failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * One refresh in flight at a time. The backend's POST /accounts/refresh
 * retires the refresh token it's handed the moment it's used, so two
 * 401s landing together (the home page's queries all fire at once) must
 * share one refresh — a second, independent one would present a token
 * that's already been spent, and lose.
 */
let refreshPromise: Promise<TokenPair> | null = null;

function refreshTokens(): Promise<TokenPair> {
  if (!refreshPromise) {
    const currentRefreshToken = useAuthStore.getState().refreshToken;
    refreshPromise = currentRefreshToken
      ? rawRequest<TokenPair>("/accounts/refresh", {
          method: "POST",
          body: { refreshToken: currentRefreshToken },
        })
      : Promise.reject(new ApiError(401, "No refresh token available"));
    void refreshPromise
      .finally(() => {
        refreshPromise = null;
      })
      .catch(() => {});
  }
  return refreshPromise;
}

/**
 * Every API call goes through here. Access tokens last 15 minutes, so a
 * signed-in call that comes back 401 with `code: "TOKEN_INVALID"` gets
 * one silent refresh (POST /accounts/refresh) and one retry with the new
 * token. If the refresh fails too, the session is over: it's cleared and
 * the browser goes to /login, and the caller still sees the original
 * 401.
 *
 * Only TOKEN_INVALID triggers it. Every other 401 the business endpoints
 * send — a wrong password, a wrong authenticator code — is the caller's
 * real answer, and refreshing on those would retry the same wrong code,
 * fail again, and log the person out over a typo (iGroom's lesson).
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    const canRetryWithRefresh =
      err instanceof ApiError &&
      err.status === 401 &&
      err.code === "TOKEN_INVALID" &&
      options.auth === true &&
      !options.isRetryAttempt;
    if (!canRetryWithRefresh) throw err;

    let tokens: TokenPair;
    try {
      tokens = await refreshTokens();
    } catch {
      useAuthStore.getState().logOut();
      navigateTo("/login");
      throw err;
    }
    useAuthStore.getState().setTokens(tokens);
    return rawRequest<T>(path, { ...options, isRetryAttempt: true });
  }
}
