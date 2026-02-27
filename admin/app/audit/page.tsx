import Link from "next/link";
import { adminApi } from "@/lib/api";
import { Card, CardHeader, CardBody, EmptyState, ErrorState } from "@/components/ui";

const ACTION_FILTERS = [
  "", "ride.created", "ride.started", "ride.cancelled", "ride.completed",
  "request.accepted", "user.blocked", "user.unblocked",
  "report.created", "report.status_changed", "rating.submitted",
];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const { page: pageStr, action } = await searchParams;
  const page = parseInt(pageStr ?? "0", 10);

  let result;
  try {
    result = await adminApi.listAudit(page, action);
  } catch (e: any) {
    return <div className="p-8"><ErrorState message={e.message} /></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">{result.count} events</p>
        </div>
        {/* Action filter */}
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          defaultValue={action ?? ""}
          onChange={undefined}
        >
          {ACTION_FILTERS.map((a) => (
            <option key={a} value={a}>{a || "All actions"}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-[2fr_2fr_2fr_1fr] text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Action</span><span>Entity</span><span>Metadata</span><span>Time</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {result.data.length === 0 ? (
            <EmptyState message="No audit events" />
          ) : (
            <div className="divide-y divide-gray-100">
              {result.data.map((e) => (
                <div key={e.id} className="grid grid-cols-[2fr_2fr_2fr_1fr] items-start px-6 py-3 gap-2">
                  <span className="text-sm font-mono font-medium text-gray-800">{e.action}</span>
                  <span className="text-sm text-gray-600">
                    {e.entity_type}{e.entity_id ? ` · ${e.entity_id.slice(0, 8)}…` : ""}
                  </span>
                  <span className="text-xs text-gray-400 font-mono truncate">
                    {JSON.stringify(e.metadata).slice(0, 80)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(e.created_at).toLocaleString("en-MU", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
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
            <Link href={`/audit?page=${page - 1}${action ? `&action=${action}` : ""}`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">← Previous</Link>
          )}
          {result.hasMore && (
            <Link href={`/audit?page=${page + 1}${action ? `&action=${action}` : ""}`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">Next →</Link>
          )}
        </div>
      </div>
    </div>
  );
}
