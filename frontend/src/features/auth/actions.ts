"use server";

import { redirect } from "next/navigation";
import { AdminApiError, changePassword, login, logout } from "@/lib/admin/api";
import { clearSession, setSession } from "@/lib/auth";
import { changePasswordSchema, loginSchema } from "@/features/auth/schema";

export interface ActionState {
  error?: string;
  success?: boolean;
}

/**
 * Validates credentials, exchanges them for tokens, and persists the session
 * before redirecting into the dashboard. Never trusts client-side gating.
 */
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const { accessToken, refreshToken } = await login(parsed.data.email, parsed.data.password);
    await setSession({ accessToken, refreshToken });
  } catch (error: unknown) {
    if (error instanceof AdminApiError && error.status === 401) {
      return { error: "Incorrect email or password" };
    }
    return { error: error instanceof Error ? error.message : "Login failed" };
  }

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await logout();
  await clearSession();
  redirect("/admin/login");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await changePassword(parsed.data.currentPassword, parsed.data.newPassword);
  } catch (error: unknown) {
    if (error instanceof AdminApiError && error.status === 401) {
      return { error: "Current password is incorrect" };
    }
    return { error: error instanceof Error ? error.message : "Could not update password" };
  }

  return { success: true };
}
