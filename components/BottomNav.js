"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, Heart, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function BottomNav({ myUsername, currentUserId }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUserId) return;

    const loadCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", currentUserId)
        .eq("read", false);
      setUnreadCount(count || 0);
    };
    loadCount();

    const channel = supabase
      .channel(`notif-badge:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${currentUserId}` },
        () => setUnreadCount((c) => c + 1)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUserId, supabase]);

  useEffect(() => {
    if (pathname.startsWith("/activity")) setUnreadCount(0);
  }, [pathname]);

  const items = [
    { href: "/", icon: Home, match: (p) => p === "/" },
    { href: "/search", icon: Search, match: (p) => p.startsWith("/search") },
    { href: "/new", icon: PlusSquare, match: (p) => p.startsWith("/new") },
    { href: "/activity", icon: Heart, match: (p) => p.startsWith("/activity"), badge: true },
    { href: `/profile/${myUsername || ""}`, icon: User, match: (p) => p.startsWith("/profile/" + myUsername) },
  ];
  return (
    <div className="sticky bottom-0 bg-paper border-t border-hairline flex justify-around py-2.5 pb-3">
      {items.map(({ href, icon: Icon, match, badge }) => {
        const active = match(pathname);
        return (
          <Link key={href} href={href} className="p-1.5 relative" aria-label={href}>
            <Icon size={23} color={active ? "#FF6B35" : "#1C1A17"} strokeWidth={1.6} fill={active && Icon === Heart ? "#FF6B35" : "none"} />
            {badge && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-amber text-white text-[9px] rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
