"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Send, Check, X, MoreVertical, Trash2 } from "lucide-react";

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
  const [profilesMap, setProfilesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
            if (payload.new.user_id === userId) return; // already added optimistically
            setMessages((prev) => [...prev, payload.new]);
          }
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [tab, membership, userId]);

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

    let currentMembership = null;
    if (user) {
      const { data: memberRow } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setMembership(memberRow);
      currentMembership = memberRow;
    }

    // Fetch all members' user_ids, then fetch their profiles separately
    // (community_members.user_id -> auth.users, not directly to profiles)
    const { data: allMembers } = await supabase
      .from("community_members")
      .select("id, user_id, chat_status")
      .eq("community_id", id);

    const userIds = [...new Set((allMembers || []).map((m) => m.user_id))];
    let map = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
      (profilesData || []).forEach((p) => {
        map[p.id] = p;
      });
    }
    setProfilesMap(map);

    if (currentMembership && ["admin", "creator"].includes(currentMembership.role)) {
      const pending = (allMembers || [])
        .filter((m) => m.chat_status === "pending")
        .map((m) => ({ ...m, profile: map[m.user_id] }));
      setPendingRequests(pending);
    }

    const { data: postsData } = await supabase
      .from("posts")
      .select("id, image_url, is_reel")
      .eq("community_id", id)
      .order("created_at", { ascending: false });
    setPosts(postsData || []);

    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("community_messages")
      .select("id, user_id, content, created_at")
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
    load();
  };

  const handleReject = async (memberRowId) => {
    await supabase
      .from("community_members")
      .update({ chat_status: "rejected" })
      .eq("id", memberRowId);
    load();
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage("");

    // Optimistic append so it shows immediately for the sender
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await supabase.from("community_messages").insert({
      community_id: id,
      user_id: userId,
      content,
    });
    if (error) {
      console.error(error);
    }
  };

  const handleDeleteCommunity = async () => {
    setDeleting(true);
    const { error } = await supabase.from("communities").delete().eq("id", id);
    if (error) {
      console.error(error);
      setDeleting(false);
      return;
    }
    router.push("/communities");
  };

  if (loading) {
    return <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">Loading...</p>;
  }

  if (!community) {
    return <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">Community not found.</p>;
  }

  const isAdmin = membership && ["admin", "creator"].includes(membership.role);
  const isCreator = membership && membership.role === "creator";

  return (
    <div className="min-h-screen bg-[#F7F4EE] pb-24">
      <div className="sticky top-0 bg-[#F7F4EE] border-b border-[#DCD6C8] px-4 py-3 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()}>
            <ChevronLeft size={20} color="#1C1A17" />
          </button>
          <Link href={`/communities/${id}/members`} className="font-['Fraunces'] italic text-lg text-[#1C1A17] truncate">
            {community.name}
          </Link>
        </div>

        {isCreator && (
          <div className="relative flex-shrink-0">
            <button onClick={() => setMenuOpen((v) => !v)}>
              <MoreVertical size={20} color="#1C1A17" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white border border-[#DCD6C8] rounded-lg shadow-md overflow-hidden z-20 w-44">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmingDelete(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-mono text-red-600"
                >
                  <Trash2 size={15} />
                  Delete Community
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-[#F7F4EE] rounded-xl p-5 w-full max-w-sm">
            <h2 className="font-['Fraunces'] text-lg text-[#1C1A17] mb-2">Delete this community?</h2>
            <p className="text-sm font-mono text-[#1C1A17]/60 mb-4">
              This permanently deletes {community.name}, all its posts, members, and chat messages. This can't be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="flex-1 text-sm font-mono font-semibold text-[#1C1A17] border border-[#DCD6C8] rounded-full py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCommunity}
                disabled={deleting}
                className="flex-1 text-sm font-mono font-semibold text-white bg-red-600 rounded-full py-2 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                      src={r.profile?.avatar_url || `https://picsum.photos/seed/${r.user_id}/100`}
                      className="w-8 h-8 rounded-full object-cover"
                      alt=""
                    />
                    <span className="text-sm font-mono text-[#1C1A17]">{r.profile?.username}</span>
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
                        <p className="text-[10px] font-mono opacity-60 mb-0.5">
                          {profilesMap[m.user_id]?.username || "..."}
                        </p>
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
