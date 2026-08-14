export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function FollowingPage({ params }) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", params.username)
    .maybeSingle();

  if (!profile) notFound();

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id, profiles!following_id(username, avatar_url, bio)")
    .eq("follower_id", profile.id);

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-hairline">
        <Link href={`/profile/${profile.username}`}><ChevronLeft size={22} /></Link>
        <div className="font-display italic text-[17px]">Following</div>
      </div>
      {(!follows || follows.length === 0) && (
        <div className="px-4 py-10 text-center text-inksoft text-sm">Not following anyone yet.</div>
      )}
      {(follows || []).map((f) => (
        <Link key={f.following_id} href={`/profile/${f.profiles?.username}`} className="flex items-center gap-3 px-4 py-3 border-b border-hairline">
          <img
            src={f.profiles?.avatar_url || `https://picsum.photos/seed/${f.profiles?.username}/200/200`}
            alt=""
            className="w-11 h-11 rounded-full object-cover"
          />
          <div>
            <div className="font-semibold text-[13.5px]">{f.profiles?.username}</div>
            {f.profiles?.bio && <div className="text-inksoft text-xs">{f.profiles.bio}</div>}
          </div>
        </Link>
      ))}
    </div>
  );
}
