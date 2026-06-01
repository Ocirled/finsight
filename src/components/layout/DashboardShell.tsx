"use client";

import { Sidebar, MobileNav } from "./Sidebar";
import { Header } from "./Header";

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: Props) {
  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "#faf9f7" }}>
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
