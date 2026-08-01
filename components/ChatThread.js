"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, SendHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ChatThread({ conversationId, currentUserId, other, initialMessages }) {
  const supabase = createClient();
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

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

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, text: trimmed })
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
              className="max-w-[72%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-snug"
              style={
                m.sender_id === currentUserId
                  ? { background: "#1C1A17", color: "#fff" }
                  : { background: "#fff", border: "1px solid #DCD6C8", color: "#1C1A17" }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 p-3 border-t border-hairline">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message..."
          className="flex-1 border border-hairline rounded-full px-3.5 py-2.5 text-[13.5px] bg-white outline-none"
        />
        <button
          onClick={send}
          className="rounded-full w-[38px] h-[38px] flex items-center justify-center flex-shrink-0 text-white"
          style={{ background: text.trim() ? "#FF6B35" : "#DCD6C8" }}
        >
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
