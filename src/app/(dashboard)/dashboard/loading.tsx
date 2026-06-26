import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export default function DashboardLoading() {
  return (
    <SkeletonTheme baseColor="#e2e8f0" highlightColor="#f8fafc">
      <div className="space-y-6 p-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton width={220} height={28} borderRadius={6} />
            <div className="mt-1.5">
              <Skeleton width={140} height={16} borderRadius={20} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton width={110} height={36} borderRadius={8} />
            <Skeleton circle width={36} height={36} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton width={90} height={13} borderRadius={20} />
                <Skeleton width={32} height={32} borderRadius={8} />
              </div>
              <Skeleton width={120} height={32} borderRadius={6} />
              <Skeleton width={80} height={12} borderRadius={20} />
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Area / bar chart */}
          <div className="lg:col-span-2 rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton width={160} height={16} borderRadius={20} />
              <Skeleton width={80} height={28} borderRadius={8} />
            </div>
            <div className="flex items-end gap-2" style={{ height: 160 }}>
              {[55, 70, 45, 80, 60, 90, 50, 75, 65, 85, 40, 70].map((h, i) => (
                <Skeleton
                  key={i}
                  width="100%"
                  height={`${h}%`}
                  borderRadius={4}
                  style={{ flex: 1, display: "block" }}
                />
              ))}
            </div>
            <div className="flex gap-4">
              <Skeleton width={80} height={12} borderRadius={20} />
              <Skeleton width={80} height={12} borderRadius={20} />
            </div>
          </div>

          {/* Donut */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
            <Skeleton width={130} height={16} borderRadius={20} />
            <div className="flex justify-center py-2">
              <div className="relative">
                <Skeleton circle width={144} height={144} />
                <div
                  className="absolute bg-white rounded-full"
                  style={{ width: 72, height: 72, top: 36, left: 36 }}
                />
              </div>
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton width={12} height={12} borderRadius={3} />
                  <Skeleton width="100%" height={12} borderRadius={20} />
                  <Skeleton width={28} height={12} borderRadius={20} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* At-risk table */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <Skeleton width={130} height={16} borderRadius={20} />
            <Skeleton width={90} height={32} borderRadius={8} />
          </div>
          {/* Column headers */}
          <div className="flex gap-6 px-5 py-3 bg-neutral-50 border-b border-neutral-100">
            <Skeleton width={100} height={12} borderRadius={20} />
            <Skeleton width={70} height={12} borderRadius={20} />
            <Skeleton width={70} height={12} borderRadius={20} />
            <Skeleton width={70} height={12} borderRadius={20} />
          </div>
          {/* Rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-neutral-100 last:border-0">
              <Skeleton circle width={36} height={36} />
              <div className="flex-1">
                <Skeleton width={140} height={14} borderRadius={20} />
                <div className="mt-1">
                  <Skeleton width={100} height={12} borderRadius={20} />
                </div>
              </div>
              <Skeleton width={60} height={24} borderRadius={20} />
              <Skeleton width={70} height={24} borderRadius={20} />
              <Skeleton width={90} height={32} borderRadius={8} />
            </div>
          ))}
        </div>

      </div>
    </SkeletonTheme>
  );
}
