"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("username, bio, avatar_url").eq("id", user.id).single();
      if (data) {
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
      }
    })();
  }, [supabase]);

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setError("");
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
  };

  const handleUsernameChange = (e) => {
    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "");
    setUsername(clean);
  };

  const save = async () => {
    if (!username.trim()) {
      setError("Username can't be empty.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ username: username.trim(), bio, avatar_url: avatarUrl })
      .eq("id", userId);
    setSaving(false);
    if (updateErr) {
      if (updateErr.code === "23505") {
        setError("That username is already taken.");
      } else {
        setError(updateErr.message);
      }
      return;
    }
    router.push(`/profile/${username.trim()}`);
    router.refresh();
  };

  return (
    <div className="p-4">
      <div className="font-display italic text-[17px] mb-4">Edit profile</div>
      <div className="flex flex-col items-center gap-2 mb-5">
        <img
          src={avatarUrl || `https://picsum.photos/seed/${username}/200/200`}
          alt=""
          className="w-20 h-20 rounded-full object-cover"
        />
        <button onClick={() => fileInputRef.current?.click()} className="text-amber text-sm font-semibold">
          Change photo
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
      </div>

      <label className="font-mono text-[11px] text-inksoft mb-1 block">Username</label>
      <input
        value={username}
        onChange={handleUsernameChange}
        placeholder="username"
        className="w-full border border-hairline rounded-lg px-3 py-2.5 text-sm bg-white outline-none"
      />

      <label className="font-mono text-[11px] text-inksoft mt-4 mb-1 block">Bio</label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        placeholder="Bio"
        className="w-full border border-hairline rounded-lg p-3 text-sm bg-white outline-none resize-none"
      />
      {error && <div className="text-amber text-xs mt-2">{error}</div>}
      <button
        onClick={save}
        disabled={saving}
        className="w-full mt-4 bg-ink text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
