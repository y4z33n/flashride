import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { rideService, requestService } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/authStore";
import { useRideStore } from "../../../store/rideStore";

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const { setCurrentRide, setIncomingRequests } = useRideStore();
  const [ride, setRide] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [myRequest, setMyRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Location sharing (driver only)
  const [sharingLocation, setSharingLocation] = useState(false);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);

  const isDriver = ride?.driver_id === session?.user?.id;

  useEffect(() => { loadRide(); }, [id]);

  // Stop sharing on unmount
  useEffect(() => {
    return () => {
      locationWatcher.current?.remove();
    };
  }, []);

  const loadRide = async () => {
    setLoading(true);
    try {
      const { data, error } = await rideService.getById(id!);
      if (error) throw error;
      setRide(data);
      setCurrentRide(data);
      if (data.driver_id === session?.user?.id) {
        const { data: reqs } = await requestService.getForRide(id!);
        setRequests(reqs || []);
        setIncomingRequests(reqs || []);
      } else {
        // Load this rider's own request for this ride
        const { data: riderReqs } = await requestService.getForRider(session!.user.id);
        const existing = (riderReqs || []).find((r: any) => r.ride_id === id);
        setMyRequest(existing ?? null);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    setActionLoading("request");
    try {
      const { data, error } = await requestService.create({
        ride_id: ride.id,
        rider_id: session!.user.id,
        seats_requested: 1,
        message: "",
      });
      if (error) throw error;
      setMyRequest(data);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRequest = async (requestId: string, status: string) => {
    setActionLoading(requestId + status);
    try {
      const { error } = await requestService.updateStatus(requestId, status as any);
      if (error) throw error;
      await loadRide();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleLocation = async () => {
    if (sharingLocation) {
      // Stop sharing
      locationWatcher.current?.remove();
      locationWatcher.current = null;
      setSharingLocation(false);
      return;
    }

    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is needed to share your position.");
      return;
    }

    setSharingLocation(true);

    // Start watching position
    locationWatcher.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
      async (loc) => {
        // DELETE then INSERT so Supabase Realtime fires an INSERT event
        // (UPDATE events don't carry new values without REPLICA IDENTITY FULL)
        await supabase
          .from("location_updates")
          .delete()
          .eq("ride_id", ride.id);

        await supabase.from("location_updates").insert({
          ride_id: ride.id,
          driver_id: session!.user.id,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          heading: loc.coords.heading ?? null,
        });
      }
    );
  };

  const handleCancelRide = () => {
    Alert.alert("Cancel Ride", "Are you sure?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel", style: "destructive",
        onPress: async () => {
          const { error } = await rideService.updateStatus(ride.id, "cancelled");
          if (!error) router.back();
          else Alert.alert("Error", error.message);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }
  if (!ride) return null;

  const dep = new Date(ride.departure_time);
  const fmtDep = dep.toLocaleString("en-MU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const statusColors: Record<string, string> = {
    open: "#34C759", full: "#FF9500", in_progress: "#007AFF", completed: "#8E8E93", cancelled: "#FF3B30",
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Chat button — always visible for driver; visible for accepted riders */}
        {(isDriver || myRequest?.status === "accepted") && (
          <TouchableOpacity
            style={s.chatBtn}
            onPress={() => router.push(`/(app)/chat/${ride.id}` as any)}
          >
            <Text style={s.chatBtnText}>💬  Open Group Chat</Text>
          </TouchableOpacity>
        )}

        <View style={[s.badge, { backgroundColor: statusColors[ride.status] + "22" }]}>
          <Text style={[s.badgeText, { color: statusColors[ride.status] }]}>
            {ride.status.replace("_", " ").toUpperCase()}
          </Text>
        </View>

        {/* Route card */}
        <View style={s.routeCard}>
          <View style={s.routeRow}>
            <View style={[s.dot, { backgroundColor: "#34C759" }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.routeLabel}>PICKUP</Text>
              <Text style={s.routeAddr}>{ride.origin_address}</Text>
            </View>
          </View>
          <View style={s.routeLine} />
          <View style={s.routeRow}>
            <View style={[s.dot, { backgroundColor: "#FF3B30" }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.routeLabel}>DROP-OFF</Text>
              <Text style={s.routeAddr}>{ride.destination_address}</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={s.infoCard}>
          <InfoRow label="When" value={fmtDep} />
          <InfoRow label="Seats" value={`${ride.seats_available}/${ride.seats_total} available`} />
          <InfoRow label="Price" value={ride.price_per_seat ? `MUR ${ride.price_per_seat} / seat` : "Free"} last={!ride.notes} />
          {ride.notes && <InfoRow label="Notes" value={ride.notes} last />}
        </View>

        {/* Driver */}
        <View style={s.driverCard}>
          <View style={s.driverAvatar}>
            <Text style={s.driverAvatarText}>{(ride.driver?.full_name || "?")[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.driverName}>{ride.driver?.full_name}</Text>
            <Text style={s.driverMeta}>
              {ride.driver?.rating_avg > 0 ? `⭐ ${ride.driver.rating_avg}` : "New driver"}
              {ride.driver?.phone ? `  •  📞 ${ride.driver.phone}` : ""}
            </Text>
          </View>
        </View>

        {/* DRIVER: manage requests */}
        {isDriver && (
          <View>
            <Text style={s.sectionTitle}>Requests ({requests.length})</Text>
            {requests.length === 0
              ? <Text style={s.emptyText}>No requests yet</Text>
              : requests.map(req => (
                <View key={req.id} style={s.reqCard}>
                  <View style={s.reqRow}>
                    <View style={s.reqAvatar}>
                      <Text style={s.reqAvatarText}>{(req.rider?.full_name || "?")[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.reqName}>{req.rider?.full_name}</Text>
                      <Text style={s.reqMeta}>{req.seats_requested} seat(s) requested</Text>
                    </View>
                    <View style={[s.reqBadge, {
                      backgroundColor: req.status === "accepted" ? "#34C75920" : req.status === "rejected" ? "#FF3B3020" : "#FF950020"
                    }]}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: req.status === "accepted" ? "#34C759" : req.status === "rejected" ? "#FF3B30" : "#FF9500" }}>
                        {req.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  {req.status === "pending" && (
                    <View style={s.reqActions}>
                      <TouchableOpacity
                        style={[s.reqBtn, { backgroundColor: "#34C759" }]}
                        onPress={() => handleUpdateRequest(req.id, "accepted")}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === req.id + "accepted"
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={s.reqBtnText}>Accept</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.reqBtn, { backgroundColor: "#FF3B30" }]}
                        onPress={() => handleUpdateRequest(req.id, "rejected")}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === req.id + "rejected"
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={s.reqBtnText}>Decline</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            <TouchableOpacity style={s.cancelBtn} onPress={handleCancelRide}>
              <Text style={s.cancelBtnText}>Cancel This Ride</Text>
            </TouchableOpacity>

            {/* Location sharing toggle */}
            <View style={s.locationCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.locationTitle}>
                  {sharingLocation ? "📡 Sharing Location" : "📍 Share My Location"}
                </Text>
                <Text style={s.locationSub}>
                  {sharingLocation ? "Passengers can see you live" : "Let passengers track you"}
                </Text>
              </View>
              <Switch
                value={sharingLocation}
                onValueChange={handleToggleLocation}
                trackColor={{ false: "#ddd", true: "#34C75980" }}
                thumbColor={sharingLocation ? "#34C759" : "#fff"}
              />
            </View>
          </View>
        )}

        {/* RIDER: join / request status */}
        {!isDriver && (
          <>
            {/* Not yet requested & ride is open */}
            {!myRequest && ride.status === "open" && (
              <TouchableOpacity
                style={[s.joinBtn, actionLoading === "request" && { opacity: 0.6 }]}
                onPress={handleRequest}
                disabled={actionLoading === "request"}
              >
                {actionLoading === "request"
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.joinBtnText}>Request to Join</Text>}
              </TouchableOpacity>
            )}

            {/* Pending request */}
            {myRequest?.status === "pending" && (
              <View style={s.requestedBanner}>
                <Text style={s.requestedText}>⏳  Ride Requested — awaiting driver</Text>
              </View>
            )}

            {/* Accepted */}
            {myRequest?.status === "accepted" && (
              <View style={[s.requestedBanner, { backgroundColor: "#34C75920" }]}>
                <Text style={[s.requestedText, { color: "#34C759" }]}>✅  You're on this ride!</Text>
              </View>
            )}

            {/* Track driver map button — accepted riders only */}
            {myRequest?.status === "accepted" && (
              <TouchableOpacity
                style={s.trackBtn}
                onPress={() => router.push(`/(app)/ride/map/${ride.id}` as any)}
              >
                <Text style={s.trackBtnText}>🗺️  Track Driver Live</Text>
              </TouchableOpacity>
            )}

            {/* Rejected */}
            {myRequest?.status === "rejected" && (
              <View style={[s.requestedBanner, { backgroundColor: "#FF3B3015" }]}>
                <Text style={[s.requestedText, { color: "#FF3B30" }]}>❌  Request declined by driver</Text>
              </View>
            )}

            {/* Ride is full and no prior request */}
            {!myRequest && ride.status === "full" && (
              <View style={s.fullBanner}>
                <Text style={s.fullText}>This ride is full</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  scroll: { flex: 1, padding: 16 },
  back: { marginBottom: 16 },
  backText: { color: "#007AFF", fontSize: 16, fontWeight: "600" },
  badge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 16 },
  badgeText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  routeCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
  routeRow: { flexDirection: "row", alignItems: "flex-start" },
  routeLine: { width: 2, height: 16, backgroundColor: "#ddd", marginLeft: 5, marginVertical: 3 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10, marginTop: 4 },
  routeLabel: { fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 0.5, marginBottom: 2 },
  routeAddr: { fontSize: 16, fontWeight: "600", color: "#111" },
  infoCard: { backgroundColor: "#fff", borderRadius: 14, marginBottom: 12, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  infoLabel: { fontSize: 13, color: "#888", fontWeight: "600" },
  infoValue: { fontSize: 14, color: "#111", fontWeight: "600", flex: 1, textAlign: "right" },
  driverCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 20, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  driverAvatarText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  driverName: { fontSize: 16, fontWeight: "700", color: "#111" },
  driverMeta: { fontSize: 13, color: "#666", marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 12 },
  emptyText: { color: "#999", fontSize: 14, marginBottom: 16 },
  reqCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  reqRow: { flexDirection: "row", alignItems: "center" },
  reqAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#5856D6", justifyContent: "center", alignItems: "center", marginRight: 10 },
  reqAvatarText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  reqName: { fontSize: 15, fontWeight: "700", color: "#111" },
  reqMeta: { fontSize: 13, color: "#666" },
  reqBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  reqActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  reqBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center" },
  reqBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cancelBtn: { marginTop: 16, borderWidth: 1.5, borderColor: "#FF3B30", padding: 14, borderRadius: 12, alignItems: "center" },
  cancelBtnText: { color: "#FF3B30", fontWeight: "700", fontSize: 15 },
  joinBtn: { backgroundColor: "#007AFF", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  joinBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  fullBanner: { backgroundColor: "#FF950020", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  fullText: { color: "#FF9500", fontWeight: "700", fontSize: 15 },
  requestedBanner: { backgroundColor: "#FF950018", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  requestedText: { color: "#FF9500", fontWeight: "700", fontSize: 15 },
  chatBtn: {
    backgroundColor: "#5856D6", padding: 13, borderRadius: 12,
    alignItems: "center", marginBottom: 16, flexDirection: "row", justifyContent: "center",
  },
  chatBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  locationCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginTop: 12,
    flexDirection: "row", alignItems: "center",
    elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  locationTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  locationSub: { fontSize: 12, color: "#888", marginTop: 2 },
  trackBtn: {
    backgroundColor: "#FF9500", padding: 14, borderRadius: 12,
    alignItems: "center", marginTop: 10,
  },
  trackBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
