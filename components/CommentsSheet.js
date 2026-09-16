"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CornerUpLeft, Trash2, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import Sheet from "@/components/Sheet";

function renderTextWithMentions(text, onMentionClick) {
  const parts = text.split(/(@[a-zA-Z0-9_.]+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span
        key={i}
        className="font-semibold cursor-pointer active:opacity-60"
        style={{ color: "#FF6B35" }}
        onClick={(e) => {
          e.stopPropagation();
          onMentionClick(part.slice(1));
        }}
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function CommentsSheet({ open, onClose, comments, onAddComment, onDeleteComment, currentUserId, highlightCommentId = null }) {
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [flashId, setFlashId] = useState(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!open || !highlightCommentId) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`comment-${highlightCommentId}`);
      if (el && scrollRef.current) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setFlashId(highlightCommentId);
        setTimeout(() => setFlashId(null), 2200);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [open, highlightCommentId, comments]);

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesFor = (parentId) => comments.filter((c) => c.parent_id === parentId);

  const startReply = (parentId, username) => {
    setReplyingTo({ id: parentId, username });
    setText(`@${username} `);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setText("");
  };

  const submit = async () => {
    if (!text.trim()) return;
    await onAddComment(text.trim(), replyingTo?.id || null);
    setText("");
    setReplyingTo(null);
  };

  const handleDelete = async (id) => {
    setDeleteError("");
    const result = await onDeleteComment(id);
    if (result?.error) setDeleteError("Couldn't delete that note. Try again.");
  };

  const goToProfile = (username) => {
    if (!username) return;
    onClose();
    router.push(`/profile/${username}`);
  };

  const renderComment = (c, isReply) => {
    const username = c.profiles?.username;
    const isFlashing = flashId === c.id;
    return (
      <div
        key={c.id}
        id={`comment-${c.id}`}
        className={`py-2.5 rounded-lg transition-colors duration-700 ${isReply ? "ml-9 border-l border-hairline pl-3" : ""}`}
        style={isFlashing ? { backgroundColor: "rgba(255,107,53,0.15)" } : undefined}
      >
        <div className="flex items-start gap-2.5">
          <Avatar
            username={username}
            avatarUrl={c.profiles?.avatar_url}
            size={32}
            className="active:opacity-60 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              goToProfile(username);
            }}
          />
          <div className="flex-1 min-w-0">
            <span
              className="font-semibold text-[13.5px] cursor-pointer active:opacity-60"
              onClick={(e) => {
                e.stopPropagation();
                goToProfile(username);
              }}
            >
              {username}
            </span>
            <div className="text-[13.5px] mt-0.5">{renderTextWithMentions(c.text, goToProfile)}</div>
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => startReply(isReply ? c.parent_id : c.id, username)}
                className="flex items-center gap-1 text-[11px] text-inksoft font-mono"
              >
                <CornerUpLeft size={11} /> Reply
              </button>
              {c.user_id === currentUserId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="flex items-center gap-1 text-[11px] text-amber font-mono"
                >
                  <Trash2 size={11} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Notes" maxHeight="72%">
      {deleteError && (
        <div className="px-4 py-1.5 text-[11px] font-mono text-amber bg-paperdim flex-shrink-0">{deleteError}</div>
      )}

      <div ref={scrollRef} className="overflow-y-auto px-4 py-2 flex-1 min-h-0">
        {topLevel.length === 0 && (
          <div className="text-inksoft text-sm py-6 text-center">No notes yet. Say something about this frame.</div>
        )}
        {topLevel.map((c) => (
          <div key={c.id}>
            {renderComment(c, false)}
            {repliesFor(c.id).map((r) => renderComment(r, true))}
          </div>
        ))}
      </div>

      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-hairline bg-paperdim flex-shrink-0">
          <span className="text-[11px] font-mono text-inksoft">Replying to @{replyingTo.username}</span>
          <button onClick={cancelReply}>
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex gap-2 p-3 border-t border-hairline flex-shrink-0">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a note..."
          className="flex-1 border border-hairline rounded-full px-3.5 py-2.5 text-[13px] bg-white outline-none"
        />
        <button
          onClick={submit}
          className="border-none rounded-full px-4 text-white text-[13px] font-semibold"
          style={{ background: text.trim() ? "#FF6B35" : "#DCD6C8" }}
        >
          Post
        </button>
      </div>
    </Sheet>
  );
}
