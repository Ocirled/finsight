import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "#faf9f7" }}>
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header user={session.user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
