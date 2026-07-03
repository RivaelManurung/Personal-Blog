import { beforeEach, describe, expect, it, vi } from "vitest";

// Sentinel thrown by the mocked redirect, mirroring Next's control-flow behavior.
const REDIRECT = "NEXT_REDIRECT";

// vi.mock is hoisted above module scope, so shared mocks must be created via
// vi.hoisted to be available inside the factory functions.
const { redirect, login, setSession, clearSession, AdminApiError } = vi.hoisted(() => {
  // A local stand-in for the real AdminApiError so `instanceof` branches work.
  class AdminApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "AdminApiError";
    }
  }
  return {
    redirect: vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    }),
    login: vi.fn(),
    setSession: vi.fn(),
    clearSession: vi.fn(),
    AdminApiError,
  };
});

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth", () => ({ setSession, clearSession }));
vi.mock("@/lib/admin/api", () => ({
  AdminApiError,
  login,
  logout: vi.fn(),
  changePassword: vi.fn(),
}));

import { loginAction } from "@/features/auth/actions";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets the session and redirects on a successful login", async () => {
    login.mockResolvedValue({ accessToken: "at", refreshToken: "rt" });

    await expect(
      loginAction({}, form({ email: "user@example.com", password: "secret" })),
    ).rejects.toThrow(`${REDIRECT}:/admin`);

    expect(login).toHaveBeenCalledWith("user@example.com", "secret");
    expect(setSession).toHaveBeenCalledWith({ accessToken: "at", refreshToken: "rt" });
    expect(redirect).toHaveBeenCalledWith("/admin");
  });

  it("returns a friendly error and does not redirect on 401", async () => {
    login.mockRejectedValue(new AdminApiError(401, "nope"));

    const result = await loginAction({}, form({ email: "user@example.com", password: "bad" }));

    expect(result).toEqual({ error: "Incorrect email or password" });
    expect(setSession).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("propagates a generic error message and does not redirect", async () => {
    login.mockRejectedValue(new Error("network down"));

    const result = await loginAction({}, form({ email: "user@example.com", password: "secret" }));

    expect(result).toEqual({ error: "network down" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns a validation error without calling login for a bad email", async () => {
    const result = await loginAction({}, form({ email: "not-an-email", password: "secret" }));

    expect(result.error).toBeDefined();
    expect(login).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
