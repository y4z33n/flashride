import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useRideStore } from "../../store/rideStore";
import { rideService, requestService } from "../../lib/api";

export default function HomeScreen() {
  const { profile, session } = useAuthStore();
  const { myRides, myRequests, setMyRides, setMyRequests, setCurrentRide } = useRideStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const [ridesRes, reqsRes] = await Promise.all([
        rideService.getMyRides(session.user.id),
        requestService.getForRider(session.user.id),
      ]);
      setMyRides(ridesRes.data || []);
      setMyRequests(reqsRes.data || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const activeRides = myRides.filter(r => ["open","full","in_progress"].includes(r.status)).slice(0, 3);
  const pendingReqs = myRequests.filter(r => r.status === "pending").slice(0, 3);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        <Text style={s.greeting}>
          {getGreeting()}, {profile?.full_name?.split(" ")[0] ?? "Rider"} 👋
        </Text>
        <Text style={s.subtitle}>Where are you going today?</Text>

        {/* Quick actions */}
        <View style={s.actions}>
          <TouchableOpacity style={[s.actionCard, { backgroundColor: "#007AFF" }]} onPress={() => router.push("/(app)/search")}>
            <Text style={s.actionEmoji}>🔍</Text>
            <Text style={s.actionLabel}>Find a Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionCard, { backgroundColor: "#34C759" }]} onPress={() => router.push("/(app)/offer-ride")}>
            <Text style={s.actionEmoji}>🚗</Text>
            <Text style={s.actionLabel}>Offer a Ride</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color="#007AFF" />
        ) : (
          <>
            {/* My active rides (as driver) */}
            {activeRides.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>My Rides (Driver)</Text>
                {activeRides.map(ride => (
                  <RideRow key={ride.id} ride={ride} onPress={() => { setCurrentRide(ride); router.push(`/(app)/ride/${ride.id}` as any); }} />
                ))}
              </View>
            )}

            {/* My pending requests (as rider) */}
            {pendingReqs.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>My Pending Requests</Text>
                {pendingReqs.map(req => (
                  <RequestRow key={req.id} req={req} onPress={() => router.push(`/(app)/ride/${req.ride_id}` as any)} />
                ))}
              </View>
            )}

            {activeRides.length === 0 && pendingReqs.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>🗺️</Text>
                <Text style={s.emptyTitle}>No activity yet</Text>
                <Text style={s.emptySub}>Search for a ride or offer one!</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RideRow({ ride, onPress }: { ride: any; onPress: () => void }) {
  const dep = new Date(ride.departure_time);
  const fmtDep = dep.toLocaleDateString("en-MU", { weekday: "short", day: "numeric", month: "short" });
  const statusColor: Record<string, string> = { open: "#34C759", full: "#FF9500", in_progress: "#007AFF", completed: "#8E8E93", cancelled: "#FF3B30" };
  return (
    <TouchableOpacity style={s.rowCard} onPress={onPress} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowFrom} numberOfLines={1}>{ride.origin_address}</Text>
        <Text style={s.rowArrow}>→</Text>
        <Text style={s.rowTo} numberOfLines={1}>{ride.destination_address}</Text>
        <Text style={s.rowMeta}>{fmtDep}  •  {ride.seats_available} seats left</Text>
      </View>
      <View style={[s.statusDot, { backgroundColor: statusColor[ride.status] }]} />
    </TouchableOpacity>
  );
}

function RequestRow({ req, onPress }: { req: any; onPress: () => void }) {
  const dep = req.ride?.departure_time ? new Date(req.ride.departure_time).toLocaleDateString("en-MU", { weekday: "short", day: "numeric", month: "short" }) : "";
  return (
    <TouchableOpacity style={s.rowCard} onPress={onPress} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowFrom} numberOfLines={1}>{req.ride?.origin_address ?? "..."}</Text>
        <Text style={s.rowArrow}>→</Text>
        <Text style={s.rowTo} numberOfLines={1}>{req.ride?.destination_address ?? "..."}</Text>
        <Text style={s.rowMeta}>{dep}  •  Awaiting driver</Text>
      </View>
      <View style={[s.statusDot, { backgroundColor: "#FF9500" }]} />
    </TouchableOpacity>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  scroll: { flex: 1, padding: 20 },
  greeting: { fontSize: 24, fontWeight: "bold", color: "#111", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 24 },
  actions: { flexDirection: "row", gap: 12, marginBottom: 28 },
  actionCard: { flex: 1, borderRadius: 14, padding: 20, alignItems: "center" },
  actionEmoji: { fontSize: 32, marginBottom: 8 },
  actionLabel: { color: "#fff", fontWeight: "700", fontSize: 15 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111", marginBottom: 10 },
  rowCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: "row", alignItems: "center",
    elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  rowFrom: { fontSize: 14, fontWeight: "700", color: "#111" },
  rowArrow: { fontSize: 12, color: "#999", marginVertical: 2 },
  rowTo: { fontSize: 14, color: "#444" },
  rowMeta: { fontSize: 12, color: "#999", marginTop: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#444" },
  emptySub: { fontSize: 14, color: "#999", marginTop: 4 },
});
