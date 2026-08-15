"use client";
import { useState } from "react";
import Link from "next/link";
import { Grid3x3, Clapperboard } from "lucide-react";

export default function ProfileTabs({ posts, reels }) {
  const [tab, setTab] = useState("posts");
  const active = tab === "posts" ? posts : reels;

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
      </div>

      {active.length === 0 ? (
        <div className="px-4 py-10 text-center text-inksoft text-sm">
          {tab === "posts" ? "No frames developed yet." : "No reels yet."}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {active.map((p) => (
            <Link key={p.id} href={`/post/${p.id}`} className="aspect-square overflow-hidden block relative bg-ink">
              {tab === "reels" ? (
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
