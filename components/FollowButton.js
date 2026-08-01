"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function FollowButton({ currentUserId, targetUserId, initiallyFollowing }) {
  const supabase = createClient();
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", targetUserId);
      setFollowing(false);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: targetUserId });
      setFollowing(true);
    }
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap"
      style={following ? { border: "1px solid #DCD6C8", color: "#1C1A17" } : { background: "#1C1A17", color: "#fff" }}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
