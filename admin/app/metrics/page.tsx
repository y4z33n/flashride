import { adminApi } from "@/lib/api";
import { StatCard, Card, CardHeader, CardBody, ErrorState } from "@/components/ui";

export default async function MetricsPage() {
  let m;
  try {
    m = await adminApi.getMetrics();
  } catch (e: any) {
    return <div className="p-8"><ErrorState message={e.message} /></div>;
  }

  const uptime = m.uptimeSeconds;
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Server Metrics</h1>
        <p className="text-sm text-gray-500 mt-1">Started {new Date(m.startedAt).toLocaleString()} · Uptime {uptimeStr}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={m.requests.total}   icon="📡" color="blue"   />
        <StatCard label="Total Errors"   value={m.errors.total}     icon="❌" color="red"    />
        <StatCard label="5xx Errors"     value={m.errors.by5xx}     icon="💥" color="red"    />
        <StatCard label="4xx Errors"     value={m.errors.by4xx}     icon="⚠️" color="yellow" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Auth Successes" value={m.auth.successes} icon="🔓" color="green"  />
        <StatCard label="Auth Failures"  value={m.auth.failures}  icon="🔒" color="red"    />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-800">Requests by Status</h2></CardHeader>
          <CardBody>
            <div className="space-y-2">
              {Object.entries(m.requests.byStatus).sort().map(([code, count]) => (
                <div key={code} className="flex justify-between text-sm">
                  <span className={`font-mono font-medium ${code.startsWith("5") ? "text-red-600" : code.startsWith("4") ? "text-yellow-600" : "text-green-600"}`}>
                    HTTP {code}
                  </span>
                  <span className="text-gray-700 font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(m.requests.byStatus).length === 0 && <p className="text-sm text-gray-400">No requests yet</p>}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-gray-800">Requests by Method</h2></CardHeader>
          <CardBody>
            <div className="space-y-2">
              {Object.entries(m.requests.byMethod).sort().map(([method, count]) => (
                <div key={method} className="flex justify-between text-sm">
                  <span className="font-mono font-medium text-gray-700">{method}</span>
                  <span className="text-gray-700 font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(m.requests.byMethod).length === 0 && <p className="text-sm text-gray-400">No requests yet</p>}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
