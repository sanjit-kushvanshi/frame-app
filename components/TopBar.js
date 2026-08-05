"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Send, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function TopBar({ currentUserId }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const myConvoIdsRef = useRef(new Set());

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    if (!currentUserId) return;

    const loadCount = async () => {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, user_a, user_b, last_read_a, last_read_b")
        .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);

      myConvoIdsRef.current = new Set((conversations || []).map((c) => c.id));

      const convoIds = (conversations || []).map((c) => c.id);
      if (convoIds.length === 0) {
        setUnreadCount(0);
        return;
      }

      const { data: lastMessages } = await supabase
        .from("messages")
        .select("conversation_id, sender_id, created_at")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: false });

      let count = 0;
      (conversations || []).forEach((c) => {
        const last = (lastMessages || []).find((m) => m.conversation_id === c.id);
        if (!last) return;
        const myLastRead = c.user_a === currentUserId ? c.last_read_a : c.last_read_b;
        if (last.sender_id !== currentUserId && new Date(last.created_at) > new Date(myLastRead)) {
          count += 1;
        }
      });
      setUnreadCount(count);
    };

    loadCount().catch((err) => setUnreadCount(`ERR:${err.message}`));

    const channel = supabase
      .channel(`msg-badge:${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (payload.new.sender_id === currentUserId) return;
        if (!myConvoIdsRef.current.has(payload.new.conversation_id)) return;
        setUnreadCount((c) => c + 1);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUserId, supabase]);

  useEffect(() => {
    if (pathname.startsWith("/messages")) setUnreadCount(0);
  }, [pathname]);

  return (
    <div className="sticky top-0 z-20 bg-paper border-b border-hairline">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <button onClick={handleLogout} aria-label="Log out" className="text-ink p-1">
          <LogOut size={18} strokeWidth={1.6} />
        </button>
        <div className="font-display italic font-semibold text-2xl">Frame</div>
        <Link href="/messages" aria-label="Messages" className="text-ink p-1 relative">
          <Send size={20} strokeWidth={1.6} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-amber text-white text-[9px] rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
      <div className="flex justify-between px-2.5 pb-1.5">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="w-[5px] h-[5px] rounded-sm bg-hairline" />
        ))}
      </div>
    </div>
  );
}
