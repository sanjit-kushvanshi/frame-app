"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressForUpload } from "@/lib/mediaCompress";

export default function NewPostPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState("image");
  const [postAsReel, setPostAsReel] = useState(false);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [myCommunities, setMyCommunities] = useState([]);
  const [communityId, setCommunityId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("community_members")
        .select("role, communities(id, name)")
        .eq("user_id", user.id)
        .in("role", ["admin", "creator"]);
      setMyCommunities((data || []).map((r) => r.communities).filter(Boolean));
    })();
  }, [supabase]);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Please choose an image or video file.");
      return;
    }
    setError("");
    setProcessing(true);
    try {
      const compressed = await compressForUpload(f);
      setFile(compressed);
      setFileType(isVideo ? "video" : "image");
      setPostAsReel(isVideo);
      setPreview(URL.createObjectURL(compressed));
    } catch (err) {
      setError(err.message || "Couldn't process that file.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("posts").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("posts").getPublicUrl(path);

      const { error: insertError } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: pub.publicUrl,
        caption,
        location: location || null,
        media_type: fileType,
        is_reel: fileType === "video" && postAsReel,
        community_id: communityId || null,
      });
      if (insertError) throw insertError;

      router.push(
        communityId
          ? `/communities/${communityId}`
          : fileType === "video" && postAsReel
          ? "/reels"
          : "/"
      );
      router.refresh();
    } catch (err) {
      setError(err.message || "Something went wrong publishing this frame.");
    } finally {
      setUploading(false);
    }
  };

  const selectedCommunityName = myCommunities.find((c) => c.id === communityId)?.name;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 border-b border-hairline">
        <button onClick={() => router.push("/")}><X size={22} /></button>
        <div className="font-display italic text-[17px]">{postAsReel ? "New reel" : "New frame"}</div>
        <button
          onClick={handlePublish}
          disabled={!file || uploading || processing}
          className="text-sm font-semibold"
          style={{ color: !file || uploading || processing ? "#DCD6C8" : "#FF6B35" }}
        >
          {uploading ? "Publishing..." : "Share"}
        </button>
      </div>

      <div className="p-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-square rounded bg-paperdim flex items-center justify-center overflow-hidden cursor-pointer"
        >
          {processing ? (
            <span className="font-mono text-xs text-inksoft">compressing...</span>
          ) : preview ? (
            fileType === "video" ? (
              <video src={preview} controls className="w-full h-full object-cover" />
            ) : (
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="flex flex-col items-center gap-2 text-inksoft">
              <Upload size={26} />
              <span className="font-mono text-xs">Tap to choose a photo or video</span>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
        {error && <div className="text-amber text-xs mt-2">{error}</div>}

        {fileType === "video" && (
          <label className="flex items-center gap-2 mt-3 text-[13px]">
            <input type="checkbox" checked={postAsReel} onChange={(e) => setPostAsReel(e.target.checked)} className="w-4 h-4" />
            Post to Reels
          </label>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          rows={3}
          className="w-full mt-4 border border-hairline rounded-lg p-3 text-sm bg-white outline-none resize-none"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Add location"
          className="w-full mt-2.5 border border-hairline rounded-lg px-3 py-2.5 font-mono text-[13px] bg-white outline-none"
        />

        {myCommunities.length > 0 && (
          <div className="relative mt-2.5">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="w-full flex items-center justify-between border border-hairline rounded-lg px-3 py-2.5 font-mono text-[13px] bg-white"
            >
              <span className={selectedCommunityName ? "text-ink" : "text-inksoft"}>
                {selectedCommunityName || "Post to your profile only"}
              </span>
              <ChevronDown size={15} className="text-inksoft" />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 border border-hairline rounded-lg bg-white shadow-md z-10 max-h-52 overflow-y-auto">
                <button
                  onClick={() => {
                    setCommunityId("");
                    setPickerOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 font-mono text-[13px] text-inksoft border-b border-hairline"
                >
                  Post to your profile only
                </button>
                {myCommunities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCommunityId(c.id);
                      setPickerOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 font-mono text-[13px] text-ink border-b border-hairline last:border-b-0"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
