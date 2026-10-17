import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }));
vi.mock("./navigation", () => ({ navigateTo }));

import { useAuthStore } from "@/auth/auth-store";
import { ApiError, request } from "./http";

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockFetch(handler: Handler) {
  const fetchMock = vi.fn((url: string, init: RequestInit) => Promise.resolve(handler(url, init)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const authHeader = (init: RequestInit) =>
  (init.headers as Record<string, string> | undefined)?.Authorization;

beforeEach(() => {
  useAuthStore.setState({
    status: "authenticated",
    accessToken: "old-access",
    refreshToken: "old-refresh",
    permissions: ["staff.view"],
    member: null,
  });
  navigateTo.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("returns parsed JSON, and nothing for a 204", async () => {
    mockFetch(() => json(200, { ok: true }));
    await expect(request("/health")).resolves.toEqual({ ok: true });

    mockFetch(() => new Response(null, { status: 204 }));
    await expect(request("/accounts/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("surfaces the backend's own message and code", async () => {
    mockFetch(() => json(429, { error: "Too many sign-in attempts.", code: "TOO_MANY_ATTEMPTS" }));
    const error = await request("/accounts/login", { method: "POST", body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, message: "Too many sign-in attempts." });
    expect((error as ApiError).code).toBe("TOO_MANY_ATTEMPTS");
  });

  it("sends the stored access token only when asked to", async () => {
    const fetchMock = mockFetch(() => json(200, {}));
    await request("/accounts/me", { auth: true });
    await request("/accounts/login", { method: "POST", body: {} });
    expect(authHeader(fetchMock.mock.calls[0]![1])).toBe("Bearer old-access");
    expect(authHeader(fetchMock.mock.calls[1]![1])).toBeUndefined();
  });
});

describe("request — an expired access token", () => {
  it("refreshes once, stores the new pair, and retries with it", async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/accounts/refresh")) {
        return json(200, { accessToken: "new-access", refreshToken: "new-refresh" });
      }
      return authHeader(init) === "Bearer new-access"
        ? json(200, { staff: [] })
        : json(401, { error: "Invalid or expired access token", code: "TOKEN_INVALID" });
    });

    await expect(request("/staff", { auth: true })).resolves.toEqual({ staff: [] });
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("shares one refresh between calls that fail together — a refresh token works once", async () => {
    let refreshes = 0;
    mockFetch(async (url, init) => {
      if (url.endsWith("/accounts/refresh")) {
        refreshes++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json(200, { accessToken: "new-access", refreshToken: "new-refresh" });
      }
      return authHeader(init) === "Bearer new-access"
        ? json(200, { ok: url })
        : json(401, { error: "expired", code: "TOKEN_INVALID" });
    });

    await Promise.all([
      request("/staff", { auth: true }),
      request("/staff/roles", { auth: true }),
      request("/accounts/me", { auth: true }),
    ]);
    expect(refreshes).toBe(1);
  });

  it("never refreshes on a 401 that isn't about the token — a wrong code stays a wrong code", async () => {
    const fetchMock = mockFetch(() => json(401, { error: "Incorrect authenticator code" }));
    await expect(
      request("/accounts/security/mfa/confirm", {
        method: "POST",
        auth: true,
        body: { code: "000000" },
      }),
    ).rejects.toMatchObject({ status: 401, message: "Incorrect authenticator code" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("ends the session and goes to sign-in when the refresh fails too", async () => {
    mockFetch((url) =>
      url.endsWith("/accounts/refresh")
        ? json(401, { error: "Refresh token is invalid or expired" })
        : json(401, { error: "Invalid or expired access token", code: "TOKEN_INVALID" }),
    );

    await expect(request("/staff", { auth: true })).rejects.toMatchObject({
      status: 401,
      message: "Invalid or expired access token",
    });
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", accessToken: null });
    expect(navigateTo).toHaveBeenCalledWith("/login");
  });
});
