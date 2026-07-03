import "server-only";
import { cookies } from "next/headers";
import type { TokenResponse } from "@/types/api";

/**
 * Server-only session helpers backed by httpOnly cookies on the Next origin.
 * Access + refresh JWTs never touch the client bundle.
 */

const ACCESS_COOKIE = "admin_session";
const REFRESH_COOKIE = "admin_refresh";

/** One week; the access token is short-lived but the cookie can outlive it (refresh flow handles renewal). */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

/** Read the current admin access token, if any. */
export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}

/** Read the current refresh token, if any. */
export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value;
}

/** Persist a freshly issued token pair. Must run in a Server Action or Route Handler. */
export async function setSession(
  tokens: Pick<TokenResponse, "accessToken" | "refreshToken">,
): Promise<void> {
  const store = await cookies();
  const opts = baseCookieOptions();
  store.set(ACCESS_COOKIE, tokens.accessToken, { ...opts, maxAge: MAX_AGE_SECONDS });
  store.set(REFRESH_COOKIE, tokens.refreshToken, { ...opts, maxAge: MAX_AGE_SECONDS });
}

/** Clear the session cookies (logout / auth failure). */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
