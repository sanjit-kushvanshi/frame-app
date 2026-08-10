"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, SendHorizontal, ImagePlus, X, Smile, Clapperboard, CornerUpLeft, Pencil, Trash2, Heart, Mic, Square, Play, Pause } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STICKERS = ["❤️", "🔥", "😂", "😍", "👍", "🎉", "😭", "👀", "💀", "✨", "🙏", "😮"];
const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const GIPHY_API_KEY = "fR9MLGSAdqsbgT2S4RXDUoKLEBnHEPqA";

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
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
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordError, setRecordError] = useState("");
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(messages);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);

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
          <div className="font-semibold text-sm">{other?.username}</div
