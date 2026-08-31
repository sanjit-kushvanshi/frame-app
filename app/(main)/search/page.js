"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search as SearchIcon, Clapperboard, Users, ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";

export default function SearchPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [explorePosts, setExplorePosts] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: following } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      const excludeIds = [user.id, ...(following || []).map((f) => f.following_id)];

      const { data: posts } = await supabase
        .from("posts")
        .select("id, image_url, is_reel, user_id")
        .not("user_id", "in", `(${excludeIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(60);

      setExplorePosts(posts || []);
      setExploreLoading(false);
    })();
  }, [supabase]);

  const runSearch = async (q) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio")
      .ilike("username", `%${q.trim()}%`)
      .limit(20);
    setResults(data || []);
    setSearched(true);
  };

  return (
    <div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 border border-hairline rounded-lg px-3 py-2.5 bg-white">
          <SearchIcon size={16} color="#6B6459" />
          <input
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search people by username"
            className="flex-1 outline-none text-sm bg-transparent"
          />
        </div>

        {!query.trim() && (
          <Link
            href="/communities"
            className="flex items-center justify-between border border-hairline rounded-lg px-3 py-2.5 bg-white"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FF6B35]/10 flex items-center justify-center">
                <Users size={16} color="#FF6B35" />
              </div>
              <div>
                <div className="font-semibold text-[13.5px] text-ink">Communities</div>
                <div className="text-inksoft text-xs">Find and join spaces</div>
              </div>
            </div>
            <ChevronRight size={16} color="#6B6459" />
          </Link>
        )}
      </div>

      {query.trim() ? (
        <div className="px-4">
          {results.map((p) => (
            <Link key={p.id} href={`/profile/${p.username}`} className="flex items-center gap-3 py-2.5 border-b border-hairline">
              <Avatar username={p.username} avatarUrl={p.avatar_url} size={44} />
              <div>
                <div className="font-semibold text-[13.5px]">{p.username}</div>
                <div className="text-inksoft text-xs">{p.bio}</div>
              </div>
            </Link>
          ))}
          {searched && results.length === 0 && (
            <div className="text-center text-inksoft font-mono text-sm py-10">No one by that name yet.</div>
          )}
        </div>
      ) : (
        <div>
          {exploreLoading && <div className="text-center text-inksoft font-mono text-sm py-10">Loading...</div>}
          {!exploreLoading && explorePosts.length === 0 && (
            <div className="text-center text-inksoft font-mono text-sm py-10 px-8">
              Nothing new to explore yet. Check back once more people post.
            </div>
          )}
          {explorePosts.length > 0 && (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {explorePosts.map((p) => (
                <Link key={p.id} href={`/post/${p.id}`} className="aspect-square overflow-hidden block relative bg-ink">
                  {p.is_reel ? (
                    <>
                      <video src={p.image_url} className="w-full h-full object-cover block" />
                      <Clapperboard size={14} className="absolute top-1.5 right-1.5 text-white" style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.6))" }} />
                    </>
                  ) : (
                    <img src={p.image_url} alt="" className="w-full h-full object-cover block" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
