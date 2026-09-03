import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SquarePen } from "lucide-react";
import Avatar from "@/components/Avatar";

export default async function InboxPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: directConvos } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, created_at, last_read_a, last_read_b, is_group, name")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  const oneOnOne = (directConvos || []).filter((c) => !c.is_group);

  const otherIds = oneOnOne.map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
  const { data: profiles } = otherIds.length
    ? await supabase.from("profiles").select("id, username, avatar_url").in("id", otherIds)
    : { data: [] };

  const { data: myGroupRows } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  const groupIds = (myGroupRows || []).map((r) => r.conversation_id);
  const { data: groupConvos } = groupIds.length
    ? await supabase.from("conversations").select("id, created_at, is_group, name, avatar_url").in("id", groupIds).eq("is_group", true)
    : { data: [] };

  const { data: groupParticipantRows } = (groupConvos || []).length
    ? await supabase
        .from("conversation_participants")
        .select("conversation_id, profiles!user_id(id, username, avatar_url)")
        .in("conversation_id", (groupConvos || []).map((g) => g.id))
    : { data: [] };

  const allConvoIds = [...oneOnOne.map((c) => c.id), ...(groupConvos || []).map((c) => c.id)];
  const { data: lastMessages } = allConvoIds.length
    ? await supabase.from("messages").select("conversation_id, text, media_type, sender_id, created_at, shared_post_id, view_once, viewed_at").in("conversation_id", allConvoIds).order("created_at", { ascending: false })
    : { data: [] };

  const getPreviewText = (message, currentUserId) => {
    if (!message) return "Say hello";
    
    const prefix = message.sender_id === currentUserId ? "You: " : "";
    
    if (message.text && message.media_type !== "sticker") {
      return prefix + message.text;
    }
    
    if (message.shared_post_id) {
      return prefix + "Sent a post";
    }
    
    switch (message.media_type) {
      case "voice":
        return prefix + "Sent a voice note";
      case "gif":
        return prefix + "Sent a GIF";
      case "sticker":
        return prefix + "Sent a sticker";
      case "image":
        return prefix + "Sent a photo";
      case "video":
        return prefix + "Sent a video";
      default:
        return prefix + "Sent a message";
    }
  };

  const enrichedDirect = oneOnOne.map((c) => {
    const otherId = c.user_a === user.id ? c.user_b : c.user_a;
    const other = (profiles || []).find((p) => p.id === otherId);
    const last = (lastMessages || []).find((m) => m.conversation_id === c.id);
    const myLastRead = c.user_a === user.id ? c.last_read_a : c.last_read_b;
    const unread = last && last.sender_id !== user.id && new Date(last.created_at) > new Date(myLastRead);
    return { id: c.id, isGroup: false, other, last, unread, sortTime: last?.created_at || c.created_at };
  });

  const enrichedGroups = (groupConvos || []).map((g) => {
    const members = (groupParticipantRows || [])
      .filter((r) => r.conversation_id === g.id)
      .map((r) => r.profiles)
      .filter((p) => p && p.id !== user.id);
    const last = (lastMessages || []).find((m) => m.conversation_id === g.id);
    const myLastRead = (myGroupRows || []).find((r) => r.conversation_id === g.id)?.last_read_at;
    const unread = last && last.sender_id !== user.id && new Date(last.created_at) > new Date(myLastRead || 0);
    return {
      id: g.id,
      isGroup: true,
      groupName: g.name || members.map((m) => m.username).join(", "),
      groupAvatarUrl: g.avatar_url,
      members,
      last,
      unread,
      sortTime: last?.created_at || g.created_at,
    };
  });

  const enriched = [...enrichedDirect, ...enrichedGroups].sort(
    (a, b) => new Date(b.sortTime) - new Date(a.sortTime)
  );

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
        <div className="font-display italic text-[17px]">Messages</div>
        <Link href="/messages/new"><SquarePen size={20} /></Link>
      </div>
      {enriched.length === 0 && (
        <div className="px-4 py-10 text-center text-inksoft text-sm">
          No conversations yet. Tap the icon above to start one.
        </div>
      )}
      {enriched.map((c) =>
        c.isGroup ? (
          <Link key={c.id} href={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-hairline">
            {c.groupAvatarUrl ? (
              <img src={c.groupAvatarUrl} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="flex -space-x-3 w-11 flex-shrink-0">
                {c.members.slice(0, 2).map((m) => (
                  <Avatar
                    key={m.id}
                    username={m.username}
                    avatarUrl={m.avatar_url}
                    size={32}
                    className="border-2 border-paper"
                  />
                ))}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className={`text-[13.5px] truncate ${c.unread ? "font-bold" : "font-semibold"}`}>{c.groupName}</div>
              <div className={`text-xs truncate ${c.unread ? "font-bold text-ink" : "text-inksoft"}`}>
                {getPreviewText(c.last, user.id)}
              </div>
            </div>
            {c.unread && <div className="w-2.5 h-2.5 rounded-full bg-amber flex-shrink-0" />}
          </Link>
        ) : (
          <Link key={c.id} href={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-hairline">
            <Avatar username={c.other?.username} avatarUrl={c.other?.avatar_url} size={44} />
            <div className="flex-1 min-w-0">
              <div className={`text-[13.5px] ${c.unread ? "font-bold" : "font-semibold"}`}>{c.other?.username}</div>
              <div className={`text-xs truncate ${c.unread ? "font-bold text-ink" : "text-inksoft"}`}>
                {getPreviewText(c.last, user.id)}
              </div>
            </div>
            {c.unread && <div className="w-2.5 h-2.5 rounded-full bg-amber flex-shrink-0" />}
          </Link>
        )
      )}
    </div>
  );
}
