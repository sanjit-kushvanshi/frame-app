"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Check, X, MoreVertical, Trash2, LayoutGrid, Rows3, Pencil } from "lucide-react";
import CommunityChat from "@/components/CommunityChat";
import PostCard from "@/components/PostCard";
import Avatar from "@/components/Avatar";

export default function CommunityPage() {
  const supabase = createClient();
  const { id } = useParams();
  const router = useRouter();

  const [community, setCommunity] = useState(null);
  const [membership, setMembership] = useState(null);
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState("feed");
  const [feedView, setFeedView] = useState("grid");
  const [rawPosts, setRawPosts] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id || null;
    if (user) setUserId(user.id);

    const { data: communityData } = await supabase.from("communities").select("*").eq("id", id).single();
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

    const { data: allMembers } = await supabase
      .from("community_members")
      .select("id, user_id, chat_status")
      .eq("community_id", id);

    const userIds = [...new Set((allMembers || []).map((m) => m.user_id))];
    let map = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);
      (profilesData || []).forEach((p) => { map[p.id] = p; });
    }
    setProfilesMap(map);

    if (currentMembership && ["admin", "creator"].includes(currentMembership.role)) {
      setPendingRequests((allMembers || []).filter((m) => m.chat_status === "pending").map((m) => ({ ...m, profile: map[m.user_id] })));
    }

    const { data: postsData } = await supabase
      .from("posts")
      .select("id, image_url, caption, location, created_at, user_id, is_reel, profiles!user_id(username, avatar_url)")
      .eq("community_id", id)
      .order("created_at", { ascending: false });

    setRawPosts(postsData || []);

    const postIds = (postsData || []).map((p) => p.id);
    const [{ data: likes }, { data: saves }, { data: comments }] = await Promise.all([
      postIds.length ? supabase.from("likes").select("post_id, user_id").in("post_id", postIds) : { data: [] },
      postIds.length && currentUserId
        ? supabase.from("saves").select("post_id, user_id").eq("user_id", currentUserId).in("post_id", postIds)
        : { data: [] },
      postIds.length
        ? supabase.from("comments").select("id, post_id, text, user_id, parent_id, profiles!user_id(username, avatar_url)").in("post_id", postIds)
        : { data: [] },
    ]);

    const total = (postsData || []).length;
    const enriched = (postsData || []).map((p, i) => ({
      ...p,
      likeCount: (likes || []).filter((l) => l.post_id === p.id).length,
      likedByMe: (likes || []).some((l) => l.post_id === p.id && l.user_id === currentUserId),
      savedByMe: (saves || []).some((s) => s.post_id === p.id),
      comments: (comments || []).filter((c) => c.post_id === p.id),
      frame_no: total - i,
    }));
    setFeedPosts(enriched);

    setLoading(false);
  };

  const handleJoinFeed = async () => {
    const { error } = await supabase.from("community_members").insert({ community_id: id, user_id: userId, role: "member", chat_status: "none" });
    if (!error) load();
  };

  const handleRequestChat = async () => {
    const { error } = await supabase.from("community_members").update({ chat_status: "pending" }).eq("community_id", id).eq("user_id", userId);
    if (!error) load();
  };

  const handleApprove = async (memberRowId) => {
    await supabase.from("community_members").update({ chat_status: "approved" }).eq("id", memberRowId);
    load();
  };

  const handleReject = async (memberRowId) => {
    await supabase.from("community_members").update({ chat_status: "rejected" }).eq("id", memberRowId);
    load();
  };

  const handleDeleteCommunity = async () => {
    setDeleting(true);
    const { error } = await supabase.from("communities").delete().eq("id", id);
    if (error) { console.error(error); setDeleting(false); return; }
    router.push("/communities");
  };

  if (loading) return <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">Loading...</p>;
  if (!community) return <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">Community not found.</p>;

  const isAdmin = membership && ["admin", "creator"].includes(membership.role);
  const isCreator = membership && membership.role === "creator";

  return (
    <div className="min-h-screen bg-[#F7F4EE] pb-24">
      <div className="sticky top-0 bg-[#F7F4EE] border-b border-[#DCD6C8] px-4 py-3 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()}><ChevronLeft size={20} color="#1C1A17" /></button>
          <span className="font-['Fraunces'] italic text-lg text-[#1C1A17] truncate">
            {community.name}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href={`/communities/${id}/members`} className="text-xs font-mono font-semibold text-[#1C1A17]/60">
            Members
          </Link>
          {isAdmin && (
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)}><MoreVertical size={20} color="#1C1A17" /></button>
              {menuOpen && (
                <div className="absolute right-0 top-8 bg-white border border-[#DCD6C8] rounded-lg shadow-md overflow-hidden z-20 w-44">
                  <Link
                    href={`/communities/${id}/edit`}
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-mono text-[#1C1A17]"
                  >
                    <Pencil size={15} /> Edit Community
                  </Link>
                  {isCreator && (
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmingDelete(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-mono text-red-600 border-t border-[#DCD6C8]"
                    >
                      <Trash2 size={15} /> Delete Community
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-[#F7F4EE] rounded-xl p-5 w-full max-w-sm">
            <h2 className="font-['Fraunces'] text-lg text-[#1C1A17] mb-2">Delete this community?</h2>
            <p className="text-sm font-mono text-[#1C1A17]/60 mb-4">This permanently deletes {community.name}, all its posts, members, and chat messages. This can't be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmingDelete(false)} disabled={deleting} className="flex-1 text-sm font-mono font-semibold text-[#1C1A17] border border-[#DCD6C8] rounded-full py-2">Cancel</button>
              <button onClick={handleDeleteCommunity} disabled={deleting} className="flex-1 text-sm font-mono font-semibold text-white bg-red-600 rounded-full py-2 disabled:opacity-50">{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="h-28 bg-[#DCD6C8]">
          {community.cover_url && <img src={community.cover_url} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="absolute left-4 -bottom-8 w-16 h-16 rounded-full border-4 border-[#F7F4EE] overflow-hidden bg-[#DCD6C8]">
          {community.avatar_url && <img src={community.avatar_url} alt="" className="w-full h-full object-cover" />}
        </div>
      </div>

      <div className="px-4 pt-10 pb-3">
        {community.description && <p className="text-sm text-[#1C1A17]/70 font-mono">{community.description}</p>}
        {!membership && (
          <button onClick={handleJoinFeed} className="mt-3 text-xs font-mono font-semibold text-white bg-[#FF6B35] rounded-full px-4 py-2">Join Community</button>
        )}
      </div>

      <div className="flex border-b border-[#DCD6C8]">
        <button onClick={() => setTab("feed")} className={`flex-1 py-2.5 text-sm font-mono font-semibold ${tab === "feed" ? "text-[#FF6B35] border-b-2 border-[#FF6B35]" : "text-[#1C1A17]/50"}`}>Feed</button>
        <button onClick={() => setTab("chat")} className={`flex-1 py-2.5 text-sm font-mono font-semibold ${tab === "chat" ? "text-[#FF6B35] border-b-2 border-[#FF6B35]" : "text-[#1C1A17]/50"}`}>Chat</button>
      </div>

      {tab === "feed" && (
        <div>
          {isAdmin && pendingRequests.length > 0 && (
            <div className="px-4 py-3 border-b border-[#DCD6C8] bg-white">
              <p className="text-xs font-mono font-semibold text-[#1C1A17]/60 mb-2">Chat requests ({pendingRequests.length})</p>
              {pendingRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar username={r.profile?.username} avatarUrl={r.profile?.avatar_url} size={32} />
                    <span className="text-sm font-mono text-[#1C1A17]">{r.profile?.username}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(r.id)} className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center"><Check size={14} color="green" /></button>
                    <button onClick={() => handleReject(r.id)} className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center"><X size={14} color="red" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-1 px-4 py-2 border-b border-[#DCD6C8]">
            <button
              onClick={() => setFeedView("grid")}
              className="p-1.5 rounded"
              style={{ background: feedView === "grid" ? "#FF6B35" : "transparent" }}
            >
              <LayoutGrid size={16} color={feedView === "grid" ? "#fff" : "#1C1A17"} />
            </button>
            <button
              onClick={() => setFeedView("posts")}
              className="p-1.5 rounded"
              style={{ background: feedView === "posts" ? "#FF6B35" : "transparent" }}
            >
              <Rows3 size={16} color={feedView === "posts" ? "#fff" : "#1C1A17"} />
            </button>
          </div>

          {rawPosts.length === 0 ? (
            <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">No posts yet in this community.</p>
          ) : feedView === "grid" ? (
            <div className="overflow-y-auto grid grid-cols-3 gap-0.5 p-0.5" style={{ maxHeight: "calc(100vh - 300px)" }}>
              {rawPosts.map((p) => (
                <Link key={p.id} href={`/post/${p.id}`} className="aspect-square overflow-hidden block bg-black">
                  {p.is_reel ? <video src={p.image_url} className="w-full h-full object-cover" /> : <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                </Link>
              ))}
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
              {feedPosts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={userId} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "chat" && (
        <CommunityChat
          communityId={id}
          userId={userId}
          chatStatus={membership?.chat_status || null}
          profilesMap={profilesMap}
          onRequestChat={handleRequestChat}
        />
      )}
    </div>
  );
}
