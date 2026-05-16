"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageCircle, Target, Activity, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/coach", icon: MessageCircle, label: "Coach" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/habits", icon: Activity, label: "Habits" },
  { href: "/more", icon: Menu, label: "More" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50">
      <div className="panel flex rounded-2xl px-1 py-1">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={cn("flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-semibold transition-all",
              pathname === href ? "bg-slate-950 text-white" : "text-slate-500")}>
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
