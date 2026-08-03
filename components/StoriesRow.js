"use client";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DURATION = 5000;

export default function StoryViewer({ groups, startIndex, currentUserId, onClose }) {
  const supabase = createClient();
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const viewedRef = useRef(new Set());

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  useEffect(() => {
    if (!story) return;
    setProgress(0);

    if (!viewedRef.current.has(story.id)) {
      viewedRef.current.add(story.id);
      supabase.from("story_views").upsert({ story_id: story.id, viewer_id: currentUserId }, { onConflict: "story_id,viewer_id" }).then(() => {});
    }

    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current);
        goNext();
      }
    }, 50);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex]);

  const goNext = () => {
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      setStoryIndex(0);
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 bg-black z-[70] flex items-center justify-center">
      <div className="relative w-full h-full max-w-[480px] mx-auto">
        <div className="absolute top-2.5 left-2.5 right-2.5 flex gap-1 z-10">
          {group.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white" style={{ width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%" }} />
            </div>
          ))}
        </div>

        <div className="absolute top-6 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <img src={group.avatar_url || `https://picsum.photos/seed/${group.username}/200/200`} alt="" className="w-8 h-8 rounded-full object-cover border border-white/40" />
            <span className="text-white text-[13px] font-semibold">{group.username}</span>
          </div>
          <button onClick={onClose} className="text-white p-1">
            <X size={22} />
          </button>
        </div>

        {story.media_type === "video" ? (
          <video src={story.media_url} autoPlay muted playsInline className="w-full h-full object-contain" />
        ) : (
          <img src={story.media_url} alt="" className="w-full h-full object-contain" />
        )}

        <div className="absolute inset-0 flex">
          <button onClick={goPrev} className="w-1/3 h-full" aria-label="Previous" />
          <div className="w-1/3 h-full" />
          <button onClick={goNext} className="w-1/3 h-full" aria-label="Next" />
        </div>
      </div>
    </div>
  );
}
