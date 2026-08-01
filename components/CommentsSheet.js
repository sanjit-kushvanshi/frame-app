"use client";
import { useState } from "react";
import { X } from "lucide-react";

export default function CommentsSheet({ open, onClose, comments, onAddComment }) {
  const [text, setText] = useState("");
  if (!open) return null;
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
          {comments.length === 0 && (
            <div className="text-inksoft text-sm py-6 text-center">No notes yet. Say something about this frame.</div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="py-2 text-[13.5px]">
              <span className="font-semibold">{c.profiles?.username}</span> {c.text}
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-3 border-t border-hairline">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 border border-hairline rounded-full px-3.5 py-2.5 text-[13px] bg-white outline-none"
          />
          <button
            onClick={() => {
              if (!text.trim()) return;
              onAddComment(text.trim());
              setText("");
            }}
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
