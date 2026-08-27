"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Send, X, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CommentsSheet from "@/components/CommentsSheet";
import ShareSheet from "@/components/ShareSheet";

export default function PostCard({ post, currentUserId, onPostDeleted }) {
  const supabase = createClient();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.savedByMe);
  const [comments, setComments] = useState(post.comments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const lastTap = useRef(0);
  const tapTimeout = useRef(null);

  const isVideo = post.media_type === "video";
  const isOwner = post.user_id === currentUserId;

  const [caption, setCaption] = useState(post.caption);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

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
      clearTimeout(tapTimeout.current);
      if (!liked) toggleLike();
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
    } else {
      tapTimeout.current = setTimeout(() => {
        setPreviewOpen(true);
      }, 280);
    }
    lastTap.current = now;
  };

  const addComment = async (text, parentId) => {
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, user_id: currentUserId, text, parent_id: parentId || null })
      .select("id, text, user_id, parent_id, profiles(username)")
      .single();
    if (!error && data) setComments((c) => [...c, data]);
  };

  const deleteComment = async (id) => {
    const { error } = await supabase.from("comments").delete().eq("id", id).eq("user_id", currentUserId);
    if (!error) {
      // remove the comment and any replies under it (mirrors the DB's ON DELETE CASCADE)
      setComments((c) => c.filter((cm) => cm.id !== id && cm.parent_id !== id));
    } else {
      console.error("Delete comment failed:", error.message);
    }
    return { error };
  };

  const startEdit = () => {
    setEditCaption(caption || "");
    setIsEditing(true);
    setMenuOpen(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditCaption(caption || "");
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    const { error } = await supabase
      .from("posts")
      .update({ caption: editCaption })
      .eq("id", post.id)
      .eq("user_id", currentUserId);
    setSavingEdit(false);
    if (!error) {
      setCaption(editCaption);
      setIsEditing(false);
    } else {
      console.error("Edit post failed:", error.message);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", currentUserId);
    setDeleting(false);
    if (!error) {
      setConfirmDeleteOpen(false);
      setIsDeleted(true);
      onPostDeleted?.(post.id);
    } else {
      console.error("Delete post failed:", error.message);
    }
  };

  if (isDeleted) return null;

  return (
    <div className="border-b border-hairline pb-3.5">
      <div className="flex items-center justify-between pl-4 pr-2.5 pt-3 pb-2.5">
        <Link href={`/profile/${post.profiles?.username}`} className="flex items-center gap-2.5">
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
        {isOwner && (
          <button onClick={() => setMenuOpen(true)} aria-label="Post options" className="text-ink p-1.5">
            <MoreHorizontal size={20} strokeWidth={1.6} />
          </button>
        )}
      </div>

      <div className="relative" onClick={handleImgTap}>
        {isVideo ? (
          <video src={post.image_url} controls playsInline className="w-full block aspect-square object-cover" onClick={(e) => e.stopPropagation()} />
        ) : (
          <img src={post.image_url} alt={caption} className="w-full block aspect-square object-cover" draggable={false} />
        )}
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
          <button onClick={toggleLike} aria-label="Like" className={liked ? "text-amber" : "text-ink"}>
            <Heart size={24} fill={liked ? "currentColor" : "none"} strokeWidth={1.6} />
          </button>
          <button onClick={() => setCommentsOpen(true)} aria-label="Comment" className="text-ink">
            <MessageCircle size={24} strokeWidth={1.6} />
          </button>
          <button onClick={() => setShareOpen(true)} aria-label="Share" className="text-ink">
            <Send size={22} strokeWidth={1.6} />
          </button>
        </div>
        <button onClick={toggleSave} aria-label="Save" className="text-ink">
          <Bookmark size={22} fill={saved ? "currentColor" : "none"} strokeWidth={1.6} />
        </button>
      </div>

      <div className="px-4 pt-2 font-mono text-[12.5px]">{likeCount.toLocaleString()} prints liked</div>

      {isEditing ? (
        <div className="px-4 pt-2">
          <textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            rows={2}
            autoFocus
            className="w-full bg-paperdim border border-hairline rounded-lg px-2.5 py-2 text-[13.5px] resize-none focus:outline-none"
          />
          <div className="flex gap-3 pt-1.5">
            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="font-mono text-[11.5px] text-amber font-semibold disabled:opacity-50"
            >
              {savingEdit ? "Saving…" : "Save"}
            </button>
            <button onClick={cancelEdit} className="font-mono text-[11.5px] text-inksoft">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        caption && (
          <div className="px-4 pt-1 text-[13.5px]">
            <span className="font-semibold">{post.profiles?.username}</span> {caption}
          </div>
        )
      )}

      {comments.length > 0 && (
        <button onClick={() => setCommentsOpen(true)} className="block px-4 pt-1.5 font-mono text-[11.5px] text-inksoft">
          View all {comments.length} note{comments.length > 1 ? "s" : ""}
        </button>
      )}

      <CommentsSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        comments={comments}
        onAddComment={addComment}
        onDeleteComment={deleteComment}
        currentUserId={currentUserId}
      />
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} post={post} currentUserId={currentUserId} />

      {previewOpen && !isVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            onClick={() => setPreviewOpen(false)}
            aria-label="Close preview"
            className="absolute top-4 right-4 text-white p-2"
          >
            <X size={26} strokeWidth={1.6} />
          </button>
          <img
            src={post.image_url}
            alt={caption}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setMenuOpen(false)}>
          <div className="w-full bg-paper rounded-t-2xl overflow-hidden pb-safe" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={startEdit}
              className="w-full flex items-center gap-2.5 px-4 py-3.5 border-b border-hairline text-[14px]"
            >
              <Pencil size={18} strokeWidth={1.6} />
              Edit caption
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                setConfirmDeleteOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3.5 border-b border-hairline text-[14px] text-red-500"
            >
              <Trash2 size={18} strokeWidth={1.6} />
              Delete post
            </button>
            <button onClick={() => setMenuOpen(false)} className="w-full px-4 py-3.5 text-[14px] font-semibold">
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6" onClick={() => setConfirmDeleteOpen(false)}>
          <div className="w-full max-w-xs bg-paper rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 pt-4 pb-3 text-center">
              <div className="text-[14px] font-semibold">Delete this post?</div>
              <div className="text-[12.5px] text-inksoft pt-1">This can't be undone.</div>
            </div>
            <div className="flex border-t border-hairline">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="flex-1 py-3 text-[14px] border-r border-hairline"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 text-[14px] font-semibold text-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
