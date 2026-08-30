export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard";

export default async function SinglePostPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: post } = await supabase
    .from("posts")
    .select("id, image_url, caption, location, created_at, user_id, media_type, profiles!user_id(username, avatar_url)")
    .eq("id", params.postId)
    .maybeSingle();

  if (!post) notFound();

  const [{ data: likes }, { data: saves }, { data: comments }] = await Promise.all([
    supabase.from("likes").select("post_id, user_id").eq("post_id", post.id),
    supabase.from("saves").select("post_id, user_id").eq("user_id", user.id).eq("post_id", post.id),
    supabase.from("comments").select("id, post_id, text, user_id, profiles!user_id(username, avatar_url)").eq("post_id", post.id),
  ]);

  const enriched = {
    ...post,
    frame_no: 1,
    likeCount: (likes || []).length,
    likedByMe: (likes || []).some((l) => l.user_id === user.id),
    savedByMe: (saves || []).length > 0,
    comments: comments || [],
  };

  return (
    <div>
      <div className="px-4 py-3 border-b border-hairline font-display italic text-[17px]">Frame</div>
      <PostCard post={enriched} currentUserId={user.id} />
    </div>
  );
}
