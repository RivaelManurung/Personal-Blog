"use client";

import { useTransition } from "react";
import { ChevronsUpDown, LogOut, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { logoutAction } from "@/features/auth/actions";
import type { Admin } from "@/types/api";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AdminUserMenu({ admin }: { admin: Admin }) {
  const [pending, startTransition] = useTransition();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
                {initials(admin.displayName || admin.email)}
              </span>
              <span className="flex flex-col leading-tight text-left group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">{admin.displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
              </span>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-sm font-medium">{admin.displayName}</span>
              <span className="block text-xs text-muted-foreground">{admin.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                View site
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={pending}
              onSelect={(e) => {
                e.preventDefault();
                startTransition(() => {
                  void logoutAction();
                });
              }}
            >
              <LogOut className="size-4" />
              {pending ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
