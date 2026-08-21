"use client";
import { useState } from "react";
import { X, CornerUpLeft, Trash2 } from "lucide-react";

export default function CommentsSheet({ open, onClose, comments, onAddComment, onDeleteComment, currentUserId }) {
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // { id, username }

  if (!open) return null;

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesFor = (parentId) => comments.filter((c) => c.parent_id === parentId);

  const submit = () => {
    if (!text.trim()) return;
    onAddComment(text.trim(), replyingTo?.id || null);
    setText("");
    setReplyingTo(null);
  };

  const renderComment = (c, isReply) => (
    <div key={c.id} className={`py-2 text-[13.5px] ${isReply ? "ml-7 border-l border-hairline pl-3" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <span className="font-semibold">{c.profiles?.username}</span> {c.text}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={() => setReplyingTo({ id: isReply ? c.parent_id : c.id, username: c.profiles?.username })}
          className="flex items-center gap-1 text-[11px] text-inksoft font-mono"
        >
          <CornerUpLeft size={11} /> Reply
        </button>
        {c.user_id === currentUserId && (
          <button
            onClick={() => onDeleteComment(c.id)}
            className="flex items-center gap-1 text-[11px] text-amber font-mono"
          >
            <Trash2 size={11} /> Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[rgba(28,26,23,0.5)] z-50 flex items-end" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-paper w-full max-h-[72%] rounded-t-2xl flex flex-col">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-hairline" />
        </div>
        <div className="flex justify-between items-center px-4 pb-3 pt-1.5 border-b border-hairline">
          <span className="font-semibold text-sm">Notes</span>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-4 py-2 flex-1">
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
          <div className="flex items-center justify-between px-4 py-1.5 border-t border-hairline bg-paperdim">
            <span className="text-[11px] font-mono text-inksoft">Replying to @{replyingTo.username}</span>
            <button onClick={() => setReplyingTo(null)}><X size={13} /></button>
          </div>
        )}
        <div className="flex gap-2 p-3 border-t border-hairline">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a note..."}
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
      </div>
    </div>
  );
}
