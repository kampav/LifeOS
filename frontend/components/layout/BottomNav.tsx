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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="flex">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={cn("flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
              pathname === href ? "text-primary" : "text-gray-500")}>
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
