"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/mediaCompress";
import {
  Send, X, Heart, CornerUpLeft, CornerUpRight, Pencil, Copy, Trash2, ImagePlus,
} from "lucide-react";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

export default function CommunityChat({ communityId, userId, chatStatus, profilesMap, onRequestChat }) {
  const supabase = createClient();
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [otherReadTimes, setOtherReadTimes] = useState([]);

  const [actionSheetFor, setActionSheetFor] = useState(null);
  const [reactPickerOpen, setReactPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [forwardFor, setForwardFor] = useState(null);
  const [forwardList, setForwardList] = useState([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardSentTo, setForwardSentTo] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [tick, setTick] = useState(0);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(messages);
  const channelRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (chatStatus !== "approved") return;
    fetchMessages();
    fetchReadReceipts();
    markRead();

    const channel = supabase
      .channel(`community_${communityId}_chat`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages", filter: `community_id=eq.${communityId}` },
        (payload) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "community_messages", filter: `community_id=eq.${communityId}` },
        (payload) => {
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)));
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "community_message_reactions" }, (payload) => {
        const row = payload.new?.message_id ? payload.new : payload.old;
        if (!messagesRef.current.some((m) => m.id === row.message_id)) return;
        if (payload.eventType === "DELETE") {
          setReactions((prev) => prev.filter((r) => !(r.message_id === row.message_id && r.user_id === row.user_id)));
        } else {
          setReactions((prev) => [
            ...prev.filter((r) => !(r.message_id === row.message_id && r.user_id === row.user_id)),
            payload.new,
          ]);
        }
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.user_id === userId) return;
        setTypingUsers((prev) => ({ ...prev, [payload.payload.user_id]: { username: payload.payload.username, ts: Date.now() } }));
      })
      .subscribe();

    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [chatStatus, communityId, userId]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("community_messages")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: true })
      .limit(300);
    setMessages(data || []);

    const ids = (data || []).map((m) => m.id);
    if (ids.length > 0) {
      const { data: reactionData } = await supabase.from("community_message_reactions").select("*").in("message_id", ids);
      setReactions(reactionData || []);
    }
  };

  const fetchReadReceipts = async () => {
    const { data } = await supabase
      .from("community_members")
      .select("user_id, chat_last_read_at")
      .eq("community_id", communityId)
      .eq("chat_status", "approved")
      .neq("user_id", userId);
    setOtherReadTimes(data || []);
  };

  const markRead = async () => {
    await supabase
      .from("community_members")
      .update({ chat_last_read_at: new Date().toISOString() })
      .eq("community_id", communityId)
      .eq("user_id", userId);
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    const processed = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const compressed = await compressImage(file, { maxDim: 1080, targetBytes: 200 * 1024 });
        processed.push({ file: compressed, url: URL.createObjectURL(compressed) });
      } catch (err) {
        alert("Couldn't process an image: " + err.message);
      }
    }
    setPendingFiles((prev) => [...prev, ...processed]);
    e.target.value = "";
  };

  const removePending = (i) => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));

  const broadcastTyping = () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, username: profilesMap[userId]?.username || "Someone" },
    });
  };

  const sendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed && pendingFiles.length === 0) return;
    setUploading(true);

    const newRows = [];
    if (pendingFiles.length > 0) {
      for (let i = 0; i < pendingFiles.length; i++) {
        const { file } = pendingFiles[i];
        const ext = file.name.split(".").pop();
        const path = `${communityId}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("community-chat").upload(path, file);
        if (uploadError) { alert("Couldn't send an image: " + uploadError.message); continue; }
        const { data: pub } = supabase.storage.from("community-chat").getPublicUrl(path);
        newRows.push({
          community_id: communityId,
          user_id: userId,
          content: i === 0 ? trimmed || null : null,
          media_url: pub.publicUrl,
          media_type: "image",
          reply_to_id: i === 0 ? replyingTo?.id || null : null,
        });
      }
    } else {
      newRows.push({ community_id: communityId, user_id: userId, content: trimmed, reply_to_id: replyingTo?.id || null });
    }

    setNewMessage("");
    setPendingFiles([]);
    setReplyingTo(null);

    const { data, error } = await supabase.from("community_messages").insert(newRows).select();
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

  const handlePressStart = (m) => () => {
    longPressTriggeredRef.current = false;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openActionSheet(m);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
    }, 400);
  };
  const handlePressEnd = () => clearTimeout(longPressTimerRef.current);
  const handleBubbleClickCapture = (e) => {
    if (longPressTriggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressTriggeredRef.current = false;
    }
  };
  const pressHandlers = (m) => ({
    onClickCapture: handleBubbleClickCapture,
    onTouchStart: handlePressStart(m),
    onTouchEnd: handlePressEnd,
    onTouchCancel: handlePressEnd,
    onTouchMove: handlePressEnd,
    onMouseDown: handlePressStart(m),
    onMouseUp: handlePressEnd,
    onMouseLeave: handlePressEnd,
  });

  const startReply = () => { setReplyingTo(actionSheetFor); setActionSheetFor(null); };
  const startEdit = () => { setEditingId(actionSheetFor.id); setEditText(actionSheetFor.content || ""); setActionSheetFor(null); };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from("community_messages")
      .update({ content: trimmed, edited_at: new Date().toISOString() })
      .eq("id", editingId)
      .select()
      .single();
    if (!error && data) setMessages((prev) => prev.map((m) => (m.id === data.id ? { ...m, ...data } : m)));
    setEditingId(null);
    setEditText("");
  };

  const unsendMessage = async () => {
    const msgId = actionSheetFor.id;
    setActionSheetFor(null);
    const { data, error } = await supabase
      .from("community_messages")
      .update({ deleted: true, content: null, media_url: null, media_type: null })
      .eq("id", msgId)
      .select()
      .single();
    if (!error && data) setMessages((prev) => prev.map((m) => (m.id === data.id ? { ...m, ...data } : m)));
  };

  const copyMessage = async () => {
    const m = actionSheetFor;
    setActionSheetFor(null);
    if (!m) return;
    const value = m.media_url || m.content || "";
    if (!value) return;
    try { await navigator.clipboard.writeText(value); } catch (e) {}
  };

  const toggleReaction = async (emoji) => {
    const messageId = actionSheetFor.id;
    setActionSheetFor(null);
    setReactPickerOpen(false);
    const mine = reactions.find((r) => r.message_id === messageId && r.user_id === userId);
    if (mine && mine.emoji === emoji) {
      await supabase.from("community_message_reactions").delete().eq("message_id", messageId).eq("user_id", userId);
      setReactions((prev) => prev.filter((r) => !(r.message_id === messageId && r.user_id === userId)));
    } else {
      await supabase.from("community_message_reactions").upsert({ message_id: messageId, user_id: userId, emoji }, { onConflict: "message_id,user_id" });
      setReactions((prev) => [...prev.filter((r) => !(r.message_id === messageId && r.user_id === userId)), { message_id: messageId, user_id: userId, emoji }]);
    }
  };

  const reactionsFor = (messageId) => {
    const forMsg = reactions.filter((r) => r.message_id === messageId);
    const counts = {};
    forMsg.forEach((r) => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
    const mine = forMsg.find((r) => r.user_id === userId)?.emoji;
    return { counts, mine };
  };

  const findMessage = (mid) => messages.find((m) => m.id === mid);

  const openForward = async () => {
    const m = actionSheetFor;
    setActionSheetFor(null);
    if (!m) return;
    setForwardFor(m);
    setForwardLoading(true);
    setForwardSentTo(new Set());

    const { data: partRows } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", userId);
    const convoIds = [...new Set((partRows || []).map((r) => r.conversation_id))];
    if (convoIds.length === 0) { setForwardList([]); setForwardLoading(false); return; }

    const { data: convos } = await supabase.from("conversations").select("id, is_group, name, avatar_url").in("id", convoIds);
    const { data: allParts } = await supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", convoIds);
    const otherIds = [...new Set((allParts || []).filter((p) => p.user_id !== userId).map((p) => p.user_id))];
    const { data: profs } = otherIds.length ? await supabase.from("profiles").select("id, username, avatar_url").in("id", otherIds) : { data: [] };
    const profById = {};
    (profs || []).forEach((p) => { profById[p.id] = p; });

    const list = (convos || []).map((c) => {
      if (c.is_group) return { id: c.id, title: c.name || "Group", avatar_url: c.avatar_url };
      const otherRow = (allParts || []).find((p) => p.conversation_id === c.id && p.user_id !== userId);
      const prof = otherRow ? profById[otherRow.user_id] : null;
      return { id: c.id, title: prof?.username || "Direct message", avatar_url: prof?.avatar_url };
    });
    setForwardList(list);
    setForwardLoading(false);
  };

  const forwardTo = async (targetConversationId) => {
    const m = forwardFor;
    if (!m) return;
    const payload = { conversation_id: targetConversationId, sender_id: userId };
    if (m.media_url) {
      payload.media_url = m.media_url;
      payload.media_type = m.media_type;
    } else {
      payload.text = m.content;
    }
    const { error } = await supabase.from("messages").insert(payload);
    if (!error) setForwardSentTo((prev) => new Set(prev).add(targetConversationId));
  };

  if (chatStatus !== "approved") {
    if (chatStatus === "pending") {
      return <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10 px-6">Your request to join the chat is pending approval.</p>;
    }
    if (chatStatus === "rejected") {
      return (
        <div className="text-center mt-10 px-6">
          <p className="text-sm font-mono text-[#1C1A17]/40 mb-3">Your chat request was declined.</p>
          <button onClick={onRequestChat} className="text-xs font-mono font-semibold text-[#FF6B35] border border-[#FF6B35] rounded-full px-4 py-2">Request again</button>
        </div>
      );
    }
    if (chatStatus === "none") {
      return (
        <div className="text-center mt-10 px-6">
          <button onClick={onRequestChat} className="text-xs font-mono font-semibold text-white bg-[#FF6B35] rounded-full px-4 py-2">Request to join chat</button>
        </div>
      );
    }
    return <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10 px-6">Join the community first to request chat access.</p>;
  }

  const myMessages = messages.filter((m) => m.user_id === userId && !m.deleted);
  const lastMyMessage = myMessages[myMessages.length - 1];
  const seenByOthers = lastMyMessage
    ? otherReadTimes.some((r) => r.chat_last_read_at && new Date(r.chat_last_read_at) >= new Date(lastMyMessage.created_at))
    : false;
  const activeTypers = Object.entries(typingUsers).filter(([, v]) => Date.now() - v.ts < 3000);

  return (
    <div className="flex flex-col" style={{ minHeight: "60vh" }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.map((m, idx) => {
          const { counts, mine } = reactionsFor(m.id);
          const replied = m.reply_to_id ? findMessage(m.reply_to_id) : null;
          const isMe = m.user_id === userId;
          const showName = !isMe && (idx === 0 || messages[idx - 1].user_id !== m.user_id);
          const isLastMine = isMe && m.id === lastMyMessage?.id;

          if (m.deleted) {
            return (
              <div key={m.id} className={`flex mb-2 ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="text-[#1C1A17]/40 italic text-[12px] px-3.5 py-2 border border-[#DCD6C8] rounded-2xl font-mono">Message unsent</div>
              </div>
            );
          }

          return (
            <div key={m.id} className={`flex flex-col mb-2 ${isMe ? "items-end" : "items-start"}`}>
              {showName && <div className="text-[10.5px] text-[#1C1A17]/50 font-mono mb-1 px-1">{profilesMap[m.user_id]?.username}</div>}
              {editingId === m.id ? (
                <div className="w-[80%]">
                  <input value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full border border-[#DCD6C8] rounded-lg px-3 py-2 text-[13.5px] bg-white outline-none" />
                  <div className="flex gap-3 mt-1 justify-end">
                    <button onClick={() => setEditingId(null)} className="text-xs text-[#1C1A17]/50 font-mono">Cancel</button>
                    <button onClick={saveEdit} className="text-xs text-[#FF6B35] font-mono font-semibold">Save</button>
                  </div>
                </div>
              ) : (
                <div {...pressHandlers(m)} onContextMenu={(e) => e.preventDefault()} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className="text-[13.5px] leading-snug"
                    style={{
                      maxWidth: "280px",
                      borderRadius: "20px",
                      overflow: m.media_url ? "hidden" : "visible",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      ...(m.media_url ? {} : isMe ? { background: "#FF6B35", color: "#fff", padding: "9px 16px" } : { background: "#fff", border: "1px solid #DCD6C8", color: "#1C1A17", padding: "9px 16px" }),
                    }}
                  >
                    {replied && (
                      <div className="text-[11px] mb-1.5 px-2 py-1 rounded-lg opacity-75 border-l-2" style={{ borderColor: "#FF6B35", background: isMe ? "rgba(255,255,255,0.15)" : "#F7F4EE" }}>
                        {replied.deleted ? "Message unsent" : replied.content || "Photo"}
                      </div>
                    )}
                    {m.media_url && (
                      <img src={m.media_url} alt="" onClick={(e) => { e.stopPropagation(); setLightbox(m.media_url); }} className="w-full max-w-[240px] rounded-2xl block cursor-pointer" />
                    )}
                    {m.content && <div className={m.media_url ? "mt-1.5 px-1" : ""}>{m.content}</div>}
                    {m.edited_at && <div className="text-[10px] opacity-60 mt-0.5">(edited)</div>}
                  </div>
                </div>
              )}
              {Object.keys(counts).length > 0 && (
                <div className="flex gap-1 mt-1">
                  {Object.entries(counts).map(([emoji, count]) => (
                    <button key={emoji} onClick={() => { setActionSheetFor(m); toggleReaction(emoji); }} className="text-[11px] rounded-full px-1.5 py-0.5 border" style={{ borderColor: mine === emoji ? "#FF6B35" : "#DCD6C8", background: mine === emoji ? "#FFE8DC" : "#fff" }}>
                      {emoji} {count > 1 ? count : ""}
                    </button>
                  ))}
                </div>
              )}
              {isLastMine && seenByOthers && <div className="text-[10px] font-mono text-[#1C1A17]/40 mt-0.5">Seen</div>}
            </div>
          );
        })}
        {activeTypers.length > 0 && (
          <div className="text-[11px] font-mono text-[#1C1A17]/40 px-1 pt-1">
            {activeTypers.map(([, v]) => v.username).join(", ")} typing...
          </div>
        )}
      </div>

      {actionSheetFor && (
        <div className="fixed inset-0 bg-[rgba(28,26,23,0.4)] z-50 flex items-end" onClick={() => setActionSheetFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-[#F7F4EE] w-full rounded-t-2xl p-2 pb-4">
            {!reactPickerOpen ? (
              <>
                <button onClick={() => setReactPickerOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-mono"><Heart size={18} /> React</button>
                <button onClick={startReply} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-mono"><CornerUpLeft size={18} /> Reply</button>
                <button onClick={copyMessage} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-mono"><Copy size={18} /> Copy</button>
                <button onClick={openForward} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-mono"><CornerUpRight size={18} /> Forward</button>
                {actionSheetFor.user_id === userId && !actionSheetFor.media_url && (
                  <button onClick={startEdit} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-mono"><Pencil size={18} /> Edit</button>
                )}
                {actionSheetFor.user_id === userId && (
                  <button onClick={unsendMessage} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-mono text-red-600"><Trash2 size={18} /> Unsend</button>
                )}
              </>
            ) : (
              <div className="flex justify-around px-2 py-2">
                {REACTION_EMOJIS.map((e) => (
                  <button key={e} onClick={() => toggleReaction(e)} className="text-3xl">{e}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black z-[60] flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white z-10"><X size={26} /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {forwardFor && (
        <div className="fixed inset-0 bg-[rgba(28,26,23,0.4)] z-50 flex items-end" onClick={() => setForwardFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-[#F7F4EE] w-full rounded-t-2xl p-4 pb-6 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono font-semibold text-[15px]">Forward to...</div>
              <button onClick={() => setForwardFor(null)}><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {forwardLoading && <div className="text-center text-[#1C1A17]/40 text-sm py-6 font-mono">Loading...</div>}
              {!forwardLoading && forwardList.length === 0 && <div className="text-center text-[#1C1A17]/40 text-sm py-6 font-mono">No conversations to forward to.</div>}
              {!forwardLoading && forwardList.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={c.avatar_url || `https://picsum.photos/seed/${c.id}/200/200`} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    <div className="text-[13.5px] font-mono truncate">{c.title}</div>
                  </div>
                  <button onClick={() => forwardTo(c.id)} disabled={forwardSentTo.has(c.id)} className="text-[12.5px] font-mono font-semibold px-3.5 py-1.5 rounded-full flex-shrink-0" style={{ background: forwardSentTo.has(c.id) ? "#DCD6C8" : "#FF6B35", color: forwardSentTo.has(c.id) ? "#1C1A17" : "#fff" }}>
                    {forwardSentTo.has(c.id) ? "Sent" : "Send"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#DCD6C8] bg-white">
          <div className="text-[12px] font-mono text-[#1C1A17]/50 truncate">Replying to: {replyingTo.content || "Photo"}</div>
          <button onClick={() => setReplyingTo(null)}><X size={16} /></button>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="flex gap-2 px-3 pt-2 overflow-x-auto">
          {pendingFiles.map((f, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img src={f.url} alt="" className="w-14 h-14 rounded-lg object-cover" />
              <button onClick={() => removePending(i)} className="absolute -top-1.5 -right-1.5 bg-black rounded-full w-4 h-4 flex items-center justify-center">
                <X size={10} color="white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-0 bg-[#F7F4EE] border-t border-[#DCD6C8] px-3 py-2 flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0"><ImagePlus size={20} color="#1C1A17" /></button>
        <input
          value={newMessage}
          onChange={(e) => { setNewMessage(e.target.value); broadcastTyping(); }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Message the group..."
          className="flex-1 bg-white border border-[#DCD6C8] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#FF6B35]"
        />
        <button onClick={sendMessage} disabled={uploading} className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0 disabled:opacity-50">
          <Send size={16} color="white" />
        </button>
      </div>
    </div>
  );
}
