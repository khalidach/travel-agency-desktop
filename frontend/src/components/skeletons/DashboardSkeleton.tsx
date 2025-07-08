import { Skeleton } from "../ui/Skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2 mt-2" />
      </div>

      {/* Top Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-32 mt-2" />
              </div>
              <Skeleton className="w-12 h-12 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <Skeleton className="h-6 w-1/2 mb-6" />
          <Skeleton className="h-72 w-full" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <Skeleton className="h-6 w-1/2 mb-6" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>

      {/* Bottom Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
          <Skeleton className="h-6 w-1/3 mb-4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className={`w-1/3 space-y-2 ${document.documentElement.dir === "rtl" ? "mr-4" : "ml-4"}`}>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
