import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export default function StudentsLoading() {
  return (
    <SkeletonTheme baseColor="#e2e8f0" highlightColor="#f8fafc">
      <div className="space-y-5 p-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton width={160} height={28} borderRadius={6} />
          <Skeleton width={120} height={36} borderRadius={8} />
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width={90} height={34} borderRadius={20} />
          ))}
          <div className="flex-1" />
          <Skeleton width={200} height={36} borderRadius={8} />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          {/* Column headers */}
          <div className="flex gap-4 px-5 py-3.5 bg-neutral-50 border-b border-neutral-200">
            <Skeleton width={24} height={14} borderRadius={4} />
            <Skeleton width={140} height={12} borderRadius={20} style={{ flex: 1 }} />
            <Skeleton width={80} height={12} borderRadius={20} />
            <Skeleton width={80} height={12} borderRadius={20} />
            <Skeleton width={80} height={12} borderRadius={20} />
            <Skeleton width={80} height={12} borderRadius={20} />
            <Skeleton width={60} height={12} borderRadius={20} />
          </div>
          {/* Rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-neutral-100 last:border-0">
              <Skeleton width={16} height={16} borderRadius={4} />
              <div className="flex items-center gap-3 flex-1">
                <Skeleton circle width={34} height={34} />
                <div>
                  <Skeleton width={130} height={14} borderRadius={20} />
                  <div className="mt-1">
                    <Skeleton width={100} height={12} borderRadius={20} />
                  </div>
                </div>
              </div>
              <Skeleton width={65} height={24} borderRadius={20} />
              <Skeleton width={75} height={14} borderRadius={20} />
              <Skeleton width={75} height={14} borderRadius={20} />
              <Skeleton width={65} height={24} borderRadius={20} />
              <Skeleton width={28} height={28} borderRadius={6} />
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <Skeleton width={140} height={14} borderRadius={20} />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width={36} height={36} borderRadius={8} />
            ))}
          </div>
        </div>

      </div>
    </SkeletonTheme>
  );
}
