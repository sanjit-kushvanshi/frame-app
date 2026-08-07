"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ShareSheet({ open, onClose, post, currentUserId }) {
  const supabase = createClient();
  const router = useRouter();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);
  const [sentTo, setSentTo] = useState(new Set());

  useEffect(() => {
    if (!open) return;
    setSentTo(new Set());
    (async () => {
      setLoading(true);
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, user_a, user_b")
        .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);

      const otherIds = (conversations || []).map((c) => (c.user_a === currentUserId ? c.user_b : c.user_a));

      const { data: profiles } = otherIds.length
        ? await supabase.from("profiles").select("id, username, avatar_url").in("id", otherIds)
        : { data: [] };

      const merged = (conversations || []).map((c) => {
        const otherId = c.user_a === currentUserId ? c.user_b : c.user_a;
        const profile = (profiles || []).find((p) => p.id === otherId);
        return { conversationId: c.id, otherId, username: profile?.username, avatar_url: profile?.avatar_url };
      });

      setPeople(merged);
      setLoading(false);
    })();
  }, [open, currentUserId, supabase]);

  const shareTo = async (person) => {
    setSendingTo(person.otherId);
    let conversationId = person.conversationId;
    if (!conversationId) {
      const [a, b] = [currentUserId, person.otherId].sort();
      const { data: created } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
      conversationId = created.id;
    }
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      shared_post_id: post.id,
    });
    setSentTo((prev) => new Set(prev).add(person.otherId));
    setSendingTo(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(28,26,23,0.5)] z-50 flex items-end" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-paper w-full max-h-[70%] rounded-t-2xl flex flex-col">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-hairline" />
        </div>
        <div className="flex justify-between items-center px-4 pb-3 pt-1.5 border-b border-hairline">
          <span className="font-semibold text-sm">Share to...</span>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-4 py-2 flex-1">
          {loading && <div className="text-center text-inksoft text-sm py-8">Loading...</div>}
          {!loading && people.length === 0 && (
            <div className="text-center text-inksoft text-sm py-8">No conversations yet. Message someone first.</div>
          )}
          {!loading &&
            people.map((p) => (
              <div key={p.otherId} className="flex items-center gap-3 py-2.5">
                <img
                  src={p.avatar_url || `https://picsum.photos/seed/${p.username}/200/200`}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover"
                />
                <span className="flex-1 text-[13.5px] font-semibold">{p.username}</span>
                <button
                  onClick={() => shareTo(p)}
                  disabled={sendingTo === p.otherId || sentTo.has(p.otherId)}
                  className="rounded-full px-4 py-1.5 text-[12.5px] font-semibold"
                  style={sentTo.has(p.otherId) ? { background: "#DCD6C8", color: "#1C1A17" } : { background: "#FF6B35", color: "#fff" }}
                >
                  {sentTo.has(p.otherId) ? (
                    <span className="flex items-center gap-1">
                      <Check size={13} /> Sent
                    </span>
                  ) : sendingTo === p.otherId ? (
                    "Sending..."
                  ) : (
                    "Send"
                  )}
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
