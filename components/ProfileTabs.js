"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Grid3x3, Clapperboard, Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ProfileTabs({ allItems, reels, isMe, profileUserId }) {
  const supabase = createClient();
  const [tab, setTab] = useState("posts");
  const [savedItems, setSavedItems] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedLoaded, setSavedLoaded] = useState(false);

  useEffect(() => {
    if (tab !== "saved" || savedLoaded) return;
    (async () => {
      setSavedLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: saves } = await supabase.from("saves").select("post_id").eq("user_id", user.id).order("created_at", { ascending: false });
      const postIds = (saves || []).map((s) => s.post_id);
      if (postIds.length === 0) {
        setSavedItems([]);
        setSavedLoading(false);
        setSavedLoaded(true);
        return;
      }
      const { data: posts } = await supabase.from("posts").select("id, image_url, is_reel").in("id", postIds);
      const ordered = postIds.map((id) => (posts || []).find((p) => p.id === id)).filter(Boolean);
      setSavedItems(ordered);
      setSavedLoading(false);
      setSavedLoaded(true);
    })();
  }, [tab, savedLoaded, supabase]);

  const active = tab === "posts" ? allItems : tab === "reels" ? reels : savedItems;

  return (
    <div>
      <div className="flex border-t border-hairline">
        <button
          onClick={() => setTab("posts")}
          className="flex-1 flex items-center justify-center py-2.5"
          style={{ borderBottom: tab === "posts" ? "2px solid #1C1A17" : "2px solid transparent" }}
        >
          <Grid3x3 size={20} color={tab === "posts" ? "#1C1A17" : "#6B6459"} strokeWidth={1.6} />
        </button>
        <button
          onClick={() => setTab("reels")}
          className="flex-1 flex items-center justify-center py-2.5"
          style={{ borderBottom: tab === "reels" ? "2px solid #1C1A17" : "2px solid transparent" }}
        >
          <Clapperboard size={20} color={tab === "reels" ? "#1C1A17" : "#6B6459"} strokeWidth={1.6} />
        </button>
        {isMe && (
          <button
            onClick={() => setTab("saved")}
            className="flex-1 flex items-center justify-center py-2.5"
            style={{ borderBottom: tab === "saved" ? "2px solid #1C1A17" : "2px solid transparent" }}
          >
            <Bookmark size={20} color={tab === "saved" ? "#1C1A17" : "#6B6459"} strokeWidth={1.6} />
          </button>
        )}
      </div>

      {tab === "saved" && savedLoading ? (
        <div className="px-4 py-10 text-center text-inksoft text-sm">Loading...</div>
      ) : active.length === 0 ? (
        <div className="px-4 py-10 text-center text-inksoft text-sm">
          {tab === "posts" ? "No frames developed yet." : tab === "reels" ? "No reels yet." : "No saved frames yet."}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {active.map((p) => (
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
  );
}
