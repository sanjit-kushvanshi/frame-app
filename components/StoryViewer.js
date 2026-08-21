"use client";
import { useState, useEffect, useRef } from "react";
import { X, Heart, SendHorizontal, Eye, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const IMAGE_DURATION = 5000;

export default function StoryViewer({ groups: initialGroups, startIndex, currentUserId, isOwnStory, onClose }) {
  const supabase = createClient();
  const [groups, setGroups] = useState(initialGroups);
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersList, setViewersList] = useState([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const intervalRef = useRef(null);
  const viewedRef = useRef(new Set());
  const videoRef = useRef(null);

  const group = groups?.[groupIndex];
  const story = group?.stories?.[storyIndex];
  const isVideo = story?.media_type === "video";

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setLiked(!!story.likedByMe);
    setLikeCount(story.likeCount || 0);
    setReplyText("");
    setSent(false);
    setViewersOpen(false);
    setConfirmingDelete(false);

    if (currentUserId && !viewedRef.current.has(story.id)) {
      viewedRef.current.add(story.id);
      supabase.from("story_views").upsert({ story_id: story.id, viewer_id: currentUserId }, { onConflict: "story_id,viewer_id" }).then(() => {});
    }

    if (isOwnStory) {
      supabase
        .from("story_views")
        .select("*", { count: "exact", head: true })
        .eq("story_id", story.id)
        .then(({ count }) => setViewCount(count || 0));
    }
  }, [groupIndex, storyIndex, story?.id]);

  // Progress/advance timer for IMAGE stories only.
  useEffect(() => {
    if (!story || isVideo || paused) return;
    const start = Date.now() - (progress / 100) * IMAGE_DURATION;
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / IMAGE_DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current);
        goNext();
      }
    }, 50);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, paused, isVideo]);

  // Play/pause the actual <video> element in sync with `paused`.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo) return;
    if (paused) {
      v.pause();
    } else {
      v.play().catch(() => {});
    }
  }, [paused, isVideo, groupIndex, storyIndex]);

  const handleVideoTimeUpdate = (e) => {
    const v = e.currentTarget;
    if (!v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

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

  const openViewers = async () => {
    if (!story) return;
    setViewersOpen(true);
    setPaused(true);
    setViewersLoading(true);
    const [{ data: views }, { data: likesData }] = await Promise.all([
      supabase
        .from("story_views")
        .select("viewer_id, viewed_at, profiles!viewer_id(username, avatar_url)")
        .eq("story_id", story.id)
        .order("viewed_at", { ascending: false }),
      supabase.from("story_likes").select("user_id").eq("story_id", story.id),
    ]);
    const likedIds = new Set((likesData || []).map((l) => l.user_id));
    setViewersList((views || []).map((v) => ({ ...v, liked: likedIds.has(v.viewer_id) })));
    setViewersLoading(false);
  };

  const closeViewers = () => {
    setViewersOpen(false);
    setPaused(false);
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

  const deleteStory = async () => {
    if (!story) return;
    setDeleting(true);
    const { error } = await supabase.from("stories").delete().eq("id", story.id).eq("user_id", currentUserId);
    setDeleting(false);
    if (error) {
      alert("Couldn't delete: " + error.message);
      return;
    }

    const currentGroup = groups[groupIndex];
    const remainingStories = currentGroup.stories.filter((s) => s.id !== story.id);

    if (remainingStories.length === 0) {
      onClose();
      return;
    }

    const updatedGroups = groups.map((g, i) => (i === groupIndex ? { ...g, stories: remainingStories } : g));
    setGroups(updatedGroups);
    setConfirmingDelete(false);
    if (storyIndex >= remainingStories.length) {
      setStoryIndex(remainingStories.length - 1);
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
          <div className="flex items-center gap-2">
            {isOwnStory && (
              <button onClick={() => { setConfirmingDelete(true); setPaused(true); }} className="text-white p-1" aria-label="Delete story">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} className="text-white p-1">
              <X size={22} />
            </button>
          </div>
        </div>

        {isVideo ? (
          <video
            ref={videoRef}
            src={story.media_url}
            autoPlay
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={goNext}
            className="w-full h-full object-contain"
          />
        ) : (
          <img src={story.media_url} alt="" className="w-full h-full object-contain" />
        )}

        {!viewersOpen && !confirmingDelete && (
          <div className="absolute inset-0 flex" style={{ bottom: 70 }}>
            <button onClick={goPrev} className="w-1/3 h-full" aria-label="Previous" />
            <div className="w-1/3 h-full" />
            <button onClick={goNext} className="w-1/3 h-full" aria-label="Next" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2 z-10" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.5))" }}>
          {isOwnStory ? (
            <button onClick={openViewers} className="text-white text-[13px] font-mono flex items-center gap-1.5 py-2">
              <Eye size={16} /> {viewCount} view{viewCount === 1 ? "" : "s"}
              {likeCount > 0 && (
                <>
                  <span className="opacity-50 mx-1">·</span>
                  <Heart size={14} fill="#FF6B35" color="#FF6B35" /> {likeCount}
                </>
              )}
            </button>
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

        {viewersOpen && (
          <div className="absolute inset-0 bg-black/60 z-20 flex items-end" onClick={closeViewers}>
            <div onClick={(e) => e.stopPropagation()} className="bg-paper w-full max-h-[60%] rounded-t-2xl flex flex-col">
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-9 h-1 rounded-full bg-hairline" />
              </div>
              <div className="flex justify-between items-center px-4 pb-3 pt-1.5 border-b border-hairline">
                <span className="font-semibold text-sm">{viewCount} view{viewCount === 1 ? "" : "s"}</span>
                <button onClick={closeViewers}><X size={20} /></button>
              </div>
              <div className="overflow-y-auto px-4 py-2 flex-1">
                {viewersLoading && <div className="text-center text-inksoft text-sm py-6">Loading...</div>}
                {!viewersLoading && viewersList.length === 0 && (
                  <div className="text-center text-inksoft text-sm py-6">No views yet.</div>
                )}
                {!viewersLoading &&
                  viewersList.map((v) => (
                    <div key={v.viewer_id} className="flex items-center gap-2.5 py-2">
                      <img
                        src={v.profiles?.avatar_url || `https://picsum.photos/seed/${v.profiles?.username}/200/200`}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <span className="text-[13.5px] flex-1">{v.profiles?.username}</span>
                      {v.liked && <Heart size={16} fill="#FF6B35" color="#FF6B35" />}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {confirmingDelete && (
          <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-6" onClick={() => { setConfirmingDelete(false); setPaused(false); }}>
            <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-2xl p-5 w-full max-w-[300px]">
              <div className="font-semibold text-[15px] mb-1">Delete this story?</div>
              <div className="text-inksoft text-[13px] mb-4">This can't be undone.</div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmingDelete(false); setPaused(false); }}
                  className="flex-1 border border-hairline rounded-lg py-2.5 text-[13px] font-semibold"
                >
                  Cancel
                </button>
                <button onClick={deleteStory} disabled={deleting} className="flex-1 bg-amber text-white rounded-lg py-2.5 text-[13px] font-semibold disabled:opacity-50">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
