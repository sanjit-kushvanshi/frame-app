"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Send, Check, X } from "lucide-react";

export default function CommunityPage() {
  const supabase = createClient();
  const { id } = useParams();
  const router = useRouter();

  const [community, setCommunity] = useState(null);
  const [membership, setMembership] = useState(null);
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState("feed");
  const [posts, setPosts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (tab === "chat" && membership?.chat_status === "approved") {
      fetchMessages();
      const channel = supabase
        .channel(`community_${id}_chat`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "community_messages", filter: `community_id=eq.${id}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          }
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [tab, membership]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: communityData } = await supabase
      .from("communities")
      .select("*")
      .eq("id", id)
      .single();
    setCommunity(communityData);

    if (user) {
      const { data: memberRow } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setMembership(memberRow);

      if (memberRow && ["admin", "creator"].includes(memberRow.role)) {
        fetchPendingRequests();
      }
    }

    const { data: postsData } = await supabase
      .from("posts")
      .select("id, image_url, is_reel")
      .eq("community_id", id)
      .order("created_at", { ascending: false });
    setPosts(postsData || []);

    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from("community_members")
      .select("id, user_id, chat_status, profiles!user_id(username, avatar_url)")
      .eq("community_id", id)
      .eq("chat_status", "pending");
    setPendingRequests(data || []);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("community_messages")
      .select("id, user_id, content, created_at, profiles!user_id(username, avatar_url)")
      .eq("community_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages(data || []);
  };

  const handleJoinFeed = async () => {
    const { error } = await supabase.from("community_members").insert({
      community_id: id,
      user_id: userId,
      role: "member",
      chat_status: "none",
    });
    if (!error) load();
  };

  const handleRequestChat = async () => {
    const { error } = await supabase
      .from("community_members")
      .update({ chat_status: "pending" })
      .eq("community_id", id)
      .eq("user_id", userId);
    if (!error) load();
  };

  const handleApprove = async (memberRowId) => {
    await supabase
      .from("community_members")
      .update({ chat_status: "approved" })
      .eq("id", memberRowId);
    fetchPendingRequests();
  };

  const handleReject = async (memberRowId) => {
    await supabase
      .from("community_members")
      .update({ chat_status: "rejected" })
      .eq("id", memberRowId);
    fetchPendingRequests();
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage("");
    await supabase.from("community_messages").insert({
      community_id: id,
      user_id: userId,
      content,
    });
  };

  if (loading) {
    return <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">Loading...</p>;
  }

  if (!community) {
    return <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">Community not found.</p>;
  }

  const isAdmin = membership && ["admin", "creator"].includes(membership.role);

  return (
    <div className="min-h-screen bg-[#F7F4EE] pb-24">
      <div className="sticky top-0 bg-[#F7F4EE] border-b border-[#DCD6C8] px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => router.back()}>
          <ChevronLeft size={20} color="#1C1A17" />
        </button>
        <h1 className="font-['Fraunces'] italic text-lg text-[#1C1A17] truncate">{community.name}</h1>
      </div>

      <div className="relative">
        <div className="h-28 bg-[#DCD6C8]">
          {community.cover_url && (
            <img src={community.cover_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="absolute left-4 -bottom-8 w-16 h-16 rounded-full border-4 border-[#F7F4EE] overflow-hidden bg-[#DCD6C8]">
          {community.avatar_url && (
            <img src={community.avatar_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      </div>

      <div className="px-4 pt-10 pb-3">
        {community.description && (
          <p className="text-sm text-[#1C1A17]/70 font-mono">{community.description}</p>
        )}
        {!membership && (
          <button
            onClick={handleJoinFeed}
            className="mt-3 text-xs font-mono font-semibold text-white bg-[#FF6B35] rounded-full px-4 py-2"
          >
            Join Community
          </button>
        )}
      </div>

      <div className="flex border-b border-[#DCD6C8]">
        <button
          onClick={() => setTab("feed")}
          className={`flex-1 py-2.5 text-sm font-mono font-semibold ${tab === "feed" ? "text-[#FF6B35] border-b-2 border-[#FF6B35]" : "text-[#1C1A17]/50"}`}
        >
          Feed
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`flex-1 py-2.5 text-sm font-mono font-semibold ${tab === "chat" ? "text-[#FF6B35] border-b-2 border-[#FF6B35]" : "text-[#1C1A17]/50"}`}
        >
          Chat
        </button>
      </div>

      {tab === "feed" && (
        <div>
          {isAdmin && pendingRequests.length > 0 && (
            <div className="px-4 py-3 border-b border-[#DCD6C8] bg-white">
              <p className="text-xs font-mono font-semibold text-[#1C1A17]/60 mb-2">
                Chat requests ({pendingRequests.length})
              </p>
              {pendingRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <img
                      src={r.profiles?.avatar_url || `https://picsum.photos/seed/${r.user_id}/100`}
                      className="w-8 h-8 rounded-full object-cover"
                      alt=""
                    />
                    <span className="text-sm font-mono text-[#1C1A17]">{r.profiles?.username}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(r.id)} className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                      <Check size={14} color="green" />
                    </button>
                    <button onClick={() => handleReject(r.id)} className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                      <X size={14} color="red" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">
              No posts yet in this community.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {posts.map((p) => (
                <Link key={p.id} href={`/post/${p.id}`} className="aspect-square overflow-hidden block bg-black">
                  {p.is_reel ? (
                    <video src={p.image_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div className="flex flex-col" style={{ minHeight: "60vh" }}>
          {!membership ? (
            <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10 px-6">
              Join the community first to request chat access.
            </p>
          ) : membership.chat_status === "approved" ? (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.user_id === userId ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${m.user_id === userId ? "bg-[#FF6B35] text-white" : "bg-white text-[#1C1A17]"}`}>
                      {m.user_id !== userId && (
                        <p className="text-[10px] font-mono opacity-60 mb-0.5">{m.profiles?.username}</p>
                      )}
                      <p className="text-sm">{m.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
              <div className="sticky bottom-0 bg-[#F7F4EE] border-t border-[#DCD6C8] px-3 py-2 flex items-center gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Message the group..."
                  className="flex-1 bg-white border border-[#DCD6C8] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#FF6B35]"
                />
                <button onClick={sendMessage} className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                  <Send size={16} color="white" />
                </button>
              </div>
            </>
          ) : membership.chat_status === "pending" ? (
            <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10 px-6">
              Your request to join the chat is pending approval.
            </p>
          ) : membership.chat_status === "rejected" ? (
            <div className="text-center mt-10 px-6">
              <p className="text-sm font-mono text-[#1C1A17]/40 mb-3">Your chat request was declined.</p>
              <button
                onClick={handleRequestChat}
                className="text-xs font-mono font-semibold text-[#FF6B35] border border-[#FF6B35] rounded-full px-4 py-2"
              >
                Request again
              </button>
            </div>
          ) : (
            <div className="text-center mt-10 px-6">
              <button
                onClick={handleRequestChat}
                className="text-xs font-mono font-semibold text-white bg-[#FF6B35] rounded-full px-4 py-2"
              >
                Request to join chat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
