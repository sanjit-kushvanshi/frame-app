export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PostCard from "@/components/PostCard";

export default async function SinglePostPage({ params, searchParams }) {
  const { id } = params;
  const commentId = searchParams?.comment || null;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: post } = await supabase
    .from("posts")
    .select("id, image_url, caption, location, created_at, user_id, media_type, profiles!user_id(username, avatar_url)")
    .eq("id", id)
    .single();

  if (!post) {
    return (
      <div className="px-8 py-16 text-center font-mono text-sm text-inksoft">
        This frame doesn't exist anymore.
      </div>
    );
  }

  const [{ data: likes }, { data: saves }, { data: comments }, { count: newerCount }] = await Promise.all([
    supabase.from("likes").select("post_id, user_id").eq("post_id", post.id),
    supabase.from("saves").select("post_id, user_id").eq("user_id", user.id).eq("post_id", post.id),
    supabase.from("comments").select("id, post_id, text, user_id, parent_id, profiles!user_id(username)").eq("post_id", post.id),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("is_reel", false)
      .gt("created_at", post.created_at),
  ]);

  const enrichedPost = {
    ...post,
    likeCount: (likes || []).length,
    likedByMe: (likes || []).some((l) => l.user_id === user.id),
    savedByMe: (saves || []).length > 0,
    comments: comments || [],
    frame_no: (newerCount || 0) + 1,
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 pl-2 pr-4 pt-3 pb-1">
        <Link href="/" aria-label="Back" className="p-2 text-ink">
          <ChevronLeft size={22} strokeWidth={1.8} />
        </Link>
        <div className="font-mono text-[11px] text-inksoft uppercase tracking-wide">Frame</div>
      </div>
      <PostCard
        post={enrichedPost}
        currentUserId={user.id}
        autoOpenComments={!!commentId}
        highlightCommentId={commentId}
      />
    </div>
  );
}
