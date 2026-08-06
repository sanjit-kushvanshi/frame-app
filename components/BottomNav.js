"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, User, Clapperboard } from "lucide-react";

export default function BottomNav({ myUsername }) {
  const pathname = usePathname();

  const items = [
    { href: "/", icon: Home, match: (p) => p === "/" },
    { href: "/search", icon: Search, match: (p) => p.startsWith("/search") },
    { href: "/reels", icon: Clapperboard, match: (p) => p.startsWith("/reels") },
    { href: "/new", icon: PlusSquare, match: (p) => p.startsWith("/new") },
    { href: `/profile/${myUsername || ""}`, icon: User, match: (p) => p.startsWith("/profile/" + myUsername) },
  ];
  return (
    <div className="sticky bottom-0 bg-paper border-t border-hairline flex justify-around py-2.5 pb-3">
      {items.map(({ href, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link key={href} href={href} className="p-1.5 relative" aria-label={href}>
            <Icon size={22} color={active ? "#FF6B35" : "#1C1A17"} strokeWidth={1.6} />
          </Link>
        );
      })}
    </div>
  );
}
