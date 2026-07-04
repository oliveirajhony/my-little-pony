import type { ReactNode } from 'react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '../../components/app/app-sidebar';
import { CommandMenu } from '../../components/app/command-menu';
import { UserPanel } from '../../components/app/user-panel';
import { ThemeToggle } from '../../components/theme-toggle';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </SidebarInset>
      <CommandMenu />
      <UserPanel />
    </SidebarProvider>
  );
}
