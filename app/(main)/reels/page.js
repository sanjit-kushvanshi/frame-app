export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import ReelsFeed from "@/components/ReelsFeed";

export default async function ReelsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, image_url, caption, location, created_at, user_id, profiles!user_id(username, avatar_url)")
    .eq("is_reel", true)
    .order("created_at", { ascending: false });

  const postIds = (posts || []).map((p) => p.id);

  const [{ data: likes }, { data: comments }] = await Promise.all([
    postIds.length ? supabase.from("likes").select("post_id, user_id").in("post_id", postIds) : { data: [] },
    postIds.length
      ? supabase.from("comments").select("id, post_id, text, user_id, parent_id, profiles(username)").in("post_id", postIds)
      : { data: [] },
  ]);

  const enriched = (posts || []).map((p) => ({
    ...p,
    likeCount: (likes || []).filter((l) => l.post_id === p.id).length,
    likedByMe: (likes || []).some((l) => l.post_id === p.id && l.user_id === user.id),
    comments: (comments || []).filter((c) => c.post_id === p.id),
  }));

  return <ReelsFeed posts={enriched} currentUserId={user.id} />;
}
