"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [memberOf, setMemberOf] = useState(new Set());
  const [joiningId, setJoiningId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: communitiesData } = await supabase
      .from("communities")
      .select("*")
      .order("created_at", { ascending: false });

    setCommunities(communitiesData || []);

    if (user) {
      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id);
      setMemberOf(new Set((memberships || []).map((m) => m.community_id)));
    }

    setLoading(false);
  };

  const handleJoin = async (communityId) => {
    if (!userId) return;
    setJoiningId(communityId);

    const { error } = await supabase.from("community_members").insert({
      community_id: communityId,
      user_id: userId,
      role: "member",
      chat_status: "none",
    });

    if (!error) {
      setMemberOf((prev) => new Set(prev).add(communityId));
    } else {
      console.error(error);
    }
    setJoiningId(null);
  };

  const filtered = communities.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F4EE] pb-24">
      <div className="sticky top-0 bg-[#F7F4EE] border-b border-[#DCD6C8] px-4 py-3 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-['Fraunces'] italic text-xl text-[#1C1A17]">Communities</h1>
          <Link
            href="/communities/create"
            className="text-[#FF6B35] text-sm font-mono font-semibold"
          >
            + New
          </Link>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search communities"
          className="w-full bg-white border border-[#DCD6C8] rounded-full px-4 py-2 text-sm font-mono text-[#1C1A17] focus:outline-none focus:border-[#FF6B35]"
        />
      </div>

      {loading ? (
        <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">
          Loading...
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">
          No communities found.
        </p>
      ) : (
        <div className="divide-y divide-[#DCD6C8]">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/communities/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[#DCD6C8] overflow-hidden flex-shrink-0">
                  {c.avatar_url && (
                    <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-['Fraunces'] text-[#1C1A17] truncate">{c.name}</p>
                  {c.description && (
                    <p className="text-xs font-mono text-[#1C1A17]/50 truncate">
                      {c.description}
                    </p>
                  )}
                </div>
              </Link>

              {memberOf.has(c.id) ? (
                <span className="text-xs font-mono text-[#1C1A17]/40 flex-shrink-0">Joined</span>
              ) : (
                <button
                  onClick={() => handleJoin(c.id)}
                  disabled={joiningId === c.id}
                  className="text-xs font-mono font-semibold text-[#FF6B35] border border-[#FF6B35] rounded-full px-3 py-1 flex-shrink-0 disabled:opacity-40"
                >
                  {joiningId === c.id ? "..." : "Join"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
