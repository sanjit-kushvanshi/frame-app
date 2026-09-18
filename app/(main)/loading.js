export default function FeedLoading() {
  return (
    <div>
      {/* Stories row skeleton */}
      <div className="flex gap-4 px-4 py-3.5 overflow-x-auto border-b border-hairline">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: 64 }}>
            <div className="w-[54px] h-[54px] rounded-full bg-paperdim animate-pulse motion-reduce:animate-none" />
            <div className="w-9 h-2 rounded-full bg-paperdim animate-pulse motion-reduce:animate-none" />
          </div>
        ))}
      </div>

      {/* Post card skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border-b border-hairline pb-3.5">
          <div className="flex items-center gap-2.5 pl-4 pr-2.5 pt-3 pb-2.5">
            <div className="w-8 h-8 rounded-full bg-paperdim animate-pulse motion-reduce:animate-none" />
            <div className="w-24 h-2.5 rounded-full bg-paperdim animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="w-full aspect-square bg-paperdim animate-pulse motion-reduce:animate-none" />
          <div className="flex gap-4 px-4 pt-2.5">
            <div className="w-5 h-5 rounded-full bg-paperdim animate-pulse motion-reduce:animate-none" />
            <div className="w-5 h-5 rounded-full bg-paperdim animate-pulse motion-reduce:animate-none" />
            <div className="w-5 h-5 rounded-full bg-paperdim animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="w-32 h-2.5 rounded-full bg-paperdim animate-pulse motion-reduce:animate-none mt-3 ml-4" />
        </div>
      ))}
    </div>
  );
}
