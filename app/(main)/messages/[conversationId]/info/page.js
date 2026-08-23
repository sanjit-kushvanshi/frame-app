import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import GroupInfo from "@/components/GroupInfo";

export default async function GroupInfoPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, name, avatar_url, is_group, created_by")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!convo || !convo.is_group) notFound();

  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", convo.id);

  const participantIds = (participantRows || []).map((p) => p.user_id);
  if (!participantIds.includes(user.id)) redirect("/messages");

  const { data: participants } = participantIds.length
    ? await supabase.from("profiles").select("id, username, avatar_url").in("id", participantIds)
    : { data: [] };

  return (
    <GroupInfo
      conversationId={convo.id}
      currentUserId={user.id}
      isCreator={convo.created_by === user.id}
      groupName={convo.name}
      groupAvatarUrl={convo.avatar_url}
      participants={participants || []}
    />
  );
}
