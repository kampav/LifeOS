"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, User, CalendarDays, Grid2X2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/planner", icon: CalendarDays, label: "Plan" },
  { href: "/coach", icon: MessageCircle, label: "Coach" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/more", icon: Grid2X2, label: "Domains" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50">
      <div className="mb-2 flex justify-end">
        <ThemeToggle compact />
      </div>
      <div className="flex rounded-[1.5rem] border border-[var(--md-outline)] bg-white px-1 py-1 shadow-[0_18px_46px_rgba(91,0,240,0.16)]">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={cn("flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-semibold transition-all",
              pathname === href ? "bg-[var(--life-rail-active)] text-primary shadow-sm" : "text-slate-500")}>
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
