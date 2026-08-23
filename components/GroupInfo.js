"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, X, Check, Pencil, ShieldCheck, Link2, Copy } from "lucide-react";
import { compressImage } from "@/lib/mediaCompress";
import { createClient } from "@/lib/supabase/client";

function generateCode() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export default function GroupInfo({ conversationId, currentUserId, isAdmin, groupName, groupAvatarUrl, inviteCode, participants, initialJoinRequests }) {
  const supabase = createClient();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(groupAvatarUrl);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(groupName || "");
  const [members, setMembers] = useState(participants);
  const [addingMode, setAddingMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [code, setCode] = useState(inviteCode);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [joinRequests, setJoinRequests] = useState(initialJoinRequests || []);

  useEffect(() => {
    if (!addingMode) return;
    const t = setTimeout(async () => {
      const existingIds = members.map((m) => m.id);
      let q = supabase.from("profiles").select("id, username, avatar_url").limit(15);
      if (query.trim()) q = q.ilike("username", `%${query.trim()}%`);
      const { data } = await q;
      setResults((data || []).filter((p) => !existingIds.includes(p.id)));
    }, 300);
    return () => clearTimeout(t);
  }, [query, addingMode, members, supabase]);

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file, { maxDim: 600, targetBytes: 200 * 1024 });
      const path = `${conversationId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("group-photos").upload(path, compressed);
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from("group-photos").getPublicUrl(path);
      const { error: updateError } = await supabase.from("conversations").update({ avatar_url: pub.publicUrl }).eq("id", conversationId);
      if (updateError) throw updateError;
      setAvatarUrl(pub.publicUrl);
    } catch (err) {
      alert("Couldn't update group photo: " + err.message);
    }
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("conversations").update({ name: trimmed }).eq("id", conversationId);
    if (error) {
      alert("Couldn't update group name: " + error.message);
      return;
    }
    setEditingName(false);
  };

  const removeMember = async (userId) => {
    if (!confirm("Remove this member from the group?")) return;
    const { error } = await supabase.from("conversation_participants").delete().eq("conversation_id", conversationId).eq("user_id", userId);
    if (error) {
      alert("Couldn't remove member: " + error.message);
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const leaveGroup = async () => {
    if (!confirm("Leave this group?")) return;
    const { error } = await supabase.from("conversation_participants").delete().eq("conversation_id", conversationId).eq("user_id", currentUserId);
    if (error) {
      alert("Couldn't leave group: " + error.message);
      return;
    }
    router.push("/messages");
  };

  const addMember = async (profile) => {
    const { error } = await supabase.from("conversation_participants").insert({ conversation_id: conversationId, user_id: profile.id });
    if (error) {
      alert("Couldn't add member: " + error.message);
      return;
    }
    setMembers((prev) => [...prev, { ...profile, isAdmin: false }]);
    setResults((prev) => prev.filter((p) => p.id !== profile.id));
  };

  const makeAdmin = async (userId) => {
    const { error } = await supabase.from("conversation_participants").update({ is_admin: true }).eq("conversation_id", conversationId).eq("user_id", userId);
    if (error) {
      alert("Couldn't make admin: " + error.message);
      return;
    }
    setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, isAdmin: true } : m)));
  };

  const generateLink = async () => {
    setGeneratingLink(true);
    const newCode = generateCode();
    const { error } = await supabase.from("conversations").update({ invite_code: newCode }).eq("id", conversationId);
    setGeneratingLink(false);
    if (error) {
      alert("Couldn't generate invite link: " + error.message);
      return;
    }
    setCode(newCode);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/messages/join/${code}`;
    navigator.clipboard.writeText(url);
    alert("Invite link copied.");
  };

  const approveRequest = async (req) => {
    const { error: insertError } = await supabase.from("conversation_participants").insert({ conversation_id: conversationId, user_id: req.user_id });
    if (insertError) {
      alert("Couldn't approve: " + insertError.message);
      return;
    }
    await supabase.from("conversation_join_requests").delete().eq("id", req.id);
    setJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
    if (req.profile) setMembers((prev) => [...prev, { ...req.profile, isAdmin: false }]);
  };

  const rejectRequest = async (req) => {
    await supabase.from("conversation_join_requests").delete().eq("id", req.id);
    setJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-hairline">
        <button onClick={() => router.back()}><ChevronLeft size={22} /></button>
        <div className="font-semibold text-sm flex-1">Group info</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center py-6 border-b border-hairline">
          <label className="relative">
            <img
              src={avatarUrl || `https://picsum.photos/seed/${conversationId}/200/200`}
              alt=""
              className="w-24 h-24 rounded-full object-cover"
            />
            <div className="absolute bottom-0 right-0 rounded-full w-8 h-8 flex items-center justify-center text-white" style={{ background: "#FF6B35" }}>
              <Camera size={15} />
            </div>
            <input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" disabled={uploadingPhoto} />
          </label>
          {uploadingPhoto && <div className="text-[11px] text-inksoft mt-2">Uploading...</div>}

          <div className="mt-4 flex items-center gap-2">
            {editingName ? (
              <>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="border border-hairline rounded-lg px-3 py-1.5 text-[14px] outline-none"
                  autoFocus
                />
                <button onClick={saveName}><Check size={18} color="#FF6B35" /></button>
                <button onClick={() => { setEditingName(false); setNameInput(groupName || ""); }}><X size={18} /></button>
              </>
            ) : (
              <>
                <div className="font-semibold text-[16px]">{nameInput}</div>
                <button onClick={() => setEditingName(true)}><Pencil size={15} className="text-inksoft" /></button>
              </>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="px-4 py-3 border-b border-hairline">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-inksoft mb-2">
              <Link2 size={14} /> Invite link
            </div>
            {code ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 text-[11.5px] font-mono truncate bg-paperdim rounded-lg px-2.5 py-2">
                  {typeof window !== "undefined" ? `${window.location.origin}/messages/join/${code}` : code}
                </div>
                <button onClick={copyLink} className="flex-shrink-0"><Copy size={16} /></button>
              </div>
            ) : (
              <div className="text-[12px] text-inksoft mb-2">No active invite link.</div>
            )}
            <button onClick={generateLink} disabled={generatingLink} className="text-[11.5px] font-semibold mt-2" style={{ color: "#FF6B35" }}>
              {generatingLink ? "Generating..." : code ? "Generate new link" : "Create invite link"}
            </button>
          </div>
        )}

        {isAdmin && joinRequests.length > 0 && (
          <div className="px-4 py-3 border-b border-hairline">
            <div className="text-[12.5px] font-semibold text-inksoft mb-2">Join requests</div>
            {joinRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 py-2">
                <img
                  src={req.profile?.avatar_url || `https://picsum.photos/seed/${req.profile?.username}/200/200`}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex-1 text-[13px] font-semibold">{req.profile?.username}</div>
                <button onClick={() => approveRequest(req)} className="text-[11.5px] font-semibold" style={{ color: "#FF6B35" }}>Approve</button>
                <button onClick={() => rejectRequest(req)} className="text-[11.5px] text-inksoft">Reject</button>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-[12.5px] font-semibold text-inksoft">{members.length} members</div>
          <button onClick={() => setAddingMode((a) => !a)} className="text-[12.5px] font-semibold" style={{ color: "#FF6B35" }}>
            {addingMode ? "Done" : "Add members"}
          </button>
        </div>

        {addingMode && (
          <div className="px-4 pb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users to add"
              className="w-full border border-hairline rounded-lg px-3.5 py-2 text-[13.5px] outline-none mb-2"
            />
            {results.map((p) => (
              <button key={p.id} onClick={() => addMember(p)} className="w-full flex items-center gap-3 py-2">
                <img src={p.avatar_url || `https://picsum.photos/seed/${p.username}/200/200`} alt="" className="w-9 h-9 rounded-full object-cover" />
                <div className="flex-1 text-left text-[13px]">{p.username}</div>
                <span className="text-[11px] font-semibold" style={{ color: "#FF6B35" }}>Add</span>
              </button>
            ))}
          </div>
        )}

        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-hairline">
            <img src={m.avatar_url || `https://picsum.photos/seed/${m.username}/200/200`} alt="" className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold flex items-center gap-1.5">
                <span className="truncate">{m.username}</span>
                {m.id === currentUserId && <span className="text-inksoft font-normal flex-shrink-0">(you)</span>}
                {m.isAdmin && (
                  <span className="flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ color: "#FF6B35", background: "#FFE8DC" }}>
                    <ShieldCheck size={10} /> Admin
                  </span>
                )}
              </div>
            </div>
            {isAdmin && m.id !== currentUserId && (
              <div className="flex items-center gap-3 flex-shrink-0">
                {!m.isAdmin && (
                  <button onClick={() => makeAdmin(m.id)} className="text-[11px] font-semibold" style={{ color: "#FF6B35" }}>
                    Make admin
                  </button>
                )}
                <button onClick={() => removeMember(m.id)} className="text-[11.5px] text-amber font-semibold">Remove</button>
              </div>
            )}
          </div>
        ))}

        <div className="p-4">
          <button onClick={leaveGroup} className="w-full rounded-full py-2.5 text-[13.5px] font-semibold border border-hairline text-amber">
            Leave group
          </button>
        </div>
      </div>
    </div>
  );
}
