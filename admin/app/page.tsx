import { adminApi } from "@/lib/api";
import { StatCard, Card, CardHeader, CardBody, Badge, ErrorState } from "@/components/ui";

export default async function DashboardPage() {
  let stats;
  try {
    stats = await adminApi.getStats();
  } catch (e: any) {
    return (
      <div className="p-8">
        <ErrorState message={`Failed to load stats: ${e.message}`} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">FlashRide platform overview</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"  value={stats.totals.users}       icon="👥" color="blue"   />
        <StatCard label="Total Rides"  value={stats.totals.rides}       icon="🚗" color="green"  />
        <StatCard label="Open Reports" value={stats.totals.openReports} icon="🚨" color="red"    />
        <StatCard label="All Reports"  value={stats.totals.reports}     icon="📋" color="yellow" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-800">Rides by Status</h2></CardHeader>
          <CardBody>
            <div className="space-y-3">
              {Object.entries(stats.ridesByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge status={status} />
                  <span className="font-semibold text-gray-800">{count}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-800">Recent Rides</h2></CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-gray-100">
              {stats.recentRides.map((ride) => (
                <div key={ride.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {ride.origin_address.split(",")[0]} to {ride.destination_address.split(",")[0]}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{ride.driver?.full_name ?? "Unknown"}</p>
                  </div>
                  <Badge status={ride.status} />
                </div>
              ))}
              {stats.recentRides.length === 0 && <p className="px-6 py-4 text-sm text-gray-400">No rides yet</p>}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}