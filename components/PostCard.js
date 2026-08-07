"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CommentsSheet from "@/components/CommentsSheet";
import ShareSheet from "@/components/ShareSheet";

export default function PostCard({ post, currentUserId }) {
  const supabase = createClient();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.savedByMe);
  const [comments, setComments] = useState(post.comments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const lastTap = useRef(0);

  const toggleLike = async () => {
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase.from("likes").delete().eq("user_id", currentUserId).eq("post_id", post.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from("likes").insert({ user_id: currentUserId, post_id: post.id });
    }
  };

  const toggleSave = async () => {
    if (saved) {
      setSaved(false);
      await supabase.from("saves").delete().eq("user_id", currentUserId).eq("post_id", post.id);
    } else {
      setSaved(true);
      await supabase.from("saves").insert({ user_id: currentUserId, post_id: post.id });
    }
  };

  const handleImgTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) toggleLike();
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
    }
    lastTap.current = now;
  };

  const addComment = async (text) => {
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, user_id: currentUserId, text })
      .select("id, text, user_id, profiles(username)")
      .single();
    if (!error && data) setComments((c) => [...c, data]);
  };

  return (
    <div className="border-b border-hairline pb-3.5">
      <Link href={`/profile/${post.profiles?.username}`} className="flex items-center gap-2.5 px-4 pt-3 pb-2.5">
        <img
          src={post.profiles?.avatar_url || `https://picsum.photos/seed/${post.profiles?.username}/200/200`}
          alt=""
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="leading-tight">
          <div className="font-semibold text-[13.5px]">{post.profiles?.username}</div>
          {post.location && <div className="font-mono text-[10.5px] text-inksoft">{post.location}</div>}
        </div>
      </Link>

      <div className="relative" onClick={handleImgTap}>
        <img src={post.image_url} alt={post.caption} className="w-full block aspect-square object-cover" draggable={false} />
        <div className="absolute top-2.5 left-2.5 font-mono text-[11px] text-white bg-[rgba(28,26,23,0.55)] px-[7px] py-[3px] rounded backdrop-blur-sm">
          No.{String(post.frame_no).padStart(3, "0")}
        </div>
        {burst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-heart-pop">
            <Heart size={90} color="#fff" fill="#fff" strokeWidth={1} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 pt-2.5">
        <div className="flex gap-4">
          <button onClick={toggleLike} aria-label="Like">
            <Heart size={24} color={liked ? "#FF6B35" : "#1C1A17"} fill={liked ? "#FF6B35" : "none"} strokeWidth={1.6} />
          </button>
          <button onClick={() => setCommentsOpen(true)} aria-label="Comment">
            <MessageCircle size={24} color="#1C1A17" strokeWidth={1.6} />
          </button>
          <button onClick={() => setShareOpen(true)} aria-label="Share">
            <Send size={22} color="#1C1A17" strokeWidth={1.6} />
          </button>
        </div>
        <button onClick={toggleSave} aria-label="Save">
          <Bookmark size={22} color="#1C1A17" fill={saved ? "#1C1A17" : "none"} strokeWidth={1.6} />
        </button>
      </div>

      <div className="px-4 pt-2 font-mono text-[12.5px]">{likeCount.toLocaleString()} prints liked</div>
      {post.caption && (
        <div className="px-4 pt-1 text-[13.5px]">
          <span className="font-semibold">{post.profiles?.username}</span> {post.caption}
        </div>
      )}
      {comments.length > 0 && (
        <button onClick={() => setCommentsOpen(true)} className="block px-4 pt-1.5 font-mono text-[11.5px] text-inksoft">
          View all {comments.length} note{comments.length > 1 ? "s" : ""}
        </button>
      )}

      <CommentsSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} comments={comments} onAddComment={addComment} />
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} post={post} currentUserId={currentUserId} />
    </div>
  );
}
