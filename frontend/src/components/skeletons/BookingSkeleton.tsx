import { Skeleton } from "../ui/Skeleton";

export default function BookingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-x-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      {/* Summary Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border">
            <Skeleton className="h-4 w-20 mx-auto" />
            <Skeleton className="h-7 w-24 mx-auto mt-2" />
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="px-6 py-4">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="px-6 py-4">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="px-6 py-4">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="px-6 py-4">
                  <Skeleton className="h-4 w-16" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                      <div className={`${document.documentElement.dir === "rtl" ? "mr-4" : "ml-4"} w-full`}>
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2 mt-2" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-3 w-1/2 mt-2" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-2/3 mt-2" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-20 mt-2" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-2">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
