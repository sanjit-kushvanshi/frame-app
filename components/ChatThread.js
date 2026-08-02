"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, SendHorizontal, ImagePlus, X, Smile, Clapperboard, CornerUpLeft, Pencil, Trash2, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STICKERS = ["❤️", "🔥", "😂", "😍", "👍", "🎉", "😭", "👀", "💀", "✨", "🙏", "😮"];
const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const GIPHY_API_KEY = "fR9MLGSAdqsbgT2S4RXDUoKLEBnHEPqA";

export default function ChatThread({ conversationId, currentUserId, other, initialMessages, initialReactions }) {
  const supabase = createClient();
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [reactions, setReactions] = useState(initialReactions || []);
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [actionSheetFor, setActionSheetFor] = useState(null);
  const [reactPickerOpen, setReactPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    (async () => {
      const { data: convo } = await supabase.from("conversations").select("user_a, user_b").eq("id", conversationId).single();
      if (!convo) return;
      const field = convo.user_a === currentUserId ? "last_read_a" : "last_read_b";
      await supabase.from("conversations").update({ [field]: new Date().toISOString() }).eq("id", conversationId);
    })();
  }, [conversationId, currentUserId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload) => {
        const row = payload.new?.message_id ? payload.new : payload.old;
        if (!messagesRef.current.some((m) => m.id === row.message_id)) return;
        if (payload.eventType === "DELETE") {
          setReactions((prev) => prev.filter((r) => !(r.message_id === row.message_id && r.user_id === row.user_id)));
        } else {
          setReactions((prev) => {
            const withoutOld = prev.filter((r) => !(r.message_id === row.message_id && r.user_id === row.user_id));
            return [...withoutOld, payload.new];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    if (!gifPickerOpen) return;
    const controller = new AbortController();
    const run = async () => {
      setGifLoading(true);
      try {
        const endpoint = gifQuery.trim()
          ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(gifQuery)}&limit=20&rating=pg-13`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=pg-13`;
        const res = await fetch(endpoint, { signal: controller.signal });
        const json = await res.json();
        setGifResults(json.data || []);
      } catch (e) {}
      finally {
        setGifLoading(false);
      }
    };
    const t = setTimeout(run, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [gifQuery, gifPickerOpen]);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    const withPreviews = valid.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("image/") ? "image" : "video",
    }));
    setPendingFiles((prev) => [...prev, ...withPreviews]);
    e.target.value = "";
  };

  const removePending = (i) => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));

  const sendSticker = async (emoji) => {
    setStickerPickerOpen(false);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, text: emoji, media_type: "sticker", reply_to_id: replyingTo?.id || null })
      .select()
      .single();
    setReplyingTo(null);
    if (!error && data) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  };

  const sendGif = async (gifUrl) => {
    setGifPickerOpen(false);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, media_url: gifUrl, media_type: "gif", reply_to_id: replyingTo?.id || null })
      .select()
      .single();
    setReplyingTo(null);
    if (!error && data) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed && pendingFiles.length === 0) return;

    setUploading(true);
    const newRows = [];

    if (pendingFiles.length > 0) {
      for (let i = 0; i < pendingFiles.length; i++) {
        const { file, type } = pendingFiles[i];
        const ext = file.name.split(".").pop();
        const path = `${conversationId}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("messages").upload(path, file);
        if (uploadError) {
          alert("Couldn't send one of the files: " + uploadError.message);
          continue;
        }
        const { data: pub } = supabase.storage.from("messages").getPublicUrl(path);
        newRows.push({
          conversation_id: conversationId,
          sender_id: currentUserId,
          text: i === 0 ? trimmed || null : null,
          media_url: pub.publicUrl,
          media_type: type,
          reply_to_id: i === 0 ? replyingTo?.id || null : null,
        });
      }
    } else {
      newRows.push({ conversation_id: conversationId, sender_id: currentUserId, text: trimmed, reply_to_id: replyingTo?.id || null });
    }

    setText("");
    setPendingFiles([]);
    setReplyingTo(null);

    const { data, error } = await supabase.from("messages").insert(newRows).select();
    setUploading(false);
    if (!error && data) {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...data.filter((m) => !ids.has(m.id))];
      });
    }
  };

  const openActionSheet = (m) => {
    if (m.deleted) return;
    setActionSheetFor(m);
    setReactPickerOpen(false);
  };

  const startReply = () => {
    setReplyingTo(actionSheetFor);
    setActionSheetFor(null);
  };

  const startEdit = () => {
    setEditingId(actionSheetFor.id);
    setEditText(actionSheetFor.text || "");
    setActionSheetFor(null);
  };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from("messages")
      .update({ text: trimmed, edited_at: new Date().toISOString() })
      .eq("id", editingId)
      .select()
      .single();
    if (!error && data) setMessages((prev) => prev.map((m) => (m.id === data.id ? data : m)));
    setEditingId(null);
    setEditText("");
  };

  const unsendMessage = async () => {
    const id = actionSheetFor.id;
    setActionSheetFor(null);
    const { data, error } = await supabase
      .from("messages")
      .update({ deleted: true, text: null, media_url: null, media_type: null })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setMessages((prev) => prev.map((m) => (m.id === data.id ? data : m)));
  };

  const toggleReaction = async (emoji) => {
    const messageId = actionSheetFor.id;
    setActionSheetFor(null);
    setReactPickerOpen(false);
    const mine = reactions.find((r) => r.message_id === messageId && r.user_id === currentUserId);
    if (mine && mine.emoji === emoji) {
      await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", currentUserId);
      setReactions((prev) => prev.filter((r) => !(r.message_id === messageId && r.user_id === currentUserId)));
    } else {
      await supabase.from("message_reactions").upsert(
        { message_id: messageId, user_id: currentUserId, emoji },
        { onConflict: "message_id,user_id" }
      );
      setReactions((prev) => [...prev.filter((r) => !(r.message_id === messageId && r.user_id === currentUserId)), { message_id: messageId, user_id: currentUserId, emoji }]);
    }
  };

  const reactionsFor = (messageId) => {
    const forMsg = reactions.filter((r) => r.message_id === messageId);
    const counts = {};
    forMsg.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    const mine = forMsg.find((r) => r.user_id === currentUserId)?.emoji;
    return { counts, mine };
  };

  const findMessage = (id) => messages.find((m) => m.id === id);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-hairline">
        <button onClick={() => router.push("/messages")}><ChevronLeft size={22} /></button>
        <button onClick={() => router.push(`/profile/${other?.username}`)} className="flex items-center gap-2.5">
          <img src={other?.avatar_url || `https://picsum.photos/seed/${other?.username}/200/200`} alt="" className="w-8 h-8 rounded-full object-cover" />
          <div className="font-semibold text-sm">{other?.username}</div>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center text-inksoft text-sm py-8">Start the conversation with {other?.username}.</div>
        )}
        {messages.map((m) => {
          const { counts, mine } = reactionsFor(m.id);
          const replied = m.reply_to_id ? findMessage(m.reply_to_id) : null;
          const isMe = m.sender_id === currentUserId;

          if (m.deleted) {
            return (
              <div key={m.id} className={`flex mb-2 ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="text-inksoft italic text-[12.5px] px-3.5 py-2 border border-hairline rounded-2xl">Message unsent</div>
              </div>
            );
          }

          return (
            <div key={m.id} className={`flex flex-col mb-2.5 ${isMe ? "items-end" : "items-start"}`}>
              {editingId === m.id ? (
                <div className="w-[80%]">
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full border border-hairline rounded-lg px-3 py-2 text-[13.5px] bg-white outline-none"
                  />
                  <div className="flex gap-3 mt-1 justify-end">
                    <button onClick={() => setEditingId(null)} className="text-xs text-inksoft">Cancel</button>
                    <button onClick={saveEdit} className="text-xs text-amber font-semibold">Save</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => openActionSheet(m)} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  {m.media_type === "sticker" ? (
                    <div className="text-5xl leading-none px-1">{m.text}</div>
                  ) : (
                    <div
                      className="max-w-[72%] rounded-2xl overflow-hidden text-[13.5px] leading-snug"
                      style={
                        m.media_url
                          ? { background: "transparent" }
                          : isMe
                          ? { background: "#1C1A17", color: "#fff", padding: "10px 14px" }
                          : { background: "#fff", border: "1px solid #DCD6C8", color: "#1C1A17", padding: "10px 14px" }
                      }
                    >
                      {replied && (
                        <div
                          className="text-[11px] mb-1.5 px-2 py-1 rounded-lg opacity-75 border-l-2"
                          style={{ borderColor: "#FF6B35", background: isMe ? "rgba(255,255,255,0.1)" : "#F7F4EE" }}
                        >
                          {replied.deleted ? "Message unsent" : replied.text || (replied.media_type === "video" ? "Video" : "Photo")}
                        </div>
                      )}
                      {m.media_url && (m.media_type === "image" || m.media_type === "gif") && (
                        <img src={m.media_url} alt="" className="w-full max-w-[240px] rounded-2xl block" />
                      )}
                      {m.media_url && m.media_type === "video" && (
                        <video src={m.media_url} controls onClick={(e) => e.stopPropagation()} className="w-full max-w-[240px] rounded-2xl block" />
                      )}
                      {m.text && <div className={m.media_url ? "mt-1.5 px-1" : ""}>{m.text}</div>}
                      {m.edited_at && <div className="text-[10px] opacity-60 mt-0.5">(edited)</div>}
                    </div>
                  )}
                </div>
              )}
              {Object.keys(counts).length > 0 && (
                <div className="flex gap-1 mt-1">
                  {Object.entries(counts).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setActionSheetFor(m);
                        toggleReaction(emoji);
                      }}
                      className="text-[11px] rounded-full px-1.5 py-0.5 border"
                      style={{ borderColor: mine === emoji ? "#FF6B35" : "#DCD6C8", background: mine === emoji ? "#FFE8DC" : "#fff" }}
                    >
                      {emoji} {count > 1 ? count : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {actionSheetFor && (
        <div className="fixed inset-0 bg-[rgba(28,26,23,0.4)] z-50 flex items-end" onClick={() => setActionSheetFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper w-full rounded-t-2xl p-2 pb-4">
            {!reactPickerOpen ? (
              <>
                <button onClick={() => setReactPickerOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 text-[14px]">
                  <Heart size={18} /> React
                </button>
                <button onClick={startReply} className="w-full flex items-center gap-3 px-4 py-3 text-[14px]">
                  <CornerUpLeft size={18} /> Reply
                </button>
                {actionSheetFor.sender_id === currentUserId && !actionSheetFor.media_url && (
                  <button onClick={startEdit} className="w-full flex items-center gap-3 px-4 py-3 text-[14px]">
                    <Pencil size={18} /> Edit
                  </button>
                )}
                {actionSheetFor.sender_id === currentUserId && (
                  <button onClick={unsendMessage} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-amber">
                    <Trash2 size={18} /> Unsend
                  </button>
                )}
              </>
            ) : (
              <div className="flex justify-around px-2 py-2">
                {REACTION_EMOJIS.map((e) => (
                  <button key={e} onClick={() => toggleReaction(e)} className="text-3xl">
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-hairline bg-paperdim">
          <div className="text-[12px] text-inksoft truncate">
            Replying to: {replyingTo.text || (replyingTo.media_type === "video" ? "Video" : "Photo")}
          </div>
          <button onClick={() => setReplyingTo(null)}><X size={16} /></button>
        </div>
      )}

      {stickerPickerOpen && (
        <div className="grid grid-cols-6 gap-2 px-3 pt-2 pb-1">
          {STICKERS.map((s) => (
            <button key={s} onClick={() => sendSticker(s)} className="text-3xl py-1.5 rounded-lg hover:bg-paperdim">
              {s}
            </button>
          ))}
        </div>
      )}

      {gifPickerOpen && (
        <div className="border-t border-hairline">
          <input
            value={gifQuery}
            onChange={(e) => setGifQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full px-4 py-2.5 text-[13.5px] outline-none bg-paperdim"
          />
          <div className="grid grid-cols-3 gap-1 p-2 max-h-[220px] overflow-y-auto">
            {gifLoading && <div className="col-span-3 text-center text-xs text-inksoft py-4">Loading...</div>}
            {!gifLoading &&
              gifResults.map((g) => (
                <button key={g.id} onClick={() => sendGif(g.images.fixed_height.url)} className="aspect-square overflow-hidden rounded">
                  <img src={g.images.fixed_height_small.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
          </div>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="px-3 pt-2 flex items-center gap-2 overflow-x-auto">
          {pendingFiles.map((p, i) => (
            <div key={i} className="relative flex-shrink-0">
              {p.type === "image" ? (
                <img src={p.url} alt="" className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <video src={p.url} className="w-16 h-16 rounded-lg object-cover" />
              )}
              <button onClick={() => removePending(i)} className="absolute -top-1.5 -right-1.5 bg-ink text-white rounded-full w-5 h-5 flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 p-3 border-t border-hairline items-center">
        <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 text-ink" aria-label="Attach photos or videos">
          <ImagePlus size={22} strokeWidth={1.6} />
        </button>
        <button
          onClick={() => {
            setStickerPickerOpen((o) => !o);
            setGifPickerOpen(false);
          }}
          className="flex-shrink-0 text-ink"
          aria-label="Stickers"
        >
          <Smile size={22} strokeWidth={1.6} color={stickerPickerOpen ? "#FF6B35" : "#1C1A17"} />
        </button>
        <button
          onClick={() => {
            setGifPickerOpen((o) => !o);
            setStickerPickerOpen(false);
          }}
          className="flex-shrink-0 text-ink"
          aria-label="GIFs"
        >
          <Clapperboard size={22} strokeWidth={1.6} color={gifPickerOpen ? "#FF6B35" : "#1C1A17"} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="hidden" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message..."
          className="flex-1 border border-hairline rounded-full px-3.5 py-2.5 text-[13.5px] bg-white outline-none"
        />
        <button
          onClick={send}
          disabled={uploading}
          className="rounded-full w-[38px] h-[38px] flex items-center justify-center flex-shrink-0 text-white disabled:opacity-50"
          style={{ background: text.trim() || pendingFiles.length > 0 ? "#FF6B35" : "#DCD6C8" }}
        >
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
