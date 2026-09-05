export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import StoriesRow from "@/components/StoriesRow";
import PostCard from "@/components/PostCard";

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from("profiles").select("username, avatar_url").eq("id", user.id).single();

  // Find who the user follows (used for a ranking boost, not a hard filter)
  const { data: followingRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = new Set((followingRows || []).map((f) => f.following_id));

  const { data: posts } = await supabase
    .from("posts")
    .select("id, image_url, caption, location, created_at, user_id, profiles!user_id(username, avatar_url)")
    .eq("is_reel", false)
    .order("created_at", { ascending: false });

  const postIds = (posts || []).map((p) => p.id);

  const [{ data: likes }, { data: saves }, { data: comments }, { data: people }, { data: allStories }] = await Promise.all([
    postIds.length ? supabase.from("likes").select("post_id, user_id").in("post_id", postIds) : { data: [] },
    postIds.length ? supabase.from("saves").select("post_id, user_id").eq("user_id", user.id).in("post_id", postIds) : { data: [] },
    postIds.length
      ? supabase.from("comments").select("id, post_id, text, user_id, parent_id, profiles!user_id(username)").in("post_id", postIds)
      : { data: [] },
    supabase.from("profiles").select("id, username, avatar_url").neq("id", user.id).limit(30),
    supabase
      .from("stories")
      .select("id, user_id, media_url, media_type, created_at, profiles!user_id(username, avatar_url)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true }),
  ]);

  const storyIds = (allStories || []).map((s) => s.id);
  const { data: storyLikes } = storyIds.length
    ? await supabase.from("story_likes").select("story_id, user_id").in("story_id", storyIds)
    : { data: [] };

  const enrichedStories = (allStories || []).map((s) => ({
    ...s,
    likeCount: (storyLikes || []).filter((l) => l.story_id === s.id).length,
    likedByMe: (storyLikes || []).some((l) => l.story_id === s.id && l.user_id === user.id),
  }));

  const myStories = enrichedStories.filter((s) => s.user_id === user.id);
  const otherStoriesByUser = {};
  enrichedStories
    .filter((s) => s.user_id !== user.id)
    .forEach((s) => {
      if (!otherStoriesByUser[s.user_id]) {
        otherStoriesByUser[s.user_id] = { user_id: s.user_id, username: s.profiles?.username, avatar_url: s.profiles?.avatar_url, stories: [] };
      }
      otherStoriesByUser[s.user_id].stories.push(s);
    });
  const storyGroups = Object.values(otherStoriesByUser);

  // --- Feed ranking ---
  // score = recencyScore * (1 + engagementScore) * followBoost
  // - recencyScore decays smoothly over roughly 48 hours (never hits zero, old posts can still surface if popular enough)
  // - engagementScore rewards likes and (more heavily) comments
  // - followBoost gives followed accounts a moderate edge, without making them dominate outright
  const now = Date.now();
  const scored = (posts || []).map((p) => {
    const likeCount = (likes || []).filter((l) => l.post_id === p.id).length;
    const postComments = (comments || []).filter((c) => c.post_id === p.id);
    const commentCount = postComments.length;
    const ageHours = (now - new Date(p.created_at).getTime()) / (1000 * 60 * 60);
    const recencyScore = 1 / (1 + ageHours / 24); // ~0.5 at 24h, ~0.33 at 48h, decays gently after
    const engagementScore = likeCount * 0.08 + commentCount * 0.15;
    const isFollowedOrSelf = followingIds.has(p.user_id) || p.user_id === user.id;
    const followBoost = isFollowedOrSelf ? 1.4 : 1;
    const score = recencyScore * (1 + engagementScore) * followBoost;

    return {
      ...p,
      likeCount,
      likedByMe: (likes || []).some((l) => l.post_id === p.id && l.user_id === user.id),
      savedByMe: (saves || []).some((s) => s.post_id === p.id),
      comments: postComments,
      _score: score,
    };
  });

  scored.sort((a, b) => b._score - a._score);

  const total = scored.length;
  const enriched = scored.map((p, i) => ({
    ...p,
    frame_no: total - i,
  }));

  return (
    <div>
      <StoriesRow myUsername={myProfile?.username} myAvatar={myProfile?.avatar_url} myStories={myStories} groups={storyGroups} currentUserId={user.id} />
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
