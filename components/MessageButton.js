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
      const { data: created } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
      convo = created;
    }
    if (convo) router.push(`/messages/${convo.id}`);
  };

  return (
    <button onClick={openChat} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold bg-ink text-white whitespace-nowrap">
      Message
    </button>
  );
}
