"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PlusSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, checkVideoSize } from "@/lib/mediaCompress";
import StoryViewer from "@/components/StoryViewer";
import Avatar from "@/components/Avatar";

export default function StoriesRow({ myUsername, myAvatar, myStories, groups, currentUserId }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      let uploadFile = file;
      if (isVideo) {
        const check = checkVideoSize(file);
        if (!check.ok) throw new Error(check.message);
      } else {
        uploadFile = await compressImage(file, { maxDim: 1080, targetBytes: 200 * 1024 });
      }

      const { data: { user } } = await supabase.auth.getUser();
      const ext = isVideo ? file.name.split(".").pop() : "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("stories").upload(path, uploadFile);
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from("stories").getPublicUrl(path);
      const media_type = isVideo ? "video" : "image";
      await supabase.from("stories").insert({ user_id: user.id, media_url: pub.publicUrl, media_type });
      router.refresh();
    } catch (err) {
      alert("Couldn't post that story: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex gap-4 px-4 py-3.5 overflow-x-auto border-b border-hairline">
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: 64 }}>
        <div
          onClick={() => (myStories?.length > 0 ? setViewerIndex(-1) : fileInputRef.current?.click())}
          className="relative w-[54px] h-[54px] rounded-full cursor-pointer"
          style={myStories?.length > 0 ? { padding: 2, background: "conic-gradient(#FF6B35, #F4B942, #FF6B35)" } : {}}
        >
          <Avatar
            username={myUsername}
            avatarUrl={myAvatar}
            size={myStories?.length > 0 ? 50 : 54}
            className="border-2 border-paper block"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute -bottom-0.5 -right-0.5 bg-amber text-white rounded-full w-[18px] h-[18px] flex items-center justify-center border-2 border-paper"
          >
            <PlusSquare size={10} />
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />
        <span className="text-[11px] font-mono text-ink block w-full text-center overflow-hidden whitespace-nowrap text-ellipsis">
          {uploading ? "posting..." : "you"}
        </span>
      </div>

      {(groups || []).map((g, i) => (
        <div
          key={g.user_id}
          onClick={() => setViewerIndex(i)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
          style={{ width: 64 }}
        >
          <div className="w-[54px] h-[54px] rounded-full p-[2px]" style={{ background: "conic-gradient(#FF6B35, #F4B942, #FF6B35)" }}>
            <Avatar username={g.username} avatarUrl={g.avatar_url} size={50} className="border-2 border-paper block" />
          </div>
          <span className="text-[11px] font-mono text-ink block w-full text-center overflow-hidden whitespace-nowrap text-ellipsis">
            {g.username}
          </span>
        </div>
      ))}

      {viewerIndex !== null && (
        <StoryViewer
          groups={viewerIndex === -1 ? [{ user_id: currentUserId, username: myUsername, avatar_url: myAvatar, stories: myStories }] : groups}
          startIndex={viewerIndex === -1 ? 0 : viewerIndex}
          currentUserId={currentUserId}
          isOwnStory={viewerIndex === -1}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
