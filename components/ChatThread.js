      "use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, SendHorizontal, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ChatThread({ conversationId, currentUserId, other, initialMessages }) {
  const supabase = createClient();
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return;
    setPendingFile(file);
    setPendingPreview({ url: URL.createObjectURL(file), type: isImage ? "image" : "video" });
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingFile) return;

    let media_url = null;
    let media_type = null;

    if (pendingFile) {
      setUploading(true);
      const ext = pendingFile.name.split(".").pop();
      const path = `${conversationId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("messages").upload(path, pendingFile);
      setUploading(false);
      if (uploadError) {
        alert("Couldn't send that file: " + uploadError.message);
        return;
      }
      const { data: pub } = supabase.storage.from("messages").getPublicUrl(path);
      media_url = pub.publicUrl;
      media_type = pendingPreview.type;
    }

    setText("");
    setPendingFile(null);
    setPendingPreview(null);

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, text: trimmed || null, media_url, media_type })
      .select()
      .single();
    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-hairline">
        <button onClick={() => router.push("/messages")}><ChevronLeft size={22} /></button>
        <img
          src={other?.avatar_url || `https://picsum.photos/seed/${other?.username}/200/200`}
          alt=""
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="font-semibold text-sm">{other?.username}</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center text-inksoft text-sm py-8">Start the conversation with {other?.username}.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex mb-2 ${m.sender_id === currentUserId ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[72%] rounded-2xl overflow-hidden text-[13.5px] leading-snug"
              style={
                m.media_url
                  ? { background: "transparent" }
                  : m.sender_id === currentUserId
                  ? { background: "#1C1A17", color: "#fff", padding: "10px 14px" }
                  : { background: "#fff", border: "1px solid #DCD6C8", color: "#1C1A17", padding: "10px 14px" }
              }
            >
              {m.media_url && m.media_type === "image" && (
                <img src={m.media_url} alt="" className="w-full max-w-[240px] rounded-2xl block" />
              )}
              {m.media_url && m.media_type === "video" && (
                <video src={m.media_url} controls className="w-full max-w-[240px] rounded-2xl block" />
              )}
              {m.text && (
                <div className={m.media_url ? "mt-1.5 px-1" : ""}>{m.text}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {pendingPreview && (
        <div className="px-3 pt-2 flex items-center gap-2">
          <div className="relative">
            {pendingPreview.type === "image" ? (
              <img src={pendingPreview.url} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <video src={pendingPreview.url} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <button
              onClick={() => {
                setPendingFile(null);
                setPendingPreview(null);
              }}
              className="absolute -top-1.5 -right-1.5 bg-ink text-white rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 p-3 border-t border-hairline items-center">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 text-ink"
          aria-label="Attach photo or video"
        >
          <ImagePlus size={22} strokeWidth={1.6} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
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
          style={{ background: text.trim() || pendingFile ? "#FF6B35" : "#DCD6C8" }}
        >
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
