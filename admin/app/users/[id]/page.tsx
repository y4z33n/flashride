import { adminApi } from "@/lib/api";
import { Badge, Card, CardHeader, CardBody, ErrorState } from "@/components/ui";
import { blockUserAction, unblockUserAction } from "./actions";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let detail;
  try {
    detail = await adminApi.getUserDetail(id);
  } catch (e: any) {
    return <div className="p-8"><ErrorState message={e.message} /></div>;
  }

  const { profile, rides, requests, ratings, reports } = detail;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
          <p className="text-sm text-gray-500 mt-1">{profile.email} · {profile.phone ?? "No phone"}</p>
          <div className="flex gap-2 mt-2">
            {profile.is_driver && <Badge status="open" />}
            {profile.rating_count > 0 && (
              <span className="text-sm text-gray-600">⭐ {profile.rating_avg} ({profile.rating_count} reviews)</span>
            )}
          </div>
        </div>

        {/* Block / Unblock */}
        <div className="flex gap-2">
          <form action={async (fd) => {
            "use server";
            await blockUserAction(id, fd.get("reason") as string);
          }}>
            <input name="reason" placeholder="Block reason (optional)" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm mr-2 w-48" />
            <button type="submit" className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700">
              Block
            </button>
          </form>
          <form action={async () => {
            "use server";
            await unblockUserAction(id);
          }}>
            <button type="submit" className="bg-gray-200 text-gray-800 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-300">
              Unblock
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rides offered */}
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-800">Rides Offered ({rides.length})</h2></CardHeader>
          <CardBody className="p-0">
            {rides.length === 0 ? <p className="px-6 py-4 text-sm text-gray-400">None</p> : (
              <div className="divide-y divide-gray-100">
                {rides.map((r) => (
                  <div key={r.id} className="px-6 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {r.origin_address.split(",")[0]} → {r.destination_address.split(",")[0]}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(r.departure_time).toLocaleDateString("en-MU", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <Badge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Ride requests */}
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-800">Ride Requests ({requests.length})</h2></CardHeader>
          <CardBody className="p-0">
            {requests.length === 0 ? <p className="px-6 py-4 text-sm text-gray-400">None</p> : (
              <div className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <div key={r.id} className="px-6 py-3 flex justify-between items-center">
                    <p className="text-sm text-gray-800">
                      {r.ride ? `${r.ride.origin_address.split(",")[0]} → ${r.ride.destination_address.split(",")[0]}` : "—"}
                    </p>
                    <Badge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Ratings received */}
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-800">Ratings Received ({ratings.length})</h2></CardHeader>
          <CardBody className="p-0">
            {ratings.length === 0 ? <p className="px-6 py-4 text-sm text-gray-400">None</p> : (
              <div className="divide-y divide-gray-100">
                {ratings.map((r) => (
                  <div key={r.id} className="px-6 py-3">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-800">{"⭐".repeat(r.score)} by {r.rater?.full_name ?? "?"}</p>
                      <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    {r.comment && <p className="text-xs text-gray-500 mt-1">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Reports against user */}
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-800">Reports Filed Against ({reports.length})</h2></CardHeader>
          <CardBody className="p-0">
            {reports.length === 0 ? <p className="px-6 py-4 text-sm text-gray-400">None</p> : (
              <div className="divide-y divide-gray-100">
                {reports.map((r) => (
                  <div key={r.id} className="px-6 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.reason.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-400">by {r.reporter?.full_name ?? "?"}</p>
                    </div>
                    <Badge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
