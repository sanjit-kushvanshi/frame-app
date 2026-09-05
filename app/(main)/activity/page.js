import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Avatar from "@/components/Avatar";

export default async function ActivityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, actor_id, post_id, comment_id, excerpt, read, created_at, profiles!notifications_actor_id_fkey(username, avatar_url)")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  await supabase.from("notifications").update({ read: true }).eq("recipient_id", user.id).eq("read", false);

  const labelFor = (n) => {
    if (n.type === "follow") return "started following you";
    if (n.type === "like") return "liked your frame";
    if (n.type === "story_like") return "liked your story";
    if (n.type === "comment") return `left a note: "${n.excerpt}"`;
    if (n.type === "mention") return `mentioned you: "${n.excerpt}"`;
    return "";
  };

  const hrefFor = (n) => {
    if (n.type === "follow" || n.type === "story_like") return `/profile/${n.profiles?.username}`;
    if (n.type === "like" && n.post_id) return `/post/${n.post_id}`;
    if ((n.type === "comment" || n.type === "mention") && n.post_id) {
      return n.comment_id ? `/post/${n.post_id}?comment=${n.comment_id}` : `/post/${n.post_id}`;
    }
    return "/";
  };

  return (
    <div className="p-4">
      <div className="font-mono text-[11px] text-inksoft uppercase tracking-wide mb-2.5">Activity</div>
      {(!notifications || notifications.length === 0) && (
        <div className="text-inksoft text-sm py-10 text-center">No activity yet.</div>
      )}
      {(notifications || []).map((n) => (
        <Link
          key={n.id}
          href={hrefFor(n)}
          className={`flex items-center gap-2.5 py-2.5 ${!n.read ? "font-semibold" : ""}`}
        >
          <Avatar username={n.profiles?.username} avatarUrl={n.profiles?.avatar_url} size={36} className="flex-shrink-0" />
          <div className="text-[13px]">
            <span className="font-semibold">{n.profiles?.username}</span> {labelFor(n)}
          </div>
        </Link>
      ))}
    </div>
  );
}
