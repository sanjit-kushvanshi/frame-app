"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, User, Clapperboard, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function BottomNav({ myUsername }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!error && data?.is_admin) {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);

  const items = [
    { href: "/", icon: Home, match: (p) => p === "/" },
    { href: "/reels", icon: Clapperboard, match: (p) => p.startsWith("/reels") },
    { href: "/new", icon: PlusSquare, match: (p) => p.startsWith("/new") },
    { href: "/search", icon: Search, match: (p) => p.startsWith("/search") },
    { href: `/profile/${myUsername || ""}`, icon: User, match: (p) => p.startsWith("/profile/" + myUsername) },
  ];

  if (isAdmin) {
    items.push({ href: "/admin", icon: ShieldCheck, match: (p) => p.startsWith("/admin") });
  }

  return (
    <div className="sticky bottom-0 bg-paper border-t border-hairline flex justify-around py-2.5 pb-3">
      {items.map(({ href, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`p-1.5 relative ${active ? "text-amber" : "text-ink"}`}
            aria-label={href}
          >
            <Icon size={22} strokeWidth={1.6} />
          </Link>
        );
      })}
    </div>
  );
}
