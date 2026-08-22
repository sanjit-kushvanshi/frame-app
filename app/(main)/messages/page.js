import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function InboxPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: conversations, error: convoError } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, created_at, last_read_a, last_read_b")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  if (convoError) {
    return (
      <div className="px-4 py-6">
        <div className="font-display italic text-[17px] mb-4">Messages</div>
        <div className="text-xs font-mono text-amber border border-hairline rounded-lg p-3 whitespace-pre-wrap">
          DEBUG ERROR: {JSON.stringify(convoError, null, 2)}
        </div>
      </div>
    );
  }

  const otherIds = (conversations || []).map((c) => (c.user_a === user.id ? c.user_b : c.user_a));

  const { data: profiles } = otherIds.length
    ? await supabase.from("profiles").select("id, username, avatar_url").in("id", otherIds)
    : { data: [] };

  const convoIds = (conversations || []).map((c) => c.id);
  const { data: lastMessages } = convoIds.length
    ? await supabase.from("messages").select("conversation_id, text, media_type, sender_id, created_at").in("conversation_id", convoIds).order("created_at", { ascending: false })
    : { data: [] };

  const enriched = (conversations || [])
    .map((c) => {
      const otherId = c.user_a === user.id ? c.user_b : c.user_a;
      const other = (profiles || []).find((p) => p.id === otherId);
      const last = (lastMessages || []).find((m) => m.conversation_id === c.id);
      const myLastRead = c.user_a === user.id ? c.last_read_a : c.last_read_b;
      const unread = last && last.sender_id !== user.id && new Date(last.created_at) > new Date(myLastRead);
      return { ...c, other, last, unread };
    })
    .sort((a, b) => new Date(b.last?.created_at || b.created_at) - new Date(a.last?.created_at || a.created_at));

  return (
    <div>
      <div className="px-4 py-3 border-b border-hairline font-display italic text-[17px]">Messages</div>
      <div className="px-4 py-2 text-[10px] font-mono text-inksoft">
        DEBUG: found {conversations?.length || 0} conversations, user: {user.id}
      </div>
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
            <div className={`text-[13.5px] ${c.unread ? "font-bold" : "font-semibold"}`}>{c.other?.username}</div>
            <div className={`text-xs truncate ${c.unread ? "font-bold text-ink" : "text-inksoft"}`}>
              {c.last
                ? (c.last.sender_id === user.id ? "You: " : "") + (c.last.text || (c.last.media_type === "video" ? "Sent a video" : "Sent a photo"))
                : "Say hello"}
            </div>
          </div>
          {c.unread && <div className="w-2.5 h-2.5 rounded-full bg-amber flex-shrink-0" />}
        </Link>
      ))}
    </div>
  );
}
