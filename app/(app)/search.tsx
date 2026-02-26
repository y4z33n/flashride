import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { rideService } from "../../lib/api";
import { useRideStore } from "../../store/rideStore";
import { useAuthStore } from "../../store/authStore";
import { getCoords } from "../../lib/places";
import PlaceAutocomplete from "../../components/PlaceAutocomplete";
import type { MUPlace } from "../../lib/places";

function RideCard({ ride, onPress }: { ride: any; onPress: () => void }) {
  const dep = new Date(ride.departure_time);
  const fmtDate = dep.toLocaleDateString("en-MU", { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = dep.toLocaleTimeString("en-MU", { hour: "2-digit", minute: "2-digit" });

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(ride.driver?.full_name || "?")[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.driverName}>{ride.driver?.full_name || "Driver"}</Text>
          <Text style={s.driverRating}>
            {ride.driver?.rating_avg > 0 ? "⭐ " + ride.driver.rating_avg : "New driver"}
          </Text>
        </View>
        <View style={s.pricePill}>
          <Text style={s.priceText}>
            {ride.price_per_seat ? "MUR " + ride.price_per_seat : "Free"}
          </Text>
        </View>
      </View>

      <View style={s.route}>
        <View style={s.routePoint}>
          <View style={[s.dot, { backgroundColor: "#34C759" }]} />
          <Text style={s.routeText} numberOfLines={1}>{ride.origin_address}</Text>
        </View>
        <View style={s.routeLine} />
        <View style={s.routePoint}>
          <View style={[s.dot, { backgroundColor: "#FF3B30" }]} />
          <Text style={s.routeText} numberOfLines={1}>{ride.destination_address}</Text>
        </View>
      </View>

      <View style={s.cardFooter}>
        <Text style={s.meta}>{fmtDate} at {fmtTime}</Text>
        <Text style={s.meta}>{ride.seats_available} seat{ride.seats_available !== 1 ? "s" : ""} left</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const { setRides, setCurrentRide } = useRideStore();
  const { session } = useAuthStore();

  const [origin, setOrigin] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState("");
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-MU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const oc = originCoords ?? (origin.trim() ? getCoords(origin) : { lat: -20.2, lng: 57.5 });
      const dc = destinationCoords ?? (destination.trim() ? getCoords(destination) : { lat: -20.2, lng: 57.5 });

      const { data, error } = await rideService.search({
        origin_lat: oc.lat,
        origin_lng: oc.lng,
        destination_lat: dc.lat,
        destination_lng: dc.lng,
        date: date.toISOString(),
      });
      if (error) throw error;
      const filtered = (data || []).filter((r: any) =>
        r.driver_id !== session?.user?.id &&
        (!origin.trim() || r.origin_address.toLowerCase().includes(origin.toLowerCase())) &&
        (!destination.trim() || r.destination_address.toLowerCase().includes(destination.toLowerCase()))
      );
      setResults(filtered);
      setRides(filtered);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Find a Ride</Text>

      <View style={s.searchBox}>
        <PlaceAutocomplete
          placeholder="From… (e.g. Curepipe)"
          value={origin}
          onChangeText={setOrigin}
          onSelect={(place: MUPlace) => {
            setOrigin(place.name);
            setOriginCoords({ lat: place.lat, lng: place.lng });
          }}
          containerStyle={s.autocompleteContainer}
        />
        <PlaceAutocomplete
          placeholder="To… (e.g. Port Louis)"
          value={destination}
          onChangeText={setDestination}
          onSelect={(place: MUPlace) => {
            setDestination(place.name);
            setDestinationCoords({ lat: place.lat, lng: place.lng });
          }}
          containerStyle={s.autocompleteContainer}
        />

        {/* Date picker */}
        <TouchableOpacity style={s.datePill} onPress={() => setShowDatePicker(true)}>
          <Text style={s.datePillIcon}>📅</Text>
          <Text style={s.datePillText}>{fmtDate(date)}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, d) => {
              setShowDatePicker(Platform.OS === "ios");
              if (d) setDate(d);
            }}
          />
        )}
        {/* iOS inline confirm */}
        {showDatePicker && Platform.OS === "ios" && (
          <TouchableOpacity style={s.doneBtn} onPress={() => setShowDatePicker(false)}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.btn} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Search Rides</Text>}
        </TouchableOpacity>
      </View>

      {searched && !loading && (
        <Text style={s.resultCount}>
          {results.length > 0
            ? `${results.length} ride${results.length !== 1 ? "s" : ""} found`
            : "No rides found"}
        </Text>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <RideCard
            ride={item}
            onPress={() => {
              setCurrentRide(item);
              router.push(`/(app)/ride/${item.id}` as any);
            }}
          />
        )}
        ListEmptyComponent={
          searched && !loading ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🔍</Text>
              <Text style={s.emptyText}>No rides available</Text>
              <Text style={s.emptySub}>Try a different date or location</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  title: { fontSize: 26, fontWeight: "bold", color: "#111", paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
  searchBox: { paddingHorizontal: 16, marginBottom: 4, zIndex: 10 },
  autocompleteContainer: { marginBottom: 10 },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#c8e0ff",
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
  },
  datePillIcon: { fontSize: 16, marginRight: 8 },
  datePillText: { fontSize: 15, color: "#007AFF", fontWeight: "600" },
  doneBtn: { alignItems: "flex-end", marginBottom: 8 },
  doneBtnText: { color: "#007AFF", fontSize: 15, fontWeight: "700" },
  btn: { backgroundColor: "#007AFF", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resultCount: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, color: "#666", fontWeight: "600" },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center", marginRight: 10 },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  driverName: { fontSize: 15, fontWeight: "700", color: "#111" },
  driverRating: { fontSize: 13, color: "#666" },
  pricePill: { backgroundColor: "#e8f4fd", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  priceText: { fontSize: 13, fontWeight: "700", color: "#007AFF" },
  route: { marginBottom: 12 },
  routePoint: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  routeText: { fontSize: 14, color: "#333", flex: 1 },
  routeLine: { width: 2, height: 10, backgroundColor: "#ddd", marginLeft: 4, marginBottom: 4 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 10 },
  meta: { fontSize: 13, color: "#888" },
  empty: { alignItems: "center", paddingTop: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: "600", color: "#444" },
  emptySub: { fontSize: 14, color: "#999", marginTop: 4 },
});
