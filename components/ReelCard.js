"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Volume2, VolumeX, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CommentsSheet from "@/components/CommentsSheet";
import ShareSheet from "@/components/ShareSheet";

export default function ReelCard({ post, currentUserId, isActive, onDeleted }) {
  const supabase = createClient();
  const videoRef = useRef(null);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState(post.comments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isMine = post.user_id === currentUserId;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive]);

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

  const addComment = async (text) => {
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, user_id: currentUserId, text })
      .select("id, text, user_id, profiles(username)")
      .single();
    if (!error && data) setComments((c) => [...c, data]);
  };

  const deleteReel = async () => {
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", currentUserId);
    if (error) {
      alert("Couldn't delete: " + error.message);
      setDeleting(false);
      return;
    }
    onDeleted?.(post.id);
  };

  return (
    <div className="relative w-full h-full snap-start flex-shrink-0 bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={post.image_url}
        loop
        muted={muted}
        playsInline
        onClick={() => setMuted((m) => !m)}
        className="w-full h-full object-contain"
      />

      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isMine && (
          <button onClick={() => setConfirmingDelete(true)} className="text-white bg-black/40 rounded-full p-2" aria-label="Delete reel">
            <Trash2 size={18} />
          </button>
        )}
        <button onClick={() => setMuted((m) => !m)} className="text-white bg-black/40 rounded-full p-2">
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 flex items-end justify-between" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${post.profiles?.username}`} className="flex items-center gap-2 mb-2">
            <img
              src={post.profiles?.avatar_url || `https://picsum.photos/seed/${post.profiles?.username}/200/200`}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-white/40"
            />
            <span className="text-white text-[13px] font-semibold">{post.profiles?.username}</span>
          </Link>
          {post.caption && <div className="text-white text-[13px] leading-snug">{post.caption}</div>}
        </div>

        <div className="flex flex-col items-center gap-4 pl-3 flex-shrink-0">
          <button onClick={toggleLike} className="flex flex-col items-center gap-1">
            <Heart size={26} color="#fff" fill={liked ? "#FF6B35" : "none"} strokeWidth={1.6} />
            <span className="text-white text-[11px] font-mono">{likeCount}</span>
          </button>
          <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-1">
            <MessageCircle size={26} color="#fff" strokeWidth={1.6} />
            <span className="text-white text-[11px] font-mono">{comments.length}</span>
          </button>
          <button onClick={() => setShareOpen(true)} className="flex flex-col items-center gap-1">
            <Send size={24} color="#fff" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <CommentsSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} comments={comments} onAddComment={addComment} />
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} post={post} currentUserId={currentUserId} />

      {confirmingDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setConfirmingDelete(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-2xl p-5 w-full max-w-[300px]">
            <div className="font-semibold text-[15px] mb-1">Delete this reel?</div>
            <div className="text-inksoft text-[13px] mb-4">This can't be undone.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmingDelete(false)} className="flex-1 border border-hairline rounded-lg py-2.5 text-[13px] font-semibold">
                Cancel
              </button>
              <button onClick={deleteReel} disabled={deleting} className="flex-1 bg-amber text-white rounded-lg py-2.5 text-[13px] font-semibold disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
