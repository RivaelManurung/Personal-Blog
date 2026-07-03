import type { Metadata } from "next";
import { me } from "@/lib/admin/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChangePasswordForm } from "@/components/admin/change-password-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const admin = await me();

  return (
    <div className="w-full max-w-[1800px] mx-auto flex flex-col gap-8 animate-in fade-in duration-500">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and credentials.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <Card className="transition-all duration-300 hover:shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Your editor identity.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
                <dd className="mt-1 font-medium">{admin.displayName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
                <dd className="mt-1 font-medium">{admin.email}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
            <CardDescription>Choose a strong password you do not use elsewhere.</CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-6" />
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
