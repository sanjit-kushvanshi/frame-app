"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, Heart, User } from "lucide-react";

export default function BottomNav({ myUsername }) {
  const pathname = usePathname();
  const items = [
    { href: "/", icon: Home, match: (p) => p === "/" },
    { href: "/search", icon: Search, match: (p) => p.startsWith("/search") },
    { href: "/new", icon: PlusSquare, match: (p) => p.startsWith("/new") },
    { href: "/activity", icon: Heart, match: (p) => p.startsWith("/activity") },
    { href: `/profile/${myUsername || ""}`, icon: User, match: (p) => p.startsWith("/profile/" + myUsername) },
  ];
  return (
    <div className="sticky bottom-0 bg-paper border-t border-hairline flex justify-around py-2.5 pb-3">
      {items.map(({ href, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link key={href} href={href} className="p-1.5" aria-label={href}>
            <Icon size={23} color={active ? "#FF6B35" : "#1C1A17"} strokeWidth={1.6} fill={active && Icon === Heart ? "#FF6B35" : "none"} />
          </Link>
        );
      })}
    </div>
  );
}
