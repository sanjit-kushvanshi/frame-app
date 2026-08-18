export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Clapperboard } from "lucide-react";

export default async function ExplorePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: following } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
  const excludeIds = [user.id, ...(following || []).map((f) => f.following_id)];

  const { data: posts } = await supabase
    .from("posts")
    .select("id, image_url, is_reel, user_id, profiles!user_id(username, avatar_url)")
    .not("user_id", "in", `(${excludeIds.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <div>
      <div className="px-4 py-3 border-b border-hairline font-display italic text-[17px]">Explore</div>
      {(!posts || posts.length === 0) && (
        <div className="px-8 py-16 text-center font-mono text-sm text-inksoft">
          Nothing new to explore yet. Check back once more people post.
        </div>
      )}
      {posts && posts.length > 0 && (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts.map((p) => (
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
