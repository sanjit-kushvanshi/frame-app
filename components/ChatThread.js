"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, SendHorizontal, ImagePlus, X, Smile, Clapperboard, CornerUpLeft, CornerUpRight, Pencil, Trash2, Heart, Mic, Square, Play, Pause, Copy, Download, Eye, EyeOff } from "lucide-react";
import { compressImage, checkVideoSize } from "@/lib/mediaCompress";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

const STICKERS = ["❤️", "🔥", "😂", "😍", "👍", "🎉", "😭", "👀", "💀", "✨", "🙏", "😮"];
const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const GIPHY_API_KEY = "fR9MLGSAdqsbgT2S4RXDUoKLEBnHEPqA";
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

function splitTextWithLinks(text) {
  if (!text) return [];
  const parts = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(URL_REGEX);
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    parts.push({ type: "link", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: "text", value: text.slice(lastIndex) });
  return parts;
}

function MessageText({ text, isMe, onLinkClick }) {
  const parts = splitTextWithLinks(text);
  return (
    <>
      {parts.map((p, i) =>
        p.type === "link" ? (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onLinkClick(p.value);
            }}
            style={{
              color: isMe ? "#FFC9AC" : "#FF6B35",
              textDecoration: "underline",
              cursor: "pointer",
              wordBreak: "break-all",
            }}
          >
            {p.value}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </>
  );
}

function VoiceMessage({ url, isMe }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const toggle = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex items-center gap-2.5 w-[190px] py-0.5">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
        className="hidden"
      />
      <button
        onClick={toggle}
        className="flex-shrink-0 rounded-full w-8 h-8 flex items-center justify-center"
        style={{ background: isMe ? "rgba(255,255,255,0.15)" : "#F7F4EE" }}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          className="h-[3px] rounded-full overflow-hidden"
          style={{ background: isMe ? "rgba(255,255,255,0.25)" : "#DCD6C8" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(progress, 1) * 100}%`, background: isMe ? "#fff" : "#FF6B35" }}
          />
        </div>
        <span className="text-[10.5px] opacity-75">
          {formatDuration(playing || currentTime > 0 ? currentTime : duration)}
        </span>
      </div>
    </div>
  );
}

export default function ChatThread({
  conversationId,
  currentUserId,
  other,
  isGroup = false,
  groupName,
  groupAvatarUrl,
  participants,
  initialMessages,
  initialReactions,
}) {
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
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordError, setRecordError] = useState("");
  const [lightbox, setLightbox] = useState(null); // { url, type: "image" | "video" }
  const [forwardFor, setForwardFor] = useState(null);
  const [forwardList, setForwardList] = useState([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardSentTo, setForwardSentTo] = useState(new Set());
  const [viewOnceMode, setViewOnceMode] = useState(false);
  const [viewOnceModal, setViewOnceModal] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(messages);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const otherParticipants = isGroup ? (participants || []).filter((p) => p.id !== currentUserId) : [];
  const profileById = (id) => {
    if (isGroup) return (participants || []).find((p) => p.id === id);
    return id === currentUserId ? null : other;
  };
  const headerTitle = isGroup
    ? groupName || otherParticipants.map((p) => p.username).join(", ")
    : other?.username;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    (async () => {
      if (isGroup) {
        await supabase
          .from("conversation_participants")
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .eq("user_id", currentUserId);
        return;
      }
      const { data: convo } = await supabase.from("conversations").select("user_a, user_b").eq("id", conversationId).single();
      if (!convo) return;
      const field = convo.user_a === currentUserId ? "last_read_a" : "last_read_b";
      await supabase.from("conversations").update({ [field]: new Date().toISOString() }).eq("id", conversationId);
    })();
  }, [conversationId, currentUserId, supabase, isGroup]);

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
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)));
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
    return () => {
      clearInterval(recordTimerRef.current);
      clearTimeout(longPressTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    const processed = [];
    for (const file of valid) {
      const isVideo = file.type.startsWith("video/");
      if (isVideo) {
        const check = checkVideoSize(file);
        if (!check.ok) {
          alert(check.message);
          continue;
        }
        processed.push({ file, url: URL.createObjectURL(file), type: "video" });
      } else {
        try {
          const compressed = await compressImage(file, { maxDim: 1080, targetBytes: 200 * 1024 });
          processed.push({ file: compressed, url: URL.createObjectURL(compressed), type: "image" });
        } catch (err) {
          alert("Couldn't process an image: " + err.message);
        }
      }
    }
    setPendingFiles((prev) => [...prev, ...processed]);
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

  const startRecording = async () => {
    setRecordError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      setRecordError("Couldn't access microphone. Check your browser permissions.");
    }
  };

  const cleanupRecording = () => {
    clearInterval(recordTimerRef.current);
    recordTimerRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setRecording(false);
    setRecordSeconds(0);
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    recordedChunksRef.current = [];
    cleanupRecording();
  };

  const stopAndSendRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanupRecording();
      return;
    }
    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      cleanupRecording();

      if (blob.size === 0) return;

      setUploading(true);
      const ext = mimeType.includes("mp4") ? "m4a" : "webm";
      const path = `${conversationId}/${Date.now()}-voice.${ext}`;
      const { error: uploadError } = await supabase.storage.from("messages").upload(path, blob, { contentType: mimeType });
      if (uploadError) {
        setUploading(false);
        alert("Couldn't send the voice note: " + uploadError.message);
        return;
      }
      const { data: pub } = supabase.storage.from("messages").getPublicUrl(path);
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          media_url: pub.publicUrl,
          media_type: "voice",
          reply_to_id: replyingTo?.id || null,
        })
        .select()
        .single();
      setReplyingTo(null);
      setUploading(false);
      if (!error && data) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    };
    recorder.stop();
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
      newRows.push({
        conversation_id: conversationId,
        sender_id: currentUserId,
        text: trimmed,
        reply_to_id: replyingTo?.id || null,
        ...(viewOnceMode ? { view_once: true } : {}),
      });
    }

    setText("");
    setPendingFiles([]);
    setReplyingTo(null);
    setViewOnceMode(false);

    const { data, error } = await supabase.from("messages").insert(newRows).select();

setUploading(false);

if (error) alert("SEND ERROR: " + error.message);

if (!error && data) {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...data.filter((m) => !ids.has(m.id))];
      });
    }
  };

  const openViewOnce = async (m) => {
    setViewOnceModal(m);
    const { data, error } = await supabase.rpc("mark_view_once_viewed", { message_id_input: m.id });
    if (!error && data && data[0]) {
      setMessages((prev) => prev.map((x) => (x.id === data[0].id ? { ...x, ...data[0] } : x)));
    }
  };

  const openActionSheet = (m) => {
    if (m.deleted) return;
    setActionSheetFor(m);
    setReactPickerOpen(false);
  };

  // --- Long-press handling: hold ~400ms to open action sheet, tap is reserved for content ---
  const handlePressStart = (m) => () => {
    longPressTriggeredRef.current = false;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openActionSheet(m);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
    }, 400);
  };

  const handlePressEnd = () => {
    clearTimeout(longPressTimerRef.current);
  };

  // Runs in the capture phase, before any inner link/media onClick fires.
  // If a long-press just happened, swallow the click so it doesn't also navigate/open.
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

  const handleLinkClick = (url) => {
    try {
      const parsed = new URL(url);
      if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
        router.push(parsed.pathname + parsed.search + parsed.hash);
        return;
      }
    } catch (e) {}
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openLightbox = (url, type) => (e) => {
    e.stopPropagation();
    setLightbox({ url, type });
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
    if (!error && data) setMessages((prev) => prev.map((m) => (m.id === data.id ? { ...m, ...data } : m)));
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
    if (!error && data) setMessages((prev) => prev.map((m) => (m.id === data.id ? { ...m, ...data } : m)));
  };

  const copyMessage = async () => {
    const m = actionSheetFor;
    setActionSheetFor(null);
    if (!m) return;
    if (m.view_once && m.sender_id !== currentUserId && !m.viewed_at) return;
    const value = m.media_url || m.text || "";
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (e) {}
  };

  const openForward = async () => {
    const m = actionSheetFor;
    setActionSheetFor(null);
    if (!m) return;
    setForwardFor(m);
    setForwardLoading(true);
    setForwardSentTo(new Set());

    const { data: partRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId);

    const convoIds = [...new Set((partRows || []).map((r) => r.conversation_id))];
    if (convoIds.length === 0) {
      setForwardList([]);
      setForwardLoading(false);
      return;
    }

    const { data: convos } = await supabase
      .from("conversations")
      .select("id, is_group, name, avatar_url")
      .in("id", convoIds);

    const { data: allParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convoIds);

    const otherIds = [...new Set((allParts || []).filter((p) => p.user_id !== currentUserId).map((p) => p.user_id))];
    const { data: profs } = otherIds.length
      ? await supabase.from("profiles").select("id, username, avatar_url").in("id", otherIds)
      : { data: [] };
    const profById = {};
    (profs || []).forEach((p) => (profById[p.id] = p));

    const list = (convos || [])
      .filter((c) => c.id !== conversationId)
      .map((c) => {
        if (c.is_group) {
          return { id: c.id, title: c.name || "Group", avatar_url: c.avatar_url, isGroup: true };
        }
        const otherRow = (allParts || []).find((p) => p.conversation_id === c.id && p.user_id !== currentUserId);
        const prof = otherRow ? profById[otherRow.user_id] : null;
        return { id: c.id, title: prof?.username || "Direct message", avatar_url: prof?.avatar_url, isGroup: false };
      });

    setForwardList(list);
    setForwardLoading(false);
  };

  const forwardTo = async (targetConversationId) => {
    const m = forwardFor;
    if (!m) return;
    const payload = { conversation_id: targetConversationId, sender_id: currentUserId };
    if (m.shared_post_id) {
      payload.shared_post_id = m.shared_post_id;
    } else if (m.media_url) {
      payload.media_url = m.media_url;
      payload.media_type = m.media_type;
    } else {
      payload.text = m.text;
      if (m.media_type === "sticker") payload.media_type = "sticker";
    }
    const { error } = await supabase.from("messages").insert(payload);
    if (!error) {
      setForwardSentTo((prev) => new Set(prev).add(targetConversationId));
    }
  };

  const downloadImage = async () => {
    if (!lightbox || lightbox.type !== "image") return;
    try {
      const response = await fetch(lightbox.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `frame-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {}
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

  const previewText = (msg) => {
    if (!msg) return "";
    if (msg.deleted) return "Message unsent";
    const locked = msg.view_once && msg.sender_id !== currentUserId && !msg.viewed_at;
    if (locked) return "View once message";
    return msg.text || (msg.media_type === "video" ? "Video" : msg.media_type === "voice" ? "Voice message" : "Photo");
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-hairline">
        <button onClick={() => router.push("/messages")}><ChevronLeft size={22} /></button>
        {isGroup ? (
          <button onClick={() => router.push(`/messages/${conversationId}/info`)} className="flex items-center gap-2.5">
            {groupAvatarUrl ? (
              <img src={groupAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="flex -space-x-3">
                {otherParticipants.slice(0, 3).map((p) => (
                  <Avatar key={p.id} username={p.username} avatarUrl={p.avatar_url} size={32} className="border-2 border-paper" />
                ))}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate max-w-[200px]">{headerTitle}</div>
              <div className="text-[10.5px] text-inksoft font-mono">{(participants || []).length} members</div>
            </div>
          </button>
        ) : (
          <button onClick={() => router.push(`/profile/${other?.username}`)} className="flex items-center gap-2.5">
            <Avatar username={other?.username} avatarUrl={other?.avatar_url} size={32} />
            <div className="font-semibold text-sm">{other?.username}</div>
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center text-inksoft text-sm py-8">
            {isGroup ? `Say hello to ${headerTitle}.` : `Start the conversation with ${other?.username}.`}
          </div>
        )}
        {messages.map((m) => {
          const { counts, mine } = reactionsFor(m.id);
          const replied = m.reply_to_id ? findMessage(m.reply_to_id) : null;
          const isMe = m.sender_id === currentUserId;
          const sender = isGroup && !isMe ? profileById(m.sender_id) : null;
          const viewOnceLocked = m.view_once && !isMe && !m.viewed_at;
          const viewOnceOpened = m.view_once && !isMe && m.viewed_at;

          if (m.deleted) {
            return (
              <div key={m.id} className={`flex mb-2 ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="text-inksoft italic text-[12.5px] px-3.5 py-2 border border-hairline rounded-2xl">Message unsent</div>
              </div>
            );
          }

          if (m.shared_post_id) {
            return (
              <div key={m.id} className={`flex flex-col mb-2.5 ${isMe ? "items-end" : "items-start"}`}>
                {sender && <div className="text-[10.5px] text-inksoft font-mono mb-1 px-1">{sender.username}</div>}
                <div {...pressHandlers(m)}>
                  <Link
                    href={`/post/${m.shared_post_id}`}
                    className="w-[200px] rounded-xl overflow-hidden border border-hairline bg-white block"
                  >
                    <div className="aspect-square relative bg-paperdim">
                      {m.posts ? (
                        m.posts.media_type === "video" ? (
                          <video src={m.posts.image_url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={m.posts.image_url} alt="" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-inksoft text-[11px] font-mono">Post unavailable</div>
                      )}
                    </div>
                    {m.posts && (
                      <div className="px-2.5 py-2 text-[11px]">
                        <div className="font-semibold">{m.posts.profiles?.username}</div>
                        {m.posts.caption && <div className="text-inksoft truncate">{m.posts.caption}</div>}
                      </div>
                    )}
                  </Link>
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className={`flex flex-col mb-2.5 ${isMe ? "items-end" : "items-start"}`}>
              {sender && <div className="text-[10.5px] text-inksoft font-mono mb-1 px-1">{sender.username}</div>}
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
                <div
                  {...(viewOnceLocked ? {} : pressHandlers(m))}
                  onClick={viewOnceLocked ? () => openViewOnce(m) : undefined}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`flex ${isMe ? "justify-end" : "justify-start"} flex-shrink-0`}
                >
                  {m.media_type === "sticker" ? (
                    <div className="text-5xl leading-none px-1">{m.text}</div>
                  ) : viewOnceLocked ? (
                    <div
                      className="flex items-center gap-2 text-[13px] cursor-pointer"
                      style={{ background: "#1C1A17", color: "#fff", padding: "9px 16px", borderRadius: "20px" }}
                    >
                      <Eye size={15} /> View once
                    </div>
                  ) : viewOnceOpened ? (
                    <div
                      className="flex items-center gap-2 text-[13px] italic opacity-60"
                      style={{
                        background: "#fff",
                        border: "1px solid #DCD6C8",
                        color: "#1C1A17",
                        padding: "9px 16px",
                        borderRadius: "20px",
                      }}
                    >
                      <EyeOff size={15} /> Opened
                    </div>
                  ) : (
                    <div
                      className="text-[13.5px] leading-snug flex-shrink-0"
                      style={{
                        width: "fit-content",
                        maxWidth: "280px",
                        borderRadius: "20px",
                        overflow: m.media_url ? "hidden" : "visible",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        ...(m.media_url
                          ? { background: "transparent" }
                          : isMe
                          ? { background: "#1C1A17", color: "#fff", padding: "9px 16px" }
                          : { background: "#fff", border: "1px solid #DCD6C8", color: "#1C1A17", padding: "9px 16px" }),
                      }}
                    >
                      {replied && (
                        <div
                          className="text-[11px] mb-1.5 px-2 py-1 rounded-lg opacity-75 border-l-2"
                          style={{ borderColor: "#FF6B35", background: isMe ? "rgba(255,255,255,0.1)" : "#F7F4EE" }}
                        >
                          {previewText(replied)}
                        </div>
                      )}
                      {m.media_url && (m.media_type === "image" || m.media_type === "gif") && (
                        <img
                          src={m.media_url}
                          alt=""
                          onClick={openLightbox(m.media_url, "image")}
                          className="w-full max-w-[240px] rounded-2xl block cursor-pointer"
                        />
                      )}
                      {m.media_url && m.media_type === "video" && (
                        <video src={m.media_url} controls onClick={(e) => e.stopPropagation()} className="w-full max-w-[240px] rounded-2xl block" />
                      )}
                      {m.media_url && m.media_type === "voice" && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <VoiceMessage url={m.media_url} isMe={isMe} />
                        </div>
                      )}
                      {m.text && (
                        <div className={m.media_url ? "mt-1.5 px-1" : ""}>
                          <MessageText text={m.text} isMe={isMe} onLinkClick={handleLinkClick} />
                        </div>
                      )}
                      {m.edited_at && <div className="text-[10px] opacity-60 mt-0.5">(edited)</div>}
                    </div>
                  )}
                </div>
              )}
              {m.view_once && isMe && (
                <div className="text-[10px] text-inksoft mt-1 flex items-center gap-1">
                  <Eye size={11} /> {m.viewed_at ? "Opened" : "Sent · View once"}
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
                <button onClick={copyMessage} className="w-full flex items-center gap-3 px-4 py-3 text-[14px]">
                  <Copy size={18} /> Copy
                </button>
                <button onClick={openForward} className="w-full flex items-center gap-3 px-4 py-3 text-[14px]">
                  <CornerUpRight size={18} /> Forward
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

      {lightbox && (
        <div
          className="fixed inset-0 bg-black z-[60] flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white z-10"
            aria-label="Close"
          >
            <X size={26} />
          </button>
          {lightbox.type === "image" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadImage();
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white z-10 bg-[rgba(0,0,0,0.5)] p-3 rounded-full"
              aria-label="Download image"
            >
              <Download size={20} />
            </button>
          )}
          {lightbox.type === "video" ? (
            <video src={lightbox.url} controls autoPlay className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={lightbox.url} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}

      {viewOnceModal && (
        <div
          className="fixed inset-0 bg-black z-[60] flex items-center justify-center px-8"
          onClick={() => setViewOnceModal(null)}
        >
          <button
            onClick={() => setViewOnceModal(null)}
            className="absolute top-4 right-4 text-white z-10"
            aria-label="Close"
          >
            <X size={26} />
          </button>
          <div className="text-white text-[17px] text-center leading-relaxed" onClick={(e) => e.stopPropagation()}>
            {viewOnceModal.text}
          </div>
        </div>
      )}

      {forwardFor && (
        <div className="fixed inset-0 bg-[rgba(28,26,23,0.4)] z-50 flex items-end" onClick={() => setForwardFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper w-full rounded-t-2xl p-4 pb-6 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-[15px]">Forward to...</div>
              <button onClick={() => setForwardFor(null)}><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {forwardLoading && <div className="text-center text-inksoft text-sm py-6">Loading...</div>}
              {!forwardLoading && forwardList.length === 0 && (
                <div className="text-center text-inksoft text-sm py-6">No conversations to forward to.</div>
              )}
              {!forwardLoading &&
                forwardList.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar username={c.title} avatarUrl={c.avatar_url} size={36} className="flex-shrink-0" />
                      <div className="text-[13.5px] truncate">{c.title}</div>
                    </div>
                    <button
                      onClick={() => forwardTo(c.id)}
                      disabled={forwardSentTo.has(c.id)}
                      className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: forwardSentTo.has(c.id) ? "#DCD6C8" : "#FF6B35",
                        color: forwardSentTo.has(c.id) ? "#1C1A17" : "#fff",
                      }}
                    >
                      {forwardSentTo.has(c.id) ? "Sent" : "Send"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-hairline bg-paperdim">
          <div className="text-[12px] text-inksoft truncate">
            Replying to: {previewText(replyingTo)}
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

      {viewOnceMode && pendingFiles.length === 0 && !recording && (
        <div className="px-4 pt-2 text-[11px] text-amber font-mono flex items-center gap-1">
          <Eye size={12} /> Next message will be view once
        </div>
      )}

      {recordError && (
        <div className="px-4 pt-2 text-[11px] text-amber font-mono">{recordError}</div>
      )}

      {recording ? (
        <div className="flex gap-2 p-3 border-t border-hairline items-center">
          <button
            onClick={cancelRecording}
            className="flex-shrink-0 rounded-full w-[38px] h-[38px] flex items-center justify-center text-ink border border-hairline"
            aria-label="Cancel recording"
          >
            <X size={16} />
          </button>
          <div className="flex-1 flex items-center gap-2.5 border border-hairline rounded-full px-3.5 py-2.5 bg-white">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#FF6B35", animation: "pulse 1.2s infinite" }} />
            <span className="text-[13.5px] font-mono text-ink">{formatDuration(recordSeconds)}</span>
            <span className="text-[12px] text-inksoft ml-auto">Recording voice note...</span>
          </div>
          <button
            onClick={stopAndSendRecording}
            disabled={uploading}
            className="rounded-full w-[38px] h-[38px] flex items-center justify-center flex-shrink-0 text-white disabled:opacity-50"
            style={{ background: "#FF6B35" }}
            aria-label="Stop and send voice note"
          >
            <Square size={14} fill="currentColor" />
          </button>
        </div>
      ) : (
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
          {pendingFiles.length === 0 && (
            <button
              onClick={() => setViewOnceMode((v) => !v)}
              className="flex-shrink-0"
              aria-label="Toggle view once"
            >
              {viewOnceMode ? <Eye size={22} strokeWidth={1.6} color="#FF6B35" /> : <EyeOff size={22} strokeWidth={1.6} color="#1C1A17" />}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="hidden" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={viewOnceMode ? "View once message..." : "Message..."}
            className="flex-1 border rounded-full px-3.5 py-2.5 text-[13.5px] bg-white outline-none"
            style={{ borderColor: viewOnceMode ? "#FF6B35" : "#DCD6C8" }}
          />
          {text.trim() || pendingFiles.length > 0 ? (
            <button
              onClick={send}
              disabled={uploading}
              className="rounded-full w-[38px] h-[38px] flex items-center justify-center flex-shrink-0 text-white disabled:opacity-50"
              style={{ background: "#FF6B35" }}
            >
              <SendHorizontal size={16} />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="rounded-full w-[38px] h-[38px] flex items-center justify-center flex-shrink-0 text-white"
              style={{ background: "#FF6B35" }}
              aria-label="Record voice note"
            >
              <Mic size={16} />
            </button>
          )}
        </div>
      )}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
