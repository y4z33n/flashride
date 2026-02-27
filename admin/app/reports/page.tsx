import Link from "next/link";
import { adminApi } from "@/lib/api";
import { Card, CardHeader, CardBody, Badge, EmptyState, ErrorState } from "@/components/ui";
import { updateReportStatusAction } from "./actions";

const STATUS_FILTERS = ["", "open", "in_review", "resolved", "dismissed"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageStr, status } = await searchParams;
  const page = parseInt(pageStr ?? "0", 10);

  let result;
  try {
    result = await adminApi.listReports(page, status);
  } catch (e: any) {
    return <div className="p-8"><ErrorState message={e.message} /></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">{result.count} total</p>
        </div>
        {/* Status filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={`/reports${s ? `?status=${s}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                status === s || (!s && !status)
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {s || "All"}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Reporter → Reported</span><span>Reason</span><span>Status</span><span>Date</span><span>Actions</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {result.data.length === 0 ? (
            <EmptyState message="No reports" />
          ) : (
            <div className="divide-y divide-gray-100">
              {result.data.map((r: any) => (
                <div key={r.id} className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] items-center px-6 py-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {r.reporter?.full_name ?? "?"} → {r.reported_user?.full_name ?? "?"}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">{r.reason.replace(/_/g, " ")}</p>
                  <Badge status={r.status} />
                  <p className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString("en-MU", { day: "numeric", month: "short" })}
                  </p>
                  {/* Quick actions */}
                  <div className="flex gap-1">
                    {r.status === "open" && (
                      <form action={async () => { "use server"; await updateReportStatusAction(r.id, "in_review"); }}>
                        <button className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Review</button>
                      </form>
                    )}
                    {(r.status === "open" || r.status === "in_review") && (
                      <>
                        <form action={async () => { "use server"; await updateReportStatusAction(r.id, "resolved"); }}>
                          <button className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Resolve</button>
                        </form>
                        <form action={async () => { "use server"; await updateReportStatusAction(r.id, "dismissed"); }}>
                          <button className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Dismiss</button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Page {page + 1}</p>
        <div className="flex gap-2">
          {page > 0 && (
            <Link href={`/reports?page=${page - 1}${status ? `&status=${status}` : ""}`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">← Previous</Link>
          )}
          {result.hasMore && (
            <Link href={`/reports?page=${page + 1}${status ? `&status=${status}` : ""}`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">Next →</Link>
          )}
        </div>
      </div>
    </div>
  );
}
