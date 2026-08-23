import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import GroupInfo from "@/components/GroupInfo";

export default async function GroupInfoPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, name, avatar_url, is_group, created_by, invite_code")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!convo || !convo.is_group) notFound();

  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("user_id, is_admin")
    .eq("conversation_id", convo.id);

  const myRow = (participantRows || []).find((p) => p.user_id === user.id);
  if (!myRow) redirect("/messages");

  const participantIds = (participantRows || []).map((p) => p.user_id);
  const { data: profiles } = participantIds.length
    ? await supabase.from("profiles").select("id, username, avatar_url").in("id", participantIds)
    : { data: [] };

  const participants = (profiles || []).map((p) => ({
    ...p,
    isAdmin: (participantRows || []).find((r) => r.user_id === p.id)?.is_admin || false,
  }));

  const isAdmin = !!myRow.is_admin;

  let joinRequests = [];
  if (isAdmin) {
    const { data: requests } = await supabase
      .from("conversation_join_requests")
      .select("id, user_id, status")
      .eq("conversation_id", convo.id)
      .eq("status", "pending");

    const requesterIds = (requests || []).map((r) => r.user_id);
    const { data: requesterProfiles } = requesterIds.length
      ? await supabase.from("profiles").select("id, username, avatar_url").in("id", requesterIds)
      : { data: [] };

    joinRequests = (requests || []).map((r) => ({
      ...r,
      profile: (requesterProfiles || []).find((p) => p.id === r.user_id),
    }));
  }

  return (
    <GroupInfo
      conversationId={convo.id}
      currentUserId={user.id}
      isAdmin={isAdmin}
      groupName={convo.name}
      groupAvatarUrl={convo.avatar_url}
      inviteCode={convo.invite_code}
      participants={participants}
      initialJoinRequests={joinRequests}
    />
  );
}
