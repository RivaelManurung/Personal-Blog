import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { AdminApiError, me } from "@/lib/admin/api";
import { getAccessToken } from "@/lib/auth";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import type { Admin } from "@/types/api";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Authoritative server-side gate. The login route lives outside this group.
  const token = await getAccessToken();
  if (!token) redirect("/admin/login");

  let admin: Admin;
  try {
    admin = await me();
  } catch (error: unknown) {
    if (error instanceof AdminApiError && error.status === 401) {
      redirect("/admin/login");
    }
    throw error;
  }

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AdminSidebar admin={admin} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <AdminBreadcrumb />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 md:inline-flex">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
            <Button asChild variant="outline" size="sm" className="hidden h-8 gap-1.5 text-xs sm:inline-flex">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                <span>View Site</span>
              </a>
            </Button>
            <Button asChild size="sm" className="h-8 gap-1.5 text-xs shadow-sm">
              <Link href="/admin/posts/new">
                <Plus className="size-3.5" />
                <span>New Post</span>
              </Link>
            </Button>
          </div>
        </header>
        <main id="main-content" className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300">
          {children}
        </main>
      </SidebarInset>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
