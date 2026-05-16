import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { NotificationBell } from "@/components/layout/Header";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PersonalisationInit } from "@/components/life-os/PersonalisationInit";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen app-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 flex items-center justify-end gap-3 px-6 flex-shrink-0 md:flex hidden">
          <ThemeToggle compact />
          <NotificationBell />
        </div>
        <PersonalisationInit />
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
