"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search as SearchIcon } from "lucide-react";

export default function SearchPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

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
    <div className="p-4">
      <div className="flex items-center gap-2 border border-hairline rounded-lg px-3 py-2.5 bg-white">
        <SearchIcon size={16} color="#6B6459" />
        <input
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="Search people by username"
          className="flex-1 outline-none text-sm bg-transparent"
        />
      </div>

      <div className="mt-4">
        {results.map((p) => (
          <Link key={p.id} href={`/profile/${p.username}`} className="flex items-center gap-3 py-2.5 border-b border-hairline">
            <img
              src={p.avatar_url || `https://picsum.photos/seed/${p.username}/200/200`}
              alt=""
              className="w-11 h-11 rounded-full object-cover"
            />
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
    </div>
  );
}
