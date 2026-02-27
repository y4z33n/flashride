import Link from "next/link";
import { adminApi } from "@/lib/api";
import { Card, CardHeader, CardBody, Badge, EmptyState, ErrorState } from "@/components/ui";

const STATUS_FILTERS = ["", "open", "full", "in_progress", "completed", "cancelled"];

export default async function RidesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageStr, status } = await searchParams;
  const page = parseInt(pageStr ?? "0", 10);

  let result;
  try {
    result = await adminApi.listRides(page, status);
  } catch (e: any) {
    return <div className="p-8"><ErrorState message={e.message} /></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rides</h1>
          <p className="text-sm text-gray-500 mt-1">{result.count} total</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={`/rides${s ? `?status=${s}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                status === s || (!s && !status)
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {s.replace("_", " ") || "All"}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-[3fr_2fr_1fr_1fr_1fr] text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Route</span><span>Driver</span><span>Seats</span><span>Status</span><span>Date</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {result.data.length === 0 ? (
            <EmptyState message="No rides found" />
          ) : (
            <div className="divide-y divide-gray-100">
              {(result.data as any[]).map((r) => (
                <div key={r.id} className="grid grid-cols-[3fr_2fr_1fr_1fr_1fr] items-center px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {r.origin_address.split(",")[0]} → {r.destination_address.split(",")[0]}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">{r.driver?.full_name ?? "—"}</p>
                  <p className="text-sm text-gray-600">{r.seats_available}/{r.seats_total}</p>
                  <Badge status={r.status} />
                  <p className="text-xs text-gray-400">
                    {new Date(r.departure_time).toLocaleDateString("en-MU", { day: "numeric", month: "short" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Page {page + 1}</p>
        <div className="flex gap-2">
          {page > 0 && (
            <Link href={`/rides?page=${page - 1}${status ? `&status=${status}` : ""}`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">← Previous</Link>
          )}
          {result.hasMore && (
            <Link href={`/rides?page=${page + 1}${status ? `&status=${status}` : ""}`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">Next →</Link>
          )}
        </div>
      </div>
    </div>
  );
}
