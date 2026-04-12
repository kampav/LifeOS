"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOMAINS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageCircle, Target, Activity, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/coach", icon: MessageCircle, label: "AI Coach" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/habits", icon: Activity, label: "Habits" },
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
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r border-gray-100 py-6 px-3">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
          <span className="text-white text-sm font-bold">L</span>
        </div>
        <span className="font-bold text-gray-900 text-lg">Life OS</span>
      </div>

      {/* Main nav */}
      <nav className="space-y-1 mb-6">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              pathname === href ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Domains */}
      <div className="px-3 mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Life Domains</p>
      </div>
      <nav className="space-y-0.5 flex-1 overflow-y-auto">
        {DOMAINS.map(d => (
          <Link key={d.id} href={`/${d.id}`}
            className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === `/${d.id}` ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            {d.label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="space-y-1 pt-4 border-t border-gray-100 mt-4">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Settings className="w-4 h-4" /> Settings
        </Link>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
