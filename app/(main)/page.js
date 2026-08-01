import { createClient } from "@/lib/supabase/server";
import StoriesRow from "@/components/StoriesRow";
import PostCard from "@/components/PostCard";

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, image_url, caption, location, created_at, user_id, profiles(username, avatar_url)")
    .order("created_at", { ascending: false });

  const postIds = (posts || []).map((p) => p.id);

  const [{ data: likes }, { data: saves }, { data: comments }, { data: people }] = await Promise.all([
    postIds.length ? supabase.from("likes").select("post_id, user_id").in("post_id", postIds) : { data: [] },
    postIds.length ? supabase.from("saves").select("post_id, user_id").eq("user_id", user.id).in("post_id", postIds) : { data: [] },
    postIds.length
      ? supabase.from("comments").select("id, post_id, text, user_id, profiles(username)").in("post_id", postIds)
      : { data: [] },
    supabase.from("profiles").select("id, username, avatar_url").neq("id", user.id).limit(12),
  ]);

  const total = (posts || []).length;
  const enriched = (posts || []).map((p, i) => ({
    ...p,
    frame_no: total - i,
    likeCount: (likes || []).filter((l) => l.post_id === p.id).length,
    likedByMe: (likes || []).some((l) => l.post_id === p.id && l.user_id === user.id),
    savedByMe: (saves || []).some((s) => s.post_id === p.id),
    comments: (comments || []).filter((c) => c.post_id === p.id),
  }));

  return (
    <div>
      <StoriesRow people={people} />
      {enriched.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={user.id} />
      ))}
      {enriched.length === 0 && (
        <div className="px-8 py-16 text-center font-mono text-sm text-inksoft">
          No frames yet. Be the first to develop one.
        </div>
      )}
    </div>
  );
}
