"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOMAINS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageCircle, Target, Activity, Settings, LogOut, Sparkles, CalendarDays, KanbanSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/coach", icon: MessageCircle, label: "AI Coach" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/habits", icon: Activity, label: "Habits" },
  { href: "/planner", icon: CalendarDays, label: "Planner" },
  { href: "/kanban", icon: KanbanSquare, label: "Kanban" },
  { href: "/review", icon: Sparkles, label: "Reviews" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden md:flex flex-col w-72 min-h-screen px-4 py-5">
      {/* Logo */}
      <div className="panel glass-shine rounded-[1.75rem] px-4 py-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--md-primary)] flex items-center justify-center shadow-lg shadow-blue-500/25">
            <span className="text-white text-sm font-bold">LO</span>
          </div>
          <div>
            <span className="font-bold text-slate-950 text-lg leading-none">Life OS</span>
            <p className="text-xs text-slate-500 mt-0.5">Personal command centre</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="panel rounded-[1.75rem] p-2 space-y-1 mb-4">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
              pathname === href ? "bg-[var(--md-primary)] text-white shadow-lg shadow-blue-950/15" : "text-slate-600 hover:bg-white/55 hover:text-slate-950")}>
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Domains */}
      <div className="panel rounded-[1.75rem] p-2 flex-1 overflow-hidden flex flex-col">
        <div className="px-3 py-2">
          <p className="metric-label">Life Domains</p>
        </div>
        <nav className="space-y-0.5 overflow-y-auto pr-1">
          {DOMAINS.map(d => (
            <Link key={d.id} href={`/${d.id}`}
              className={cn("flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all",
                pathname === `/${d.id}` ? "bg-white/70 text-slate-950 font-semibold shadow-sm ring-1 ring-white/80" : "text-slate-600 hover:bg-white/45 hover:text-slate-950")}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm shadow-slate-400/30" style={{ background: d.color }} />
              {d.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom */}
      <div className="panel rounded-[1.75rem] p-2 space-y-1 mt-4">
        <div className="px-1 pb-1">
          <ThemeToggle />
        </div>
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-white/55 hover:text-slate-950">
          <Settings className="w-4 h-4" /> Settings
        </Link>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50/70 hover:text-red-600">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
