import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Toaster } from "@/components/ui/sonner";
import { getAccessToken } from "@/lib/auth";
import { me } from "@/lib/admin/api";
import { SITE } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // If an existing session is still valid, skip the form.
  const token = await getAccessToken();
  if (token) {
    try {
      await me();
      redirect("/admin");
    } catch {
      // stale token — fall through to the login form
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.6] [background:radial-gradient(120%_120%_at_50%_-10%,var(--accent)_0%,transparent_55%)]"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-muted-foreground">
            {SITE.name}
          </p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight text-foreground">
            Editor console
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage stories, taxonomy, and media.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <LoginForm />
        </div>
      </div>
      <Toaster richColors position="top-center" />
    </main>
  );
}
