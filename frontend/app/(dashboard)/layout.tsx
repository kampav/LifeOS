import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { NotificationBell } from "@/components/layout/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PersonalisationInit } from "@/components/life-os/PersonalisationInit";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-6 flex-shrink-0 md:flex hidden">
          <NotificationBell />
        </div>
        <PersonalisationInit />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
