"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MessageButton({ currentUserId, targetUserId }) {
  const supabase = createClient();
  const router = useRouter();

  const openChat = async () => {
    const [a, b] = [currentUserId, targetUserId].sort();
    let { data: convo } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", a)
      .eq("user_b", b)
      .maybeSingle();

    if (!convo) {
      const { data: created, error: convoError } = await supabase
        .from("conversations")
        .insert({ user_a: a, user_b: b, created_by: currentUserId })
        .select("id")
        .single();

      if (convoError || !created) {
        alert("Couldn't start the conversation: " + (convoError?.message || "unknown error"));
        return;
      }
      convo = created;

      const participantRows = [currentUserId, targetUserId].map((user_id) => ({
        conversation_id: convo.id,
        user_id,
        is_admin: user_id === currentUserId,
      }));

      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert(participantRows);

      if (participantsError) {
        alert("Conversation created but adding participants failed: " + participantsError.message);
        return;
      }
    }

    if (convo) router.push(`/messages/${convo.id}`);
  };

  return (
    <button onClick={openChat} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold bg-ink text-white whitespace-nowrap">
      Message
    </button>
  );
}
