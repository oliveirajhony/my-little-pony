'use client';

import { LogOut, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCommandMenu } from '../../lib/command-menu-store';
import { mockUser, screens } from '../../lib/mock-data';
import { DocIcon } from '../icons';
import { ThemeSwitcher } from './theme-switcher';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const openCommand = useCommandMenu((s) => s.setOpen);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/app">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <DocIcon className="size-[18px]" />
                </span>
                <span className="font-display text-[15px] font-semibold tracking-tight">
                  my-little-pony
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => openCommand(true)} tooltip="Buscar (Alt+B)">
              <Search />
              <span>Buscar…</span>
              <kbd className="ml-auto font-mono text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                Alt B
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {screens.map((screen) => (
                <SidebarMenuItem key={screen.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === screen.href}
                    tooltip={screen.title}
                  >
                    <Link href={screen.href}>
                      <screen.icon />
                      <span>{screen.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeSwitcher />
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={mockUser.name}>
              <Link href="/app/config">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-accent text-accent-foreground">
                    {mockUser.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden text-left leading-tight">
                  <span className="truncate text-sm font-medium">{mockUser.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{mockUser.email}</span>
                </div>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuAction
              onClick={() => router.push('/')}
              aria-label="Sair da conta"
              showOnHover
            >
              <LogOut />
            </SidebarMenuAction>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
