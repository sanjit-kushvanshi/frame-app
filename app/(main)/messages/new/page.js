"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NewMessagePage() {
  const supabase = createClient();
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState("search"); // "search" | "name"
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!currentUserId) return;
    const t = setTimeout(async () => {
      setLoading(true);
      let q = supabase.from("profiles").select("id, username, avatar_url").neq("id", currentUserId).limit(20);
      if (query.trim()) q = q.ilike("username", `%${query.trim()}%`);
      const { data } = await q;
      setResults(data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, currentUserId, supabase]);

  const toggleSelect = (profile) => {
    setSelected((prev) =>
      prev.some((p) => p.id === profile.id) ? prev.filter((p) => p.id !== profile.id) : [...prev, profile]
    );
  };

  const startDirectMessage = async (targetUserId) => {
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

  const createGroup = async () => {
    if (selected.length < 2) return;
    setCreating(true);
    const finalName = groupName.trim() || selected.map((p) => p.username).join(", ");

    alert("currentUserId: " + currentUserId);
    const { data: convo, error: convoError } = await supabase
      .from("conversations")
      .insert({ is_group: true, name: finalName, created_by: currentUserId })
      .select("id")
      .single();

    if (convoError || !convo) {
      setCreating(false);
      alert("Couldn't create the group: " + (convoError?.message || "unknown error"));
      return;
    }

    const participantRows = [currentUserId, ...selected.map((p) => p.id)].map((user_id) => ({
      conversation_id: convo.id,
      user_id,
    }));

    const { error: participantsError } = await supabase.from("conversation_participants").insert(participantRows);

    setCreating(false);
    if (participantsError) {
      alert("Group created but adding members failed: " + participantsError.message);
      return;
    }

    router.push(`/messages/${convo.id}`);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-hairline">
        <button onClick={() => (step === "name" ? setStep("search") : router.push("/messages"))}>
          <ChevronLeft size={22} />
        </button>
        <div className="font-semibold text-sm flex-1">{step === "name" ? "Name your group" : "New Message"}</div>
        {step === "search" && (
          <button
            onClick={() => {
              setGroupMode((g) => !g);
              setSelected([]);
            }}
            className="text-[12.5px] font-semibold"
            style={{ color: groupMode ? "#FF6B35" : "#1C1A17" }}
          >
            {groupMode ? "Cancel group" : "New group"}
          </button>
        )}
      </div>

      {step === "search" && (
        <>
          {groupMode && selected.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-2.5 border-b border-hairline">
              {selected.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 bg-paperdim rounded-full pl-1 pr-2 py-1">
                  <img src={p.avatar_url || `https://picsum.photos/seed/${p.username}/200/200`} alt="" className="w-5 h-5 rounded-full object-cover" />
                  <span className="text-[11.5px]">{p.username}</span>
                  <button onClick={() => toggleSelect(p)}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline">
            <Search size={16} className="text-inksoft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent outline-none text-[13.5px]"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <div className="text-center text-inksoft text-xs py-6">Searching...</div>}
            {!loading && results.length === 0 && (
              <div className="text-center text-inksoft text-xs py-6">No users found.</div>
            )}
            {!loading &&
              results.map((p) => {
                const isSelected = selected.some((s) => s.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => (groupMode ? toggleSelect(p) : startDirectMessage(p.id))}
                    className="w-full flex items-center gap-3 px-4 py-2.5"
                  >
                    <img src={p.avatar_url || `https://picsum.photos/seed/${p.username}/200/200`} alt="" className="w-11 h-11 rounded-full object-cover" />
                    <div className="flex-1 text-left text-[13.5px] font-semibold">{p.username}</div>
                    {groupMode && (
                      <div
                        className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: isSelected ? "#FF6B35" : "#DCD6C8", background: isSelected ? "#FF6B35" : "transparent" }}
                      >
                        {isSelected && <Check size={13} color="#fff" />}
                      </div>
                    )}
                  </button>
                );
              })}
          </div>

          {groupMode && selected.length >= 2 && (
            <div className="p-3 border-t border-hairline">
              <button
                onClick={() => setStep("name")}
                className="w-full rounded-full py-2.5 text-[13.5px] font-semibold text-white"
                style={{ background: "#FF6B35" }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {step === "name" && (
        <div className="flex-1 flex flex-col p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 bg-paperdim rounded-full pl-1 pr-2 py-1">
                <img src={p.avatar_url || `https://picsum.photos/seed/${p.username}/200/200`} alt="" className="w-5 h-5 rounded-full object-cover" />
                <span className="text-[11.5px]">{p.username}</span>
              </div>
            ))}
          </div>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (optional)"
            className="border border-hairline rounded-lg px-3.5 py-2.5 text-[13.5px] outline-none mb-4"
          />
          <button
            onClick={createGroup}
            disabled={creating}
            className="rounded-full py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50"
            style={{ background: "#FF6B35" }}
          >
            {creating ? "Creating..." : "Create group"}
          </button>
        </div>
      )}
    </div>
  );
}
