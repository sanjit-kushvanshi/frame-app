"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinGroupPage({ params }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [group, setGroup] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please log in first.");
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      const { data: convo } = await supabase
        .from("conversations")
        .select("id, name, avatar_url, is_group")
        .eq("invite_code", params.code)
        .eq("is_group", true)
        .maybeSingle();

      if (!convo) {
        setError("This invite link is invalid or has expired.");
        setLoading(false);
        return;
      }
      setGroup(convo);

      const { data: existingParticipant } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", convo.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingParticipant) {
        setStatus("member");
        setLoading(false);
        return;
      }

      const { data: existingRequest } = await supabase
        .from("conversation_join_requests")
        .select("status")
        .eq("conversation_id", convo.id)
        .eq("user_id", user.id)
        .maybeSingle();

      setStatus(existingRequest?.status === "pending" ? "pending" : "can_request");
      setLoading(false);
    })();
  }, [params.code, supabase]);

  const requestJoin = async () => {
    setSubmitting(true);
    const { error: reqError } = await supabase
      .from("conversation_join_requests")
      .upsert({ conversation_id: group.id, user_id: currentUserId, status: "pending" }, { onConflict: "conversation_id,user_id" });
    setSubmitting(false);
    if (reqError) {
      alert("Couldn't send join request: " + reqError.message);
      return;
    }
    setStatus("pending");
  };

  if (loading) return <div className="p-6 text-center text-inksoft text-sm">Loading...</div>;
  if (error) return <div className="p-6 text-center text-inksoft text-sm">{error}</div>;

  return (
    <div className="flex flex-col items-center p-8 text-center">
      <img
        src={group.avatar_url || `https://picsum.photos/seed/${group.id}/200/200`}
        alt=""
        className="w-24 h-24 rounded-full object-cover mb-4"
      />
      <div className="font-semibold text-[16px] mb-1">{group.name}</div>
      <div className="text-inksoft text-[12.5px] mb-6">Group chat invite</div>

      {status === "member" && (
        <button onClick={() => router.push(`/messages/${group.id}`)} className="rounded-full px-6 py-2.5 text-[13.5px] font-semibold text-white" style={{ background: "#FF6B35" }}>
          Open chat
        </button>
      )}
      {status === "pending" && (
        <div className="text-[13px] text-inksoft">Your request to join is pending approval.</div>
      )}
      {status === "can_request" && (
        <button onClick={requestJoin} disabled={submitting} className="rounded-full px-6 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50" style={{ background: "#FF6B35" }}>
          {submitting ? "Sending..." : "Request to join"}
        </button>
      )}
    </div>
  );
}
