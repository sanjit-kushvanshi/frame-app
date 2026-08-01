import { createClient } from "@/lib/supabase/server";

export default async function ActivityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: myPosts } = await supabase.from("posts").select("id").eq("user_id", user.id);
  const myPostIds = (myPosts || []).map((p) => p.id);

  const [{ data: likes }, { data: comments }] = await Promise.all([
    myPostIds.length
      ? supabase.from("likes").select("post_id, user_id, created_at, profiles(username, avatar_url)").in("post_id", myPostIds).neq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
      : { data: [] },
    myPostIds.length
      ? supabase.from("comments").select("post_id, user_id, text, created_at, profiles(username, avatar_url)").in("post_id", myPostIds).neq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
      : { data: [] },
  ]);

  const events = [
    ...(likes || []).map((l) => ({ ...l, type: "like" })),
    ...(comments || []).map((c) => ({ ...c, type: "comment" })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="p-4">
      <div className="font-mono text-[11px] text-inksoft uppercase tracking-wide mb-2.5">Recent activity</div>
      {events.length === 0 && (
        <div className="text-inksoft text-sm py-10 text-center">No activity yet on your frames.</div>
      )}
      {events.map((e, i) => (
        <div key={i} className="flex items-center gap-2.5 py-2">
          <img
            src={e.profiles?.avatar_url || `https://picsum.photos/seed/${e.profiles?.username}/200/200`}
            alt=""
            className="w-8.5 h-8.5 rounded-full object-cover"
            style={{ width: 34, height: 34 }}
          />
          <div className="text-[13px]">
            <span className="font-semibold">{e.profiles?.username}</span>{" "}
            {e.type === "like" ? "liked your frame" : `left a note: "${e.text}"`}
          </div>
        </div>
      ))}
    </div>
  );
}
