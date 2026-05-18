"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn, DOMAINS } from "@/lib/utils";
import {
  Brain,
  CalendarDays,
  CircleHelp,
  Grid2X2,
  Home,
  LogOut,
  MessageCircle,
  Plus,
  Settings,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/planner", icon: CalendarDays, label: "Planning" },
  { href: "/coach", icon: MessageCircle, label: "Coach" },
  { href: "/more", icon: Grid2X2, label: "Domains" },
];

const SECONDARY = [
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/release-log", icon: Sparkles, label: "Release log" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/login");
  }

  function openQuickCapture() {
    window.dispatchEvent(new Event("lifeos-open-quick-capture"));
  }

  const activeDomain = DOMAINS.find(domain => pathname === `/${domain.id}`);

  return (
    <aside className="life-shell-rail hidden min-h-screen w-[17rem] flex-col px-5 py-6 md:flex">
      <div className="mb-9 px-2">
        <Link href="/" className="block">
          <p className="text-lg font-black leading-tight text-primary">Life OS</p>
          <p className="mt-1 max-w-36 text-base leading-6 text-[var(--md-on-surface-variant)]">
            High Agency Mastery
          </p>
        </Link>
      </div>

      <nav className="space-y-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/more"
            ? Boolean(activeDomain) || pathname === "/more"
            : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-12 items-center gap-3 rounded-2xl px-4 text-base font-semibold text-slate-600 transition hover:bg-white/70 hover:text-primary",
                isActive && "life-nav-active"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-[1.35rem] bg-white/62 p-3 shadow-[0_10px_26px_rgba(91,0,240,0.06)]">
        <p className="px-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Areas</p>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {DOMAINS.slice(0, 8).map(domain => (
            <Link
              key={domain.id}
              href={`/${domain.id}`}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-slate-950",
                pathname === `/${domain.id}` && "bg-white text-slate-950 shadow-sm"
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: domain.color }} />
              <span className="truncate">{domain.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-5">
        <div className="life-coach-card rounded-[1.75rem] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-slate-950">AI Coach</p>
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--life-mint)] shadow-[0_0_14px_rgba(16,197,143,0.8)]" />
          </div>
          <div className="rounded-[1.25rem] border border-emerald-200/80 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-600">
              <Brain className="h-4 w-4" />
              Health mode
            </div>
            <h3 className="text-sm font-black leading-5 text-slate-950">Restorative pulse detected</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Good window for a focused block or a strategic review.
            </p>
            <Link href="/coach" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-primary">
              Ask coach <Zap className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={openQuickCapture}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-5 text-base font-black text-white shadow-[0_18px_38px_rgba(91,0,240,0.26)] transition hover:-translate-y-0.5 hover:bg-primary-dark"
        >
          <Plus className="h-5 w-5" />
          Quick Action
        </button>

        <div className="space-y-1">
          <ThemeToggle />
          {SECONDARY.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-white/70 hover:text-slate-950",
                pathname === href && "bg-white text-slate-950 shadow-sm"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <Link href="/settings/preferences" className="flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-white/70 hover:text-slate-950">
            <Settings className="h-4 w-4" />
            Preferences
          </Link>
          <Link href="/settings/privacy" className="flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-white/70 hover:text-slate-950">
            <CircleHelp className="h-4 w-4" />
            Privacy
          </Link>
          <button
            onClick={signOut}
            className="flex h-11 w-full items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
