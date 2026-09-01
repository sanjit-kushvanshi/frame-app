"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ShieldCheck, ShieldOff, UserMinus } from "lucide-react";
import Avatar from "@/components/Avatar";

export default function CommunityMembersPage() {
  const supabase = createClient();
  const { id } = useParams();
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: memberRows } = await supabase
      .from("community_members")
      .select("id, user_id, role, joined_at")
      .eq("community_id", id)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true });

    const userIds = [...new Set((memberRows || []).map((m) => m.user_id))];
    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
      (profilesData || []).forEach((p) => { profilesMap[p.id] = p; });
    }

    setMembers((memberRows || []).map((m) => ({ ...m, profile: profilesMap[m.user_id] })));
    setLoading(false);
  };

  const handleLeave = async () => {
    setLeaving(true);
    const { error } = await supabase.rpc("leave_community", { cid: id });
    if (error) {
      console.error(error);
      setLeaving(false);
      return;
    }
    router.push("/communities");
  };

  const handlePromote = async (memberRowId) => {
    setActionLoadingId(memberRowId);
    const { error } = await supabase.from("community_members").update({ role: "admin" }).eq("id", memberRowId);
    if (error) alert(error.message);
    else load();
    setActionLoadingId(null);
  };

  const handleDemote = async (memberRowId) => {
    setActionLoadingId(memberRowId);
    const { error } = await supabase.from("community_members").update({ role: "member" }).eq("id", memberRowId);
    if (error) alert(error.message);
    else load();
    setActionLoadingId(null);
  };

  const handleRemove = async (memberRowId) => {
    setActionLoadingId(memberRowId);
    const { error } = await supabase.from("community_members").delete().eq("id", memberRowId);
    if (error) alert(error.message);
    else load();
    setActionLoadingId(null);
    setConfirmingRemoveId(null);
  };

  const roleLabel = (role) =>
    role === "creator" ? "Creator" : role === "admin" ? "Admin" : null;

  const myRole = members.find((m) => m.user_id === userId)?.role;
  const isCreator = myRole === "creator";

  return (
    <div className="min-h-screen bg-[#F7F4EE] pb-24">
      <div className="sticky top-0 bg-[#F7F4EE] border-b border-[#DCD6C8] px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => router.back()}>
          <ChevronLeft size={20} color="#1C1A17" />
        </button>
        <h1 className="font-['Fraunces'] italic text-lg text-[#1C1A17]">Members</h1>
      </div>

      {loading ? (
        <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">Loading...</p>
      ) : (
        <div className="divide-y divide-[#DCD6C8]">
          {members.map((m) => (
            <div key={m.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Link href={`/profile/${m.profile?.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar username={m.profile?.username} avatarUrl={m.profile?.avatar_url} size={40} className="flex-shrink-0" />
                  <p className="text-sm font-mono text-[#1C1A17] truncate">{m.profile?.username}</p>
                </Link>
                {roleLabel(m.role) && (
                  <span className="text-[10px] font-mono font-semibold text-[#FF6B35] border border-[#FF6B35] rounded-full px-2 py-0.5 flex-shrink-0">
                    {roleLabel(m.role)}
                  </span>
                )}
              </div>

              {isCreator && m.role !== "creator" && (
                <div className="flex gap-2 mt-2 pl-[52px]">
                  {m.role === "member" ? (
                    <button
                      onClick={() => handlePromote(m.id)}
                      disabled={actionLoadingId === m.id}
                      className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#1C1A17]/70 border border-[#DCD6C8] rounded-full px-2.5 py-1"
                    >
                      <ShieldCheck size={12} /> Make Admin
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDemote(m.id)}
                      disabled={actionLoadingId === m.id}
                      className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#1C1A17]/70 border border-[#DCD6C8] rounded-full px-2.5 py-1"
                    >
                      <ShieldOff size={12} /> Remove Admin
                    </button>
                  )}

                  {confirmingRemoveId === m.id ? (
                    <>
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={actionLoadingId === m.id}
                        className="text-[11px] font-mono font-semibold text-white bg-red-600 rounded-full px-2.5 py-1"
                      >
                        Confirm remove
                      </button>
                      <button
                        onClick={() => setConfirmingRemoveId(null)}
                        className="text-[11px] font-mono font-semibold text-[#1C1A17]/50 px-1"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmingRemoveId(m.id)}
                      className="flex items-center gap-1 text-[11px] font-mono font-semibold text-red-600 border border-red-200 rounded-full px-2.5 py-1"
                    >
                      <UserMinus size={12} /> Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {userId && (
        <div className="px-4 mt-6">
          {!confirmingLeave ? (
            <button
              onClick={() => setConfirmingLeave(true)}
              className="text-sm font-mono font-semibold text-red-600"
            >
              Leave Community
            </button>
          ) : (
            <div className="border border-[#DCD6C8] rounded-lg p-3 bg-white">
              <p className="text-xs font-mono text-[#1C1A17]/60 mb-3">
                Are you sure you want to leave? If you're the creator, ownership transfers to the longest-standing admin or member.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingLeave(false)}
                  disabled={leaving}
                  className="flex-1 text-xs font-mono font-semibold border border-[#DCD6C8] rounded-full py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="flex-1 text-xs font-mono font-semibold text-white bg-red-600 rounded-full py-2 disabled:opacity-50"
                >
                  {leaving ? "Leaving..." : "Leave"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
