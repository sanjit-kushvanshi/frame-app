import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import MessageButton from "@/components/MessageButton";
import ProfileTabs from "@/components/ProfileTabs";
import ProfileSettingsMenu from "@/components/ProfileSettingsMenu";
import Avatar from "@/components/Avatar";

export default async function ProfilePage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .eq("username", params.username)
    .maybeSingle();

  if (!profile) notFound();

  const isMe = profile.id === user.id;

  const [{ data: allItems }, { count: followerCount }, { count: followingCount }, { data: iFollow }] = await Promise.all([
    supabase.from("posts").select("id, image_url, is_reel").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    isMe ? { data: null } : supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle(),
  ]);

  const reels = (allItems || []).filter((p) => p.is_reel);
  const totalFrames = (allItems || []).length;

  return (
    <div>
      {isMe && (
        <div className="flex justify-end px-4 pt-3">
          <ProfileSettingsMenu />
        </div>
      )}

      <div className="flex gap-5 px-4 pt-2 pb-2.5 items-center">
        <Avatar
          username={profile.username}
          avatarUrl={profile.avatar_url}
          size={76}
          className="border border-hairline"
        />
        <div className="flex gap-5 font-mono">
          <div className="text-center">
            <div className="text-base font-semibold">{totalFrames}</div>
            <div className="text-[10.5px] text-inksoft">frames</div>
          </div>
          <Link href={`/profile/${profile.username}/followers`} className="text-center">
            <div className="text-base font-semibold">{followerCount || 0}</div>
            <div className="text-[10.5px] text-inksoft">followers</div>
          </Link>
          <Link href={`/profile/${profile.username}/following`} className="text-center">
            <div className="text-base font-semibold">{followingCount || 0}</div>
            <div className="text-[10.5px] text-inksoft">following</div>
          </Link>
        </div>
      </div>

      <div className="px-4 pb-3.5 pt-1 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-sm">@{profile.username}</div>
          <div className="text-inksoft text-xs mt-0.5">{profile.bio}</div>
        </div>
        {!isMe ? (
          <div className="flex gap-2">
            <FollowButton currentUserId={user.id} targetUserId={profile.id} initiallyFollowing={!!iFollow} />
            <MessageButton currentUserId={user.id} targetUserId={profile.id} />
          </div>
        ) : (
          <Link href="/settings" className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold border border-hairline whitespace-nowrap">
            Edit profile
          </Link>
        )}
      </div>

      <ProfileTabs allItems={allItems || []} reels={reels} isMe={isMe} profileUserId={profile.id} />
    </div>
  );
}
