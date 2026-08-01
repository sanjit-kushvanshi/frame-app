import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ChatThread from "@/components/ChatThread";

export default async function ConversationPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, user_a, user_b")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!convo) notFound();
  if (convo.user_a !== user.id && convo.user_b !== user.id) redirect("/messages");

  const otherId = convo.user_a === user.id ? convo.user_b : convo.user_a;
  const { data: other } = await supabase.from("profiles").select("id, username, avatar_url").eq("id", otherId).single();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, text, sender_id, created_at")
    .eq("conversation_id", convo.id)
    .order("created_at", { ascending: true });

  return (
    <ChatThread
      conversationId={convo.id}
      currentUserId={user.id}
      other={other}
      initialMessages={messages || []}
    />
  );
}
