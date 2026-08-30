"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft } from "lucide-react";

export default function EditCommunityPage() {
  const supabase = createClient();
  const { id } = useParams();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", id)
      .eq("user_id", user?.id)
      .maybeSingle();

    if (!membership || !["admin", "creator"].includes(membership.role)) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);

    const { data: community } = await supabase.from("communities").select("*").eq("id", id).single();
    if (community) {
      setName(community.name || "");
      setDescription(community.description || "");
      setAvatarUrl(community.avatar_url);
      setCoverUrl(community.cover_url);
    }
    setLoading(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file, folder) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("communities").upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("communities").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async () => {
    setError("");
    if (!name.trim()) {
      setError("Community name is required.");
      return;
    }
    setSaving(true);
    try {
      let newAvatarUrl = avatarUrl;
      let newCoverUrl = coverUrl;

      if (avatarFile) newAvatarUrl = await uploadImage(avatarFile, "avatars");
      if (coverFile) newCoverUrl = await uploadImage(coverFile, "covers");

      const { error: updateError } = await supabase
        .from("communities")
        .update({
          name: name.trim(),
          description: description.trim(),
          avatar_url: newAvatarUrl,
          cover_url: newCoverUrl,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      router.push(`/communities/${id}`);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10">Loading...</p>;
  }

  if (!allowed) {
    return <p className="text-center text-sm font-mono text-[#1C1A17]/40 mt-10 px-6">Only admins or the creator can edit this community.</p>;
  }

  return (
    <div className="min-h-screen bg-[#F7F4EE] pb-24">
      <div className="sticky top-0 bg-[#F7F4EE] border-b border-[#DCD6C8] px-4 py-3 flex items-center justify-between z-10">
        <button onClick={() => router.back()} className="text-[#1C1A17] text-sm font-mono">
          Cancel
        </button>
        <h1 className="font-['Fraunces'] italic text-lg text-[#1C1A17]">Edit Community</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-[#FF6B35] text-sm font-mono font-semibold disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="relative">
        <label className="block h-32 bg-[#DCD6C8] cursor-pointer relative overflow-hidden">
          {(coverPreview || coverUrl) ? (
            <img src={coverPreview || coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#1C1A17]/40 text-xs font-mono">
              Add cover photo
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
        </label>

        <label className="absolute left-4 -bottom-10 w-20 h-20 rounded-full bg-[#F7F4EE] border-4 border-[#F7F4EE] overflow-hidden cursor-pointer shadow-sm">
          {(avatarPreview || avatarUrl) ? (
            <img src={avatarPreview || avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#DCD6C8] flex items-center justify-center text-[10px] font-mono text-[#1C1A17]/50">
              Avatar
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </label>
      </div>

      <div className="px-4 mt-14 space-y-4">
        <div>
          <label className="block text-xs font-mono text-[#1C1A17]/60 mb-1">Community name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b border-[#DCD6C8] py-2 text-[#1C1A17] font-['Fraunces'] text-lg focus:outline-none focus:border-[#FF6B35]"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-[#1C1A17]/60 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-transparent border-b border-[#DCD6C8] py-2 text-[#1C1A17] text-sm focus:outline-none focus:border-[#FF6B35] resize-none"
            maxLength={200}
          />
        </div>

        {error && <p className="text-xs text-red-500 font-mono">{error}</p>}
      </div>
    </div>
  );
}
