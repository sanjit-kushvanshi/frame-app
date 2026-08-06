"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import ReelCard from "@/components/ReelCard";

export default function ReelsFeed({ posts, currentUserId }) {
  const router = useRouter();
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      const index = Math.round(container.scrollTop / container.clientHeight);
      setActiveIndex(index);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  if (!posts || posts.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <button onClick={() => router.push("/")} className="absolute top-4 left-4 text-white">
          <ChevronLeft size={24} />
        </button>
        <div className="font-mono text-sm text-white/70 text-center px-8">
          No reels yet. Post a video from the + button and check "Post to Reels."
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black"
      style={{ scrollBehavior: "smooth" }}
    >
      <button onClick={() => router.push("/")} className="fixed top-4 left-4 z-30 text-white bg-black/40 rounded-full p-2">
        <ChevronLeft size={22} />
      </button>
      {posts.map((post, i) => (
        <div key={post.id} className="h-screen w-full snap-start">
          <ReelCard post={post} currentUserId={currentUserId} isActive={i === activeIndex} />
        </div>
      ))}
    </div>
  );
}
