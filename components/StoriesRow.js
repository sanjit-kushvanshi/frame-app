import Link from "next/link";

export default function StoriesRow({ people }) {
  return (
    <div className="flex gap-4 px-4 py-3.5 overflow-x-auto border-b border-hairline">
      {(people || []).map((p) => (
        <Link key={p.id} href={`/profile/${p.username}`} className="flex flex-col items-center gap-1.5 min-w-[56px]">
          <div className="w-[54px] h-[54px] rounded-full p-[2px]" style={{ background: "conic-gradient(#FF6B35, #F4B942, #FF6B35)" }}>
            <img
              src={p.avatar_url || `https://picsum.photos/seed/${p.username}/200/200`}
              alt={p.username}
              className="w-full h-full rounded-full object-cover border-2 border-paper block"
            />
          </div>
          <span className="text-[11px] font-mono text-ink">{p.username}</span>
        </Link>
      ))}
      {(!people || people.length === 0) && (
        <span className="text-xs font-mono text-inksoft py-4">No one else here yet — invite someone.</span>
      )}
    </div>
  );
}
