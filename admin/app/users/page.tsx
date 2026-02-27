import Link from "next/link";
import { adminApi } from "@/lib/api";
import { Card, CardHeader, CardBody, EmptyState, ErrorState } from "@/components/ui";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const { page: pageStr, search } = await searchParams;
  const page = parseInt(pageStr ?? "0", 10);

  let result;
  try {
    result = await adminApi.listUsers(page, search);
  } catch (e: any) {
    return <div className="p-8"><ErrorState message={e.message} /></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">{result.count} total users</p>
        </div>
        {/* Search */}
        <form className="flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search name or email…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Search
          </button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Name</span><span>Email</span><span>Driver</span><span>Rating</span><span>Joined</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {result.data.length === 0 ? (
            <EmptyState message="No users found" />
          ) : (
            <div className="divide-y divide-gray-100">
              {result.data.map((u) => (
                <Link
                  key={u.id}
                  href={`/users/${u.id}`}
                  className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] items-center px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">{u.full_name}</span>
                  <span className="text-sm text-gray-500">{u.email}</span>
                  <span className="text-sm">{u.is_driver ? "✅ Yes" : "—"}</span>
                  <span className="text-sm text-gray-700">
                    {u.rating_count > 0 ? `⭐ ${u.rating_avg} (${u.rating_count})` : "—"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(u.created_at).toLocaleDateString("en-MU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Page {page + 1} · showing {Math.min((page + 1) * 25, result.count)} of {result.count}
        </p>
        <div className="flex gap-2">
          {page > 0 && (
            <Link
              href={`/users?page=${page - 1}${search ? `&search=${search}` : ""}`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              ← Previous
            </Link>
          )}
          {result.hasMore && (
            <Link
              href={`/users?page=${page + 1}${search ? `&search=${search}` : ""}`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Next →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
