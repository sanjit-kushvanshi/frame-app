import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function InboxPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, created_at")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const otherIds = (conversations || []).map((c) => (c.user_a === user.id ? c.user_b : c.user_a));

  const { data: profiles } = otherIds.length
    ? await supabase.from("profiles").select("id, username, avatar_url").in("id", otherIds)
    : { data: [] };

  const convoIds = (conversations || []).map((c) => c.id);
  const { data: lastMessages } = convoIds.length
    ? await supabase.from("messages").select("conversation_id, text, sender_id, created_at").in("conversation_id", convoIds).order("created_at", { ascending: false })
    : { data: [] };

  const enriched = (conversations || []).map((c) => {
    const otherId = c.user_a === user.id ? c.user_b : c.user_a;
    const other = (profiles || []).find((p) => p.id === otherId);
    const last = (lastMessages || []).find((m) => m.conversation_id === c.id);
    return { ...c, other, last };
  });

  return (
    <div>
      <div className="px-4 py-3 border-b border-hairline font-display italic text-[17px]">Messages</div>
      {enriched.length === 0 && (
        <div className="px-4 py-10 text-center text-inksoft text-sm">
          No conversations yet. Visit a profile and tap Message.
        </div>
      )}
      {enriched.map((c) => (
        <Link key={c.id} href={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-hairline">
          <img
            src={c.other?.avatar_url || `https://picsum.photos/seed/${c.other?.username}/200/200`}
            alt=""
            className="w-11 h-11 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13.5px]">{c.other?.username}</div>
            <div className="text-inksoft text-xs truncate">
              {c.last ? (c.last.sender_id === user.id ? "You: " : "") + c.last.text : "Say hello"}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
