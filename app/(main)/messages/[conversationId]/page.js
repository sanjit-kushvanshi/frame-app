import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ChatThread from "@/components/ChatThread";

export default async function ConversationPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, is_group, name")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!convo) notFound();

  if (convo.is_group) {
    const { data: participantRows } = await supabase
      .from("conversation_participants")
      .select("user_id, profiles!user_id(id, username, avatar_url)")
      .eq("conversation_id", convo.id);

    const participants = (participantRows || []).map((p) => p.profiles).filter(Boolean);
    const isMember = participants.some((p) => p.id === user.id);
    if (!isMember) redirect("/messages");

    const { data: messages } = await supabase
      .from("messages")
      .select("id, text, sender_id, created_at, media_url, media_type, reply_to_id, edited_at, deleted, shared_post_id, posts!shared_post_id(id, image_url, caption, media_type, user_id, profiles!user_id(username))")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true });

    const messageIds = (messages || []).map((m) => m.id);
    const { data: reactions } = messageIds.length
      ? await supabase.from("message_reactions").select("message_id, user_id, emoji").in("message_id", messageIds)
      : { data: [] };

    return (
      <ChatThread
        conversationId={convo.id}
        currentUserId={user.id}
        isGroup={true}
        groupName={convo.name}
        participants={participants}
        initialMessages={messages || []}
        initialReactions={reactions || []}
      />
    );
  }

  if (convo.user_a !== user.id && convo.user_b !== user.id) redirect("/messages");

  const otherId = convo.user_a === user.id ? convo.user_b : convo.user_a;
  const { data: other } = await supabase.from("profiles").select("id, username, avatar_url").eq("id", otherId).single();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, text, sender_id, created_at, media_url, media_type, reply_to_id, edited_at, deleted, shared_post_id, posts!shared_post_id(id, image_url, caption, media_type, user_id, profiles!user_id(username))")
    .eq("conversation_id", convo.id)
    .order("created_at", { ascending: true });

  const messageIds = (messages || []).map((m) => m.id);
  const { data: reactions } = messageIds.length
    ? await supabase.from("message_reactions").select("message_id, user_id, emoji").in("message_id", messageIds)
    : { data: [] };

  return (
    <ChatThread
      conversationId={convo.id}
      currentUserId={user.id}
      isGroup={false}
      other={other}
      initialMessages={messages || []}
      initialReactions={reactions || []}
    />
  );
}
