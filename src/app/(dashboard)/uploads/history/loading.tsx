import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export default function UploadsHistoryLoading() {
  return (
    <SkeletonTheme baseColor="#e2e8f0" highlightColor="#f8fafc">
      <div className="space-y-6 p-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton width={180} height={28} borderRadius={6} />
            <div className="mt-1.5">
              <Skeleton width={240} height={14} borderRadius={20} />
            </div>
          </div>
          <Skeleton width={130} height={36} borderRadius={8} />
        </div>

        {/* Upload set cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-neutral-50">
              <div className="flex items-center gap-3">
                <Skeleton width={20} height={20} borderRadius={4} />
                <Skeleton width={160} height={16} borderRadius={20} />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton width={80} height={12} borderRadius={20} />
                <Skeleton width={28} height={28} borderRadius={6} />
              </div>
            </div>
            {/* Entity rows */}
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-4 px-5 py-3.5 border-b border-neutral-100 last:border-0">
                <Skeleton width={90} height={13} borderRadius={20} />
                <Skeleton width={60} height={22} borderRadius={20} />
                <div className="flex-1" />
                <Skeleton width={100} height={12} borderRadius={20} />
                <Skeleton width={80} height={30} borderRadius={8} />
              </div>
            ))}
          </div>
        ))}

      </div>
    </SkeletonTheme>
  );
}
