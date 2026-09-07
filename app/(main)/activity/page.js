import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Avatar from "@/components/Avatar";

export default async function ActivityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, actor_id, post_id, comment_id, story_id, excerpt, read, created_at, profiles!notifications_actor_id_fkey(username, avatar_url)")
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
    if (n.type === "post_removed") return n.excerpt || "removed one of your posts";
    if (n.type === "account_restricted") return "Your account has been restricted. Tap for details.";
    if (n.type === "account_suspended") return n.excerpt || "suspended your account";
    if (n.type === "account_restored") return n.excerpt || "restored your account";
    return "";
  };

  const hrefFor = (n) => {
    if (n.type === "follow") return `/profile/${n.profiles?.username}`;
    if (n.type === "story_like") return n.story_id ? `/?story=${n.story_id}` : "/";
    if (n.type === "like" && n.post_id) return `/post/${n.post_id}`;
    if ((n.type === "comment" || n.type === "mention") && n.post_id) {
      return n.comment_id ? `/post/${n.post_id}?comment=${n.comment_id}` : `/post/${n.post_id}`;
    }
    if (n.type === "account_restricted") return "/restricted";
    return "/";
  };

  const isModerationNotice = (n) =>
    n.type === "post_removed" ||
    n.type === "account_restricted" ||
    n.type === "account_suspended" ||
    n.type === "account_restored";

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
          {isModerationNotice(n) ? (
            <div className="w-9 h-9 rounded-full bg-amber/15 flex items-center justify-center flex-shrink-0 text-amber text-[15px]">
              ⚠
            </div>
          ) : (
            <Avatar username={n.profiles?.username} avatarUrl={n.profiles?.avatar_url} size={36} className="flex-shrink-0" />
          )}
          <div className="text-[13px]">
            {isModerationNotice(n) ? <span className="font-semibold">Frame</span> : <span className="font-semibold">{n.profiles?.username}</span>}{" "}
            {labelFor(n)}
          </div>
        </Link>
      ))}
    </div>
  );
}
