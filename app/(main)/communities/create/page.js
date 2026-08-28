"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CreateCommunityPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    const { error: uploadError } = await supabase.storage
      .from("communities")
      .upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("communities").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Community name is required.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in.");
        setLoading(false);
        return;
      }

      let avatarUrl = null;
      let coverUrl = null;

      if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile, "avatars");
      }
      if (coverFile) {
        coverUrl = await uploadImage(coverFile, "covers");
      }

      const { data: community, error: insertError } = await supabase
        .from("communities")
        .insert({
          name: name.trim(),
          description: description.trim(),
          avatar_url: avatarUrl,
          cover_url: coverUrl,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Creator auto-joins with creator role + approved chat access
      const { error: memberError } = await supabase
        .from("community_members")
        .insert({
          community_id: community.id,
          user_id: user.id,
          role: "creator",
          chat_status: "approved",
        });

      if (memberError) throw memberError;

      router.push(`/communities/${community.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] pb-24">
      <div className="sticky top-0 bg-[#F7F4EE] border-b border-[#DCD6C8] px-4 py-3 flex items-center justify-between z-10">
        <button onClick={() => router.back()} className="text-[#1C1A17] text-sm font-mono">
          Cancel
        </button>
        <h1 className="font-['Fraunces'] italic text-lg text-[#1C1A17]">New Community</h1>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-[#FF6B35] text-sm font-mono font-semibold disabled:opacity-40"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>

      <div className="relative">
        <label className="block h-32 bg-[#DCD6C8] cursor-pointer relative overflow-hidden">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#1C1A17]/40 text-xs font-mono">
              Add cover photo
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
        </label>

        <label className="absolute left-4 -bottom-10 w-20 h-20 rounded-full bg-[#F7F4EE] border-4 border-[#F7F4EE] overflow-hidden cursor-pointer shadow-sm">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
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
          <label className="block text-xs font-mono text-[#1C1A17]/60 mb-1">
            Community name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Street Photographers"
            className="w-full bg-transparent border-b border-[#DCD6C8] py-2 text-[#1C1A17] font-['Fraunces'] text-lg focus:outline-none focus:border-[#FF6B35]"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-[#1C1A17]/60 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this community about?"
            rows={3}
            className="w-full bg-transparent border-b border-[#DCD6C8] py-2 text-[#1C1A17] text-sm focus:outline-none focus:border-[#FF6B35] resize-none"
            maxLength={200}
          />
        </div>

        <p className="text-xs font-mono text-[#1C1A17]/40 pt-2">
          Anyone can view and post in the feed. Group chat requires admin approval to join.
        </p>

        {error && <p className="text-xs text-red-500 font-mono">{error}</p>}
      </div>
    </div>
  );
}
