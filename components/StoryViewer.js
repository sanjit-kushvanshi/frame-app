"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Heart, SendHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DURATION = 5000;

export default function StoryViewer({ groups, startIndex, currentUserId, isOwnStory, onClose }) {
  const supabase = createClient();
  const router = useRouter();
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const intervalRef = useRef(null);
  const viewedRef = useRef(new Set());

  const group = groups?.[groupIndex];
  const story = group?.stories?.[storyIndex];

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setLiked(!!story.likedByMe);
    setLikeCount(story.likeCount || 0);
    setReplyText("");
    setSent(false);

    if (currentUserId && !viewedRef.current.has(story.id)) {
      viewedRef.current.add(story.id);
      supabase.from("story_views").upsert({ story_id: story.id, viewer_id: currentUserId }, { onConflict: "story_id,viewer_id" }).then(() => {});
    }
  }, [groupIndex, storyIndex, story?.id]);

  useEffect(() => {
    if (!story || paused) return;
    const start = Date.now() - (progress / 100) * DURATION;
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
  }, [groupIndex, storyIndex, paused]);

  const goNext = () => {
    if (!group) return;
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

  const toggleLike = async () => {
    if (!story || isOwnStory) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      await supabase.from("story_likes").delete().eq("story_id", story.id).eq("user_id", currentUserId);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from("story_likes").insert({ story_id: story.id, user_id: currentUserId });
    }
  };

  const sendReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || !story || sending) return;
    setSending(true);
    setPaused(true);
    try {
      const [a, b] = [currentUserId, group.user_id].sort();
      let { data: convo } = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
      if (!convo) {
        const { data: created } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
        convo = created;
      }
      await supabase.from("messages").insert({
        conversation_id: convo.id,
        sender_id: currentUserId,
        text: trimmed,
        story_id: story.id,
        story_snapshot_url: story.media_url,
      });
      setReplyText("");
      setSent(true);
      setTimeout(() => setSent(false), 1500);
    } catch (err) {
      alert("Couldn't send reply: " + err.message);
    } finally {
      setSending(false);
      setPaused(false);
    }
  };

  if (!group || !story) return null;

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

        {!isOwnStory && (
          <div className="absolute inset-0 flex" style={{ bottom: 70 }}>
            <button onClick={goPrev} className="w-1/3 h-full" aria-label="Previous" />
            <div className="w-1/3 h-full" />
            <button onClick={goNext} className="w-1/3 h-full" aria-label="Next" />
          </div>
        )}
        {isOwnStory && (
          <div className="absolute inset-0 flex">
            <button onClick={goPrev} className="w-1/3 h-full" aria-label="Previous" />
            <div className="w-1/3 h-full" />
            <button onClick={goNext} className="w-1/3 h-full" aria-label="Next" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2 z-10" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.5))" }}>
          {isOwnStory ? (
            <div className="text-white text-[13px] font-mono flex items-center gap-1.5 py-2">
              <Heart size={16} fill="#fff" /> {likeCount} like{likeCount === 1 ? "" : "s"}
            </div>
          ) : (
            <>
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => !replyText && setPaused(false)}
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
                placeholder={sent ? "Sent!" : "Reply..."}
                className="flex-1 bg-transparent border border-white/50 rounded-full px-4 py-2.5 text-white text-[13px] outline-none placeholder-white/70"
              />
              <button onClick={toggleLike} aria-label="Like">
                <Heart size={26} color="#fff" fill={liked ? "#FF6B35" : "none"} strokeWidth={1.6} />
              </button>
              {replyText.trim() && (
                <button onClick={sendReply} disabled={sending} aria-label="Send reply">
                  <SendHorizontal size={24} color="#fff" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
